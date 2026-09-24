// =====================================================================
// Module ÉVALUATION QUALITÉ (cahier) — Exécution (Phase 3a, F.39bis)
// Détail d'une évaluation, cochage/commentaire des erreurs, calcul au fil
// de l'eau (score par catégorie + conclusion), résolution, clôture +
// notifications. Schéma b_evaluation / b_evaluation_categorie/erreur.
// =====================================================================
const db = require("../config/db");
const { emitEvaluation } = require("../utils/notify");

const num = (v) => (v === null || v === undefined ? 0 : Number(v));
// Tolérance d'arrondi : les poids sont en DECIMAL(12,6), un cumul « 100 %
// conforme » peut être stocké 99.999999. Sans marge, un seuil à 100 avec ">="
// échouerait à tort. EPS reste bien inférieur au coût du plus petit écart réel.
const EPS = 0.01;
const reussite = (score, comparateur, seuil) =>
  comparateur === ">=" ? num(score) >= num(seuil) - EPS : num(score) > num(seuil) - EPS;

const withTx = async (fn) => {
  const conn = await db.getConnection();
  try { await conn.beginTransaction(); const r = await fn(conn); await conn.commit(); return r; }
  catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
};

// Recalcule le score d'une catégorie (cumul des poids des erreurs cochées)
const recomputeCategorie = async (conn, catId) => {
  const [[s]] = await conn.query(
    `SELECT COALESCE(SUM(CASE WHEN coche=1 THEN poids ELSE 0 END),0) AS score,
            SUM(CASE WHEN coche=0 THEN 1 ELSE 0 END) AS nbdec
     FROM b_evaluation_erreur WHERE id_evaluation_categorie=?`, [catId]
  );
  await conn.query(
    `UPDATE b_evaluation_categorie SET score_obtenu=?, nb_erreurs_decochees=? WHERE id=?`,
    [Number(num(s.score).toFixed(6)), s.nbdec || 0, catId]
  );
};

// Conclusion globale live à partir des catégories (non figée avant clôture)
const computeConclusion = async (conn, evaluationId) => {
  const [cats] = await conn.query(
    `SELECT score_obtenu, comparateur, seuil_reussite FROM b_evaluation_categorie WHERE id_evaluation=?`,
    [evaluationId]
  );
  if (cats.length === 0) return "SUCCES";
  const toutes = cats.every((c) => reussite(c.score_obtenu, c.comparateur, c.seuil_reussite));
  return toutes ? "SUCCES" : "ECHEC";
};

