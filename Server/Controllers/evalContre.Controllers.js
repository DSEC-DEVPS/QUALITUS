// =====================================================================
// Module ÉVALUATION QUALITÉ (cahier) — Contre-évaluation (Phase 6b, F.42bis)
// Objet DISTINCT : contrôle du travail d'un évaluateur sur une évaluation
// terminée. Snapshot recopié de l'évaluation initiale ; exécution comparée ;
// date de visibilité ; aucune notification/coaching/plan/supplémentaire.
// Tables b_eval_contre_evaluation / b_eval_contre_categorie/erreur.
// =====================================================================
const db = require("../config/db");

const num = (v) => (v === null || v === undefined ? 0 : Number(v));
const EPS = 0.01; // tolérance d'arrondi (poids DECIMAL(12,6)) — cf. evalExecution
const reussite = (score, comp, seuil) => (comp === ">=" ? num(score) >= num(seuil) - EPS : num(score) > num(seuil) - EPS);

const withTx = async (fn) => {
  const conn = await db.getConnection();
  try { await conn.beginTransaction(); const r = await fn(conn); await conn.commit(); return r; }
  catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
};
const getUserRole = async (userId) => {
  const [[r]] = await db.query(`SELECT f.Role_Associe AS role FROM b_utilisateur u JOIN b_fonction f ON u.id_Fonction=f.id WHERE u.id=?`, [userId]);
  return r ? r.role : null;
};

// --- Sélection : évaluateurs par site (ayant des évaluations terminées) ---
const getEvaluateursBySite = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT DISTINCT u.id, u.nom, u.prenom, u.nom_utilisateur AS login
       FROM b_evaluation e JOIN b_utilisateur u ON e.id_evaluateur=u.id
       WHERE u.id_Site=? AND e.statut='TERMINE' AND e.actif=1
       ORDER BY u.nom, u.prenom`, [req.params.idSite]
    );
    return res.status(200).json(rows);
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors du chargement." }); }
};

// --- Évaluations terminées d'un évaluateur non encore contre-évaluées -----
const getEvaluationsByEvaluateur = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT e.id, e.date_appel, e.identifiant_appel, e.conclusion, ag.nom AS agent_nom, ag.prenom AS agent_prenom, gr.nom AS grille
       FROM b_evaluation e
       LEFT JOIN b_utilisateur ag ON e.id_agent=ag.id
       LEFT JOIN b_eval_grille gr ON e.id_grille_origine=gr.id
       WHERE e.id_evaluateur=? AND e.statut='TERMINE' AND e.actif=1
         AND e.id NOT IN (SELECT id_evaluation_initiale FROM b_eval_contre_evaluation)
       ORDER BY e.date_appel DESC`, [req.params.idEvaluateur]
    );
    return res.status(200).json(rows);
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors du chargement." }); }
};

