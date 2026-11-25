// =====================================================================
// Module ÉVALUATION QUALITÉ (cahier) — Suites d'échec (Phase 4a)
// F.39quater (évaluations supplémentaires), F.39quinquies B (plan d'action),
// F.39sexies (lettres félicitation/débriefing + rendu).
// =====================================================================
const db = require("../config/db");
const { emit, destinatairesEvaluation } = require("../utils/notify");
const { nettoyerTexte, cleTexte, sqlRealisee, estStatutRealise, estStatutClos, sqlClose, filtreAssignables, horsPerimetre } = require("../utils/planAction");

// Personnes concernées par une action : porteur et contributeurs (à lire AVANT une suppression).
const concernesLigne = async (idLigne) => {
  if (!idLigne) return [];
  const [r] = await db.query(
    `SELECT id_porteur AS id FROM b_eval_plan_action_ligne WHERE id = ? AND id_porteur IS NOT NULL
     UNION SELECT id_utilisateur FROM b_eval_plan_action_contributeur WHERE id_ligne = ?`, [idLigne, idLigne]);
  return r.map((x) => Number(x.id));
};

// Notifie une modification du plan d'action si l'évaluation est TERMINÉE (out114) :
// évaluateur, agent évalué, superviseur(s) de l'agent, porteur et contributeurs de
// l'action — et personne d'autre, quelle que soit sa visibilité. Une seule notification
// par personne (une personne peut cumuler plusieurs rôles) ; jamais l'auteur.
const notifierPlanSiTerminee = async (idEval, message, exclure, concernes = []) => {
  const [[e]] = await db.query(
    `SELECT id, id_evaluateur, id_agent, statut FROM b_evaluation WHERE id=?`, [idEval]
  );
  if (!e || e.statut !== "TERMINE") return;
  const dest = new Set([...(await destinatairesEvaluation(db, e)), ...concernes].map(Number).filter(Boolean));
  if (exclure) dest.delete(Number(exclure));
  for (const uid of dest) {
    await emit(db, {
      id_utilisateur: uid, titre: "Plan d'action mis à jour", message, type: "EVALUATION",
      nature_objet: "EVALUATION", id_objet: e.id, url: `/mon-espace/evaluation/executer/${e.id}`,
    });
  }
};

