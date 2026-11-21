// =====================================================================
// Périmètre du menu « Gérer les comptes » (compte.gerer) et de la
// permission « Jauge » (compte.jauge).
//  - utilisateur d'un site ordinaire : les comptes de SON site ;
//  - utilisateur du site à vision globale, ou administrateur : tous les sites ;
//  - son propre compte est inclus ; les administrateurs sont toujours exclus.
// Contrôlé ici (et pas seulement par le middleware) car le mode OBSERVATION
// laisse passer toutes les requêtes.
// =====================================================================
const db = require("../config/db");
const { porteeSite } = require("./siteVisionGlobale");

/** Fonction « Administrateur » (ou rôle R_ADMI) : jamais gérable, jamais attribuable. */
const estFonctionAdmin = (nom, role) =>
  String(nom || "").trim().toLowerCase() === "administrateur" || String(role || "").toUpperCase() === "R_ADMI";

/**
 * Utilisateur connecté s'il détient la permission `code` (ou est R_ADMI) :
 * { id, id_Site, role, visionGlobale } ; null sinon.
 */
const habilitationSite = async (userId, code) => {
  const { permissionsEffectives } = require("../middlewares/permission");
  const { role, set } = await permissionsEffectives(userId);
  if (role !== "R_ADMI" && !set.has(code)) return null;
  const [[me]] = await db.query(`SELECT id, id_Site FROM B_UTILISATEUR WHERE id = ?`, [userId]);
  if (!me) return null;
  const { visionGlobale } = await porteeSite(userId, role === "R_ADMI");
  return { ...me, role, visionGlobale };
};

/** Le compte `id` est-il dans le périmètre du gestionnaire ? { utilisateur, estMoi } ou { erreur: 403|404 }. */
const compteGerable = async (gestionnaire, id) => {
  const [[u]] = await db.query(
    `SELECT UT.id, UT.id_Site, FCT.nom AS fonction, FCT.Role_Associe AS role
       FROM B_UTILISATEUR UT LEFT JOIN B_FONCTION FCT ON UT.id_Fonction = FCT.id
      WHERE UT.id = ?`,
    [id]
  );
  if (!u) return { erreur: 404 };
  const estMoi = u.id === gestionnaire.id;
  if (!estMoi && estFonctionAdmin(u.fonction, u.role)) return { erreur: 403 };
  if (!estMoi && !gestionnaire.visionGlobale && (u.id_Site == null || u.id_Site !== gestionnaire.id_Site)) {
    return { erreur: 403 };
  }
  return { utilisateur: u, estMoi };
};

module.exports = { habilitationSite, compteGerable, estFonctionAdmin };
