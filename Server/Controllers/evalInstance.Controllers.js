// =====================================================================
// Module ÉVALUATION QUALITÉ (cahier) — Évaluations : création (Phase 2)
// F.38bis (choix ressource + résolution grille), F.38ter (champs & état
// initial, création en masse), F.37ter (recopie snapshot immuable).
// Schéma b_evaluation + b_evaluation_categorie/erreur. Endpoints /eval/*.
// =====================================================================
const db = require("../config/db");

const num = (v) => (v === null || v === undefined ? 0 : Number(v));
const applied = (mode, row) =>
  mode === "AUTO" ? num(row.poids_calcule) : num(row.poids_saisi);

const rejet = (message) => { const e = new Error(message); e.rejet = true; return e; };

const withTx = async (fn) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const r = await fn(conn);
    await conn.commit();
    return r;
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
};

// --- résolution de la grille rattachée à un agent (F.38bis B) ---------
const resolveGrilleForAgent = async (conn, agentId) => {
  const [[u]] = await conn.query(
    `SELECT id_EvalGrille, id_Site, id_Programme FROM b_utilisateur WHERE id=?`, [agentId]
  );
  if (!u) throw rejet("Agent introuvable.");
  if (!u.id_EvalGrille) throw rejet("L'agent n'est rattaché à aucune grille d'évaluation.");
  const [[g]] = await conn.query(`SELECT * FROM b_eval_grille WHERE id=?`, [u.id_EvalGrille]);
  if (!g) throw rejet("La grille rattachée à l'agent est introuvable.");
  if (g.statut !== "ACTIVE") throw rejet("La grille rattachée à l'agent n'est pas au statut Active.");
  if (g.type_ressource_cible === "AUTOMATISEE") throw rejet("La grille rattachée à l'agent est de type Automatisée.");
  return { grilleId: g.id, siteId: u.id_Site, programmeId: u.id_Programme, grille: g };
};

// --- contrôle de période (F.38quater C) — permissif si non configuré --
const ensurePeriodeOuverte = async (conn, siteId, dateAppel) => {
  if (!siteId) return;
  const d = new Date(dateAppel);
  if (isNaN(d.getTime())) throw rejet("Date d'appel invalide.");
  const mois = d.getMonth() + 1, annee = d.getFullYear();
  const [rows] = await conn.query(
    `SELECT etat FROM b_eval_calendrier_mois WHERE id_site=? AND mois=? AND annee=?`,
    [siteId, mois, annee]
  );
  if (rows.length && rows[0].etat === "FERME") {
    throw rejet(`La période ${mois}/${annee} est fermée pour votre site : création impossible.`);
  }
};

