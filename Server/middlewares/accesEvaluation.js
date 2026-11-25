// =====================================================================
// Périmètre d'accès à UNE évaluation (en plus des permissions evaluation.*).
//
//  voir     : ouvrir l'évaluation et ses annexes (coaching, BI, plan d'actions,
//             lettre, évaluations supplémentaires)
//               - evaluation.voir_tous : toutes les évaluations de son site, de
//                 tous les sites pour le site à vision globale (et l'admin) ;
//               - l'évaluateur ;
//               - le superviseur de l'agent évalué ;
//               - l'agent évalué, une fois l'évaluation terminée ;
//               - agent_pole.voir_tous, pour une évaluation terminée (même
//                 portée de site que evaluation.voir_tous).
//  executer : remplir l'évaluation (items, résolution, terminer)
//               - l'évaluateur ou l'administrateur.
//  agir     : coaching, plan d'actions, options BI, évaluation supplémentaire
//               - evaluation.voir_tous (même portée que ci-dessus),
//                 l'évaluateur, le superviseur de l'agent.
//
// Toujours appliqué (indépendant du mode OBSERVATION / ACTIF).
// =====================================================================
const db = require("../config/db");
const { permissionsEffectives } = require("./permission");
const { porteeSite } = require("../utils/siteVisionGlobale");

/** Droits de l'utilisateur sur l'évaluation `e` ({ id, id_agent, id_evaluateur, id_site, statut }). */
const droitsEvaluation = async (userId, e) => {
  const { role, set } = await permissionsEffectives(userId);
  const uid = Number(userId);
  const admin = role === "R_ADMI";
  // evaluation.voir_tous : tous les sites (site à vision globale / admin) ou son site.
  let visionTotale = admin;
  let surMaPortee = admin; // évaluation sur mon site, ou j'ai la vision globale
  if (!admin && (set.has("evaluation.voir_tous") || set.has("agent_pole.voir_tous"))) {
    const p = await porteeSite(uid);
    surMaPortee = p.visionGlobale || (p.idSite !== null && Number(e.id_site) === p.idSite);
    visionTotale = set.has("evaluation.voir_tous") && surMaPortee;
  }
  const estEvaluateur = e.id_evaluateur != null && Number(e.id_evaluateur) === uid;
  const estAgent = e.id_agent != null && Number(e.id_agent) === uid;
  let estSuperviseur = false;
  if (e.id_agent != null) {
    const [[s]] = await db.query(
      `SELECT 1 AS ok FROM b_r_superviseur_agent WHERE id_SUPERVISEUR = ? AND id_AGENT = ? LIMIT 1`,
      [uid, e.id_agent]
    );
    estSuperviseur = !!s;
  }
  const terminee = e.statut === "TERMINE";
  const agir = admin || visionTotale || estEvaluateur || estSuperviseur;
  return {
    voir: agir || (estAgent && terminee) || (terminee && (admin || (set.has("agent_pole.voir_tous") && surMaPortee))),
    executer: admin || estEvaluateur,
    agir,
    coacher: agir && (admin || set.has("evaluation.coacher")),
    voirTous: visionTotale,
  };
};

const MESSAGES = {
  voir: "Vous n'avez pas accès à cette évaluation.",
  executer: "Seul l'évaluateur de cette évaluation peut la remplir.",
  agir: "Vous n'intervenez pas sur cette évaluation.",
};

// Résolveurs de l'évaluation concernée par la requête.
const parParamId = async (req) => req.params.id;
const parCorpsEvaluation = async (req) => (req.body || {}).id_evaluation;
const parCoaching = async (req) => {
  const [[c]] = await db.query(`SELECT id_evaluation FROM b_eval_coaching WHERE id = ?`, [(req.body || {}).id_coaching]);
  return c ? c.id_evaluation : null;
};
const parLignePlanAction = async (req) => {
  const [[l]] = await db.query(`SELECT id_evaluation FROM b_eval_plan_action_ligne WHERE id = ?`, [req.params.id]);
  return l ? l.id_evaluation : null;
};

