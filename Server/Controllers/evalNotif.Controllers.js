// =====================================================================
// Notifications — lecture (socle S6, mécanisme unique b_notification)
// Présente à l'utilisateur ses notifications de module (nature_objet non nul :
// EVALUATION, PLAN_ACTION, OPTION_BI, OPTION_COACHING, …). Les notifications
// de fiche (nature_objet NULL) conservent leur flux propre et ne sont pas
// mélangées ici.
// =====================================================================
const db = require("../config/db");

const getMesNotifications = async (req, res) => {
  const userId = req.auth.userId;
  try {
    const [rows] = await db.query(
      `SELECT n.id, n.id_objet AS id_evaluation, n.nature_objet, n.titre, n.message, n.lu,
              n.dateReception AS dateCreation, n.dateLecture, n.url,
              e.conclusion, e.type_ressource
       FROM b_notification n
       LEFT JOIN b_evaluation e ON n.nature_objet='EVALUATION' AND n.id_objet=e.id
       WHERE n.id_UTILISATEUR = ? AND n.nature_objet IS NOT NULL
       ORDER BY n.lu ASC, n.dateReception DESC`, [userId]
    );
    return res.status(200).json(rows);
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors du chargement." }); }
};

const countNonLues = async (req, res) => {
  try {
    const [[r]] = await db.query(
      `SELECT COUNT(*) AS n FROM b_notification WHERE id_UTILISATEUR = ? AND nature_objet IS NOT NULL AND lu = 0`,
      [req.auth.userId]
    );
    return res.status(200).json({ count: r.n });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur." }); }
};

const marquerLu = async (req, res) => {
  try {
    await db.query(
      `UPDATE b_notification SET lu = 1, dateLecture = NOW() WHERE id = ? AND id_UTILISATEUR = ?`,
      [req.params.id, req.auth.userId]
    );
    return res.status(200).json({ message: "Marquée comme lue." });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur." }); }
};

const marquerToutLu = async (req, res) => {
  try {
    await db.query(
      `UPDATE b_notification SET lu = 1, dateLecture = NOW() WHERE id_UTILISATEUR = ? AND nature_objet IS NOT NULL AND lu = 0`,
      [req.auth.userId]
    );
    return res.status(200).json({ message: "Toutes marquées comme lues." });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur." }); }
};

module.exports = { getMesNotifications, countNonLues, marquerLu, marquerToutLu };
