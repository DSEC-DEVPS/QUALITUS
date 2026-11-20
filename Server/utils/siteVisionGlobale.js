// =====================================================================
// Site à vision globale (paramètre b_param_habilitation.site_vision_globale).
// Les utilisateurs de ce site (ex. DSFO) — et les administrateurs — ont une
// vision de tous les sites là où une permission « voir tout » le prévoit
// (exports Évaluation, evaluation.voir_tous) ; les autres restent sur leur site.
// =====================================================================
const db = require("../config/db");

const PARAM_SITE_GLOBAL = "site_vision_globale";

/** { idSite, visionGlobale } de l'utilisateur (`admin` : rôle R_ADMI). */
const porteeSite = async (userId, admin = false) => {
  const [[me]] = await db.query(`SELECT id_Site FROM b_utilisateur WHERE id = ?`, [userId]);
  const [[param]] = await db.query(`SELECT valeur FROM b_param_habilitation WHERE cle = ?`, [PARAM_SITE_GLOBAL]);
  const siteGlobal = param && /^\d+$/.test(String(param.valeur)) ? Number(param.valeur) : null;
  const idSite = me && me.id_Site != null ? Number(me.id_Site) : null;
  return { idSite, visionGlobale: admin || (siteGlobal !== null && idSite === siteGlobal) };
};

module.exports = { porteeSite, PARAM_SITE_GLOBAL };