// ---------------------------------------------------------------------
// GET détail d'une évaluation (snapshot + états courants)
// ---------------------------------------------------------------------
const getEvaluationDetail = async (req, res) => {
  const id = req.params.id;
  try {
    const [[e]] = await db.query(
      `SELECT e.*, ag.nom AS agent_nom, ag.prenom AS agent_prenom,
              ev.nom AS evaluateur_nom, ev.prenom AS evaluateur_prenom,
              ctx.libelle AS contexte, t.libelle AS type_evaluation,
              gr.nom AS grille, nat.libelle AS nature_ressource,
              s.nom AS site, p.nom AS programme
       FROM b_evaluation e
       LEFT JOIN b_utilisateur ag ON e.id_agent=ag.id
       LEFT JOIN b_utilisateur ev ON e.id_evaluateur=ev.id
       LEFT JOIN b_eval_ref_contexte ctx ON e.id_contexte=ctx.id
       LEFT JOIN b_eval_ref_type_evaluation t ON e.id_type_evaluation=t.id
       LEFT JOIN b_eval_grille gr ON e.id_grille_origine=gr.id
       LEFT JOIN b_eval_ref_nature_ressource nat ON e.id_nature_ressource=nat.id
       LEFT JOIN b_site s ON e.id_site=s.id
       LEFT JOIN b_programme p ON e.id_programme=p.id
       WHERE e.id=?`, [id]
    );
    if (!e) return res.status(404).json({ message: "Évaluation introuvable." });
    const [cats] = await db.query(
      `SELECT * FROM b_evaluation_categorie WHERE id_evaluation=? ORDER BY ordre, id`, [id]
    );
    for (const cat of cats) {
      const [errs] = await db.query(
        `SELECT * FROM b_evaluation_erreur WHERE id_evaluation_categorie=? ORDER BY id`, [cat.id]
      );
      cat.erreurs = errs;
      cat.reussite = reussite(cat.score_obtenu, cat.comparateur, cat.seuil_reussite);
    }
    const conclusion_live = cats.length
      ? (cats.every((c) => c.reussite) ? "SUCCES" : "ECHEC")
      : "SUCCES";

    // Rôle du visualiseur vis-à-vis de cette évaluation (droits d'affichage)
    const uid = req.auth.userId;
    const [[roleRow]] = await db.query(
      `SELECT f.Role_Associe AS role FROM b_utilisateur u JOIN b_fonction f ON u.id_Fonction=f.id WHERE u.id=?`, [uid]
    );
    const role = roleRow ? roleRow.role : null;
    const is_agent = e.id_agent != null && Number(e.id_agent) === Number(uid);
    const is_evaluateur = e.id_evaluateur != null && Number(e.id_evaluateur) === Number(uid);
    let is_superviseur = false;
    if (e.id_agent) {
      const [[sup]] = await db.query(
        `SELECT 1 AS ok FROM b_r_superviseur_agent WHERE id_SUPERVISEUR=? AND id_AGENT=?`, [uid, e.id_agent]
      );
      is_superviseur = !!sup;
      // Superviseur de l'agent (pour la section Informations)
      const [[supU]] = await db.query(
        `SELECT su.nom, su.prenom FROM b_r_superviseur_agent ra
           JOIN b_utilisateur su ON su.id=ra.id_SUPERVISEUR
          WHERE ra.id_AGENT=? LIMIT 1`, [e.id_agent]
      );
      if (supU) { e.superviseur_nom = supU.nom; e.superviseur_prenom = supU.prenom; }
    }
    // Une évaluation désactivée n'est pas visible par l'agent évalué.
    if (Number(e.actif) === 0 && is_agent && !is_evaluateur && role !== "R_ADMI") {
      return res.status(403).json({ message: "Cette évaluation n'est pas disponible." });
    }
    // L'agent évalué ne fait que consulter (coaching/plan en lecture seule,
    // section « évaluations supplémentaires » masquée).
    const lecture_seule = is_agent && !is_evaluateur && !is_superviseur && !["R_ADMI", "R_AQ", "R_RO"].includes(role);
    const viewer = { role, is_agent, is_evaluateur, is_superviseur, lecture_seule };

    return res.status(200).json({ evaluation: e, categories: cats, conclusion_live, viewer });
  } catch (err) { console.log(err); return res.status(500).json({ message: "Erreur lors du chargement." }); }
};

// ---------------------------------------------------------------------
// PUT cochage / commentaire d'une erreur (calcul au fil de l'eau)
// ---------------------------------------------------------------------
const toggleErreur = async (req, res) => {
  const { id, idErreur } = req.params;
  const { coche, commentaire } = req.body;
  try {
    const out = await withTx(async (conn) => {
      const [[e]] = await conn.query(`SELECT statut FROM b_evaluation WHERE id=?`, [id]);
      if (!e) return { notFound: true };
      if (e.statut === "TERMINE") return { locked: true };
      const [[err]] = await conn.query(
        `SELECT id_evaluation_categorie FROM b_evaluation_erreur WHERE id=? AND id_evaluation=?`,
        [idErreur, id]
      );
      if (!err) return { notFound: true };
      await conn.query(
        `UPDATE b_evaluation_erreur SET coche=?, commentaire=? WHERE id=?`,
        [coche ? 1 : 0, commentaire !== undefined ? commentaire : null, idErreur]
      );
      await recomputeCategorie(conn, err.id_evaluation_categorie);
      const [[cat]] = await conn.query(
        `SELECT score_obtenu, nb_erreurs_decochees, comparateur, seuil_reussite FROM b_evaluation_categorie WHERE id=?`,
        [err.id_evaluation_categorie]
      );
      const conclusion_live = await computeConclusion(conn, id);
      return {
        id_categorie: err.id_evaluation_categorie,
        score_categorie: num(cat.score_obtenu),
        nb_decochees: cat.nb_erreurs_decochees,
        reussite_categorie: reussite(cat.score_obtenu, cat.comparateur, cat.seuil_reussite),
        conclusion_live,
      };
    });
    if (out.notFound) return res.status(404).json({ message: "Élément introuvable." });
    if (out.locked) return res.status(409).json({ message: "Évaluation terminée : non modifiable." });
    return res.status(200).json(out);
  } catch (err) { console.log(err); return res.status(500).json({ message: "Erreur lors de la mise à jour." }); }
};