// --- Création : recopie du snapshot de l'évaluation initiale (F.42bis C) ---
const creerContre = async (req, res) => {
  const idInit = req.params.idEvaluation;
  const responsable = req.auth.userId;
  try {
    const out = await withTx(async (conn) => {
      const [[e]] = await conn.query(`SELECT * FROM b_evaluation WHERE id=?`, [idInit]);
      if (!e) return { notFound: true };
      if (e.statut !== "TERMINE") return { pasTerminee: true };
      const [[dup]] = await conn.query(`SELECT id FROM b_eval_contre_evaluation WHERE id_evaluation_initiale=?`, [idInit]);
      if (dup) return { dejaContre: true };

      const [ins] = await conn.query(
        `INSERT INTO b_eval_contre_evaluation (id_evaluation_initiale, id_responsable, statut, date_creation, actif)
         VALUES (?, ?, 'NON_TERMINE', NOW(), 1)`, [idInit, responsable]
      );
      const ceId = ins.insertId;
      const [cats] = await conn.query(`SELECT * FROM b_evaluation_categorie WHERE id_evaluation=? ORDER BY ordre, id`, [idInit]);
      for (const cat of cats) {
        const [rc] = await conn.query(
          `INSERT INTO b_eval_contre_categorie
           (id_contre_evaluation, libelle, poids, seuil_reussite, comparateur, critique, score_obtenu, nb_erreurs_decochees, ordre, id_categorie_origine)
           VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, ?)`,
          [ceId, cat.libelle, cat.poids, cat.seuil_reussite, cat.comparateur, cat.critique, cat.ordre, cat.id_categorie_origine]
        );
        const newCat = rc.insertId;
        let score = 0;
        const [errs] = await conn.query(`SELECT * FROM b_evaluation_erreur WHERE id_evaluation_categorie=? ORDER BY id`, [cat.id]);
        for (const er of errs) {
          await conn.query(
            `INSERT INTO b_eval_contre_erreur
             (id_contre_evaluation, id_contre_categorie, item, sous_item, referentiel, poids, score_pct, score_sur20,
              libelle_sous_categorie, poids_sous_categorie, coche, commentaire, id_erreur_origine, id_sous_categorie_origine)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NULL, ?, ?)`,
            [ceId, newCat, er.item, er.sous_item, er.referentiel, er.poids, er.score_pct, er.score_sur20,
             er.libelle_sous_categorie, er.poids_sous_categorie, er.id_erreur_origine, er.id_sous_categorie_origine]
          );
          score += num(er.poids);
        }
        await conn.query(`UPDATE b_eval_contre_categorie SET score_obtenu=? WHERE id=?`, [Number(score.toFixed(6)), newCat]);
      }
      return { id: ceId };
    });
    if (out.notFound) return res.status(404).json({ message: "Évaluation introuvable." });
    if (out.pasTerminee) return res.status(409).json({ message: "La contre-évaluation ne porte que sur une évaluation terminée." });
    if (out.dejaContre) return res.status(409).json({ message: "Cette évaluation a déjà une contre-évaluation." });
    return res.status(201).json({ id: out.id, message: "Contre-évaluation créée." });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors de la création." }); }
};

// --- Liste (respecte la date de visibilité) -------------------------------
const getAllContre = async (req, res) => {
  const userId = req.auth.userId;
  try {
    const role = await getUserRole(userId);
    const where = ["ce.actif=1"];
    const params = [];
    if (role !== "R_ADMI") {
      where.push(`(ce.id_responsable=? OR (ce.date_visibilite IS NOT NULL AND ce.date_visibilite<=NOW()
                  AND e.id_agent IN (SELECT id_AGENT FROM b_r_superviseur_agent WHERE id_SUPERVISEUR=?)))`);
      params.push(userId, userId);
    }
    const [rows] = await db.query(
      `SELECT ce.id, ce.statut, ce.conclusion, ce.date_creation, ce.date_visibilite, ce.date_evaluation,
              e.id AS id_evaluation_initiale, e.identifiant_appel, ev.nom AS evaluateur_nom, ev.prenom AS evaluateur_prenom,
              ag.nom AS agent_nom, ag.prenom AS agent_prenom, r.nom AS responsable_nom, r.prenom AS responsable_prenom
       FROM b_eval_contre_evaluation ce
       JOIN b_evaluation e ON ce.id_evaluation_initiale=e.id
       LEFT JOIN b_utilisateur ev ON e.id_evaluateur=ev.id
       LEFT JOIN b_utilisateur ag ON e.id_agent=ag.id
       LEFT JOIN b_utilisateur r ON ce.id_responsable=r.id
       WHERE ${where.join(" AND ")}
       ORDER BY ce.date_creation DESC`, params
    );
    return res.status(200).json(rows);
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors du chargement." }); }
};

// --- Détail : contre-éval + comparaison avec l'évaluation initiale --------
const getContre = async (req, res) => {
  const id = req.params.id;
  try {
    const [[ce]] = await db.query(
      `SELECT ce.*, e.id AS id_eval_init, ev.nom AS evaluateur_nom, ev.prenom AS evaluateur_prenom,
              ag.nom AS agent_nom, ag.prenom AS agent_prenom, gr.nom AS grille
       FROM b_eval_contre_evaluation ce
       JOIN b_evaluation e ON ce.id_evaluation_initiale=e.id
       LEFT JOIN b_utilisateur ev ON e.id_evaluateur=ev.id
       LEFT JOIN b_utilisateur ag ON e.id_agent=ag.id
       LEFT JOIN b_eval_grille gr ON e.id_grille_origine=gr.id
       WHERE ce.id=?`, [id]
    );
    if (!ce) return res.status(404).json({ message: "Contre-évaluation introuvable." });

    // cochage initial indexé par id_erreur_origine
    const [initErrs] = await db.query(
      `SELECT id_erreur_origine, coche FROM b_evaluation_erreur WHERE id_evaluation=?`, [ce.id_eval_init]
    );
    const initMap = {};
    initErrs.forEach((x) => (initMap[x.id_erreur_origine] = x.coche));

    const [cats] = await db.query(`SELECT * FROM b_eval_contre_categorie WHERE id_contre_evaluation=? ORDER BY ordre, id`, [id]);
    for (const cat of cats) {
      const [errs] = await db.query(`SELECT * FROM b_eval_contre_erreur WHERE id_contre_categorie=? ORDER BY id`, [cat.id]);
      errs.forEach((er) => {
        er.coche_initiale = initMap[er.id_erreur_origine] !== undefined ? initMap[er.id_erreur_origine] : null;
        er.ecart = er.coche_initiale !== null && er.coche_initiale !== er.coche;
      });
      cat.erreurs = errs;
      cat.reussite = reussite(cat.score_obtenu, cat.comparateur, cat.seuil_reussite);
    }
    const conclusion_live = cats.length ? (cats.every((c) => c.reussite) ? "SUCCES" : "ECHEC") : "SUCCES";
    return res.status(200).json({ contre: ce, categories: cats, conclusion_live });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors du chargement." }); }
};

const toggleErreur = async (req, res) => {
  const { id, idErreur } = req.params;
  const { coche, commentaire } = req.body;
  try {
    const out = await withTx(async (conn) => {
      const [[ce]] = await conn.query(`SELECT statut FROM b_eval_contre_evaluation WHERE id=?`, [id]);
      if (!ce) return { notFound: true };
      if (ce.statut === "TERMINE") return { locked: true };
      const [[er]] = await conn.query(`SELECT id_contre_categorie FROM b_eval_contre_erreur WHERE id=? AND id_contre_evaluation=?`, [idErreur, id]);
      if (!er) return { notFound: true };
      await conn.query(`UPDATE b_eval_contre_erreur SET coche=?, commentaire=? WHERE id=?`, [coche ? 1 : 0, commentaire !== undefined ? commentaire : null, idErreur]);
      const [[s]] = await conn.query(
        `SELECT COALESCE(SUM(CASE WHEN coche=1 THEN poids ELSE 0 END),0) AS score, SUM(CASE WHEN coche=0 THEN 1 ELSE 0 END) AS nbdec
         FROM b_eval_contre_erreur WHERE id_contre_categorie=?`, [er.id_contre_categorie]
      );
      await conn.query(`UPDATE b_eval_contre_categorie SET score_obtenu=?, nb_erreurs_decochees=? WHERE id=?`, [Number(num(s.score).toFixed(6)), s.nbdec || 0, er.id_contre_categorie]);
      const [[cat]] = await conn.query(`SELECT score_obtenu, comparateur, seuil_reussite FROM b_eval_contre_categorie WHERE id=?`, [er.id_contre_categorie]);
      const [cats] = await conn.query(`SELECT score_obtenu, comparateur, seuil_reussite FROM b_eval_contre_categorie WHERE id_contre_evaluation=?`, [id]);
      const conclusion_live = cats.every((c) => reussite(c.score_obtenu, c.comparateur, c.seuil_reussite)) ? "SUCCES" : "ECHEC";
      return { id_categorie: er.id_contre_categorie, score_categorie: num(cat.score_obtenu), reussite_categorie: reussite(cat.score_obtenu, cat.comparateur, cat.seuil_reussite), conclusion_live };
    });
    if (out.notFound) return res.status(404).json({ message: "Élément introuvable." });
    if (out.locked) return res.status(409).json({ message: "Contre-évaluation terminée : non modifiable." });
    return res.status(200).json(out);
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur." }); }
};

const setResolution = async (req, res) => {
  const id = req.params.id;
  const { resolution, synthese, date_visibilite } = req.body;
  try {
    const [[ce]] = await db.query(`SELECT statut FROM b_eval_contre_evaluation WHERE id=?`, [id]);
    if (!ce) return res.status(404).json({ message: "Introuvable." });
    if (ce.statut === "TERMINE") return res.status(409).json({ message: "Terminée : non modifiable." });
    await db.query(`UPDATE b_eval_contre_evaluation SET resolution=?, synthese=?, date_visibilite=? WHERE id=?`,
      [resolution || null, synthese !== undefined ? synthese : null, date_visibilite || null, id]);
    return res.status(200).json({ message: "Enregistré." });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur." }); }
};

const terminerContre = async (req, res) => {
  const id = req.params.id;
  try {
    const out = await withTx(async (conn) => {
      const [[ce]] = await conn.query(`SELECT * FROM b_eval_contre_evaluation WHERE id=?`, [id]);
      if (!ce) return { notFound: true };
      if (ce.statut === "TERMINE") return { deja: true };
      if (!ce.date_visibilite) return { sansVisibilite: true };
      const [cats] = await conn.query(`SELECT score_obtenu, comparateur, seuil_reussite FROM b_eval_contre_categorie WHERE id_contre_evaluation=?`, [id]);
      const conclusion = cats.every((c) => reussite(c.score_obtenu, c.comparateur, c.seuil_reussite)) ? "SUCCES" : "ECHEC";
      await conn.query(`UPDATE b_eval_contre_evaluation SET statut='TERMINE', conclusion=?, date_evaluation=NOW() WHERE id=?`, [conclusion, id]);
      return { conclusion };
    });
    if (out.notFound) return res.status(404).json({ message: "Introuvable." });
    if (out.deja) return res.status(409).json({ message: "Déjà terminée." });
    if (out.sansVisibilite) return res.status(400).json({ message: "La date de visibilité est obligatoire avant de terminer." });
    return res.status(200).json({ message: "Contre-évaluation terminée.", conclusion: out.conclusion });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur." }); }
};

const setActifContre = async (req, res) => {
  try {
    await db.query(`UPDATE b_eval_contre_evaluation SET actif=? WHERE id=?`, [req.body.actif ? 1 : 0, req.params.id]);
    return res.status(200).json({ message: req.body.actif ? "Réactivée." : "Désactivée." });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur." }); }
};

module.exports = {
  getEvaluateursBySite, getEvaluationsByEvaluateur, creerContre, getAllContre, getContre,
  toggleErreur, setResolution, terminerContre, setActifContre,
};
