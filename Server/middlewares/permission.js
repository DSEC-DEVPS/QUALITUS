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
      WHERE up.id_utilisateur=?`, [userId]
  );
  comp.forEach((x) => (x.sens === "DENY" ? set.delete(x.code) : set.add(x.code)));
  return { role, set };
};

const permission = (module, action) => async (req, res, next) => {
  const code = (module + "." + action).toLowerCase();
  const userId = req.auth && req.auth.userId;
  try {
    const { role, set } = await permissionsEffectives(userId);
    const autorise = role === "R_ADMI" || set.has(code);
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

module.exports = { permission, permissionsEffectives };
