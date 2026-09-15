// =====================================================================
// Socle commun S5 — Administration des habilitations (matrice des droits)
// Lecture du référentiel des permissions, de la matrice rôle↔permission,
// pilotage du mode de contrôle (OBSERVATION|ACTIF), journal d'observation
// et droits complémentaires. Exposition des permissions effectives au client.
// =====================================================================
const db = require("../config/db");
const { permissionsEffectives } = require("../middlewares/permission");

// --- Référentiel des permissions -------------------------------------
const getPermissions = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, module, action, code, libelle, etat FROM b_permission ORDER BY module, action"
    );
    return res.status(200).json(rows);
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur." }); }
};

// --- Rôles (+ nb de permissions) -------------------------------------
const getRoles = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT r.id, r.code, r.libelle, r.etat,
              (SELECT COUNT(*) FROM b_role_permission rp WHERE rp.id_role=r.id) AS nb_permissions
         FROM b_role r ORDER BY r.code`
    );
    return res.status(200).json(rows);
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur." }); }
};

// --- Matrice complète rôle × permission ------------------------------
const getMatrice = async (req, res) => {
  try {
    const [roles] = await db.query("SELECT id, code, libelle FROM b_role ORDER BY code");
    const [perms] = await db.query("SELECT id, module, action, code, libelle FROM b_permission WHERE etat='ACTIF' ORDER BY module, action");
    const [links] = await db.query("SELECT id_role, id_permission FROM b_role_permission");
    const grid = {};
    links.forEach((l) => { (grid[l.id_role] ||= {})[l.id_permission] = true; });
    return res.status(200).json({ roles, permissions: perms, grid });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur." }); }
};

// --- Basculer une case de la matrice ---------------------------------
const toggleRolePermission = async (req, res) => {
  const { idRole, idPermission } = req.params;
  const { actif } = req.body;
  try {
    if (actif) {
      await db.query("INSERT IGNORE INTO b_role_permission (id_role, id_permission) VALUES (?,?)", [idRole, idPermission]);
    } else {
      await db.query("DELETE FROM b_role_permission WHERE id_role=? AND id_permission=?", [idRole, idPermission]);
    }
    return res.status(200).json({ message: "Matrice mise à jour." });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur." }); }
};

// --- Mode de contrôle (OBSERVATION | ACTIF) --------------------------
const getMode = async (req, res) => {
  try {
    const [[r]] = await db.query("SELECT valeur FROM b_param_habilitation WHERE cle='mode_controle'");
    return res.status(200).json({ mode: (r && r.valeur) || "OBSERVATION" });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur." }); }
};

const setMode = async (req, res) => {
  const { mode } = req.body;
  if (!["OBSERVATION", "ACTIF"].includes(mode))
    return res.status(400).json({ message: "Mode invalide (OBSERVATION|ACTIF)." });
  try {
    await db.query(
      "INSERT INTO b_param_habilitation (cle, valeur) VALUES ('mode_controle', ?) ON DUPLICATE KEY UPDATE valeur=VALUES(valeur)",
      [mode]
    );
    return res.status(200).json({ message: "Mode de contrôle : " + mode });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur." }); }
};

// --- Journal d'observation (accès qui SERAIENT refusés) --------------
const getObservations = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT permission, role_code, COUNT(*) AS occurrences, MAX(dateReception) AS derniere
         FROM b_habilitation_observation
        GROUP BY permission, role_code
        ORDER BY occurrences DESC, derniere DESC LIMIT 200`
    );
    return res.status(200).json(rows);
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur." }); }
};

