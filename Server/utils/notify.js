// =====================================================================
// Socle S6 — Mécanisme de notification transverse (unique)
// Émission d'une notification vers UN destinataire, décrite par une
// nature d'objet + un identifiant (fiche, evaluation, plan_action,
// session_calibrage, …). Stockage unifié dans b_notification.
// `executor` = pool (db) ou connexion de transaction (conn) : les deux
// exposent .query().
// =====================================================================
const emit = async (executor, { id_utilisateur, titre, message, type, nature_objet, id_objet = null, url = null }) => {
  if (!id_utilisateur) return;
  await executor.query(
    `INSERT INTO b_notification (titre, message, type, nature_objet, id_objet, dateReception, id_UTILISATEUR, url, lu)
     VALUES (?, ?, ?, ?, ?, NOW(), ?, ?, 0)`,
    [titre || null, message || null, type || nature_objet || "INFO", nature_objet || null, id_objet, id_utilisateur, url]
  );
};

// Destinataires légitimes des notifications d'une évaluation : le créateur
// (id_evaluateur), le superviseur de l'agent évalué, et l'agent lui-même.
// `evaluation` doit contenir id, id_evaluateur, id_agent.
const destinatairesEvaluation = async (executor, evaluation) => {
  const set = new Set();
  if (evaluation.id_evaluateur) set.add(Number(evaluation.id_evaluateur));
  if (evaluation.id_agent) {
    set.add(Number(evaluation.id_agent));
    const [sups] = await executor.query(
      `SELECT id_SUPERVISEUR FROM b_r_superviseur_agent WHERE id_AGENT=?`, [evaluation.id_agent]
    );
    sups.forEach((s) => set.add(Number(s.id_SUPERVISEUR)));
  }
  return [...set].filter((x) => x);
};

// Émet une notification d'évaluation aux SEULS destinataires légitimes
// (pas de broadcast). `exclure` = id d'utilisateur à ne pas notifier (l'auteur).
const emitEvaluation = async (executor, evaluation, { titre, message, url, exclure } = {}) => {
  const dest = await destinatairesEvaluation(executor, evaluation);
  for (const uid of dest) {
    if (exclure && Number(uid) === Number(exclure)) continue;
    await emit(executor, {
      id_utilisateur: uid, titre, message, type: "EVALUATION",
      nature_objet: "EVALUATION", id_objet: evaluation.id, url: url || `/mon-espace/evaluation/executer/${evaluation.id}`,
    });
  }
};

module.exports = { emit, destinatairesEvaluation, emitEvaluation };
