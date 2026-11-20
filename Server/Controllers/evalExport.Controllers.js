// =====================================================================
// Exportations — exports du module Évaluation et des utilisateurs
// (Écoutes, Écoutes items, Pôle de perfectionnement, Liste des agents,
//  Coaching agent, Contre-évaluation, Calibrages, Plan d'actions).
//
// Habilitation (HABILITATION EXPORT) :
//  - chaque type exige le menu Exportations (reporting.lire) + la permission
//    du module concerné (TYPES ci-dessous) ;
//  - périmètre : un utilisateur du « site à vision globale » (paramètre
//    b_param_habilitation.site_vision_globale, ex. DSFO) ou un administrateur
//    choisit un site ou tous les sites ; tout autre utilisateur n'exporte que
//    son propre site.
// Contrôlé ici à chaque export, quel que soit le mode OBSERVATION / ACTIF.
// =====================================================================
const db = require("../config/db");
const { permissionsEffectives } = require("../middlewares/permission");
const { chargerPole } = require("./evalRapport.Controllers");
const { calculer: calculerCalibrage } = require("./calibrageResultats.Controllers");
const { porteeSite } = require("../utils/siteVisionGlobale");

// code -> libellé (liste déroulante) + droit requis (en plus de reporting.lire)
const TYPES = {
  ECOUTES: { libelle: "Écoutes", droit: (s) => s.has("evaluation.creer") },
  ECOUTES_ITEMS: { libelle: "Écoutes items", droit: (s) => s.has("evaluation.creer") },
  POLE: { libelle: "Pôle de perfectionnement", droit: (s) => s.has("agent_pole.lire") },
  // Permission dédiée (31_permission_export_agents.sql)
  AGENTS: { libelle: "Liste des agents", droit: (s) => s.has("utilisateur.exporter"), sansDates: true },
  COACHING: { libelle: "Coaching agent", droit: (s) => s.has("evaluation.creer") },
  CONTRE_EVALUATION: { libelle: "Contre-évaluation", droit: (s) => s.has("contre_evaluation.creer") },
  CALIBRAGES: { libelle: "Calibrages", droit: (s) => s.has("calibrage.organiser") },
  PLAN_ACTIONS: { libelle: "Plan d'actions", droit: (s) => s.has("evaluation.creer") },
};

