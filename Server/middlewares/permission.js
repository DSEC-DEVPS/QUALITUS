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
const { cachePermissionsMs } = require("../config/parametres");

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

// Permissions effectives (Set de codes "module.action") pour un utilisateur.
// Une seule requête (rôle + permissions du rôle + dérogations) au lieu de trois.
const chargerPermissions = async (userId) => {
  const [rows] = await db.query(
    `SELECT 1 AS etape, f.Role_Associe AS code, NULL AS sens
       FROM b_utilisateur u LEFT JOIN b_fonction f ON u.id_Fonction=f.id
      WHERE u.id=?
     UNION ALL
     SELECT 2, p.code, NULL
       FROM b_utilisateur u
       JOIN b_fonction f ON f.id=u.id_Fonction
       JOIN b_role r ON r.code=f.Role_Associe
       JOIN b_role_permission rp ON rp.id_role=r.id
       JOIN b_permission p ON p.id=rp.id_permission
      WHERE u.id=? AND p.etat='ACTIF'
     UNION ALL
     SELECT 3, p.code, up.sens
       FROM b_utilisateur_permission up
       JOIN b_permission p ON p.id=up.id_permission
      WHERE up.id_utilisateur=?
        AND (up.date_fin IS NULL OR up.date_fin >= CURDATE())`, // dérogation expirée : ignorée
    [userId, userId, userId]
  );
  let role = null;
  const set = new Set();
  rows.sort((a, b) => a.etape - b.etape).forEach((x) => {
    if (x.etape === 1) role = x.code || null;
    else if (x.etape === 2) set.add(x.code);
    else if (x.sens === "DENY") set.delete(x.code);
    else set.add(x.code);
  });
  return { role, set };
};

// Cache en mémoire (CACHE_PERMISSIONS_MS, 10 s par défaut) : chaque appel à l'API
// relisait les permissions en base, souvent plusieurs fois par requête. Le cache
// est vidé dès qu'un utilisateur, une fonction, un compte ou une habilitation est
// modifié par l'API (voir viderCachePermissionsApresModif) ; une modification faite
// directement en base est prise en compte au plus tard après ce délai.
const cache = new Map(); // userId -> { expire, promesse }
let generation = 0;
const viderLocal = () => { generation++; cache.clear(); cacheMode = null; };
// Plusieurs processus (WEB_CONCURRENCY > 1, demarrer.js) : le vidage est relayé aux autres.
const viderCachePermissions = () => {
  viderLocal();
  if (typeof process.send === "function") {
    try { process.send({ type: "qualitus:vider-permissions" }); } catch { /* processus seul */ }
  }
};
if (typeof process.send === "function") {
  process.on("message", (msg) => { if (msg && msg.type === "qualitus:vider-permissions") viderLocal(); });
}

const permissionsEffectives = async (userId) => {
  if (!cachePermissionsMs) return chargerPermissions(userId);
  const cle = String(userId);
  const maintenant = Date.now();
  let e = cache.get(cle);
  if (!e || e.expire <= maintenant) {
    const gen = generation;
    e = { expire: maintenant + cachePermissionsMs, promesse: chargerPermissions(userId) };
    cache.set(cle, e);
    e.promesse.catch(() => { if (cache.get(cle) === e) cache.delete(cle); });
    // un vidage pendant la lecture : ne pas garder une valeur peut-être périmée
    e.promesse.then(() => { if (gen !== generation && cache.get(cle) === e) cache.delete(cle); }, () => {});
    if (cache.size > 5000) { for (const [k, v] of cache) if (v.expire <= maintenant) cache.delete(k); }
  }
  const { role, set } = await e.promesse;
  return { role, set: new Set(set) }; // copie : l'appelant peut la modifier sans toucher au cache
};

// Écritures qui changent les droits : utilisateurs (fonction, création, suppression),
// fonctions (rôle associé), comptes (Jauge), habilitations (rôles, dérogations).
const ROUTES_DROITS = /^\/api\/v1\/(utilisateur|update_utilisateur|comptes|fonction|fonction_update|habilitations)(\/|$|\?)/;
const viderCachePermissionsApresModif = (req, res, next) => {
  if (req.method !== "GET" && req.method !== "OPTIONS" && ROUTES_DROITS.test(req.originalUrl)) {
    res.on("finish", () => { if (res.statusCode < 400) viderCachePermissions(); });
  }
  next();
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

module.exports = { permission, permissionsEffectives, exigerHabilitationGestion, viderCachePermissions, viderCachePermissionsApresModif };