// ---------------------------------------------------------------------
// PUT résolution (Oui/Non) et synthèse
// ---------------------------------------------------------------------
const setResolution = async (req, res) => {
  const id = req.params.id;
  const { resolution, synthese } = req.body;
  if (resolution && resolution !== "OUI" && resolution !== "NON") {
    return res.status(400).json({ message: "Résolution invalide (OUI ou NON)." });
  }
  try {
    const [[e]] = await db.query(`SELECT statut FROM b_evaluation WHERE id=?`, [id]);
    if (!e) return res.status(404).json({ message: "Évaluation introuvable." });
    if (e.statut === "TERMINE") return res.status(409).json({ message: "Évaluation terminée : non modifiable." });
    await db.query(
      `UPDATE b_evaluation SET resolution=?, synthese=? WHERE id=?`,
      [resolution || null, synthese !== undefined ? synthese : null, id]
    );
    return res.status(200).json({ message: "Enregistré." });
  } catch (err) { console.log(err); return res.status(500).json({ message: "Erreur." }); }
};

// ---------------------------------------------------------------------
// POST clôture (F.39bis D/E) — fige la conclusion + notifie
// ---------------------------------------------------------------------
const terminerEvaluation = async (req, res) => {
  const id = req.params.id;
  try {
    const out = await withTx(async (conn) => {
      const [[e]] = await conn.query(`SELECT * FROM b_evaluation WHERE id=?`, [id]);
      if (!e) return { notFound: true };
      if (e.statut === "TERMINE") return { deja: true };
      if (!e.resolution) return { sansResolution: true };
      // F.39ter D : une option BI en attente de validation bloque la clôture
      const [[pending]] = await conn.query(
        `SELECT COUNT(*) AS n FROM b_eval_bi_option WHERE id_evaluation_origine=? AND etat='EN_ATTENTE'`, [id]
      );
      if (pending.n > 0) return { optionEnAttente: true };
      // recalcul de toutes les catégories puis conclusion figée
      const [cats] = await conn.query(`SELECT id FROM b_evaluation_categorie WHERE id_evaluation=?`, [id]);
      for (const c of cats) await recomputeCategorie(conn, c.id);
      const conclusion = await computeConclusion(conn, id);
      // F.39quater : sur un ÉCHEC (ressource humaine), le nb d'évaluations
      // supplémentaires attendues s'applique à TOUT niveau (ordinaire OU
      // supplémentaire). L'évaluation supplémentaire n'est PAS une duplication :
      // elle se crée via le formulaire normal, liée au parent.
      let nbAttendues = e.nb_supplementaires_attendues || null;
      if (conclusion === "ECHEC" && e.type_ressource === "HUMAINE") {
        const [[p]] = await conn.query(
          `SELECT valeur FROM b_eval_param_systeme WHERE cle='nb_supplementaires_attendues'`
        );
        const parDefaut = p ? parseInt(p.valeur, 10) : 0;
        nbAttendues = nbAttendues || parDefaut || 0;
        // On fige le nombre attendu (utile à l'UI) même si la clôture est bloquée.
        await conn.query(`UPDATE b_evaluation SET nb_supplementaires_attendues=? WHERE id=?`, [nbAttendues, id]);
        // Blocage : impossible de terminer tant que les N supplémentaires ne sont
        // pas RÉALISÉES (terminées).
        if (nbAttendues > 0) {
          const [[{ realisees }]] = await conn.query(
            `SELECT COUNT(*) AS realisees FROM b_evaluation WHERE id_evaluation_parente=? AND statut='TERMINE' AND actif=1`, [id]
          );
          if (realisees < nbAttendues) {
            return { supplementairesRequises: true, requis: nbAttendues, realisees };
          }
        }
      }
      await conn.query(
        `UPDATE b_evaluation SET statut='TERMINE', conclusion=?, date_evaluation=NOW(), nb_supplementaires_attendues=? WHERE id=?`,
        [conclusion, nbAttendues, id]
      );
      // Notification « Évaluation terminée » — uniquement créateur + superviseur + agent
      if (e.type_ressource === "HUMAINE" && e.id_agent) {
        await emitEvaluation(conn, { id, id_evaluateur: e.id_evaluateur, id_agent: e.id_agent }, {
          titre: "Résultat d'évaluation",
          message: `L'évaluation est terminée : ${conclusion === "SUCCES" ? "Succès" : "Échec"}.`,
        });
      }
      return { conclusion };
    });
    if (out.notFound) return res.status(404).json({ message: "Évaluation introuvable." });
    if (out.deja) return res.status(409).json({ message: "Évaluation déjà terminée." });
    if (out.sansResolution) return res.status(400).json({ message: "La résolution est obligatoire avant de terminer." });
    if (out.optionEnAttente) return res.status(409).json({ message: "Une option BI est en attente de validation : clôture impossible." });
    if (out.supplementairesRequises) return res.status(409).json({
      message: `Évaluation en échec : vous devez créer et réaliser ${out.requis} évaluation(s) supplémentaire(s) avant de terminer (${out.realisees}/${out.requis} réalisée(s)).`,
      requis: out.requis, realisees: out.realisees,
    });
    return res.status(200).json({ message: "Évaluation terminée.", conclusion: out.conclusion });
  } catch (err) { console.log(err); return res.status(500).json({ message: "Erreur lors de la clôture." }); }
};

