// =====================================================================
// Module ÉVALUATION QUALITÉ (cahier) — Reporting (Phase 7, F.40bis)
// Identification des agents en échec répété (« agents en pôle ») selon 3
// critères. Ne portent que sur les évaluations terminées, actives, de type
// Évaluation, ressources humaines.
// =====================================================================
const db = require("../config/db");
const { permissionsEffectives } = require("../middlewares/permission");

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

// Détermine la portée d'accès de l'utilisateur courant.
const porteePole = async (userId) => {
  const { role, set } = await permissionsEffectives(userId);
  const voirTous = role === "R_ADMI" || set.has("agent_pole.voir_tous");
  return { role, voirTous };
};

const getRapportAgentsPole = async (req, res) => {
  const q = req.query || {};
  const userId = req.auth.userId;
  try {
    const { voirTous } = await porteePole(userId);
    const where = [];
    const params = [];
    if (voirTous) {
      // Filtres complets
      if (q.id_site) { where.push("e.id_site=?"); params.push(Number(q.id_site)); }
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
    return res.status(200).json({ voir_tous: voirTous, agents: resultat });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors du chargement du rapport." }); }
};

// Détail d'un agent en pôle : évaluations déclenchantes, critères, infos agent +
// superviseur, et droit d'agir sur le plan d'action par évaluation.
const getAgentPoleDetail = async (req, res) => {
  const idAgent = Number(req.params.id);
  const userId = req.auth.userId;
  try {
    const { voirTous } = await porteePole(userId);
    // Contrôle d'accès : hors « voir tous », seul le superviseur de l'agent y accède.
    if (!voirTous) {
      const [[lien]] = await db.query(
        "SELECT 1 AS ok FROM b_r_superviseur_agent WHERE id_SUPERVISEUR=? AND id_AGENT=?", [userId, idAgent]
      );
      if (!lien) return res.status(403).json({ message: "Accès limité à vos agents." });
    }
    const liste = await chargerPole(["e.id_agent=?"], [idAgent]);
    const agent = liste[0];
    if (!agent) return res.status(404).json({ message: "Cet agent n'est pas en pôle sur ce périmètre." });

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
    // Droit d'agir sur le plan d'action de chaque éval : évaluateur de l'éval OU superviseur de l'agent
    const estSup = sup && Number(sup.id) === Number(userId);
    agent.evaluations = agent.evaluations.map((e) => ({
      ...e,
      peut_plan: estSup || Number(e.id_evaluateur) === Number(userId) || voirTous,
    }));

    return res.status(200).json({ agent, infos_agent: ag || null, superviseur: sup || null });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors du chargement du détail." }); }
};

// Superviseurs (pour le filtre équipe)
const getSuperviseurs = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT DISTINCT u.id, u.nom, u.prenom FROM b_r_superviseur_agent r JOIN b_utilisateur u ON r.id_SUPERVISEUR=u.id ORDER BY u.nom`
    );
    return res.status(200).json(rows);
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur." }); }
};

module.exports = { getRapportAgentsPole, getAgentPoleDetail, getSuperviseurs };
