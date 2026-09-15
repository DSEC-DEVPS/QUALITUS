// =====================================================================
// Module ÉVALUATION QUALITÉ (cahier) — Suites d'échec (Phase 4a)
// F.39quater (évaluations supplémentaires), F.39quinquies B (plan d'action),
// F.39sexies (lettres félicitation/débriefing + rendu).
// =====================================================================
const db = require("../config/db");

const num = (v) => (v === null || v === undefined ? 0 : Number(v));

const withTx = async (fn) => {
  const conn = await db.getConnection();
  try { await conn.beginTransaction(); const r = await fn(conn); await conn.commit(); return r; }
  catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
};

// =====================================================================
// ÉVALUATIONS SUPPLÉMENTAIRES (F.39quater)
// =====================================================================
const creerSupplementaire = async (req, res) => {
  const idParent = req.params.id;
  const evaluateurId = req.auth.userId;
  try {
    const out = await withTx(async (conn) => {
      const [[p]] = await conn.query(`SELECT * FROM b_evaluation WHERE id=?`, [idParent]);
      if (!p) return { notFound: true };
      if (p.statut !== "TERMINE" || p.conclusion !== "ECHEC") return { pasEchec: true };
      if (p.id_evaluation_parente) return { imbrication: true };
      if (p.type_ressource !== "HUMAINE") return { auto: true };

      const [[type]] = await conn.query(
        `SELECT id FROM b_eval_ref_type_evaluation WHERE code='EVALUATION_SUPPLEMENTAIRE'`
      );
      const [ins] = await conn.query(
        `INSERT INTO b_evaluation
         (type_ressource, id_nature_ressource, id_agent, id_evaluateur, id_site, id_programme,
          id_grille_origine, id_contexte, identifiant_appel, numero_case, numero_appel, motif_appel,
          date_appel, dmt, id_type_evaluation, id_evaluation_parente, nb_supplementaires_attendues,
          statut, conclusion, resolution, date_creation, actif)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL,
                 'NON_TERMINE', NULL, NULL, NOW(), 1)`,
        [p.type_ressource, p.id_nature_ressource, p.id_agent, evaluateurId, p.id_site, p.id_programme,
         p.id_grille_origine, p.id_contexte, p.identifiant_appel, p.numero_case, p.numero_appel, p.motif_appel,
         p.date_appel, p.dmt, type ? type.id : null, idParent]
      );
      const newId = ins.insertId;
      // recopie du snapshot du parent (mêmes valeurs de grille) — F.39quater
      const [cats] = await conn.query(`SELECT * FROM b_evaluation_categorie WHERE id_evaluation=? ORDER BY ordre, id`, [idParent]);
      for (const cat of cats) {
        const [rc] = await conn.query(
          `INSERT INTO b_evaluation_categorie
           (id_evaluation, libelle, poids, seuil_reussite, comparateur, critique, score_obtenu, nb_erreurs_decochees, ordre, id_categorie_origine)
           VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, ?)`,
          [newId, cat.libelle, cat.poids, cat.seuil_reussite, cat.comparateur, cat.critique, cat.ordre, cat.id_categorie_origine]
        );
        const newCat = rc.insertId;
        let score = 0;
        const [errs] = await conn.query(`SELECT * FROM b_evaluation_erreur WHERE id_evaluation_categorie=? ORDER BY id`, [cat.id]);
        for (const e of errs) {
          await conn.query(
            `INSERT INTO b_evaluation_erreur
             (id_evaluation, id_evaluation_categorie, item, sous_item, referentiel, poids, score_pct, score_sur20,
              libelle_sous_categorie, poids_sous_categorie, coche, commentaire, id_erreur_origine, id_sous_categorie_origine)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NULL, ?, ?)`,
            [newId, newCat, e.item, e.sous_item, e.referentiel, e.poids, e.score_pct, e.score_sur20,
             e.libelle_sous_categorie, e.poids_sous_categorie, e.id_erreur_origine, e.id_sous_categorie_origine]
          );
          score += num(e.poids);
        }
        await conn.query(`UPDATE b_evaluation_categorie SET score_obtenu=? WHERE id=?`, [Number(score.toFixed(6)), newCat]);
      }
      return { id: newId };
    });
    if (out.notFound) return res.status(404).json({ message: "Évaluation parente introuvable." });
    if (out.pasEchec) return res.status(409).json({ message: "Seule une évaluation terminée en échec peut avoir des supplémentaires." });
    if (out.imbrication) return res.status(409).json({ message: "Une évaluation supplémentaire ne peut pas elle-même en avoir (1 seul niveau)." });
    if (out.auto) return res.status(409).json({ message: "Pas d'évaluation supplémentaire pour une ressource automatisée." });
    return res.status(201).json({ id: out.id, message: "Évaluation supplémentaire créée." });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors de la création." }); }
};

const getSupplementaires = async (req, res) => {
  const idParent = req.params.id;
  try {
    const [[p]] = await db.query(`SELECT nb_supplementaires_attendues FROM b_evaluation WHERE id=?`, [idParent]);
    const [rows] = await db.query(
      `SELECT id, statut, conclusion, date_creation, date_evaluation FROM b_evaluation
       WHERE id_evaluation_parente=? AND actif=1 ORDER BY date_creation`, [idParent]
    );
    const realisees = rows.filter((r) => r.statut === "TERMINE").length;
    return res.status(200).json({
      attendues: p ? p.nb_supplementaires_attendues : null,
      realisees,
      total: rows.length,
      supplementaires: rows,
    });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors du chargement." }); }
};

// =====================================================================
// PLAN D'ACTION (F.39quinquies B) — modifiable même après clôture
// =====================================================================
const getPlanAction = async (req, res) => {
  const idEval = req.params.id;
  try {
    const [lignes] = await db.query(
      `SELECT l.*, a.libelle AS action_libelle, s.libelle AS statut_libelle, k.libelle AS kpi_libelle,
              po.nom AS porteur_nom, po.prenom AS porteur_prenom
       FROM b_eval_plan_action_ligne l
       LEFT JOIN b_eval_ref_action_pa a ON l.id_action=a.id
       LEFT JOIN b_eval_ref_statut_pa s ON l.id_statut=s.id
       LEFT JOIN b_eval_ref_kpi k ON l.id_kpi=k.id
       LEFT JOIN b_utilisateur po ON l.id_porteur=po.id
       WHERE l.id_evaluation=? ORDER BY l.id`, [idEval]
    );
    for (const l of lignes) {
      const [c] = await db.query(
        `SELECT c.id_utilisateur, u.nom, u.prenom FROM b_eval_plan_action_contributeur c
         LEFT JOIN b_utilisateur u ON c.id_utilisateur=u.id WHERE c.id_ligne=?`, [l.id]
      );
      l.contributeurs = c;
    }
    return res.status(200).json(lignes);
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors du chargement." }); }
};

const addLignePlanAction = async (req, res) => {
  const b = req.body;
  if (!b.id_evaluation) return res.status(400).json({ message: "Évaluation obligatoire." });
  try {
    const out = await withTx(async (conn) => {
      const [r] = await conn.query(
        `INSERT INTO b_eval_plan_action_ligne
         (id_evaluation, id_action, id_porteur, date_debut, date_attendue, date_realisation, id_statut, id_kpi, commentaire, dateCreation)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [b.id_evaluation, b.id_action || null, b.id_porteur || null, b.date_debut || null, b.date_attendue || null,
         b.date_realisation || null, b.id_statut || null, b.id_kpi || null, b.commentaire || null]
      );
      const ligneId = r.insertId;
      for (const idu of b.contributeurs || []) {
        await conn.query(`INSERT INTO b_eval_plan_action_contributeur (id_ligne, id_utilisateur) VALUES (?, ?)`, [ligneId, idu]);
      }
      return ligneId;
    });
    return res.status(201).json({ id: out, message: "Ligne ajoutée." });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors de l'ajout." }); }
};

const updateLignePlanAction = async (req, res) => {
  const id = req.params.id;
  const b = req.body;
  try {
    await withTx(async (conn) => {
      await conn.query(
        `UPDATE b_eval_plan_action_ligne
         SET id_action=?, id_porteur=?, date_debut=?, date_attendue=?, date_realisation=?, id_statut=?, id_kpi=?, commentaire=?, dateModification=NOW()
         WHERE id=?`,
        [b.id_action || null, b.id_porteur || null, b.date_debut || null, b.date_attendue || null,
         b.date_realisation || null, b.id_statut || null, b.id_kpi || null, b.commentaire || null, id]
      );
      if (Array.isArray(b.contributeurs)) {
        await conn.query(`DELETE FROM b_eval_plan_action_contributeur WHERE id_ligne=?`, [id]);
        for (const idu of b.contributeurs) {
          await conn.query(`INSERT INTO b_eval_plan_action_contributeur (id_ligne, id_utilisateur) VALUES (?, ?)`, [id, idu]);
        }
      }
    });
    return res.status(200).json({ message: "Ligne mise à jour." });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors de la mise à jour." }); }
};

const deleteLignePlanAction = async (req, res) => {
  try {
    await withTx(async (conn) => {
      await conn.query(`DELETE FROM b_eval_plan_action_contributeur WHERE id_ligne=?`, [req.params.id]);
      await conn.query(`DELETE FROM b_eval_plan_action_ligne WHERE id=?`, [req.params.id]);
    });
    return res.status(200).json({ message: "Ligne supprimée." });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors de la suppression." }); }
};

// =====================================================================
// LETTRES (F.39sexies) — modèle paramétrable + rendu
// =====================================================================
const getLettreModele = async (req, res) => {
  const type = req.params.type;
  try {
    const [[m]] = await db.query(`SELECT * FROM b_eval_lettre_modele WHERE type=?`, [type]);
    if (!m) return res.status(404).json({ message: "Modèle introuvable." });
    return res.status(200).json(m);
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur." }); }
};

const updateLettreModele = async (req, res) => {
  const type = req.params.type;
  try {
    const [r] = await db.query(`UPDATE b_eval_lettre_modele SET texte=?, dateModification=NOW() WHERE type=?`, [req.body.texte || "", type]);
    if (r.affectedRows === 0) return res.status(404).json({ message: "Modèle introuvable." });
    return res.status(200).json({ message: "Modèle mis à jour." });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur." }); }
};

// Rendu de la lettre d'une évaluation (données structurées pour l'affichage)
const getLettreEvaluation = async (req, res) => {
  const idEval = req.params.id;
  try {
    const [[e]] = await db.query(
      `SELECT ev.*, ag.nom AS agent_nom, ag.prenom AS agent_prenom, ctx.libelle AS contexte
       FROM b_evaluation ev
       LEFT JOIN b_utilisateur ag ON ev.id_agent=ag.id
       LEFT JOIN b_eval_ref_contexte ctx ON ev.id_contexte=ctx.id
       WHERE ev.id=?`, [idEval]
    );
    if (!e) return res.status(404).json({ message: "Évaluation introuvable." });
    if (e.statut !== "TERMINE") return res.status(409).json({ message: "La lettre n'est disponible qu'après clôture." });

    const type = e.conclusion === "SUCCES" ? "FELICITATION" : "DEBRIEFING";
    const [[modele]] = await db.query(`SELECT texte FROM b_eval_lettre_modele WHERE type=?`, [type]);

    const [cats] = await db.query(
      `SELECT id, libelle, seuil_reussite, comparateur, score_obtenu, nb_erreurs_decochees FROM b_evaluation_categorie WHERE id_evaluation=? ORDER BY ordre, id`, [idEval]
    );
    const scores = [];
    const constats = [];
    for (const c of cats) {
      const reussite = c.comparateur === ">=" ? num(c.score_obtenu) >= num(c.seuil_reussite) : num(c.score_obtenu) > num(c.seuil_reussite);
      scores.push({ categorie: c.libelle, score: num(c.score_obtenu), seuil: num(c.seuil_reussite), reussite });
      const [errs] = await db.query(
        `SELECT item, commentaire, referentiel FROM b_evaluation_erreur WHERE id_evaluation_categorie=? AND coche=0`, [c.id]
      );
      errs.forEach((x) => constats.push({ categorie: c.libelle, item: x.item, commentaire: x.commentaire, referentiel: x.referentiel }));
    }

    // BI (analyse des causes) recopiée
    const [bi] = await db.query(`SELECT niveau, libelle FROM b_evaluation_bi WHERE id_evaluation=? ORDER BY niveau`, [idEval]);
    // Coaching (cause racine) recopié
    const [coaching] = await db.query(
      `SELECT n.niveau, n.libelle FROM b_eval_coaching_niveau n
       JOIN b_eval_coaching co ON n.id_coaching=co.id WHERE co.id_evaluation=? ORDER BY n.niveau`, [idEval]
    );

    return res.status(200).json({
      type,
      modele: modele ? modele.texte : "",
      agent: { nom: e.agent_nom, prenom: e.agent_prenom },
      date_evaluation: e.date_evaluation,
      contexte: e.contexte,
      identifiant_appel: e.identifiant_appel,
      synthese: e.synthese,
      conclusion: e.conclusion,
      avis_agent: e.avis_agent,
      scores,
      constats,
      business_intelligence: bi,
      cause_racine: coaching,
    });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors du chargement de la lettre." }); }
};

module.exports = {
  creerSupplementaire, getSupplementaires,
  getPlanAction, addLignePlanAction, updateLignePlanAction, deleteLignePlanAction,
  getLettreModele, updateLettreModele, getLettreEvaluation,
};