// ---------------------------------------------------------------------
// PUT avis de l'agent (F.39sexies D) — seul champ modifiable après clôture
// ---------------------------------------------------------------------
const setAvisAgent = async (req, res) => {
  const id = req.params.id;
  const uid = req.auth.userId;
  const { avis } = req.body;
  try {
    const [[e]] = await db.query(`SELECT id, id_evaluateur, id_agent, statut, conclusion FROM b_evaluation WHERE id=?`, [id]);
    if (!e) return res.status(404).json({ message: "Évaluation introuvable." });
    if (e.statut !== "TERMINE") return res.status(409).json({ message: "L'avis n'est saisissable qu'après clôture." });
    // L'avis appartient à l'agent évalué (les admins peuvent le saisir aussi).
    const [[roleRow]] = await db.query(
      `SELECT f.Role_Associe AS role FROM b_utilisateur u JOIN b_fonction f ON u.id_Fonction=f.id WHERE u.id=?`, [uid]
    );
    const role = roleRow ? roleRow.role : null;
    const estAgent = e.id_agent != null && Number(e.id_agent) === Number(uid);
    if (!estAgent && role !== "R_ADMI") {
      return res.status(403).json({ message: "Seul l'agent évalué peut enregistrer son avis." });
    }
    // Statut après évaluation : dérivé de la nature de la lettre (conclusion).
    // Félicitation (Succès) -> FELICITER ; Débriefing (Échec) -> DEBRIEFER.
    const statutApres = e.conclusion === "SUCCES" ? "FELICITER" : "DEBRIEFER";
    await db.query(
      `UPDATE b_evaluation SET avis_agent=?, date_avis=NOW(), statut_apres_evaluation=? WHERE id=?`,
      [avis || null, statutApres, id]
    );
    await db.query(`INSERT INTO b_evaluation_avis_histo (id_evaluation, avis, dateSaisie) VALUES (?, ?, NOW())`, [id, avis || null]);
    // Notification « Approbation agent enregistrée » — créateur + superviseur (pas l'auteur)
    await emitEvaluation(db, e, {
      titre: "Approbation de l'agent",
      message: `L'agent a enregistré son approbation (${statutApres === "FELICITER" ? "Féliciter" : "Débriefer"}).`,
      exclure: uid,
    });
    return res.status(200).json({ message: "Avis enregistré.", statut_apres_evaluation: statutApres });
  } catch (err) { console.log(err); return res.status(500).json({ message: "Erreur." }); }
};

module.exports = { getEvaluationDetail, toggleErreur, setResolution, terminerEvaluation, setAvisAgent };