/** Middleware : refuse si l'utilisateur n'a pas le niveau requis sur l'évaluation. */
const garderEvaluation = (niveau, resoudre = parParamId) => async (req, res, next) => {
  try {
    const id = await resoudre(req);
    if (id === undefined || id === null || id === "" || !/^\d+$/.test(String(id))) {
      return res.status(404).json({ message: "Évaluation introuvable." });
    }
    const [[e]] = await db.query(
      `SELECT id, id_agent, id_evaluateur, id_site, statut FROM b_evaluation WHERE id = ?`,
      [id]
    );
    if (!e) return res.status(404).json({ message: "Évaluation introuvable." });
    const d = await droitsEvaluation(req.auth.userId, e);
    if (!d[niveau]) return res.status(403).json({ message: MESSAGES[niveau] });
    return next();
  } catch (err) {
    console.error("garderEvaluation:", err && err.message);
    return res.status(500).json({ message: "Erreur lors du contrôle d'accès." });
  }
};

/**
 * Middleware : plan d'actions et coaching ne concernent qu'une évaluation
 * TERMINÉE et conclue en ÉCHEC (contrôle serveur, l'écran ne suffit pas).
 */
const exigerEchecTermine = (resoudre = parParamId) => async (req, res, next) => {
  try {
    const id = await resoudre(req);
    if (id === undefined || id === null || id === "" || !/^\d+$/.test(String(id))) {
      return res.status(404).json({ message: "Évaluation introuvable." });
    }
    const [[e]] = await db.query(`SELECT statut, conclusion FROM b_evaluation WHERE id = ?`, [id]);
    if (!e) return res.status(404).json({ message: "Évaluation introuvable." });
    if (e.statut !== "TERMINE" || e.conclusion !== "ECHEC") {
      return res.status(409).json({ message: "Le plan d'actions et le coaching ne concernent qu'une évaluation terminée en échec." });
    }
    return next();
  } catch (err) {
    console.error("exigerEchecTermine:", err && err.message);
    return res.status(500).json({ message: "Erreur lors du contrôle de l'évaluation." });
  }
};

/**
 * Middleware de modification d'une action du plan (out107). Une fois créée, une action
 * ne change plus que par son STATUT et sa SYNTHÈSE ; une action close (Réalisé, Abandonné,
 * Annulé…) ne change plus du tout.
 *  - peuvent modifier : le PORTEUR de l'action, et qui a un droit sur l'évaluation
 *    (agir) avec evaluation.coacher ;
 *  - ces derniers peuvent aussi attribuer un porteur s'il n'y en a pas (anciennes actions) ;
 *  - tout autre champ envoyé est ignoré.
 */
const garderLignePlanAction = async (req, res, next) => {
  try {
    const { estStatutClos } = require("../utils/planAction");
    const [[l]] = await db.query(
      `SELECT l.id_porteur, st.libelle AS statut, e.id, e.id_agent, e.id_evaluateur, e.id_site, e.statut AS statut_evaluation
         FROM b_eval_plan_action_ligne l JOIN b_evaluation e ON e.id = l.id_evaluation
         LEFT JOIN b_eval_ref_statut_pa st ON st.id = l.id_statut WHERE l.id = ?`, [req.params.id]
    );
    if (!l) return res.status(404).json({ message: "Action introuvable." });
    const d = await droitsEvaluation(req.auth.userId, { ...l, statut: l.statut_evaluation });
    const porteur = l.id_porteur != null && Number(l.id_porteur) === Number(req.auth.userId);
    if (!d.coacher && !porteur) {
      return res.status(403).json({ message: "Seuls le porteur de l'action et ceux qui coachent cette évaluation peuvent la modifier." });
    }
    if (estStatutClos(l.statut)) return res.status(409).json({ message: "Cette action est close : elle ne peut plus être modifiée." });
    const b = req.body || {};
    req.body = {};
    const garder = ["id_statut", "synthese"];
    if (d.coacher && l.id_porteur == null) garder.push("id_porteur");
    for (const k of garder) if (Object.prototype.hasOwnProperty.call(b, k)) req.body[k] = b[k];
    return next();
  } catch (err) {
    console.error("garderLignePlanAction:", err && err.message);
    return res.status(500).json({ message: "Erreur lors du contrôle d'accès." });
  }
};

module.exports = { droitsEvaluation, garderEvaluation, exigerEchecTermine, garderLignePlanAction, parParamId, parCorpsEvaluation, parLignePlanAction, parCoaching };
