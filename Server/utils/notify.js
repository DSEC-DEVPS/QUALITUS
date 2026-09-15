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

module.exports = { emit };
