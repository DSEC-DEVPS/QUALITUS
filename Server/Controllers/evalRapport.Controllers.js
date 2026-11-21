// =====================================================================
// Module ÉVALUATION QUALITÉ (cahier) — Reporting (Phase 7, F.40bis)
// Identification des agents en échec répété (« agents en pôle ») selon 3
// critères. Ne portent que sur les évaluations terminées, actives, de type
// Évaluation, ressources humaines.
// =====================================================================
const db = require("../config/db");
const { permissionsEffectives } = require("../middlewares/permission");
const { porteeSite } = require("../utils/siteVisionGlobale");
const { droitsEvaluation } = require("../middlewares/accesEvaluation");

const moisIndex = (d) => { const x = new Date(d); return x.getFullYear() * 12 + x.getMonth(); };
const moisLabel = (d) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}`; };
const estDateYMD = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

// Cœur du calcul : construit la liste des agents en pôle à partir d'un WHERE.
const chargerPole = async (extraWhere, extraParams) => {
  const where = [
    "e.statut='TERMINE'", "e.actif=1", "e.conclusion='ECHEC'",
    "e.type_ressource='HUMAINE'", "t.code='EVALUATION'", "e.id_agent IS NOT NULL",
    ...extraWhere,
  ];
  const params = [...extraParams];

  const [evals] = await db.query(
    `SELECT e.id, e.id_agent, e.id_evaluateur, e.date_appel, e.conclusion,
            ag.nom, ag.prenom, ag.nom_utilisateur AS login,
            pr.nom AS programme, s.nom AS site, e.id_site, e.id_programme
     FROM b_evaluation e
     JOIN b_eval_ref_type_evaluation t ON e.id_type_evaluation=t.id
     LEFT JOIN b_utilisateur ag ON e.id_agent=ag.id
     LEFT JOIN b_programme pr ON e.id_programme=pr.id
     LEFT JOIN b_site s ON e.id_site=s.id
     WHERE ${where.join(" AND ")}
     ORDER BY e.id_agent, e.date_appel`, params
  );

  // Critère 3 : nb d'erreurs critiques décochées par évaluation
  const [crit] = await db.query(
    `SELECT er.id_evaluation, COUNT(*) AS n
     FROM b_evaluation_erreur er JOIN b_evaluation_categorie c ON er.id_evaluation_categorie=c.id
     WHERE er.coche=0 AND c.critique=1
     GROUP BY er.id_evaluation`
  );
  const critMap = {};
  crit.forEach((x) => (critMap[x.id_evaluation] = x.n));

  // superviseur par agent
  const [sups] = await db.query(
    `SELECT r.id_AGENT, u.id AS id_sup, u.nom, u.prenom FROM b_r_superviseur_agent r LEFT JOIN b_utilisateur u ON r.id_SUPERVISEUR=u.id`
  );
  const supMap = {};
  sups.forEach((s) => (supMap[s.id_AGENT] = { id: s.id_sup, nom: `${s.nom || ""} ${s.prenom || ""}`.trim() }));

  const parAgent = {};
  for (const e of evals) {
    if (!parAgent[e.id_agent]) {
      parAgent[e.id_agent] = {
        id: e.id_agent, nom: e.nom, prenom: e.prenom, login: e.login,
        programme: e.programme, site: e.site,
        superviseur: (supMap[e.id_agent] && supMap[e.id_agent].nom) || "—",
        id_superviseur: supMap[e.id_agent] && supMap[e.id_agent].id,
        evaluations: [], mois: {}, critique3: false,
      };
    }
    const a = parAgent[e.id_agent];
    a.evaluations.push({
      id: e.id, id_evaluateur: e.id_evaluateur, date_appel: e.date_appel,
      critiques_decochees: critMap[e.id] || 0,
    });
    const ml = moisLabel(e.date_appel);
    a.mois[ml] = (a.mois[ml] || 0) + 1;
    if ((critMap[e.id] || 0) >= 3) a.critique3 = true;
  }

  const resultat = [];
  for (const id in parAgent) {
    const a = parAgent[id];
    const criteres = [];
    const idxs = [...new Set(a.evaluations.map((x) => moisIndex(x.date_appel)))].sort((x, y) => x - y);
    let consecutifs = false;
    for (let i = 1; i < idxs.length; i++) if (idxs[i] - idxs[i - 1] === 1) consecutifs = true;
    if (consecutifs) criteres.push("Échec sur 2 mois consécutifs");
    if (Object.values(a.mois).some((n) => n >= 2)) criteres.push("Échec répété dans le mois");
    if (a.critique3) criteres.push("Erreurs critiques cumulées (≥3)");

    if (criteres.length > 0) {
      resultat.push({
        id: a.id, nom: a.nom, prenom: a.prenom, login: a.login,
        programme: a.programme, site: a.site, superviseur: a.superviseur, id_superviseur: a.id_superviseur,
        criteres,
        // nb d'évaluations en échec qui ont conduit l'agent en pôle
        nb_evaluations: a.evaluations.length,
        evaluations: a.evaluations,
      });
    }
  }
  resultat.sort((x, y) => y.nb_evaluations - x.nb_evaluations);
  return resultat;
};

// Portée d'accès de l'utilisateur courant (alignée sur les évaluations) :
//  - agent_pole.lire seul : ses propres agents (ceux qu'il supervise) ;
//  - agent_pole.voir_tous : les agents en pôle de SON site (évaluations de son
//    site), de tous les sites pour le site à vision globale ;
//  - administrateur : tous les sites.
// siteImpose : site auquel la vue est limitée (null = tous les sites).
const porteePole = async (userId) => {
  const { role, set } = await permissionsEffectives(userId);
  const admin = role === "R_ADMI";
  const voirTous = admin || set.has("agent_pole.voir_tous");
  if (!voirTous || admin) return { role, voirTous, siteImpose: null };
  const p = await porteeSite(userId);
  if (p.visionGlobale) return { role, voirTous, siteImpose: null };
  // site inconnu : on retombe sur ses seuls agents
  if (p.idSite === null) return { role, voirTous: false, siteImpose: null };
  return { role, voirTous, siteImpose: p.idSite };
};

const getRapportAgentsPole = async (req, res) => {
  const q = req.query || {};
  const userId = req.auth.userId;
  try {
    const { voirTous, siteImpose } = await porteePole(userId);
    const where = [];
    const params = [];
    if (voirTous) {
      // Filtres complets ; le site est imposé hors vision globale
      const idSite = siteImpose !== null ? siteImpose : q.id_site ? Number(q.id_site) : null;
      if (idSite) { where.push("e.id_site=?"); params.push(idSite); }
      if (q.id_programme) { where.push("e.id_programme=?"); params.push(Number(q.id_programme)); }
      if (q.id_superviseur) {
        where.push("e.id_agent IN (SELECT id_AGENT FROM b_r_superviseur_agent WHERE id_SUPERVISEUR=?)");
        params.push(Number(q.id_superviseur));
      }
    } else {
      // Superviseur : uniquement ses agents (filtre date seulement)
      where.push("e.id_agent IN (SELECT id_AGENT FROM b_r_superviseur_agent WHERE id_SUPERVISEUR=?)");
      params.push(userId);
    }
    if (estDateYMD(q.date_debut)) { where.push("e.date_appel>=?"); params.push(q.date_debut + " 00:00:00"); }
    if (estDateYMD(q.date_fin)) { where.push("e.date_appel<=?"); params.push(q.date_fin + " 23:59:59"); }

    const resultat = await chargerPole(where, params);
    return res.status(200).json({ voir_tous: voirTous, site_impose: siteImpose, agents: resultat });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors du chargement du rapport." }); }
};

// Détail d'un agent en pôle : évaluations déclenchantes, critères, infos agent +
// superviseur, et droit d'agir sur le plan d'action par évaluation.
const getAgentPoleDetail = async (req, res) => {
  const idAgent = Number(req.params.id);
  const userId = req.auth.userId;
  try {
    const { voirTous, siteImpose } = await porteePole(userId);
    const [[lien]] = await db.query(
      "SELECT 1 AS ok FROM b_r_superviseur_agent WHERE id_SUPERVISEUR=? AND id_AGENT=?", [userId, idAgent]
    );
    // Contrôle d'accès : le superviseur de l'agent, ou « voir tous » sur la portée.
    if (!lien && !voirTous) return res.status(403).json({ message: "Accès limité à vos agents." });
    // Hors vision globale (et hors supervision), seules les évaluations de son site comptent.
    const filtreSite = !lien && siteImpose !== null;
    const liste = await chargerPole(
      filtreSite ? ["e.id_agent=?", "e.id_site=?"] : ["e.id_agent=?"],
      filtreSite ? [idAgent, siteImpose] : [idAgent]
    );
    const agent = liste[0];
    if (!agent) {
      return filtreSite
        ? res.status(403).json({ message: "Cet agent n'est pas en pôle sur votre site." })
        : res.status(404).json({ message: "Cet agent n'est pas en pôle sur ce périmètre." });
    }

    // Infos agent + superviseur détaillées
    const [[ag]] = await db.query(
      `SELECT u.id, u.nom, u.prenom, u.nom_utilisateur AS login, u.email, u.telephone,
              s.nom AS site, p.nom AS programme
         FROM b_utilisateur u LEFT JOIN b_site s ON u.id_Site=s.id LEFT JOIN b_programme p ON u.id_Programme=p.id
        WHERE u.id=?`, [idAgent]
    );
    const [[sup]] = await db.query(
      `SELECT u.id, u.nom, u.prenom, u.nom_utilisateur AS login, u.email, u.telephone
         FROM b_r_superviseur_agent r JOIN b_utilisateur u ON r.id_SUPERVISEUR=u.id
        WHERE r.id_AGENT=? LIMIT 1`, [idAgent]
    );
    // Droit d'agir sur le plan d'action : la règle réelle de l'évaluation (droit « agir » :
    // évaluateur, superviseur de l'agent, evaluation.voir_tous sur sa portée, admin).
    // Résumé par évaluation (affiché dans l'en-tête de chaque panneau) :
    // appel, évaluateur, catégories en échec (score / seuil), plan d'action.
    const EPS = 0.01;
    const reussie = (c) => (c.comparateur === ">" ? Number(c.score_obtenu) > Number(c.seuil_reussite) - EPS
      : Number(c.score_obtenu) >= Number(c.seuil_reussite) - EPS);
    agent.evaluations = await Promise.all(agent.evaluations.map(async (e) => {
      const [[ev]] = await db.query(
        `SELECT e.id, e.id_agent, e.id_evaluateur, e.id_site, e.statut, e.identifiant_appel, e.date_evaluation,
                TRIM(CONCAT(IFNULL(u.prenom,''),' ',IFNULL(u.nom,''))) AS evaluateur
           FROM b_evaluation e LEFT JOIN b_utilisateur u ON u.id = e.id_evaluateur WHERE e.id=?`, [e.id]
      );
      const d = ev ? await droitsEvaluation(userId, ev) : { agir: false };
      const [cats] = await db.query(
        `SELECT libelle, score_obtenu, seuil_reussite, comparateur, critique
           FROM b_evaluation_categorie WHERE id_evaluation=? ORDER BY ordre, id`, [e.id]
      );
      const [[pa]] = await db.query(
        `SELECT COUNT(*) AS nb, SUM(date_realisation IS NOT NULL) AS realisees
           FROM b_eval_plan_action_ligne WHERE id_evaluation=?`, [e.id]
      );
      const nbPa = Number(pa.nb || 0), nbReal = Number(pa.realisees || 0);
      return {
        ...e,
        peut_plan: !!d.agir,
        identifiant_appel: ev ? ev.identifiant_appel : null,
        date_evaluation: ev ? ev.date_evaluation : null,
        evaluateur: ev ? ev.evaluateur || null : null,
        nb_categories: cats.length,
        categories_echec: cats.filter((c) => c.score_obtenu !== null && !reussie(c)).map((c) => ({
          libelle: c.libelle, score: Number(c.score_obtenu), seuil: Number(c.seuil_reussite), critique: !!Number(c.critique),
        })),
        plan_action: { nb: nbPa, realisees: nbReal, etat: !nbPa ? "AUCUN" : nbReal >= nbPa ? "TERMINE" : "EN_COURS" },
      };
    }));

    return res.status(200).json({ agent, infos_agent: ag || null, superviseur: sup || null });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors du chargement du détail." }); }
};

// Superviseurs (pour le filtre équipe) : limités à la portée visible.
const getSuperviseurs = async (req, res) => {
  try {
    const { voirTous, siteImpose } = await porteePole(req.auth.userId);
    if (!voirTous) return res.status(200).json([]);
    const [rows] = await db.query(
      `SELECT DISTINCT u.id, u.nom, u.prenom
         FROM b_r_superviseur_agent r
         JOIN b_utilisateur u ON r.id_SUPERVISEUR=u.id
         JOIN b_utilisateur ag ON r.id_AGENT=ag.id
        ${siteImpose !== null ? "WHERE ag.id_Site=?" : ""}
        ORDER BY u.nom`, siteImpose !== null ? [siteImpose] : []
    );
    return res.status(200).json(rows);
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur." }); }
};

module.exports = { getRapportAgentsPole, getAgentPoleDetail, getSuperviseurs, chargerPole };