// --- Permissions effectives de l'utilisateur courant (Étape 4) -------
const getMesPermissions = async (req, res) => {
  try {
    const { role, set } = await permissionsEffectives(req.auth.userId);
    return res.status(200).json({ role, permissions: Array.from(set), admin: role === "R_ADMI" });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur." }); }
};


// --- Droits complémentaires par utilisateur -------------------------------
// Recherche d'utilisateurs (pour le sélecteur de l'écran d'administration)
const rechercherUtilisateurs = async (req, res) => {
  const q = "%" + (req.query.q || "") + "%";
  try {
    const [rows] = await db.query(
      `SELECT u.id, u.nom, u.prenom, u.nom_utilisateur, f.Role_Associe AS role, f.nom AS fonction
         FROM b_utilisateur u LEFT JOIN b_fonction f ON u.id_Fonction=f.id
        WHERE u.nom LIKE ? OR u.prenom LIKE ? OR u.nom_utilisateur LIKE ?
        ORDER BY u.nom, u.prenom LIMIT 50`, [q, q, q]
    );
    return res.status(200).json(rows);
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur." }); }
};

// Détail des droits d'un utilisateur : base (rôle) + dérogations + effectif
const getDroitsUtilisateur = async (req, res) => {
  const id = req.params.id;
  try {
    const [[u]] = await db.query(
      `SELECT u.id, u.nom, u.prenom, f.Role_Associe AS role, f.nom AS fonction
         FROM b_utilisateur u LEFT JOIN b_fonction f ON u.id_Fonction=f.id WHERE u.id=?`, [id]
    );
    if (!u) return res.status(404).json({ message: "Utilisateur introuvable." });
    const [perms] = await db.query(
      "SELECT id, module, action, code, libelle FROM b_permission WHERE etat='ACTIF' ORDER BY module, action"
    );
    // permissions du rôle
    const rolePerms = new Set();
    if (u.role) {
      const [rp] = await db.query(
        `SELECT p.id FROM b_role r JOIN b_role_permission rp ON rp.id_role=r.id
           JOIN b_permission p ON p.id=rp.id_permission WHERE r.code=?`, [u.role]
      );
      rp.forEach(x => rolePerms.add(x.id));
    }
    // dérogations
    const [ov] = await db.query(
      "SELECT id_permission, sens FROM b_utilisateur_permission WHERE id_utilisateur=?", [id]
    );
    const overrides = {};
    ov.forEach(x => (overrides[x.id_permission] = x.sens));
    const items = perms.map(p => {
      const parRole = rolePerms.has(p.id);
      const sens = overrides[p.id] || null; // GRANT | DENY | null
      const effectif = u.role === "R_ADMI" ? true : (sens === "GRANT" ? true : sens === "DENY" ? false : parRole);
      return { ...p, parRole, sens, effectif };
    });
    return res.status(200).json({ utilisateur: u, admin: u.role === "R_ADMI", permissions: items });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur." }); }
};

// Positionne / retire une dérogation (GRANT, DENY, ou NONE pour hériter du rôle)
const setDroitUtilisateur = async (req, res) => {
  const { id, idPermission } = req.params;
  const { sens } = req.body; // 'GRANT' | 'DENY' | 'NONE'
  if (!["GRANT", "DENY", "NONE"].includes(sens))
    return res.status(400).json({ message: "Sens invalide (GRANT|DENY|NONE)." });
  try {
    if (sens === "NONE") {
      await db.query(
        "DELETE FROM b_utilisateur_permission WHERE id_utilisateur=? AND id_permission=?", [id, idPermission]
      );
    } else {
      await db.query(
        `INSERT INTO b_utilisateur_permission (id_utilisateur, id_permission, sens, attribue_par)
         VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE sens=VALUES(sens), attribue_par=VALUES(attribue_par)`,
        [id, idPermission, sens, req.auth.userId]
      );
    }
    return res.status(200).json({ message: "Dérogation mise à jour." });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur." }); }
};

module.exports = {
  getPermissions, getRoles, getMatrice, toggleRolePermission,
  getMode, setMode, getObservations, getMesPermissions,
  rechercherUtilisateurs, getDroitsUtilisateur, setDroitUtilisateur,
};