const num = (v) => (v === null || v === undefined ? 0 : Number(v));
// Normalise une date entrante (ISO, Date, 'YYYY-MM-DD…') en 'YYYY-MM-DD' pour MySQL
// (évite les 500 sur des chaînes ISO 'YYYY-MM-DDTHH:mm:ss.sssZ' renvoyées au serveur).
const toDateSql = (v) => {
  if (v === null || v === undefined || v === "") return null;
  if (v instanceof Date && !isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  const m = String(v).match(/^\d{4}-\d{2}-\d{2}/);
  return m ? m[0] : null;
};

const withTx = async (fn) => {
  const conn = await db.getConnection();
  try { await conn.beginTransaction(); const r = await fn(conn); await conn.commit(); return r; }
  catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
};

// =====================================================================
// ÉVALUATIONS SUPPLÉMENTAIRES (F.39quater)
// =====================================================================
// Nombre de supplémentaires attendues par défaut (paramètre système).
const nbSupplementairesParam = async (conn) => {
  const [[p]] = await conn.query(
    `SELECT valeur FROM b_eval_param_systeme WHERE cle='nb_supplementaires_attendues'`
  );
  const n = p ? parseInt(p.valeur, 10) : 0;
  return Number.isInteger(n) && n > 0 ? n : 0;
};

// Crée UNE évaluation supplémentaire (recopie du snapshot du parent). Le nouvel
// enfant hérite du même nb_supplementaires_attendues pour permettre la cascade.
const copierUneSupplementaire = async (conn, parent, evaluateurId, nbAttenduesEnfant) => {
  const [[type]] = await conn.query(
    `SELECT id FROM b_eval_ref_type_evaluation WHERE code='EVALUATION_SUPPLEMENTAIRE'`
  );
  const [ins] = await conn.query(
    `INSERT INTO b_evaluation
     (type_ressource, id_nature_ressource, id_agent, id_evaluateur, id_site, id_programme,
      id_grille_origine, id_contexte, identifiant_appel, numero_case, numero_appel, motif_appel,
      date_appel, dmt, id_type_evaluation, id_evaluation_parente, nb_supplementaires_attendues,
      statut, conclusion, resolution, date_creation, actif)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
             'NON_TERMINE', NULL, NULL, NOW(), 1)`,
    [parent.type_ressource, parent.id_nature_ressource, parent.id_agent, evaluateurId, parent.id_site, parent.id_programme,
     parent.id_grille_origine, parent.id_contexte, parent.identifiant_appel, parent.numero_case, parent.numero_appel, parent.motif_appel,
     parent.date_appel, parent.dmt, type ? type.id : null, parent.id, nbAttenduesEnfant || null]
  );
  const newId = ins.insertId;
  const [cats] = await conn.query(`SELECT * FROM b_evaluation_categorie WHERE id_evaluation=? ORDER BY ordre, id`, [parent.id]);
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
  return newId;
};

// Auto-création des N supplémentaires manquantes après une clôture en échec
// (utilisé par la clôture d'évaluation — cascade sur tous les niveaux).
const genererSupplementairesAuto = async (conn, parent, evaluateurId) => {
  if (parent.type_ressource !== "HUMAINE") return 0;
  const n = parent.nb_supplementaires_attendues && parent.nb_supplementaires_attendues > 0
    ? parent.nb_supplementaires_attendues
    : await nbSupplementairesParam(conn);
  if (!n) return 0;
  const [[{ nb }]] = await conn.query(
    `SELECT COUNT(*) AS nb FROM b_evaluation WHERE id_evaluation_parente=?`, [parent.id]
  );
  let cree = 0;
  for (let i = nb; i < n; i++) { await copierUneSupplementaire(conn, parent, evaluateurId, n); cree++; }
  return cree;
};

const creerSupplementaire = async (req, res) => {
  const idParent = req.params.id;
  const evaluateurId = req.auth.userId;
  try {
    const out = await withTx(async (conn) => {
      const [[p]] = await conn.query(`SELECT * FROM b_evaluation WHERE id=?`, [idParent]);
      if (!p) return { notFound: true };
      if (p.statut !== "TERMINE" || p.conclusion !== "ECHEC") return { pasEchec: true };
      if (p.type_ressource !== "HUMAINE") return { auto: true };
      // Cascade autorisée : une supplémentaire peut elle-même en avoir.
      const n = p.nb_supplementaires_attendues && p.nb_supplementaires_attendues > 0
        ? p.nb_supplementaires_attendues : await nbSupplementairesParam(conn);
      const newId = await copierUneSupplementaire(conn, p, evaluateurId, n);
      return { id: newId };
    });
    if (out.notFound) return res.status(404).json({ message: "Évaluation parente introuvable." });
    if (out.pasEchec) return res.status(409).json({ message: "Seule une évaluation terminée en échec peut avoir des supplémentaires." });
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
      `SELECT l.*, l.action AS action_libelle, s.libelle AS statut_libelle, l.kpi AS kpi_libelle,
              po.nom AS porteur_nom, po.prenom AS porteur_prenom
       FROM b_eval_plan_action_ligne l
       LEFT JOIN b_eval_ref_statut_pa s ON l.id_statut=s.id
       LEFT JOIN b_utilisateur po ON l.id_porteur=po.id
       WHERE l.id_evaluation=? ORDER BY l.id`, [idEval]
    );
    for (const l of lignes) {
      const [c] = await db.query(
        `SELECT c.id_utilisateur, u.nom, u.prenom FROM b_eval_plan_action_contributeur c
         LEFT JOIN b_utilisateur u ON c.id_utilisateur=u.id WHERE c.id_ligne=?`, [l.id]
      );
      l.contributeurs = c;
      l.close = estStatutClos(l.statut_libelle); // out107 : action close = figée
    }
    return res.status(200).json(lignes);
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors du chargement." }); }
};

// Action et KPI : saisie libre (au cas par cas), plus de référentiel.
const texteLibre = (v, max) => {
  const t = String(v ?? "").trim();
  return t ? t.slice(0, max) : null;
};

const addLignePlanAction = async (req, res) => {
  const b = req.body;
  if (!b.id_evaluation) return res.status(400).json({ message: "Évaluation obligatoire." });
  const action = nettoyerTexte(b.action, 2000);
  if (!action) return res.status(400).json({ message: "L'action est obligatoire." });
  if (!(Number(b.id_porteur) > 0)) return res.status(400).json({ message: "Le porteur est obligatoire." });
  const contributeurs = [...new Set((Array.isArray(b.contributeurs) ? b.contributeurs : []).map(Number).filter((n) => n > 0))];
  try {
    // Porteur et contributeurs : utilisateurs actifs du périmètre autorisé.
    const refus = await horsPerimetre(req.auth.userId, [b.id_porteur, ...contributeurs].filter(Boolean));
    if (refus.length) return res.status(400).json({ message: "Porteur ou contributeur hors de votre périmètre (ou inactif)." });
    let dateRealisation = toDateSql(b.date_realisation);
    if (b.id_statut) {
      const [[st0]] = await db.query(`SELECT libelle FROM b_eval_ref_statut_pa WHERE id=?`, [b.id_statut]);
      if (st0 && estStatutClos(st0.libelle) && !nettoyerTexte(b.synthese)) {
        return res.status(400).json({ message: "Renseignez la synthèse pour clore l'action." });
      }
    }
    if (b.id_statut && !dateRealisation) {
      const [[st]] = await db.query(`SELECT libelle FROM b_eval_ref_statut_pa WHERE id=?`, [b.id_statut]);
      if (st && estStatutRealise(st.libelle)) dateRealisation = new Date().toISOString().slice(0, 10);
    }
    const out = await withTx(async (conn) => {
      const [r] = await conn.query(
        `INSERT INTO b_eval_plan_action_ligne
         (id_evaluation, action, id_porteur, date_debut, date_attendue, date_realisation, id_statut, kpi, commentaire, synthese, dateCreation)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [b.id_evaluation, action, b.id_porteur || null, toDateSql(b.date_debut), toDateSql(b.date_attendue),
         dateRealisation, b.id_statut || null, nettoyerTexte(b.kpi, 255), nettoyerTexte(b.commentaire), nettoyerTexte(b.synthese)]
      );
      const ligneId = r.insertId;
      for (const idu of contributeurs) {
        await conn.query(`INSERT INTO b_eval_plan_action_contributeur (id_ligne, id_utilisateur) VALUES (?, ?)`, [ligneId, idu]);
      }
      return ligneId;
    });
    await notifierPlanSiTerminee(b.id_evaluation, "Une action a été ajoutée au plan d'action.", req.auth.userId, await concernesLigne(out));
    return res.status(201).json({ id: out, message: "Ligne ajoutée." });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors de l'ajout." }); }
};

/**
 * Mise à jour d'une action : seuls les champs envoyés sont pris en compte.
 * Rien n'est enregistré ni notifié si rien ne change réellement (textes
 * comparés sans tenir compte des espaces en trop). Une synthèse déjà saisie
 * ne peut pas être vidée. Le statut « Réalisé » date la réalisation.
 */
const updateLignePlanAction = async (req, res) => {
  const id = req.params.id;
  const b = req.body || {};
  const a = (k) => Object.prototype.hasOwnProperty.call(b, k);
  try {
    const [[l]] = await db.query(
      `SELECT l.*, DATE_FORMAT(l.date_debut,'%Y-%m-%d') AS dd, DATE_FORMAT(l.date_attendue,'%Y-%m-%d') AS da,
              DATE_FORMAT(l.date_realisation,'%Y-%m-%d') AS dr
         FROM b_eval_plan_action_ligne l WHERE l.id=?`, [id]
    );
    if (!l) return res.status(404).json({ message: "Action introuvable." });
    const [cs] = await db.query(`SELECT id_utilisateur FROM b_eval_plan_action_contributeur WHERE id_ligne=?`, [id]);
    const contribAvant = cs.map((c) => Number(c.id_utilisateur));

    const n = {
      action: a("action") ? nettoyerTexte(b.action, 2000) : l.action,
      id_porteur: a("id_porteur") ? (Number(b.id_porteur) || null) : l.id_porteur,
      date_debut: a("date_debut") ? toDateSql(b.date_debut) : l.dd,
      date_attendue: a("date_attendue") ? toDateSql(b.date_attendue) : l.da,
      date_realisation: a("date_realisation") ? toDateSql(b.date_realisation) : l.dr,
      id_statut: a("id_statut") ? (Number(b.id_statut) || null) : l.id_statut,
      kpi: a("kpi") ? nettoyerTexte(b.kpi, 255) : l.kpi,
      commentaire: a("commentaire") ? nettoyerTexte(b.commentaire) : l.commentaire,
      synthese: a("synthese") ? nettoyerTexte(b.synthese) : l.synthese,
    };
    if (!n.action) return res.status(400).json({ message: "L'action est obligatoire." });
    // Porteur obligatoire (out106) : on ne peut pas retirer le porteur d'une action.
    if (a("id_porteur") && !n.id_porteur) return res.status(400).json({ message: "Le porteur est obligatoire." });
    if (a("synthese") && !n.synthese && cleTexte(l.synthese)) {
      return res.status(400).json({ message: "La synthèse ne peut pas être vide." });
    }
    const contribApres = Array.isArray(b.contributeurs)
      ? [...new Set(b.contributeurs.map(Number).filter((x) => x > 0))]
      : contribAvant;

    // Statut « Réalisé » : date de réalisation posée si absente ; retirée si on en sort.
    // Clore l'action (Réalisé, Abandonné…) demande une synthèse (out107).
    if (n.id_statut !== l.id_statut) {
      const [[st]] = n.id_statut ? await db.query(`SELECT libelle FROM b_eval_ref_statut_pa WHERE id=?`, [n.id_statut]) : [[null]];
      if (st && estStatutClos(st.libelle) && !cleTexte(n.synthese)) {
        return res.status(400).json({ message: "Renseignez la synthèse pour clore l'action." });
      }
      const realise = !!st && estStatutRealise(st.libelle);
      if (realise && !n.date_realisation) n.date_realisation = new Date().toISOString().slice(0, 10);
      if (!realise && !a("date_realisation")) n.date_realisation = null;
    }

    const memeId = (x, y) => (x == null ? null : Number(x)) === (y == null ? null : Number(y));
    const memeEnsemble = (x, y) => x.length === y.length && x.every((v) => y.includes(v));
    const change =
      cleTexte(n.action) !== cleTexte(l.action) ||
      !memeId(n.id_porteur, l.id_porteur) ||
      (n.date_debut || null) !== (l.dd || null) ||
      (n.date_attendue || null) !== (l.da || null) ||
      (n.date_realisation || null) !== (l.dr || null) ||
      !memeId(n.id_statut, l.id_statut) ||
      cleTexte(n.kpi) !== cleTexte(l.kpi) ||
      cleTexte(n.commentaire) !== cleTexte(l.commentaire) ||
      cleTexte(n.synthese) !== cleTexte(l.synthese) ||
      !memeEnsemble(contribApres, contribAvant);
    if (!change) return res.status(200).json({ message: "Aucune modification.", inchange: true });

    // Nouveaux porteur / contributeurs : périmètre autorisé ; ceux déjà en place sont conservés.
    const nouveaux = [];
    if (n.id_porteur && !memeId(n.id_porteur, l.id_porteur)) nouveaux.push(n.id_porteur);
    for (const c of contribApres) if (!contribAvant.includes(c)) nouveaux.push(c);
    if (nouveaux.length && (await horsPerimetre(req.auth.userId, nouveaux)).length) {
      return res.status(400).json({ message: "Porteur ou contributeur hors de votre périmètre (ou inactif)." });
    }

    await withTx(async (conn) => {
      await conn.query(
        `UPDATE b_eval_plan_action_ligne
         SET action=?, id_porteur=?, date_debut=?, date_attendue=?, date_realisation=?, id_statut=?, kpi=?, commentaire=?, synthese=?, dateModification=NOW()
         WHERE id=?`,
        [n.action, n.id_porteur, n.date_debut, n.date_attendue, n.date_realisation, n.id_statut, n.kpi, n.commentaire, n.synthese, id]
      );
      if (!memeEnsemble(contribApres, contribAvant)) {
        await conn.query(`DELETE FROM b_eval_plan_action_contributeur WHERE id_ligne=?`, [id]);
        for (const idu of contribApres) {
          await conn.query(`INSERT INTO b_eval_plan_action_contributeur (id_ligne, id_utilisateur) VALUES (?, ?)`, [id, idu]);
        }
      }
    });
    await notifierPlanSiTerminee(l.id_evaluation, "Une action du plan d'action a été modifiée.", req.auth.userId, await concernesLigne(req.params.id));
    return res.status(200).json({
      message: "Ligne mise à jour.",
      ligne: { action: n.action, synthese: n.synthese, kpi: n.kpi, commentaire: n.commentaire, date_realisation: n.date_realisation },
    });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors de la mise à jour." }); }
};

const deleteLignePlanAction = async (req, res) => {
  try {
    const [[l]] = await db.query(
      `SELECT l.id_evaluation, st.libelle AS statut FROM b_eval_plan_action_ligne l
         LEFT JOIN b_eval_ref_statut_pa st ON st.id = l.id_statut WHERE l.id=?`, [req.params.id]);
    // Suppression possible jusqu'à la clôture (out107).
    if (l && estStatutClos(l.statut)) return res.status(409).json({ message: "Cette action est close : elle ne peut plus être supprimée." });
    const concernes = await concernesLigne(req.params.id); // lus avant la suppression
    await withTx(async (conn) => {
      await conn.query(`DELETE FROM b_eval_plan_action_contributeur WHERE id_ligne=?`, [req.params.id]);
      await conn.query(`DELETE FROM b_eval_plan_action_ligne WHERE id=?`, [req.params.id]);
    });
    if (l) await notifierPlanSiTerminee(l.id_evaluation, "Une action du plan d'action a été supprimée.", req.auth.userId, concernes);
    return res.status(200).json({ message: "Ligne supprimée." });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors de la suppression." }); }
};

// =====================================================================
// SUIVI DES PLANS D'ACTIONS (out102) — toutes les actions visibles, sans
// passer par chaque évaluation. Visibilité : règles « voir » de l'évaluation
// (administrateur, evaluation.voir_tous / agent_pole.voir_tous sur sa portée,
// évaluateur, superviseur de l'agent, agent évalué une fois terminée), plus le
// porteur et les contributeurs de l'action. Lecture seule ici : la saisie se
// fait dans l'évaluation.
// =====================================================================
const JOURS_ECHEANCE_PROCHE = 7;
const DATE_RE_SUIVI = /^\d{4}-\d{2}-\d{2}$/;
const entier = (v) => (/^\d+$/.test(String(v ?? "")) ? Number(v) : null);

/** Clause de visibilité (alias e = évaluation, l = ligne) pour userId. */
const visibiliteActions = async (userId) => {
  const { permissionsEffectives } = require("../middlewares/permission");
  const { porteeSite } = require("../utils/siteVisionGlobale");
  const { role, set } = await permissionsEffectives(userId);
  if (role === "R_ADMI") return { sql: "1=1", params: [] };
  const ou = [
    `e.id_evaluateur = ?`,
    `e.id_agent IN (SELECT id_AGENT FROM b_r_superviseur_agent WHERE id_SUPERVISEUR = ?)`,
    `(e.id_agent = ? AND e.statut = 'TERMINE')`,
    `l.id_porteur = ?`,
    `EXISTS (SELECT 1 FROM b_eval_plan_action_contributeur c WHERE c.id_ligne = l.id AND c.id_utilisateur = ?)`,
  ];
  const params = [userId, userId, userId, userId, userId];
  const voirTous = set.has("evaluation.voir_tous");
  const pole = set.has("agent_pole.voir_tous");
  if (voirTous || pole) {
    const p = await porteeSite(userId);
    const cond = voirTous ? "1=1" : "e.statut = 'TERMINE'";
    if (p.visionGlobale) ou.push(`(${cond})`);
    else if (p.idSite !== null) { ou.push(`(${cond} AND e.id_site = ?)`); params.push(p.idSite); }
  }
  return { sql: `(${ou.join(" OR ")})`, params };
};

/** Expressions d'état d'une action (alias l / st). */
const SQL_EN_RETARD = `(NOT ${sqlClose()} AND l.date_attendue IS NOT NULL AND DATE(l.date_attendue) < CURDATE())`;
const SQL_ECHEANCE_PROCHE = `(NOT ${sqlClose()} AND l.date_attendue IS NOT NULL
  AND DATE(l.date_attendue) BETWEEN CURDATE() AND CURDATE() + INTERVAL ${JOURS_ECHEANCE_PROCHE} DAY)`;

/**
 * GET /eval/plan-action/suivi
 *   ?etat=en_cours|en_retard|proche|realisee|sans_porteur  &id_statut  &id_porteur  &id_agent
 *   &du&au (sur l'échéance ; sur la réalisation si periode=realisation)  &mes_actions=1  &id_site  &q
 *   &site=<id>|-1 (filtre d'écran « Site », -1 = sans site)  &id_programme (contexte : tableau de bord)
 */
const getSuiviPlansActions = async (req, res) => {
  const userId = Number(req.auth.userId);
  const q = req.query || {};
  try {
    const vis = await visibiliteActions(userId);
    // Périmètre (P) : visibilité + filtres de contexte (tableau de bord, « celles que je porte »,
    // période). Les listes des filtres Porteur / Contributeur portent sur ce périmètre.
    const w = [vis.sql, `COALESCE(e.actif, 1) = 1`];
    const params = [...vis.params];
    if (entier(q.id_agent)) { w.push(`e.id_agent = ?`); params.push(entier(q.id_agent)); }
    if (entier(q.id_site)) { w.push(`e.id_site = ?`); params.push(entier(q.id_site)); }
    // Programme de l'évaluation (filtre Programme du tableau de bord, out124).
    if (entier(q.id_programme)) { w.push(`e.id_programme = ?`); params.push(entier(q.id_programme)); }
    if (String(q.equipe || "") === "1") {
      w.push(`e.id_agent IN (SELECT id_AGENT FROM b_r_superviseur_agent WHERE id_SUPERVISEUR = ?)`); params.push(userId);
    }
    if (String(q.mes_actions || "") === "1") {
      w.push(`(l.id_porteur = ? OR EXISTS (SELECT 1 FROM b_eval_plan_action_contributeur c2 WHERE c2.id_ligne = l.id AND c2.id_utilisateur = ?))`);
      params.push(userId, userId);
    }
    const col = String(q.periode || "") === "realisation" ? "l.date_realisation" : "l.date_attendue";
    if (DATE_RE_SUIVI.test(String(q.du || ""))) { w.push(`DATE(${col}) >= ?`); params.push(String(q.du)); }
    if (DATE_RE_SUIVI.test(String(q.au || ""))) { w.push(`DATE(${col}) <= ?`); params.push(String(q.au)); }
    // Filtres d'écran (F) : statut, porteur (-1 = non attribué), contributeur, recherche.
    // Les compteurs des cartes portent sur P + F.
    const wf = [];
    const pf = [];
    if (entier(q.id_statut)) { wf.push(`l.id_statut = ?`); pf.push(entier(q.id_statut)); }
    // Filtre d'écran « Site » (site de l'évaluation) ; -1 = évaluations sans site (out124).
    if (String(q.site || "") === "-1") wf.push(`e.id_site IS NULL`);
    else if (entier(q.site)) { wf.push(`e.id_site = ?`); pf.push(entier(q.site)); }
    if (String(q.id_porteur || "") === "-1") wf.push(`l.id_porteur IS NULL`);
    else if (entier(q.id_porteur)) { wf.push(`l.id_porteur = ?`); pf.push(entier(q.id_porteur)); }
    if (entier(q.id_contributeur)) {
      wf.push(`EXISTS (SELECT 1 FROM b_eval_plan_action_contributeur c6 WHERE c6.id_ligne = l.id AND c6.id_utilisateur = ?)`);
      pf.push(entier(q.id_contributeur));
    }
    const pagine = q.page !== undefined;
    const txt = String(q.q || "").trim().slice(0, 100);
    if (pagine && txt) {
      // chaque mot dans au moins un champ (casse et accents ignorés par la collation)
      for (const mot of txt.split(/\s+/).filter(Boolean).slice(0, 5)) {
        const like = `%${mot.replace(/[\\%_]/g, (c) => "\\" + c)}%`;
        wf.push(`(l.action LIKE ? OR l.synthese LIKE ? OR ag.nom LIKE ? OR ag.prenom LIKE ? OR ag.nom_utilisateur LIKE ?
                  OR po.nom LIKE ? OR po.prenom LIKE ?
                  OR EXISTS (SELECT 1 FROM b_eval_plan_action_contributeur c7 JOIN b_utilisateur u7 ON u7.id = c7.id_utilisateur
                              WHERE c7.id_ligne = l.id AND (u7.nom LIKE ? OR u7.prenom LIKE ?)))`);
        pf.push(like, like, like, like, like, like, like, like, like);
      }
    }
    // État (E) : une carte.
    const etat = String(q.etat || "");
    const SQL_ETAT = {
      en_cours: `NOT ${sqlClose()}`, en_retard: SQL_EN_RETARD, proche: SQL_ECHEANCE_PROCHE,
      realisee: sqlRealisee(), sans_porteur: `l.id_porteur IS NULL AND NOT ${sqlClose()}`,
    };
    const we = SQL_ETAT[etat] ? [SQL_ETAT[etat]] : [];
    const FROM = `FROM b_eval_plan_action_ligne l
         JOIN b_evaluation e ON e.id = l.id_evaluation
         LEFT JOIN b_eval_ref_statut_pa st ON st.id = l.id_statut
         LEFT JOIN b_utilisateur po ON po.id = l.id_porteur
         LEFT JOIN b_utilisateur ag ON ag.id = e.id_agent
         LEFT JOIN b_site s ON s.id = e.id_site`;
    const ORDRE = `ORDER BY ${sqlClose()} ASC, l.date_attendue IS NULL, l.date_attendue ASC, l.id DESC`;
    const SELECT = `SELECT l.id, l.id_evaluation, l.action, l.synthese, l.kpi, l.commentaire, l.id_statut, l.id_porteur,
              DATE_FORMAT(l.date_debut, '%Y-%m-%d') AS date_debut,
              e.id_evaluateur, e.id_site, e.statut AS statut_evaluation, e.conclusion,
              (SELECT GROUP_CONCAT(c5.id_utilisateur ORDER BY u5.nom, u5.id SEPARATOR ',') FROM b_eval_plan_action_contributeur c5
                 JOIN b_utilisateur u5 ON u5.id = c5.id_utilisateur WHERE c5.id_ligne = l.id) AS contributeurs_ids,
              DATE_FORMAT(l.date_attendue, '%Y-%m-%d') AS date_attendue,
              DATE_FORMAT(l.date_realisation, '%Y-%m-%d') AS date_realisation,
              st.libelle AS statut,
              po.nom AS porteur_nom, po.prenom AS porteur_prenom,
              e.id_agent, ag.nom AS agent_nom, ag.prenom AS agent_prenom, ag.nom_utilisateur AS agent_login,
              DATE_FORMAT(e.date_appel, '%Y-%m-%d') AS date_appel, s.nom AS site,
              ${sqlRealisee()} AS realisee, ${sqlClose()} AS close, ${SQL_EN_RETARD} AS en_retard, ${SQL_ECHEANCE_PROCHE} AS echeance_proche,
              (l.id_porteur = ? OR EXISTS (SELECT 1 FROM b_eval_plan_action_contributeur c3 WHERE c3.id_ligne = l.id AND c3.id_utilisateur = ?)) AS mienne,
              (SELECT GROUP_CONCAT(CONCAT(u.nom, ' ', u.prenom) ORDER BY u.nom, u.id SEPARATOR ', ')
                 FROM b_eval_plan_action_contributeur c4 JOIN b_utilisateur u ON u.id = c4.id_utilisateur
                WHERE c4.id_ligne = l.id) AS contributeurs
         ${FROM}`;

    let rows;
    let extra = null;
    if (pagine) {
      const page = Math.max(1, parseInt(q.page, 10) || 1);
      const taille = Math.min(100, Math.max(5, parseInt(q.taille, 10) || 10));
      const wPF = [...w, ...wf];
      const pPF = [...params, ...pf];
      const [[[cpt]], [ids], [porteurs], [contributeurs], [[sp]], [sites]] = await Promise.all([
        db.query(`SELECT COUNT(*) AS total_pf,
                         SUM(CASE WHEN ${we.length ? we[0] : "1=1"} THEN 1 ELSE 0 END) AS total,
                         SUM(CASE WHEN NOT ${sqlClose()} THEN 1 ELSE 0 END) AS en_cours,
                         SUM(CASE WHEN ${SQL_EN_RETARD} THEN 1 ELSE 0 END) AS en_retard,
                         SUM(CASE WHEN ${SQL_ECHEANCE_PROCHE} THEN 1 ELSE 0 END) AS proche,
                         SUM(CASE WHEN ${sqlRealisee()} THEN 1 ELSE 0 END) AS realisee
                    ${FROM} WHERE ${wPF.join(" AND ")}`, pPF),
        db.query(`SELECT l.id ${FROM} WHERE ${[...wPF, ...we].join(" AND ")} ${ORDRE} LIMIT ? OFFSET ?`,
          [...pPF, taille, (page - 1) * taille]),
        db.query(`SELECT DISTINCT po.id, TRIM(CONCAT(COALESCE(po.nom, ''), ' ', COALESCE(po.prenom, ''))) AS nom
                    ${FROM} WHERE ${w.join(" AND ")} AND po.id IS NOT NULL`, params),
        db.query(`SELECT DISTINCT cu.id, TRIM(CONCAT(COALESCE(cu.nom, ''), ' ', COALESCE(cu.prenom, ''))) AS nom
                    ${FROM} JOIN b_eval_plan_action_contributeur cc ON cc.id_ligne = l.id
                    JOIN b_utilisateur cu ON cu.id = cc.id_utilisateur
                   WHERE ${w.join(" AND ")}`, params),
        db.query(`SELECT COUNT(*) AS n, SUM(CASE WHEN l.id_porteur IS NULL THEN 1 ELSE 0 END) AS sans_porteur
                    ${FROM} WHERE ${w.join(" AND ")}`, params),
        // Sites des actions visibles (filtre « Site ») : jamais un site hors de la visibilité.
        db.query(`SELECT e.id_site AS id, MAX(s.nom) AS nom, COUNT(*) AS n
                    ${FROM} WHERE ${w.join(" AND ")} GROUP BY e.id_site`, params),
      ]);
      const trier = (l) => l.filter((x) => x.nom).sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
      extra = {
        total: Number(cpt.total) || 0, page, taille,
        compteurs: { en_cours: Number(cpt.en_cours) || 0, en_retard: Number(cpt.en_retard) || 0,
          proche: Number(cpt.proche) || 0, realisee: Number(cpt.realisee) || 0 },
        total_filtres: Number(cpt.total_pf) || 0, // après filtres d'écran, toutes cartes confondues
        total_perimetre: Number(sp.n) || 0,
        nb_sans_porteur: Number(sp.sans_porteur) || 0,
        porteurs: trier(porteurs), contributeurs: trier(contributeurs),
        sites: sites
          .map((x) => ({ id: x.id === null ? -1 : Number(x.id), nom: x.id === null ? "Sans site" : x.nom || `Site ${x.id}`, n: Number(x.n) || 0 }))
          .sort((a, b) => (a.id === -1) - (b.id === -1) || a.nom.localeCompare(b.nom, "fr")),
      };
      const idsPage = ids.map((r) => r.id);
      if (!idsPage.length) rows = [];
      else {
        [rows] = await db.query(`${SELECT} WHERE l.id IN (${idsPage.map(() => "?").join(",")}) ${ORDRE}`,
          [userId, userId, ...idsPage]);
      }
    } else {
      // Sans « page » : liste complète, comme avant (compatibilité).
      [rows] = await db.query(`${SELECT} WHERE ${[...w, ...wf, ...we].join(" AND ")} ${ORDRE}`,
        [userId, userId, ...params, ...pf]);
    }
    // Droit de modification par ligne (mêmes règles que PUT /eval/plan-action/ligne/:id, out107) :
    // statut et synthèse pour le porteur ou qui coache l'évaluation ; rien sur une action close ;
    // peut_attribuer_porteur : qui coache, si l'action n'a pas de porteur.
    const { permissionsEffectives } = require("../middlewares/permission");
    const { porteeSite } = require("../utils/siteVisionGlobale");
    const { role, set } = await permissionsEffectives(userId);
    const admin = role === "R_ADMI";
    const coacher = admin || set.has("evaluation.coacher");
    const portee = !admin && set.has("evaluation.voir_tous") ? await porteeSite(userId) : null;
    const [sup] = await db.query(`SELECT id_AGENT FROM b_r_superviseur_agent WHERE id_SUPERVISEUR = ?`, [userId]);
    const mesAgents = new Set(sup.map((s) => Number(s.id_AGENT)));
    const coache = (r) => coacher && (admin || Number(r.id_evaluateur) === userId || mesAgents.has(Number(r.id_agent)) ||
      (!!portee && (portee.visionGlobale || (portee.idSite !== null && Number(r.id_site) === portee.idSite))));
    const ouverte = (r) => !Number(r.close) && r.statut_evaluation === "TERMINE" && r.conclusion === "ECHEC";
    const droit = (r) => ouverte(r) && (coache(r) || Number(r.id_porteur) === userId);
    const txtAncien = pagine ? "" : txt.toLowerCase();
    const liste = rows
      .map((r) => ({ ...r, realisee: !!Number(r.realisee), en_retard: !!Number(r.en_retard), echeance_proche: !!Number(r.echeance_proche),
        mienne: !!Number(r.mienne), close: !!Number(r.close), peut_modifier: droit(r),
        peut_attribuer_porteur: ouverte(r) && !r.id_porteur && coache(r),
        contributeurs_ids: r.contributeurs_ids ? String(r.contributeurs_ids).split(",").map(Number) : [] }))
      .filter((r) => !txtAncien || [r.action, r.synthese, r.agent_nom, r.agent_prenom, r.agent_login, r.porteur_nom, r.porteur_prenom]
        .some((v) => String(v || "").toLowerCase().includes(txtAncien)));
    if (pagine) return res.status(200).json({ lignes: liste, ...extra });
    return res.status(200).json(liste);
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors du chargement." }); }
};

/** GET /eval/plan-action/statuts — statuts actifs d'une action (référentiel), en lecture. */
const getStatutsPlanAction = async (req, res) => {
  try {
    const [rows] = await db.query(`SELECT id, libelle FROM b_eval_ref_statut_pa WHERE COALESCE(etat, 'ACTIF') = 'ACTIF' ORDER BY ordre, id`);
    return res.status(200).json(rows);
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors du chargement." }); }
};

/**
 * GET /eval/plan-action/utilisateurs — porteurs / contributeurs proposables :
 * utilisateurs actifs de tous les sites (site à vision globale, administrateur),
 * sinon de son site et du site à vision globale. Le site est renvoyé.
 */
const getUtilisateursAssignables = async (req, res) => {
  try {
    const f = await filtreAssignables(req.auth.userId, "u");
    const [rows] = await db.query(
      `SELECT u.id, u.nom, u.prenom, u.nom_utilisateur AS login, s.nom AS site
         FROM b_utilisateur u LEFT JOIN b_site s ON s.id = u.id_Site
        WHERE u.status = 'ACTIF' AND ${f.sql}
        ORDER BY u.nom, u.prenom`, f.params
    );
    return res.status(200).json(rows);
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors du chargement." }); }
};

// =====================================================================
// LETTRES (F.39sexies) — modèle paramétrable + rendu
// =====================================================================
// Modèle d'une lettre : texte d'introduction et formule de clôture, avec les
// variables {{prenom}} {{nom}} {{date_evaluation}} {{contexte}} {{appel}}
// {{evaluateur}} (44_lettres_modeles_parametrables.sql).
const TYPES_LETTRE = ["FELICITATION", "DEBRIEFING"];
const LONGUEUR_MAX_MODELE = 4000;

const getLettreModele = async (req, res) => {
  const type = String(req.params.type || "").toUpperCase();
  if (!TYPES_LETTRE.includes(type)) return res.status(400).json({ message: "Type de lettre invalide." });
  try {
    const [[m]] = await db.query(
      `SELECT type, introduction, cloture, dateModification FROM b_eval_lettre_modele WHERE type=?`, [type]
    );
    if (!m) return res.status(404).json({ message: "Modèle introuvable." });
    return res.status(200).json(m);
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur." }); }
};

const updateLettreModele = async (req, res) => {
  const type = String(req.params.type || "").toUpperCase();
  if (!TYPES_LETTRE.includes(type)) return res.status(400).json({ message: "Type de lettre invalide." });
  const introduction = String((req.body && req.body.introduction) || "").trim();
  const cloture = String((req.body && req.body.cloture) || "").trim();
  if (!introduction || !cloture) {
    return res.status(400).json({ message: "Le texte d'introduction et la formule de clôture sont obligatoires." });
  }
  if (introduction.length > LONGUEUR_MAX_MODELE || cloture.length > LONGUEUR_MAX_MODELE) {
    return res.status(400).json({ message: `Texte trop long (${LONGUEUR_MAX_MODELE} caractères au plus).` });
  }
  try {
    const [r] = await db.query(
      `UPDATE b_eval_lettre_modele SET introduction=?, cloture=?, dateModification=NOW() WHERE type=?`,
      [introduction, cloture, type]
    );
    if (r.affectedRows === 0) return res.status(404).json({ message: "Modèle introuvable." });
    return res.status(200).json({ message: "Modèle de lettre enregistré." });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur." }); }
};

/** Remplace les variables du modèle par les valeurs de l'évaluation. */
const remplirModele = (texte, v) =>
  String(texte || "").replace(/\{\{\s*(\w+)\s*\}\}/g, (m, cle) => (Object.prototype.hasOwnProperty.call(v, cle) ? v[cle] : m));
const dateFr = (d) => {
  if (!d) return "";
  const x = new Date(d);
  return isNaN(x.getTime()) ? "" : x.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
};

// Rendu de la lettre d'une évaluation (données structurées pour l'affichage)
const getLettreEvaluation = async (req, res) => {
  const idEval = req.params.id;
  try {
    const [[e]] = await db.query(
      `SELECT ev.*, ag.nom AS agent_nom, ag.prenom AS agent_prenom, ctx.libelle AS contexte,
              evr.nom AS evaluateur_nom, evr.prenom AS evaluateur_prenom, fe.nom AS evaluateur_fonction
       FROM b_evaluation ev
       LEFT JOIN b_utilisateur ag ON ev.id_agent=ag.id
       LEFT JOIN b_utilisateur evr ON ev.id_evaluateur=evr.id
       LEFT JOIN b_fonction fe ON evr.id_Fonction=fe.id
       LEFT JOIN b_eval_ref_contexte ctx ON ev.id_contexte=ctx.id
       WHERE ev.id=?`, [idEval]
    );
    if (!e) return res.status(404).json({ message: "Évaluation introuvable." });
    if (e.statut !== "TERMINE") return res.status(409).json({ message: "La lettre n'est disponible qu'après clôture." });

    const type = e.conclusion === "SUCCES" ? "FELICITATION" : "DEBRIEFING";
    const [[modele]] = await db.query(`SELECT texte, introduction, cloture FROM b_eval_lettre_modele WHERE type=?`, [type]);
    const evaluateur = [e.evaluateur_prenom, e.evaluateur_nom].filter(Boolean).join(" ");
    const variables = {
      prenom: e.agent_prenom || "", nom: e.agent_nom || "", date_evaluation: dateFr(e.date_evaluation),
      contexte: e.contexte || "", appel: e.identifiant_appel || "", evaluateur,
    };

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
      introduction: remplirModele(modele && modele.introduction, variables),
      cloture: remplirModele(modele && modele.cloture, variables),
      agent: { nom: e.agent_nom, prenom: e.agent_prenom },
      evaluateur: { nom: e.evaluateur_nom, prenom: e.evaluateur_prenom, fonction: e.evaluateur_fonction },
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
  creerSupplementaire, getSupplementaires, genererSupplementairesAuto,
  getPlanAction, addLignePlanAction, updateLignePlanAction, deleteLignePlanAction,
  getSuiviPlansActions, getUtilisateursAssignables, getStatutsPlanAction, visibiliteActions, SQL_EN_RETARD, SQL_ECHEANCE_PROCHE,
  getLettreModele, updateLettreModele, getLettreEvaluation,
};
