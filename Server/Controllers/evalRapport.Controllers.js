// =====================================================================
// Module ÉVALUATION QUALITÉ (cahier) — Reporting (Phase 7, F.40bis)
// Identification des agents en échec répété (« agents en pôle ») selon 3
// critères. Ne portent que sur les évaluations terminées, actives, de type
// Évaluation, ressources humaines.
// =====================================================================
const db = require("../config/db");

const moisIndex = (d) => { const x = new Date(d); return x.getFullYear() * 12 + x.getMonth(); };
const moisLabel = (d) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}`; };

const getRapportAgentsPole = async (req, res) => {
  const q = req.query;
  try {
    const where = [
      "e.statut='TERMINE'", "e.actif=1", "e.conclusion='ECHEC'",
      "e.type_ressource='HUMAINE'", "t.code='EVALUATION'", "e.id_agent IS NOT NULL",
    ];
    const params = [];
    if (q.id_site) { where.push("e.id_site=?"); params.push(q.id_site); }
    if (q.id_programme) { where.push("e.id_programme=?"); params.push(q.id_programme); }
    if (q.date_debut) { where.push("e.date_appel>=?"); params.push(q.date_debut); }
    if (q.date_fin) { where.push("e.date_appel<=?"); params.push(q.date_fin + " 23:59:59"); }
    if (q.id_superviseur) {
      where.push("e.id_agent IN (SELECT id_AGENT FROM b_r_superviseur_agent WHERE id_SUPERVISEUR=?)");
      params.push(q.id_superviseur);
    }

    const [evals] = await db.query(
      `SELECT e.id, e.id_agent, e.date_appel, e.conclusion,
              ag.nom, ag.prenom, ag.nom_utilisateur AS login,
              pr.nom AS programme, s.nom AS site
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

    // Plans d'action rattachés aux évaluations en échec
    const evalIds = evals.map((e) => e.id);
    const planMap = {};
    if (evalIds.length) {
      const [plans] = await db.query(
        `SELECT pl.id_evaluation, pa.libelle AS action, st.libelle AS statut,
                pl.date_attendue, pl.commentaire, k.libelle AS kpi,
                u.nom AS porteur_nom, u.prenom AS porteur_prenom
           FROM b_eval_plan_action_ligne pl
           LEFT JOIN b_eval_ref_action_pa pa ON pl.id_action=pa.id
           LEFT JOIN b_eval_ref_statut_pa st ON pl.id_statut=st.id
           LEFT JOIN b_eval_ref_kpi k ON pl.id_kpi=k.id
           LEFT JOIN b_utilisateur u ON pl.id_porteur=u.id
          WHERE pl.id_evaluation IN (?)
          ORDER BY pl.id`, [evalIds]
      );
      plans.forEach((p) => {
        (planMap[p.id_evaluation] ||= []).push({
          action: p.action, statut: p.statut, date_attendue: p.date_attendue,
          kpi: p.kpi, commentaire: p.commentaire,
          porteur: `${p.porteur_nom || ""} ${p.porteur_prenom || ""}`.trim() || null,
        });
      });
    }

    // superviseur par agent
    const [sups] = await db.query(
      `SELECT r.id_AGENT, u.nom, u.prenom FROM b_r_superviseur_agent r LEFT JOIN b_utilisateur u ON r.id_SUPERVISEUR=u.id`
    );
    const supMap = {};
    sups.forEach((s) => (supMap[s.id_AGENT] = `${s.nom || ""} ${s.prenom || ""}`.trim()));

    // regroupement par agent
    const parAgent = {};
    for (const e of evals) {
      if (!parAgent[e.id_agent]) {
        parAgent[e.id_agent] = {
          id: e.id_agent, nom: e.nom, prenom: e.prenom, login: e.login,
          programme: e.programme, site: e.site, superviseur: supMap[e.id_agent] || "—",
          evaluations: [], mois: {}, critique3: false,
        };
      }
      const a = parAgent[e.id_agent];
      a.evaluations.push({ id: e.id, date_appel: e.date_appel, critiques_decochees: critMap[e.id] || 0, plans: planMap[e.id] || [] });
      const ml = moisLabel(e.date_appel);
      a.mois[ml] = (a.mois[ml] || 0) + 1;
      if ((critMap[e.id] || 0) >= 3) a.critique3 = true;
    }

    const resultat = [];
    for (const id in parAgent) {
      const a = parAgent[id];
      const criteres = [];
      // Critère 1 : échec sur 2 mois consécutifs
      const idxs = [...new Set(a.evaluations.map((x) => moisIndex(x.date_appel)))].sort((x, y) => x - y);
      let consecutifs = false;
      for (let i = 1; i < idxs.length; i++) if (idxs[i] - idxs[i - 1] === 1) consecutifs = true;
      if (consecutifs) criteres.push("Échec sur 2 mois consécutifs");
      // Critère 2 : au moins 2 échecs dans un même mois
      if (Object.values(a.mois).some((n) => n >= 2)) criteres.push("Échec répété dans le mois");
      // Critère 3 : erreurs critiques cumulées
      if (a.critique3) criteres.push("Erreurs critiques cumulées (≥3)");

      if (criteres.length > 0) {
        resultat.push({
          id: a.id, nom: a.nom, prenom: a.prenom, login: a.login,
          programme: a.programme, site: a.site, superviseur: a.superviseur,
          criteres, nb_evaluations: a.evaluations.length, evaluations: a.evaluations,
        });
      }
    }
    resultat.sort((x, y) => y.nb_evaluations - x.nb_evaluations);
    return res.status(200).json(resultat);
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors du chargement du rapport." }); }
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

module.exports = { getRapportAgentsPole, getSuperviseurs };