// --- recopie immuable de la grille dans l'évaluation (F.37ter B) ------
const snapshotGrille = async (conn, evaluationId, grilleId) => {
  const [[grille]] = await conn.query(`SELECT mode_ponderation FROM b_eval_grille WHERE id=?`, [grilleId]);
  const mode = grille.mode_ponderation;
  const [cats] = await conn.query(
    `SELECT * FROM b_eval_categorie_erreur WHERE id_grille=? AND etat='ACTIF' ORDER BY ordre, id`, [grilleId]
  );
  for (const cat of cats) {
    const [catRes] = await conn.query(
      `INSERT INTO b_evaluation_categorie
       (id_evaluation, libelle, poids, seuil_reussite, comparateur, critique, score_obtenu, nb_erreurs_decochees, ordre, id_categorie_origine)
       VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, ?)`,
      [evaluationId, cat.libelle, num(cat.poids), num(cat.seuil_reussite), cat.comparateur, cat.critique, num(cat.ordre), cat.id]
    );
    const catSnapId = catRes.insertId;
    let scoreObtenu = 0;
    const [sousCats] = await conn.query(
      `SELECT * FROM b_eval_sous_categorie_erreur WHERE id_categorie_erreur=? AND etat='ACTIF' ORDER BY id`, [cat.id]
    );
    for (const sc of sousCats) {
      const poidsSC = applied(mode, sc);
      const [errs] = await conn.query(
        `SELECT * FROM b_eval_erreur WHERE id_sous_categorie_erreur=? AND etat='ACTIF' ORDER BY id`, [sc.id]
      );
      for (const e of errs) {
        const poidsErr = applied(mode, e);
        const scorePct = (poidsErr * num(cat.poids)) / 100;
        const scoreSur20 = (scorePct / 100) * 20;
        await conn.query(
          `INSERT INTO b_evaluation_erreur
           (id_evaluation, id_evaluation_categorie, item, sous_item, referentiel, poids, score_pct, score_sur20,
            libelle_sous_categorie, poids_sous_categorie, coche, commentaire, id_erreur_origine, id_sous_categorie_origine)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NULL, ?, ?)`,
          [evaluationId, catSnapId, e.item, e.sous_item, e.referentiel, poidsErr,
           Number(scorePct.toFixed(6)), Number(scoreSur20.toFixed(6)), sc.libelle, poidsSC, e.id, sc.id]
        );
        scoreObtenu += poidsErr;
      }
    }
    await conn.query(`UPDATE b_evaluation_categorie SET score_obtenu=? WHERE id=?`, [Number(scoreObtenu.toFixed(6)), catSnapId]);
  }
};

const getTypeEvaluationId = async (conn, code) => {
  const [[r]] = await conn.query(`SELECT id FROM b_eval_ref_type_evaluation WHERE code=?`, [code]);
  return r ? r.id : null;
};

const getEvaluateurSite = async (conn, evaluateurId) => {
  const [[r]] = await conn.query(`SELECT id_Site FROM b_utilisateur WHERE id=?`, [evaluateurId]);
  return r ? r.id_Site : null;
};

// --- cœur de la création (F.38ter D) ---------------------------------
const creerEvaluationInterne = async (conn, p, evaluateurId, evaluateurSiteId) => {
  const type_ressource = p.type_ressource;
  if (type_ressource !== "HUMAINE" && type_ressource !== "AUTOMATISEE") throw rejet("Type de ressource invalide.");
  if (!p.date_appel) throw rejet("La date d'appel est obligatoire.");
  await ensurePeriodeOuverte(conn, evaluateurSiteId, p.date_appel);

  let grilleId, siteId = null, programmeId = null, natureId = null, agentId = null;
  if (type_ressource === "HUMAINE") {
    if (!p.id_agent) throw rejet("L'agent est obligatoire pour une ressource humaine.");
    if (p.id_grille) throw rejet("La grille n'est pas saisissable pour une ressource humaine.");
    const r = await resolveGrilleForAgent(conn, p.id_agent);
    grilleId = r.grilleId; siteId = r.siteId; programmeId = r.programmeId; agentId = p.id_agent;
  } else {
    if (p.id_agent) throw rejet("L'agent est interdit pour une ressource automatisée.");
    if (!p.id_grille) throw rejet("La grille d'évaluation est obligatoire.");
    if (!p.id_nature_ressource) throw rejet("La nature de la ressource est obligatoire.");
    const [[g]] = await conn.query(`SELECT * FROM b_eval_grille WHERE id=?`, [p.id_grille]);
    if (!g) throw rejet("Grille introuvable.");
    if (g.statut !== "ACTIVE") throw rejet("La grille sélectionnée n'est pas active.");
    if (g.type_ressource_cible !== "AUTOMATISEE") throw rejet("La grille sélectionnée n'est pas de type Automatisée.");
    grilleId = g.id; natureId = p.id_nature_ressource;
  }

  const typeId = p.id_type_evaluation || (await getTypeEvaluationId(conn, "EVALUATION"));
  const [ins] = await conn.query(
    `INSERT INTO b_evaluation
     (type_ressource, id_nature_ressource, id_agent, id_evaluateur, id_site, id_programme,
      id_grille_origine, id_contexte, identifiant_appel, numero_case, numero_appel, motif_appel,
      date_appel, dmt, id_type_evaluation, id_evaluation_parente, nb_supplementaires_attendues,
      statut, conclusion, resolution, synthese, avis_agent, date_creation, date_evaluation, actif)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL,
             'NON_TERMINE', NULL, NULL, NULL, NULL, NOW(), NULL, 1)`,
    [type_ressource, natureId, agentId, evaluateurId, siteId, programmeId, grilleId,
     p.id_contexte || null, p.identifiant_appel || null, p.numero_case || null, p.numero_appel || null,
     p.motif_appel || null, p.date_appel, num(p.dmt), typeId, p.id_evaluation_parente || null]
  );
  const evaluationId = ins.insertId;
  await snapshotGrille(conn, evaluationId, grilleId);
  return evaluationId;
};