const estJour = (v) => {
  const t = String(v || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return false;
  const d = new Date(t + "T00:00:00Z");
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === t;
};

// Droits et périmètre de l'utilisateur connecté.
const contexteUtilisateur = async (userId) => {
  const { role, set } = await permissionsEffectives(userId);
  const admin = role === "R_ADMI";
  const { idSite, visionGlobale } = await porteeSite(userId, admin);
  const menu = admin || set.has("reporting.lire");
  const types = Object.keys(TYPES).filter((code) => menu && (admin || TYPES[code].droit(set)));
  return { admin, set, idSite, visionGlobale, types, voirTousPole: admin || set.has("agent_pole.voir_tous") };
};

/** GET /export/eval/contexte : types autorisés + champ Site (vision globale). */
const getContexteExport = async (req, res) => {
  try {
    const c = await contexteUtilisateur(req.auth.userId);
    let sites = [];
    if (c.visionGlobale) {
      [sites] = await db.query(`SELECT id, nom FROM b_site ORDER BY nom`);
    } else if (c.idSite !== null) {
      [sites] = await db.query(`SELECT id, nom FROM b_site WHERE id = ?`, [c.idSite]);
    }
    return res.status(200).json({
      vision_globale: c.visionGlobale,
      id_site: c.idSite,
      sites,
      types: c.types.map((code) => ({ code, libelle: TYPES[code].libelle, sans_dates: !!TYPES[code].sansDates })),
    });
  } catch (e) {
    console.error("getContexteExport:", e);
    return res.status(500).json({ message: "Impossible de charger les exports disponibles." });
  }
};

/* ------------------------------------------------------------------ */
/* Requêtes par type. `f` = { du, au, idSite (null = tous), statut }    */
/* ------------------------------------------------------------------ */
const DATE_EVAL = "COALESCE(e.date_evaluation, e.date_creation)";
const fmt = (col) => `DATE_FORMAT(${col}, '%Y-%m-%d %H:%i')`;

// Filtres communs sur une évaluation (alias e) : actives, période, site.
const filtresEvaluation = (f) => {
  const where = ["e.actif = 1", `${DATE_EVAL} >= ?`, `${DATE_EVAL} < DATE_ADD(?, INTERVAL 1 DAY)`];
  const params = [f.du, f.au];
  if (f.idSite !== null) {
    where.push("e.id_site = ?");
    params.push(f.idSite);
  }
  return { where: where.join(" AND "), params };
};

// Agent / évaluateur d'une évaluation (alias e) avec fonction, site, programme de l'agent.
const JOINTURES_EVALUATION = `
  LEFT JOIN b_utilisateur ag ON ag.id = e.id_agent
  LEFT JOIN b_fonction fa ON fa.id = ag.id_Fonction
  LEFT JOIN b_site sa ON sa.id = ag.id_Site
  LEFT JOIN b_programme pa ON pa.id = ag.id_Programme
  LEFT JOIN b_site se ON se.id = e.id_site
  LEFT JOIN b_utilisateur ev ON ev.id = e.id_evaluateur`;

const exportEcoutes = async (f) => {
  const { where, params } = filtresEvaluation(f);
  const [lignes] = await db.query(
    `SELECT e.id AS \`N° évaluation\`,
            ${fmt(DATE_EVAL)} AS \`Date évaluation\`,
            ${fmt("e.date_creation")} AS \`Date création\`,
            t.libelle AS \`Type d'évaluation\`,
            e.type_ressource AS \`Ressource\`,
            nr.libelle AS \`Nature ressource\`,
            ag.nom_utilisateur AS \`Login agent\`, ag.nom AS \`Nom agent\`, ag.prenom AS \`Prénom agent\`,
            fa.nom AS \`Fonction agent\`, sa.nom AS \`Site agent\`, pa.nom AS \`Programme agent\`,
            se.nom AS \`Site de l'évaluation\`,
            ev.nom_utilisateur AS \`Login évaluateur\`, ev.nom AS \`Nom évaluateur\`, ev.prenom AS \`Prénom évaluateur\`,
            ctx.libelle AS \`Contexte\`,
            g.nom AS \`Grille\`,
            e.identifiant_appel AS \`Identifiant appel\`, e.numero_case AS \`N° case\`, e.numero_appel AS \`N° appel\`,
            ${fmt("e.date_appel")} AS \`Date appel\`, e.dmt AS \`DMT (s)\`, e.motif_appel AS \`Motif appel\`,
            e.statut AS \`Statut\`, e.conclusion AS \`Conclusion\`, e.resolution AS \`Résolution\`,
            e.statut_apres_evaluation AS \`Statut après évaluation\`,
            (SELECT COUNT(*) FROM b_evaluation_erreur er WHERE er.id_evaluation = e.id AND er.coche = 0) AS \`Items non conformes\`,
            (SELECT COUNT(*) FROM b_evaluation_erreur er JOIN b_evaluation_categorie c ON c.id = er.id_evaluation_categorie
              WHERE er.id_evaluation = e.id AND er.coche = 0 AND c.critique = 1) AS \`Items critiques non conformes\`,
            e.synthese AS \`Synthèse\`, e.avis_agent AS \`Avis agent\`
       FROM b_evaluation e
       ${JOINTURES_EVALUATION}
       LEFT JOIN b_eval_ref_type_evaluation t ON t.id = e.id_type_evaluation
       LEFT JOIN b_eval_ref_nature_ressource nr ON nr.id = e.id_nature_ressource
       LEFT JOIN b_eval_ref_contexte ctx ON ctx.id = e.id_contexte
       LEFT JOIN b_eval_grille g ON g.id = e.id_grille_origine
      WHERE ${where}
      ORDER BY ${DATE_EVAL}, e.id`,
    params
  );
  return [{ nom: "Écoutes", lignes }];
};

const exportEcoutesItems = async (f) => {
  const { where, params } = filtresEvaluation(f);
  const [lignes] = await db.query(
    `SELECT e.id AS \`N° évaluation\`,
            ${fmt(DATE_EVAL)} AS \`Date évaluation\`,
            ag.nom_utilisateur AS \`Login agent\`, ag.nom AS \`Nom agent\`, ag.prenom AS \`Prénom agent\`,
            se.nom AS \`Site de l'évaluation\`,
            ev.nom_utilisateur AS \`Login évaluateur\`,
            e.conclusion AS \`Conclusion évaluation\`,
            c.libelle AS \`Catégorie\`,
            IF(c.critique = 1, 'OUI', 'NON') AS \`Catégorie critique\`,
            er.libelle_sous_categorie AS \`Sous-catégorie\`,
            er.item AS \`Item\`, er.sous_item AS \`Sous-item\`,
            IF(er.coche = 1, 'OUI', 'NON') AS \`Conforme\`,
            er.poids AS \`Poids\`, er.commentaire AS \`Commentaire\`
       FROM b_evaluation_erreur er
       JOIN b_evaluation e ON e.id = er.id_evaluation
       LEFT JOIN b_evaluation_categorie c ON c.id = er.id_evaluation_categorie
       ${JOINTURES_EVALUATION}
      WHERE ${where}
      ORDER BY ${DATE_EVAL}, e.id, c.ordre, er.id`,
    params
  );
  return [{ nom: "Écoutes items", lignes }];
};

// Pôle : même calcul que l'écran « Agents en pôle » (période sur la date d'appel).
// Sans agent_pole.voir_tous : uniquement les agents supervisés (contour du module).
const exportPole = async (f, ctx, userId) => {
  const where = ["e.date_appel >= ?", "e.date_appel <= ?"];
  const params = [f.du + " 00:00:00", f.au + " 23:59:59"];
  if (f.idSite !== null) {
    where.push("e.id_site = ?");
    params.push(f.idSite);
  }
  if (!ctx.voirTousPole) {
    where.push("e.id_agent IN (SELECT id_AGENT FROM b_r_superviseur_agent WHERE id_SUPERVISEUR = ?)");
    params.push(userId);
  }
  const agents = await chargerPole(where, params);
  const jour = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");
  const synthese = agents.map((a) => ({
    "Login agent": a.login,
    "Nom agent": a.nom,
    "Prénom agent": a.prenom,
    Programme: a.programme,
    Site: a.site,
    Superviseur: a.superviseur,
    "Critères déclencheurs": a.criteres.join(" ; "),
    "Évaluations en échec": a.nb_evaluations,
    "N° des évaluations": a.evaluations.map((x) => x.id).join(", "),
  }));
  const detail = [];
  agents.forEach((a) =>
    a.evaluations.forEach((x) =>
      detail.push({
        "Login agent": a.login,
        "Nom agent": a.nom,
        "Prénom agent": a.prenom,
        Site: a.site,
        "N° évaluation": x.id,
        "Date appel": jour(x.date_appel),
        "Items critiques non conformes": x.critiques_decochees,
      })
    )
  );
  return [
    { nom: "Agents en pôle", lignes: synthese },
    { nom: "Évaluations en échec", lignes: detail },
  ];
};

const exportAgents = async (f) => {
  const where = [];
  const params = [];
  if (f.idSite !== null) {
    where.push("u.id_Site = ?");
    params.push(f.idSite);
  }
  if (f.statut === "ACTIF") where.push("u.status = 'ACTIF'");
  if (f.statut === "INACTIF") where.push("(u.status IS NULL OR u.status <> 'ACTIF')");
  const [lignes] = await db.query(
    `SELECT u.nom_utilisateur AS \`Login\`, u.nom AS \`Nom\`, u.prenom AS \`Prénom\`,
            u.email AS \`Email\`, fo.nom AS \`Fonction\`, s.nom AS \`Site\`, p.nom AS \`Programme\`,
            sup.nom_utilisateur AS \`Login superviseur\`,
            TRIM(CONCAT(COALESCE(sup.nom, ''), ' ', COALESCE(sup.prenom, ''))) AS \`Superviseur\`,
            u.status AS \`Statut\`, ${fmt("u.dateCreation")} AS \`Date création\`
       FROM b_utilisateur u
       LEFT JOIN b_fonction fo ON fo.id = u.id_Fonction
       LEFT JOIN b_site s ON s.id = u.id_Site
       LEFT JOIN b_programme p ON p.id = u.id_Programme
       LEFT JOIN b_r_superviseur_agent r ON r.id = (
         SELECT r2.id FROM b_r_superviseur_agent r2 WHERE r2.id_AGENT = u.id
          ORDER BY r2.dateCreation DESC, r2.id DESC LIMIT 1)
       LEFT JOIN b_utilisateur sup ON sup.id = r.id_SUPERVISEUR
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY s.nom, u.nom, u.prenom`,
    params
  );
  return [{ nom: "Agents", lignes }];
};

const exportCoaching = async (f) => {
  const { where, params } = filtresEvaluation(f);
  const [lignes] = await db.query(
    `SELECT co.id AS \`N° coaching\`, e.id AS \`N° évaluation\`,
            ${fmt(DATE_EVAL)} AS \`Date évaluation\`, e.conclusion AS \`Conclusion évaluation\`,
            ag.nom_utilisateur AS \`Login agent\`, ag.nom AS \`Nom agent\`, ag.prenom AS \`Prénom agent\`,
            pa.nom AS \`Programme agent\`, se.nom AS \`Site de l'évaluation\`,
            ev.nom_utilisateur AS \`Login évaluateur\`,
            su.nom_utilisateur AS \`Login superviseur\`,
            TRIM(CONCAT(COALESCE(su.nom, ''), ' ', COALESCE(su.prenom, ''))) AS \`Superviseur\`,
            co.statut AS \`Statut coaching\`,
            (SELECT GROUP_CONCAT(n.libelle ORDER BY n.niveau SEPARATOR ' > ')
               FROM b_eval_coaching_niveau n WHERE n.id_coaching = co.id) AS \`Options de coaching\`,
            ${fmt("co.dateCreation")} AS \`Date création\`, ${fmt("co.dateCloture")} AS \`Date clôture\`
       FROM b_eval_coaching co
       JOIN b_evaluation e ON e.id = co.id_evaluation
       ${JOINTURES_EVALUATION}
       LEFT JOIN b_utilisateur su ON su.id = co.id_superviseur
      WHERE ${where}
      ORDER BY ${DATE_EVAL}, co.id`,
    params
  );
  return [{ nom: "Coaching", lignes }];
};

// Contre-évaluation : feuille 1 = initiale vs contre ; feuille 2 = détail par item
// (conformité dans la contre-évaluation et dans l'évaluation initiale).
const exportContreEvaluation = async (f) => {
  const { where, params } = filtresEvaluation(f);
  const [synthese] = await db.query(
    `SELECT ce.id AS \`N° contre-évaluation\`, e.id AS \`N° évaluation initiale\`,
            ${fmt(DATE_EVAL)} AS \`Date évaluation initiale\`,
            ag.nom_utilisateur AS \`Login agent\`, ag.nom AS \`Nom agent\`, ag.prenom AS \`Prénom agent\`,
            se.nom AS \`Site de l'évaluation\`,
            ev.nom_utilisateur AS \`Login évaluateur initial\`,
            e.conclusion AS \`Conclusion initiale\`, e.resolution AS \`Résolution initiale\`,
            re.nom_utilisateur AS \`Login responsable contre-évaluation\`,
            TRIM(CONCAT(COALESCE(re.nom, ''), ' ', COALESCE(re.prenom, ''))) AS \`Responsable contre-évaluation\`,
            ce.statut AS \`Statut contre-évaluation\`,
            ${fmt("ce.date_evaluation")} AS \`Date contre-évaluation\`,
            ce.conclusion AS \`Conclusion contre-évaluation\`, ce.resolution AS \`Résolution contre-évaluation\`,
            CASE WHEN ce.conclusion IS NULL THEN ''
                 WHEN ce.conclusion = e.conclusion THEN 'Identique' ELSE 'Différente' END AS \`Conclusion : écart\`,
            (SELECT COUNT(*) FROM b_eval_contre_erreur x WHERE x.id_contre_evaluation = ce.id AND x.coche = 0) AS \`Items non conformes (contre)\`,
            (SELECT COUNT(*) FROM b_evaluation_erreur x WHERE x.id_evaluation = e.id AND x.coche = 0) AS \`Items non conformes (initiale)\`,
            ce.synthese AS \`Synthèse contre-évaluation\`
       FROM b_eval_contre_evaluation ce
       JOIN b_evaluation e ON e.id = ce.id_evaluation_initiale
       ${JOINTURES_EVALUATION}
       LEFT JOIN b_utilisateur re ON re.id = ce.id_responsable
      WHERE ce.actif = 1 AND ${where}
      ORDER BY ${DATE_EVAL}, ce.id`,
    params
  );
  const [detail] = await db.query(
    `SELECT ce.id AS \`N° contre-évaluation\`, e.id AS \`N° évaluation initiale\`,
            ag.nom_utilisateur AS \`Login agent\`,
            cc.libelle AS \`Catégorie\`, IF(cc.critique = 1, 'OUI', 'NON') AS \`Catégorie critique\`,
            x.libelle_sous_categorie AS \`Sous-catégorie\`, x.item AS \`Item\`, x.sous_item AS \`Sous-item\`,
            IF(ini.id IS NULL, '', IF(ini.coche = 1, 'OUI', 'NON')) AS \`Conforme (initiale)\`,
            IF(x.coche = 1, 'OUI', 'NON') AS \`Conforme (contre)\`,
            CASE WHEN ini.id IS NULL THEN '' WHEN ini.coche = x.coche THEN 'Identique' ELSE 'Différent' END AS \`Écart\`,
            x.commentaire AS \`Commentaire (contre)\`
       FROM b_eval_contre_erreur x
       JOIN b_eval_contre_evaluation ce ON ce.id = x.id_contre_evaluation
       JOIN b_evaluation e ON e.id = ce.id_evaluation_initiale
       LEFT JOIN b_eval_contre_categorie cc ON cc.id = x.id_contre_categorie
       LEFT JOIN b_utilisateur ag ON ag.id = e.id_agent
       LEFT JOIN b_evaluation_erreur ini ON ini.id = (
         SELECT i2.id FROM b_evaluation_erreur i2
          WHERE i2.id_evaluation = e.id AND i2.id_erreur_origine = x.id_erreur_origine
          ORDER BY i2.id LIMIT 1)
      WHERE ce.actif = 1 AND ${where}
      ORDER BY ce.id, cc.ordre, x.id`,
    params
  );
  return [
    { nom: "Contre-évaluations", lignes: synthese },
    { nom: "Détail par item", lignes: detail },
  ];
};

// Calibrages : résultats calculés comme sur l'écran Résultats de la session
// (chaque transaction du participant comparée à la référence du jauge).
// Toutes les sessions ; « Provisoire » tant que la session n'est pas clôturée.
const exportCalibrages = async (f) => {
  const where = ["s.date_calibrage >= ?", "s.date_calibrage <= ?"];
  const params = [f.du, f.au];
  if (f.idSite !== null) {
    where.push("s.id_site = ?");
    params.push(f.idSite);
  }
  const [sessions] = await db.query(
    `SELECT s.id, s.nom, s.statut, DATE_FORMAT(s.date_calibrage, '%Y-%m-%d') AS date_calibrage,
            st.nom AS site, g.nom AS grille,
            j.nom_utilisateur AS jauge_login,
            TRIM(CONCAT(COALESCE(j.nom, ''), ' ', COALESCE(j.prenom, ''))) AS jauge
       FROM b_cal_session s
       LEFT JOIN b_site st ON st.id = s.id_site
       LEFT JOIN b_eval_grille g ON g.id = s.id_grille
       LEFT JOIN b_utilisateur j ON j.id = s.id_jauge
      WHERE ${where.join(" AND ")}
      ORDER BY s.date_calibrage, s.id`,
    params
  );
  const parParticipant = [];
  const parTransaction = [];
  for (const s of sessions) {
    const r = await calculerCalibrage(db, s.id);
    const nature = s.statut === "CLOTUREE" ? "Définitif" : "Provisoire";
    // Infos des transactions (agent, case, date d'appel) et des participants (login).
    const [infosT] = await db.query(
      `SELECT t.id, t.numero_case, DATE_FORMAT(t.date_appel, '%Y-%m-%d') AS date_appel,
              a.nom_utilisateur AS agent_login,
              TRIM(CONCAT(COALESCE(a.nom, ''), ' ', COALESCE(a.prenom, ''))) AS agent
         FROM b_cal_transaction t LEFT JOIN b_utilisateur a ON a.id = t.id_agent
        WHERE t.id_session = ?`,
      [s.id]
    );
    const infoT = Object.fromEntries(infosT.map((t) => [t.id, t]));
    const [logins] = await db.query(
      `SELECT u.id, u.nom_utilisateur FROM b_cal_participant p JOIN b_utilisateur u ON u.id = p.id_evaluateur
        WHERE p.id_session = ?`,
      [s.id]
    );
    const login = Object.fromEntries(logins.map((u) => [u.id, u.nom_utilisateur]));
    for (const p of r.participants) {
      const res = r.grid[p.id_evaluateur] || {};
      const reussies = r.transactions.filter((t) => res[t.id] === "SUCCES").length;
      parParticipant.push({
        "N° session": s.id,
        Session: s.nom,
        Site: s.site,
        Grille: s.grille,
        "Date calibrage": s.date_calibrage,
        "Statut session": s.statut,
        "Login jauge": s.jauge_login,
        Jauge: s.jauge,
        "Login participant": login[p.id_evaluateur] || "",
        "Nom participant": p.nom,
        "Prénom participant": p.prenom,
        "Statut participation": p.statut_participation,
        "Résultat session": r.transactions.length ? r.global[p.id_evaluateur] : "",
        "Transactions réussies": `${reussies} / ${r.transactions.length}`,
        Résultat: nature,
      });
      for (const t of r.transactions) {
        const it = infoT[t.id] || {};
        parTransaction.push({
          "N° session": s.id,
          Session: s.nom,
          "Date calibrage": s.date_calibrage,
          "Login participant": login[p.id_evaluateur] || "",
          "Nom participant": p.nom,
          "Prénom participant": p.prenom,
          "Ordre de passage": t.ordre_passage,
          "Identifiant appel": t.identifiant_appel,
          "N° case": it.numero_case || "",
          "Login agent": it.agent_login || "",
          Agent: it.agent || "",
          "Date appel": it.date_appel || "",
          "Résultat transaction": res[t.id] || "",
          Résultat: nature,
        });
      }
    }
  }
  return [
    { nom: "Résultat par participant", lignes: parParticipant },
    { nom: "Résultat par transaction", lignes: parTransaction },
  ];
};

const exportPlanActions = async (f) => {
  const { where, params } = filtresEvaluation(f);
  const [lignes] = await db.query(
    `SELECT l.id AS \`N° action\`, e.id AS \`N° évaluation\`,
            ${fmt(DATE_EVAL)} AS \`Date évaluation\`, e.conclusion AS \`Conclusion évaluation\`,
            ag.nom_utilisateur AS \`Login agent\`, ag.nom AS \`Nom agent\`, ag.prenom AS \`Prénom agent\`,
            se.nom AS \`Site de l'évaluation\`,
            l.action AS \`Action\`,
            po.nom_utilisateur AS \`Login porteur\`,
            TRIM(CONCAT(COALESCE(po.nom, ''), ' ', COALESCE(po.prenom, ''))) AS \`Porteur\`,
            (SELECT GROUP_CONCAT(cu.nom_utilisateur ORDER BY cu.nom_utilisateur SEPARATOR ', ')
               FROM b_eval_plan_action_contributeur pc JOIN b_utilisateur cu ON cu.id = pc.id_utilisateur
              WHERE pc.id_ligne = l.id) AS \`Contributeurs\`,
            l.kpi AS \`KPI\`, sp.libelle AS \`Statut\`,
            DATE_FORMAT(l.date_debut, '%Y-%m-%d') AS \`Date début\`,
            DATE_FORMAT(l.date_attendue, '%Y-%m-%d') AS \`Date attendue\`,
            DATE_FORMAT(l.date_realisation, '%Y-%m-%d') AS \`Date réalisation\`,
            l.commentaire AS \`Commentaire\`, l.synthese AS \`Synthèse\`
       FROM b_eval_plan_action_ligne l
       JOIN b_evaluation e ON e.id = l.id_evaluation
       ${JOINTURES_EVALUATION}
       LEFT JOIN b_utilisateur po ON po.id = l.id_porteur
       LEFT JOIN b_eval_ref_statut_pa sp ON sp.id = l.id_statut
      WHERE ${where}
      ORDER BY ${DATE_EVAL}, l.id`,
    params
  );
  return [{ nom: "Plan d'actions", lignes }];
};

const EXPORTS = {
  ECOUTES: exportEcoutes,
  ECOUTES_ITEMS: exportEcoutesItems,
  POLE: exportPole,
  AGENTS: exportAgents,
  COACHING: exportCoaching,
  CONTRE_EVALUATION: exportContreEvaluation,
  CALIBRAGES: exportCalibrages,
  PLAN_ACTIONS: exportPlanActions,
};

/**
 * POST /export/eval  { type, du, au, id_site, statut }
 * Réponse : { type, libelle, feuilles: [{ nom, lignes }] }
 */
const exporterEval = async (req, res) => {
  const { type, du, au, id_site, statut } = req.body || {};
  try {
    if (!TYPES[type]) {
      return res.status(400).json({ message: "Type d'export inconnu." });
    }
    const ctx = await contexteUtilisateur(req.auth.userId);
    if (!ctx.types.includes(type)) {
      return res.status(403).json({ message: "Vous n'êtes pas habilité à cet export." });
    }
    if (!TYPES[type].sansDates) {
      if (!estJour(du) || !estJour(au)) {
        return res.status(400).json({ message: "Renseignez une période valide (début et fin)." });
      }
      if (du > au) {
        return res.status(400).json({ message: "La date de fin doit être égale ou postérieure à la date de début." });
      }
    }
    // Périmètre : site choisi (vision globale) ou site de l'utilisateur.
    let idSite = null;
    const demande = id_site === undefined || id_site === null || id_site === "" ? null : Number(id_site);
    if (demande !== null && !Number.isInteger(demande)) {
      return res.status(400).json({ message: "Site invalide." });
    }
    if (ctx.visionGlobale) {
      idSite = demande;
    } else {
      if (ctx.idSite === null) {
        return res.status(403).json({ message: "Aucun site n'est rattaché à votre compte." });
      }
      if (demande !== null && demande !== ctx.idSite) {
        return res.status(403).json({ message: "Vous ne pouvez exporter que les données de votre site." });
      }
      idSite = ctx.idSite;
    }
    const filtres = {
      du,
      au,
      idSite,
      statut: ["ACTIF", "INACTIF"].includes(statut) ? statut : "TOUS",
    };
    const feuilles = await EXPORTS[type](filtres, ctx, req.auth.userId);
    return res.status(200).json({ type, libelle: TYPES[type].libelle, feuilles });
  } catch (e) {
    console.error("exporterEval:", type, e && (e.sqlMessage || e.message));
    return res.status(500).json({ message: "Impossible de générer l'export." });
  }
};

module.exports = { getContexteExport, exporterEval, TYPES };
