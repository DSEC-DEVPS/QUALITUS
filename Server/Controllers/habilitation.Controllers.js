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
    // R_ADMI est super-utilisateur côté serveur : on lui renvoie TOUTES les
    // permissions du référentiel (et pas seulement celles enregistrées pour son
    // rôle), sinon les menus d'une permission non attribuée à R_ADMI en base
    // (ex. compte.gerer, assignation.gerer) restent masqués à l'écran.
    if (role === "R_ADMI") {
      const [toutes] = await db.query("SELECT code FROM b_permission");
      toutes.forEach((p) => p.code && set.add(String(p.code).toLowerCase()));
    }
    return res.status(200).json({ role, permissions: Array.from(set), admin: role === "R_ADMI" });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur." }); }
};


// --- Actions groupées de la matrice : tout un module pour un rôle --------
const setModuleRole = async (req, res) => {
  const idRole = Number(req.params.idRole);
  const module = String(req.params.module || "");
  const actif = !!(req.body && req.body.actif);
  try {
    const [[r]] = await db.query("SELECT code FROM b_role WHERE id=?", [idRole]);
    if (!r) return res.status(404).json({ message: "Rôle introuvable." });
    if (r.code === "R_ADMI") return res.status(400).json({ message: "L'administrateur dispose de toutes les permissions." });
    const [perms] = await db.query("SELECT id FROM b_permission WHERE etat='ACTIF' AND module=?", [module]);
    if (!perms.length) return res.status(404).json({ message: "Module introuvable." });
    const ids = perms.map((p) => p.id);
    let modifiees;
    if (actif) {
      const [x] = await db.query(
        `INSERT IGNORE INTO b_role_permission (id_role, id_permission) VALUES ${ids.map(() => "(?,?)").join(",")}`,
        ids.flatMap((id) => [idRole, id])
      );
      modifiees = x.affectedRows;
    } else {
      const [x] = await db.query(
        `DELETE FROM b_role_permission WHERE id_role=? AND id_permission IN (${ids.map(() => "?").join(",")})`,
        [idRole, ...ids]
      );
      modifiees = x.affectedRows;
    }
    return res.status(200).json({ message: "Matrice mise à jour.", modifiees });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur." }); }
};

// --- Droits complémentaires par utilisateur -------------------------------
// Une dérogation est « active » tant que sa date de fin n'est pas dépassée.
const ACTIVE = "(up.date_fin IS NULL OR up.date_fin >= CURDATE())";
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Motif / date de fin envoyés par l'écran : contrôlés et normalisés. */
const lireMotifEcheance = (body) => {
  const motif = body && body.motif ? String(body.motif).trim().slice(0, 255) : null;
  let dateFin = body && body.date_fin ? String(body.date_fin).slice(0, 10) : null;
  if (dateFin && !DATE_RE.test(dateFin)) return { erreur: "Date de fin invalide (AAAA-MM-JJ)." };
  if (dateFin) {
    const auj = new Date();
    const p = (n) => String(n).padStart(2, "0");
    const iso = `${auj.getFullYear()}-${p(auj.getMonth() + 1)}-${p(auj.getDate())}`;
    if (dateFin < iso) return { erreur: "La date de fin ne peut pas être dans le passé." };
  }
  return { motif: motif || null, dateFin: dateFin || null };
};

// Recherche d'utilisateurs (pour le sélecteur de l'écran d'administration)
const rechercherUtilisateurs = async (req, res) => {
  const q = "%" + (req.query.q || "") + "%";
  try {
    const [rows] = await db.query(
      `SELECT u.id, u.nom, u.prenom, u.nom_utilisateur, f.Role_Associe AS role, f.nom AS fonction, s.nom AS site
         FROM b_utilisateur u LEFT JOIN b_fonction f ON u.id_Fonction=f.id LEFT JOIN B_SITE s ON s.id = u.id_Site
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
      `SELECT u.id, u.nom, u.prenom, u.nom_utilisateur, u.status, f.Role_Associe AS role, f.nom AS fonction,
              r.libelle AS role_libelle, s.nom AS site
         FROM b_utilisateur u LEFT JOIN b_fonction f ON u.id_Fonction=f.id
         LEFT JOIN b_role r ON r.code = f.Role_Associe LEFT JOIN B_SITE s ON s.id = u.id_Site
        WHERE u.id=?`, [id]
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
    // dérogations (avec auteur, dates, motif, échéance)
    const [ov] = await db.query(
      `SELECT up.id_permission, up.sens, up.motif, DATE_FORMAT(up.date_fin, '%Y-%m-%d') AS date_fin,
              COALESCE(up.dateModification, up.dateCreation) AS date_maj, ${ACTIVE} AS active,
              TRIM(CONCAT(COALESCE(a.prenom,''), ' ', COALESCE(a.nom,''))) AS auteur
         FROM b_utilisateur_permission up LEFT JOIN b_utilisateur a ON a.id = up.attribue_par
        WHERE up.id_utilisateur=?`, [id]
    );
    const overrides = {};
    ov.forEach(x => (overrides[x.id_permission] = x));
    const admin = u.role === "R_ADMI";
    const items = perms.map(p => {
      const parRole = rolePerms.has(p.id);
      const d = overrides[p.id] || null;
      const sens = d ? d.sens : null; // GRANT | DENY | null
      const expiree = !!d && !Number(d.active);
      const sensActif = d && !expiree ? sens : null;
      const effectif = admin ? true : (sensActif === "GRANT" ? true : sensActif === "DENY" ? false : parRole);
      return {
        ...p, parRole, sens, effectif, expiree,
        motif: d ? d.motif : null, date_fin: d ? d.date_fin : null,
        auteur: d ? d.auteur || null : null, date_maj: d ? d.date_maj : null,
      };
    });
    const actives = ov.filter(x => Number(x.active));
    const derniere = ov.slice().sort((a, b) => new Date(b.date_maj) - new Date(a.date_maj))[0] || null;
    const resume = {
      plus: actives.filter(x => x.sens === "GRANT").length,
      moins: actives.filter(x => x.sens === "DENY").length,
      expirees: ov.length - actives.length,
      effectifs: items.filter(i => i.effectif).length,
      total: items.length,
      derniere: derniere ? { auteur: derniere.auteur || null, date: derniere.date_maj } : null,
    };
    return res.status(200).json({ utilisateur: u, admin, resume, permissions: items });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur." }); }
};

/** Enregistre (ou retire, sens NONE) une dérogation. */
const ecrireDerogation = async (id, idPermission, sens, motif, dateFin, auteur) => {
  if (sens === "NONE") {
    const [x] = await db.query("DELETE FROM b_utilisateur_permission WHERE id_utilisateur=? AND id_permission=?", [id, idPermission]);
    return x.affectedRows;
  }
  const [x] = await db.query(
    `INSERT INTO b_utilisateur_permission (id_utilisateur, id_permission, sens, motif, date_fin, attribue_par)
     VALUES (?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE sens=VALUES(sens), motif=VALUES(motif), date_fin=VALUES(date_fin),
                             attribue_par=VALUES(attribue_par), dateModification=NOW()`,
    [id, idPermission, sens, motif, dateFin, auteur]
  );
  return x.affectedRows ? 1 : 0;
};

// Positionne / retire une dérogation (GRANT, DENY, ou NONE pour hériter du rôle)
const setDroitUtilisateur = async (req, res) => {
  const { id, idPermission } = req.params;
  const { sens } = req.body; // 'GRANT' | 'DENY' | 'NONE'
  if (!["GRANT", "DENY", "NONE"].includes(sens))
    return res.status(400).json({ message: "Sens invalide (GRANT|DENY|NONE)." });
  const me = lireMotifEcheance(req.body);
  if (me.erreur) return res.status(400).json({ message: me.erreur });
  try {
    await ecrireDerogation(id, idPermission, sens, me.motif, me.dateFin, req.auth.userId);
    return res.status(200).json({ message: "Dérogation mise à jour." });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur." }); }
};

// Même dérogation pour toutes les permissions d'un module
const setModuleUtilisateur = async (req, res) => {
  const id = Number(req.params.id);
  const module = String(req.params.module || "");
  const { sens } = req.body || {};
  if (!["GRANT", "DENY", "NONE"].includes(sens))
    return res.status(400).json({ message: "Sens invalide (GRANT|DENY|NONE)." });
  const me = lireMotifEcheance(req.body);
  if (me.erreur) return res.status(400).json({ message: me.erreur });
  try {
    const [perms] = await db.query("SELECT id FROM b_permission WHERE etat='ACTIF' AND module=?", [module]);
    if (!perms.length) return res.status(404).json({ message: "Module introuvable." });
    let modifiees = 0;
    for (const p of perms) modifiees += await ecrireDerogation(id, p.id, sens, me.motif, me.dateFin, req.auth.userId);
    return res.status(200).json({ message: "Dérogations mises à jour.", modifiees });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur." }); }
};

// Supprime toutes les dérogations d'un utilisateur (retour au rôle)
const resetDroitsUtilisateur = async (req, res) => {
  try {
    const [x] = await db.query("DELETE FROM b_utilisateur_permission WHERE id_utilisateur=?", [req.params.id]);
    return res.status(200).json({ message: "Droits remis au rôle.", supprimees: x.affectedRows });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur." }); }
};

// Liste des sites (filtre des utilisateurs spéciaux)
const getSitesHabilitation = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT id, nom FROM B_SITE ORDER BY nom");
    return res.status(200).json(rows);
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur." }); }
};

// --- Utilisateurs spéciaux : ceux qui ont au moins une dérogation ---------
// Filtres : recherche, rôle, site, type (plus | moins | expirees), permission (code), module.
// export=1 : jusqu'à 5 000 lignes, pour l'export Excel de la liste filtrée.
const getUtilisateursSpeciaux = async (req, res) => {
  try {
    const exporter = String(req.query.export || "") === "1";
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const taille = exporter ? 5000 : Math.min(100, Math.max(1, parseInt(req.query.taille) || 10));
    const offset = exporter ? 0 : (page - 1) * taille;
    const role = req.query.role || null;
    const site = req.query.site ? Number(req.query.site) : null;
    const type = ["plus", "moins", "expirees"].includes(req.query.type) ? req.query.type : null;
    const code = req.query.permission ? String(req.query.permission) : null;
    const module = req.query.module ? String(req.query.module) : null;
    const q = req.query.q ? "%" + req.query.q + "%" : null;

    // Condition sur les dérogations elles-mêmes (type / permission / module)
    const cd = ["up.id_utilisateur = u.id"];
    const pd = [];
    if (type === "plus") cd.push(`up.sens = 'GRANT' AND ${ACTIVE}`);
    if (type === "moins") cd.push(`up.sens = 'DENY' AND ${ACTIVE}`);
    if (type === "expirees") cd.push(`NOT ${ACTIVE}`);
    if (code) { cd.push("p.code = ?"); pd.push(code); }
    if (module) { cd.push("p.module = ?"); pd.push(module); }
    const existe = `EXISTS (SELECT 1 FROM b_utilisateur_permission up JOIN b_permission p ON p.id = up.id_permission WHERE ${cd.join(" AND ")})`;

    const where = [existe];
    const params = [...pd];
    if (role) { where.push("f.Role_Associe=?"); params.push(role); }
    if (site) { where.push("u.id_Site=?"); params.push(site); }
    if (q) { where.push("(u.nom LIKE ? OR u.prenom LIKE ? OR u.nom_utilisateur LIKE ?)"); params.push(q, q, q); }
    const clause = "WHERE " + where.join(" AND ");
    const FROM = "FROM b_utilisateur u LEFT JOIN b_fonction f ON u.id_Fonction=f.id LEFT JOIN B_SITE s ON s.id = u.id_Site";

    const [[tot]] = await db.query(
      `SELECT COUNT(*) AS total,
              COALESCE(SUM((SELECT COUNT(*) FROM b_utilisateur_permission up WHERE up.id_utilisateur=u.id AND up.sens='GRANT' AND ${ACTIVE})), 0) AS plus,
              COALESCE(SUM((SELECT COUNT(*) FROM b_utilisateur_permission up WHERE up.id_utilisateur=u.id AND up.sens='DENY' AND ${ACTIVE})), 0) AS moins,
              COALESCE(SUM((SELECT COUNT(*) FROM b_utilisateur_permission up WHERE up.id_utilisateur=u.id AND NOT ${ACTIVE})), 0) AS expirees
         ${FROM} ${clause}`,
      params
    );
    const [items] = await db.query(
      `SELECT u.id, u.nom, u.prenom, u.nom_utilisateur, f.Role_Associe AS role, f.nom AS fonction, s.nom AS site,
              (SELECT COUNT(*) FROM b_utilisateur_permission up WHERE up.id_utilisateur=u.id AND up.sens='GRANT' AND ${ACTIVE}) AS nb_grant,
              (SELECT COUNT(*) FROM b_utilisateur_permission up WHERE up.id_utilisateur=u.id AND up.sens='DENY' AND ${ACTIVE}) AS nb_deny,
              (SELECT COUNT(*) FROM b_utilisateur_permission up WHERE up.id_utilisateur=u.id AND NOT ${ACTIVE}) AS nb_expirees
         ${FROM} ${clause}
        ORDER BY u.nom, u.prenom
        LIMIT ? OFFSET ?`,
      [...params, taille, offset]
    );
    // Détail des dérogations des utilisateurs de la page
    if (items.length) {
      const ids = items.map((i) => i.id);
      const [ders] = await db.query(
        `SELECT up.id_utilisateur, p.id AS id_permission, p.code, p.module, p.libelle, up.sens, up.motif,
                DATE_FORMAT(up.date_fin, '%Y-%m-%d') AS date_fin, ${ACTIVE} AS active,
                COALESCE(up.dateModification, up.dateCreation) AS date_maj,
                TRIM(CONCAT(COALESCE(a.prenom,''), ' ', COALESCE(a.nom,''))) AS auteur
           FROM b_utilisateur_permission up JOIN b_permission p ON p.id = up.id_permission
           LEFT JOIN b_utilisateur a ON a.id = up.attribue_par
          WHERE up.id_utilisateur IN (${ids.map(() => "?").join(",")})
          ORDER BY p.module, p.action`,
        ids
      );
      const parUser = new Map(ids.map((i) => [i, []]));
      for (const d of ders) {
        parUser.get(d.id_utilisateur).push({
          id_permission: d.id_permission, code: d.code, module: d.module, libelle: d.libelle, sens: d.sens,
          motif: d.motif, date_fin: d.date_fin, expiree: !Number(d.active), date_maj: d.date_maj, auteur: d.auteur || null,
        });
      }
      items.forEach((i) => (i.derogations = parUser.get(i.id) || []));
    }
    return res.status(200).json({
      items, total: Number(tot.total) || 0, page, taille,
      compteurs: { utilisateurs: Number(tot.total) || 0, plus: Number(tot.plus) || 0, moins: Number(tot.moins) || 0, expirees: Number(tot.expirees) || 0 },
    });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur." }); }
};

module.exports = {
  getPermissions, getRoles, getMatrice, toggleRolePermission, setModuleRole,
  getMode, setMode, getObservations, getMesPermissions,
  rechercherUtilisateurs, getDroitsUtilisateur, setDroitUtilisateur, setModuleUtilisateur,
  resetDroitsUtilisateur, getUtilisateursSpeciaux, getSitesHabilitation,
};