// =====================================================================
// ROUTES
// =====================================================================
const createEvaluation = async (req, res) => {
  const evaluateurId = req.auth.userId;
  try {
    const id = await withTx(async (conn) => {
      const siteEval = await getEvaluateurSite(conn, evaluateurId);
      return creerEvaluationInterne(conn, req.body, evaluateurId, siteEval);
    });
    return res.status(201).json({ id, message: "Évaluation créée.", afficher_grille: !!req.body.afficher_grille });
  } catch (e) {
    if (e.rejet) return res.status(400).json({ message: e.message });
    console.log(e); return res.status(500).json({ message: "Erreur lors de la création." });
  }
};

const createEvaluationMasse = async (req, res) => {
  const evaluateurId = req.auth.userId;
  const lignes = Array.isArray(req.body.lignes) ? req.body.lignes : [];
  const commun = req.body.commun || {};
  if (lignes.length === 0) return res.status(400).json({ message: "Aucune ligne fournie." });
  try {
    const conn = await db.getConnection();
    const siteEval = await getEvaluateurSite(conn, evaluateurId).catch(() => null);
    const crees = [], rejetes = [];
    for (let i = 0; i < lignes.length; i++) {
      const payload = { ...commun, ...lignes[i] };
      try {
        await conn.beginTransaction();
        const id = await creerEvaluationInterne(conn, payload, evaluateurId, siteEval);
        await conn.commit();
        crees.push({ index: i, id });
      } catch (e) {
        await conn.rollback();
        rejetes.push({ index: i, motif: e.rejet ? e.message : "Erreur technique." });
        if (!e.rejet) console.log(e);
      }
    }
    conn.release();
    return res.status(201).json({ total: lignes.length, crees, rejetes, message: `${crees.length} créée(s), ${rejetes.length} rejetée(s).` });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors de la création en masse." }); }
};

const getAgentsEvaluables = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT u.id, u.nom, u.prenom, u.nom_utilisateur AS login,
              s.nom AS site, p.nom AS programme,
              g.id AS id_grille, g.nom AS grille, g.statut AS grille_statut, g.type_ressource_cible AS grille_type
       FROM b_utilisateur u
       LEFT JOIN b_site s ON u.id_Site=s.id
       LEFT JOIN b_programme p ON u.id_Programme=p.id
       LEFT JOIN b_eval_grille g ON u.id_EvalGrille=g.id
       WHERE u.status='ACTIF'
       ORDER BY u.nom, u.prenom`
    );
    return res.status(200).json(rows);
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors du chargement." }); }
};

const getGrilleForAgent = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const r = await resolveGrilleForAgent(conn, req.params.id);
    return res.status(200).json({
      ok: true,
      grille: { id: r.grille.id, nom: r.grille.nom, statut: r.grille.statut, type_ressource_cible: r.grille.type_ressource_cible },
      id_site: r.siteId, id_programme: r.programmeId,
    });
  } catch (e) {
    if (e.rejet) return res.status(200).json({ ok: false, message: e.message });
    console.log(e); return res.status(500).json({ message: "Erreur lors de la résolution." });
  } finally { conn.release(); }
};

// --- liste des évaluations (F.39septies) : vues par rôle + filtres ------
const getUserRole = async (userId) => {
  const [[r]] = await db.query(
    `SELECT f.Role_Associe AS role FROM b_utilisateur u JOIN b_fonction f ON u.id_Fonction=f.id WHERE u.id=?`, [userId]
  );
  return r ? r.role : null;
};

const getAllEvaluations = async (req, res) => {
  const userId = req.auth.userId;
  const q = req.query;
  try {
    const role = await getUserRole(userId);
    const where = [];
    const params = [];

    // Portée par rôle (matrice des droits)
    if (["R_ADMI", "R_AQ", "R_RO"].includes(role)) {
      // accès à toutes les évaluations
    } else if (role === "R_SUP") {
      where.push(`(e.id_evaluateur=? OR e.id_agent=? OR e.id_agent IN (SELECT id_AGENT FROM b_r_superviseur_agent WHERE id_SUPERVISEUR=?))`);
      params.push(userId, userId, userId);
    } else if (role === "R_TC") {
      where.push(`e.id_agent=?`);
      params.push(userId);
    } else {
      where.push(`e.id_evaluateur=?`);
      params.push(userId);
    }

    // actif / inactif
    if (q.inactifs === "true") where.push(`e.actif=0`);
    else where.push(`e.actif=1`);

    // filtres
    if (q.statut) { where.push(`e.statut=?`); params.push(q.statut); }
    if (q.conclusion) { where.push(`e.conclusion=?`); params.push(q.conclusion); }
    if (q.type_ressource) { where.push(`e.type_ressource=?`); params.push(q.type_ressource); }
    if (q.id_site) { where.push(`e.id_site=?`); params.push(q.id_site); }
    if (q.id_contexte) { where.push(`e.id_contexte=?`); params.push(q.id_contexte); }
    if (q.type_evaluation) { where.push(`t.code=?`); params.push(q.type_evaluation); }
    if (q.date_debut) { where.push(`e.date_appel >= ?`); params.push(q.date_debut); }
    if (q.date_fin) { where.push(`e.date_appel <= ?`); params.push(q.date_fin + " 23:59:59"); }
    if (q.q) {
      where.push(`(e.identifiant_appel LIKE ? OR e.numero_case LIKE ? OR e.numero_appel LIKE ? OR ag.nom LIKE ? OR ag.nom_utilisateur LIKE ?)`);
      const like = `%${q.q}%`;
      params.push(like, like, like, like, like);
    }

    const [rows] = await db.query(
      `SELECT e.id, e.type_ressource, e.statut, e.conclusion, e.date_appel, e.date_creation,
              e.identifiant_appel, e.numero_case, e.numero_appel, e.actif, e.id_evaluation_parente,
              ag.nom AS agent_nom, ag.prenom AS agent_prenom,
              ev.nom AS evaluateur_nom, ev.prenom AS evaluateur_prenom,
              t.libelle AS type_evaluation, t.code AS type_code, ctx.libelle AS contexte, gr.nom AS grille, s.nom AS site
       FROM b_evaluation e
       LEFT JOIN b_utilisateur ag ON e.id_agent = ag.id
       LEFT JOIN b_utilisateur ev ON e.id_evaluateur = ev.id
       LEFT JOIN b_eval_ref_type_evaluation t ON e.id_type_evaluation = t.id
       LEFT JOIN b_eval_ref_contexte ctx ON e.id_contexte = ctx.id
       LEFT JOIN b_eval_grille gr ON e.id_grille_origine = gr.id
       LEFT JOIN b_site s ON e.id_site = s.id
       ${where.length ? "WHERE " + where.join(" AND ") : ""}
       ORDER BY e.date_creation DESC`,
      params
    );
    return res.status(200).json(rows);
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors du chargement." }); }
};

// --- cycle de vie (F.39septies D) --------------------------------------
const setActifEvaluation = async (req, res) => {
  const id = req.params.id;
  const actif = req.body.actif ? 1 : 0;
  try {
    await withTx(async (conn) => {
      await conn.query(`UPDATE b_evaluation SET actif=? WHERE id=?`, [actif, id]);
      // les évaluations supplémentaires suivent le sort de leur parente
      await conn.query(`UPDATE b_evaluation SET actif=? WHERE id_evaluation_parente=?`, [actif, id]);
    });
    return res.status(200).json({ message: actif ? "Évaluation réactivée." : "Évaluation désactivée." });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur." }); }
};

const desactiverMasse = async (req, res) => {
  const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
  if (ids.length === 0) return res.status(400).json({ message: "Aucune évaluation sélectionnée." });
  try {
    await withTx(async (conn) => {
      for (const id of ids) {
        await conn.query(`UPDATE b_evaluation SET actif=0 WHERE id=?`, [id]);
        await conn.query(`UPDATE b_evaluation SET actif=0 WHERE id_evaluation_parente=?`, [id]);
      }
    });
    return res.status(200).json({ message: `${ids.length} évaluation(s) désactivée(s).` });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur." }); }
};

// Suppression définitive (admin) — uniquement sur une évaluation non terminée
const deleteEvaluation = async (req, res) => {
  const id = req.params.id;
  try {
    const role = await getUserRole(req.auth.userId);
    if (role !== "R_ADMI") return res.status(403).json({ message: "Réservé aux administrateurs." });
    const out = await withTx(async (conn) => {
      const [[e]] = await conn.query(`SELECT statut FROM b_evaluation WHERE id=?`, [id]);
      if (!e) return { notFound: true };
      if (e.statut === "TERMINE") return { terminee: true };
      // supprime l'évaluation, ses résultats, et ses supplémentaires (atomique)
      const [sups] = await conn.query(`SELECT id FROM b_evaluation WHERE id_evaluation_parente=?`, [id]);
      const tous = [id, ...sups.map((s) => s.id)];
      for (const eid of tous) {
        await conn.query(`DELETE FROM b_evaluation_bi WHERE id_evaluation=?`, [eid]);
        // S6 : on ne supprime PAS les notifications liées ; le lien devient simplement inopérant.
        await conn.query(`DELETE FROM b_evaluation_erreur WHERE id_evaluation=?`, [eid]);
        await conn.query(`DELETE FROM b_evaluation_categorie WHERE id_evaluation=?`, [eid]);
      }
      await conn.query(`DELETE FROM b_evaluation WHERE id_evaluation_parente=?`, [id]);
      await conn.query(`DELETE FROM b_evaluation WHERE id=?`, [id]);
      return { ok: true };
    });
    if (out.notFound) return res.status(404).json({ message: "Évaluation introuvable." });
    if (out.terminee) return res.status(409).json({ message: "Une évaluation terminée ne peut pas être supprimée (désactivez-la)." });
    return res.status(200).json({ message: "Évaluation supprimée." });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors de la suppression." }); }
};

// --- référentiels pour le formulaire (lecture) -----------------------
const getContextes = async (req, res) => {
  try {
    const [rows] = await db.query(`SELECT id, libelle FROM b_eval_ref_contexte WHERE etat='ACTIF' ORDER BY libelle`);
    return res.status(200).json(rows);
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors du chargement." }); }
};
const getNatures = async (req, res) => {
  try {
    const [rows] = await db.query(`SELECT id, libelle FROM b_eval_ref_nature_ressource WHERE etat='ACTIF' ORDER BY libelle`);
    return res.status(200).json(rows);
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors du chargement." }); }
};

module.exports = {
  createEvaluation, createEvaluationMasse, getAgentsEvaluables, getGrilleForAgent,
  getContextes, getNatures, getAllEvaluations,
  setActifEvaluation, desactiverMasse, deleteEvaluation,
  _internals: { snapshotGrille, resolveGrilleForAgent, creerEvaluationInterne },
};
