// =====================================================================
// Socle commun S5 — Contrôle d'habilitation (module + action)
// Trajectoire Annexe A : d'abord OBSERVATION (aucun refus, journalisation
// des accès qui SERAIENT refusés), puis ACTIF (refus 403).
//
// Permissions effectives d'un utilisateur =
//   permissions de son rôle (b_role via b_fonction.Role_Associe)
//   + droits complémentaires GRANT (b_utilisateur_permission)
//   − droits complémentaires DENY.
// R_ADMI est traité comme super-utilisateur (toutes permissions).
//
// Usage : router.post("/x", auth, permission("EVALUATION","CREER"), ctrl.x)
// Plusieurs actions possibles (il suffit d'en détenir une) :
//         permission("QUIZ", ["PARTICIPER","LIRE"])
// Plusieurs modules possibles (codes complets, il suffit d'en détenir un) :
//         permission(["reporting.lire","chargement.verifier"])
// =====================================================================
const db = require("../config/db");

let cacheMode = null, cacheModeAt = 0;
const getMode = async () => {
  if (cacheMode && Date.now() - cacheModeAt < 30000) return cacheMode;
  try {
    const [[r]] = await db.query(
      "SELECT valeur FROM b_param_habilitation WHERE cle='mode_controle'"
    );
    cacheMode = (r && r.valeur) || "OBSERVATION";
  } catch { cacheMode = "OBSERVATION"; }
  cacheModeAt = Date.now();
  return cacheMode;
};

// Permissions effectives (Set de codes "module.action") pour un utilisateur
const permissionsEffectives = async (userId) => {
  const [[u]] = await db.query(
    `SELECT f.Role_Associe AS role
       FROM b_utilisateur u LEFT JOIN b_fonction f ON u.id_Fonction=f.id
      WHERE u.id=?`, [userId]
  );
  const role = u ? u.role : null;
  const set = new Set();
  if (role) {
    const [rows] = await db.query(
      `SELECT p.code FROM b_role r
         JOIN b_role_permission rp ON rp.id_role=r.id
         JOIN b_permission p ON p.id=rp.id_permission
        WHERE r.code=? AND p.etat='ACTIF'`, [role]
    );
    rows.forEach((x) => set.add(x.code));
  }
  const [comp] = await db.query(
    `SELECT p.code, up.sens FROM b_utilisateur_permission up
       JOIN b_permission p ON p.id=up.id_permission
      WHERE up.id_utilisateur=?
        AND (up.date_fin IS NULL OR up.date_fin >= CURDATE())`, [userId] // dérogation expirée : ignorée
  );
  comp.forEach((x) => (x.sens === "DENY" ? set.delete(x.code) : set.add(x.code)));
  return { role, set };
};

const permission = (module, action) => async (req, res, next) => {
  const codes = Array.isArray(module) && action === undefined
    ? module.map((c) => String(c).toLowerCase())
    : [].concat(action).map((a) => (module + "." + a).toLowerCase());
  const code = codes.join(" ou ");
  const userId = req.auth && req.auth.userId;
  try {
    const { role, set } = await permissionsEffectives(userId);
    const autorise = role === "R_ADMI" || codes.some((c) => set.has(c));
    if (autorise) return next();

    const mode = await getMode();
    if (mode === "ACTIF") {
      return res.status(403).json({ message: "Accès refusé : habilitation manquante (" + code + ")." });
    }
    // OBSERVATION : on journalise mais on laisse passer
    db.query(
      `INSERT INTO b_habilitation_observation (id_utilisateur, role_code, permission, methode, chemin)
       VALUES (?,?,?,?,?)`,
      [userId || null, role || null, code, req.method, req.originalUrl]
    ).catch(() => {});
    return next();
  } catch (e) {
    console.log("permission mw error:", e.message);
    return next(); // ne jamais bloquer sur une erreur du contrôle en phase de mise en place
  }
};

// Accès au module HABILITATION (voir ET agir) : exige habilitation.lire ET
// habilitation.gerer réunies — ou R_ADMI. Bloque TOUJOURS (403) si la condition
// n'est pas remplie, indépendamment du mode OBSERVATION/ACTIF (HABILITATIONS 7 :
// « ne doit pas voir, ni faire d'action » avec la seule permission lire).
const exigerHabilitationGestion = async (req, res, next) => {
  const userId = req.auth && req.auth.userId;
  try {
    const { role, set } = await permissionsEffectives(userId);
    if (role === "R_ADMI" || (set.has("habilitation.lire") && set.has("habilitation.gerer"))) {
      return next();
    }
    return res.status(403).json({ message: "Accès refusé : gestion des habilitations requise (habilitation.lire + habilitation.gerer)." });
  } catch (e) {
    console.log("exigerHabilitationGestion error:", e.message);
    return res.status(403).json({ message: "Accès refusé." });
  }
};

module.exports = { permission, permissionsEffectives, exigerHabilitationGestion };
