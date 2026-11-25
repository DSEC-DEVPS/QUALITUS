// =====================================================================
// Création de comptes utilisateur (Utilisateurs > Ajouter).
// Remplace l'ancienne route publique POST /sign_in (création sans être connecté).
//  - permission utilisateur.creer, contrôlée ici (le middleware est en mode
//    OBSERVATION et laisse tout passer) ;
//  - périmètre : un utilisateur d'un site ordinaire ne crée que sur SON site ;
//    administrateur ou site à vision globale : tous les sites ;
//  - fonction Administrateur réservée aux administrateurs ;
//  - e-mail et login uniques ; mot de passe par défaut à changer à la 1re connexion ;
//  - le nouveau compte reçoit les fiches actives qui le ciblent.
// La validation d'une ligne (validerCompte) servira aussi à l'import Excel.
// =====================================================================
const bcrypt = require("bcrypt");
const db = require("../config/db");
const { habilitationSite, estFonctionAdmin } = require("../utils/perimetreComptes");
const { notifierFichesPourUtilisateur, sansEchec } = require("../utils/notifFichesCiblees");

const texte = (v) => (v === undefined || v === null ? "" : String(v).trim());
const entier = (v) => (/^\d+$/.test(String(v ?? "").trim()) ? Number(String(v).trim()) : null);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Genre enregistré comme dans le formulaire : « Homme » / « Femme » (H, M, F acceptés).
const genre = (v) => {
  const g = texte(v).toLowerCase();
  if (["homme", "h", "m"].includes(g)) return "Homme";
  if (["femme", "f"].includes(g)) return "Femme";
  return g ? "?" : "";
};

/** Créateur habilité (utilisateur.creer) avec son périmètre, ou null. */
const createur = async (userId) => {
  const g = await habilitationSite(userId, "utilisateur.creer");
  return g ? { ...g, admin: g.role === "R_ADMI" } : null;
};

/** Listes autorisées au créateur (fonctions, sites, programmes, grilles). */
const referentiels = async (g) => {
  const [fonctions] = await db.query(
    `SELECT id, nom, Role_Associe AS role FROM B_FONCTION
      WHERE ? OR (IFNULL(Role_Associe, '') <> 'R_ADMI' AND LOWER(TRIM(IFNULL(nom, ''))) <> 'administrateur') ORDER BY nom`,
    [g.admin ? 1 : 0]
  );
  const [sites] = g.visionGlobale
    ? await db.query(`SELECT id, nom FROM B_SITE ORDER BY nom`)
    : await db.query(`SELECT id, nom FROM B_SITE WHERE id = ?`, [g.id_Site]);
  const [programmes] = await db.query(`SELECT id, nom FROM B_PROGRAMME ORDER BY nom`);
  const [grilles] = await db.query(`SELECT id, nom FROM b_eval_grille WHERE IFNULL(statut, 'ACTIVE') = 'ACTIVE' AND IFNULL(etat, 'ACTIF') = 'ACTIF' ORDER BY nom`);
  // Superviseurs actifs des sites autorisés (rattachement facultatif lors de l'import)
  const [superviseurs] = sites.length
    ? await db.query(
        `SELECT UT.id, UT.nom_utilisateur, UT.nom, UT.prenom, UT.id_Site
           FROM B_UTILISATEUR UT JOIN B_FONCTION FCT ON UT.id_Fonction = FCT.id
          WHERE UT.id_Site IN (?) AND (FCT.Role_Associe = 'R_SUP' OR LOWER(FCT.nom) = 'superviseur')
            AND IFNULL(UT.status, 'ACTIF') = 'ACTIF'
          ORDER BY UT.nom_utilisateur`,
        [sites.map((s) => s.id)]
      )
    : [[]];
  return { fonctions, sites, programmes, grilles, superviseurs, vision_globale: !!g.visionGlobale };
};

/**
 * Valide une ligne de création. refs = referentiels(g).
 * Retourne { compte } (valeurs normalisées) ou { erreurs: [..] }.
 */
const validerCompte = (b, refs) => {
  const c = {
    nom: texte(b.nom), prenom: texte(b.prenom), nom_utilisateur: texte(b.nom_utilisateur),
    genre: genre(b.genre), email: texte(b.email).toLowerCase(), telephone: texte(b.telephone),
    ville: texte(b.ville) || null, adresse: texte(b.adresse) || null,
    id_Fonction: entier(b.id_Fonction), id_Site: entier(b.id_Site), id_Programme: entier(b.id_Programme),
    id_EvalGrille: b.id_EvalGrille === null || b.id_EvalGrille === undefined || b.id_EvalGrille === "" ? null : entier(b.id_EvalGrille),
  };
  const erreurs = [];
  const manquants = [["nom", "Nom"], ["prenom", "Prénom"], ["nom_utilisateur", "Login"], ["genre", "Genre"], ["email", "E-mail"],
    ["telephone", "Téléphone"], ["id_Fonction", "Fonction"], ["id_Site", "Site"], ["id_Programme", "Programme"]]
    .filter(([k]) => !c[k]).map(([, l]) => l);
  if (manquants.length) erreurs.push(`champ(s) obligatoire(s) manquant(s) : ${manquants.join(", ")}`);
  if (c.nom_utilisateur && /\s/.test(c.nom_utilisateur)) erreurs.push("le login ne doit pas contenir d'espace");
  if (c.email && !EMAIL.test(c.email)) erreurs.push("e-mail invalide");
  if (c.genre === "?") erreurs.push("genre invalide (Homme ou Femme)");
  if (c.id_Fonction && !refs.fonctions.some((f) => f.id === c.id_Fonction)) erreurs.push("fonction inconnue ou non autorisée");
  if (c.id_Site && !refs.sites.some((s) => s.id === c.id_Site)) erreurs.push("site inconnu ou hors de votre périmètre");
  if (c.id_Programme && !refs.programmes.some((p) => p.id === c.id_Programme)) erreurs.push("programme inconnu");
  if (b.id_EvalGrille !== null && b.id_EvalGrille !== undefined && b.id_EvalGrille !== "" &&
      !(c.id_EvalGrille && refs.grilles.some((g) => g.id === c.id_EvalGrille))) erreurs.push("grille d'évaluation inconnue");
  return erreurs.length ? { erreurs } : { compte: c };
};

/** Logins / e-mails déjà pris parmi ceux donnés : { logins:Set, emails:Set } (en minuscules). */
const dejaPris = async (cnx, logins, emails) => {
  if (!logins.length && !emails.length) return { logins: new Set(), emails: new Set() };
  const [rows] = await cnx.query(
    `SELECT LOWER(nom_utilisateur) AS login, LOWER(email) AS email FROM B_UTILISATEUR
      WHERE LOWER(nom_utilisateur) IN (?) OR LOWER(email) IN (?)`,
    [logins.length ? logins : [""], emails.length ? emails : [""]]
  );
  return { logins: new Set(rows.map((r) => r.login)), emails: new Set(rows.map((r) => r.email)) };
};

/** Insère un compte validé ; retourne son id. Mot de passe par défaut : <login>Orange<année>. */
const insererCompte = async (cnx, c) => {
  const maintenant = new Date();
  const hash = await bcrypt.hash(c.nom_utilisateur + "Orange" + maintenant.getFullYear(), 10);
  const [r] = await cnx.query(
    `INSERT INTO B_UTILISATEUR (nom, prenom, nom_utilisateur, genre, email, telephone, ville, adresse, password, default_password,
                                id_Fonction, id_Site, id_Programme, id_EvalGrille, status, dateCreation)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIF', ?)`,
    [c.nom, c.prenom, c.nom_utilisateur, c.genre, c.email, c.telephone, c.ville, c.adresse, hash, hash,
     c.id_Fonction, c.id_Site, c.id_Programme, c.id_EvalGrille, maintenant]
  );
  return r.insertId;
};

const refus = (res) => res.status(403).json({ message: "Accès refusé : habilitation manquante (utilisateur.creer)." });

// GET /utilisateur-creation/referentiels — listes du formulaire, limitées au périmètre
const getReferentielsCreation = async (req, res) => {
  try {
    const g = await createur(req.auth.userId);
    if (!g) return refus(res);
    return res.status(200).json(await referentiels(g));
  } catch (e) {
    console.log(e);
    return res.status(500).json({ message: "Erreur lors du chargement des listes." });
  }
};

// POST /utilisateur/addUser — création d'un compte
const creerUtilisateur = async (req, res) => {
  try {
    const g = await createur(req.auth.userId);
    if (!g) return refus(res);
    const v = validerCompte(req.body || {}, await referentiels(g));
    if (v.erreurs) return res.status(400).json({ message: v.erreurs.join(" ; ") });
    const c = v.compte;
    const pris = await dejaPris(db, [c.nom_utilisateur.toLowerCase()], [c.email]);
    if (pris.logins.has(c.nom_utilisateur.toLowerCase())) return res.status(400).json({ message: "Ce login est déjà utilisé." });
    if (pris.emails.has(c.email)) return res.status(400).json({ message: "Cette adresse e-mail est déjà utilisée." });
    const id = await insererCompte(db, c);
    // Fiches actives déjà publiées qui ciblent ce nouveau compte.
    await sansEchec("création de compte", () => notifierFichesPourUtilisateur(db, id));
    return res.status(201).json({ message: "Le compte de l'utilisateur a bien été créé.", id });
  } catch (e) {
    if (e && e.code === "ER_DUP_ENTRY") return res.status(400).json({ message: "Login ou adresse e-mail déjà utilisé." });
    console.log(e);
    return res.status(500).json({ message: "Erreur lors de la création du compte." });
  }
};

// =====================================================================
// IMPORT EXCEL (création en masse)
// Le navigateur lit le fichier (modèle fourni par l'application) et envoie les
// lignes : { ligne, nom, prenom, nom_utilisateur, email, telephone, genre, ville,
// adresse, fonction, site, programme, grille, superviseur } — fonction, site,
// programme et grille en LIBELLÉS, superviseur en login.
//  - POST /utilisateur-import/verifier : contrôle sans rien créer ;
//  - POST /utilisateur-import/creer    : contrôle à nouveau, crée les lignes
//    valides (une transaction), ignore les autres et les renvoie avec leur erreur.
// =====================================================================
const MAX_LIGNES = 500;
const norm = (v) => texte(v).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").toLowerCase();
const INCONNU = 2147483647; // id inexistant : la validation le signale, le message est ensuite précisé

/** Contrôle de toutes les lignes : [{ ligne, login, nom, prenom, compte?, id_superviseur?, erreurs[] }]. */
const verifierLignes = async (lignes, refs) => {
  const parNom = (liste) => { const m = new Map(); for (const x of liste) if (!m.has(norm(x.nom))) m.set(norm(x.nom), x.id); return m; };
  const fonctions = parNom(refs.fonctions), sites = parNom(refs.sites), programmes = parNom(refs.programmes), grilles = parNom(refs.grilles);
  const sups = new Map(refs.superviseurs.map((s) => [norm(s.nom_utilisateur), s]));
  const resultats = lignes.map((l, i) => {
    const r = { ligne: Number(l.ligne) || i + 2, login: texte(l.nom_utilisateur), nom: texte(l.nom), prenom: texte(l.prenom), erreurs: [] };
    const resoudre = (map, val, libelle, msg) => {
      if (!texte(val)) return null;
      if (map.has(norm(val))) return map.get(norm(val));
      r.precisions = r.precisions || {};
      r.precisions[msg] = `${libelle} « ${texte(val)} » inconnu(e) ou hors de votre périmètre`;
      return INCONNU;
    };
    const b = {
      nom: l.nom, prenom: l.prenom, nom_utilisateur: l.nom_utilisateur, genre: l.genre, email: l.email, telephone: l.telephone,
      ville: l.ville, adresse: l.adresse,
      id_Fonction: resoudre(fonctions, l.fonction, "fonction", "fonction inconnue ou non autorisée"),
      id_Site: resoudre(sites, l.site, "site", "site inconnu ou hors de votre périmètre"),
      id_Programme: resoudre(programmes, l.programme, "programme", "programme inconnu"),
      id_EvalGrille: resoudre(grilles, l.grille, "grille d'évaluation", "grille d'évaluation inconnue"),
    };
    const v = validerCompte(b, refs);
    if (v.erreurs) r.erreurs.push(...v.erreurs.map((e) => (r.precisions && r.precisions[e]) || e));
    else r.compte = v.compte;
    delete r.precisions;
    if (texte(l.superviseur)) {
      const s = sups.get(norm(l.superviseur));
      if (!s) r.erreurs.push(`superviseur « ${texte(l.superviseur)} » introuvable (login d'un superviseur actif)`);
      else if (b.id_Site && b.id_Site !== INCONNU && s.id_Site !== b.id_Site) r.erreurs.push(`le superviseur « ${texte(l.superviseur)} » n'est pas du site choisi`);
      else r.id_superviseur = s.id;
    }
    return r;
  });
  // Doublons dans le fichier (la 1re occurrence est gardée)
  const vusLogin = new Map(), vusEmail = new Map();
  for (const r of resultats) {
    const login = r.login.toLowerCase(), email = r.compte ? r.compte.email : "";
    if (login) { if (vusLogin.has(login)) r.erreurs.push(`login déjà présent ligne ${vusLogin.get(login)} du fichier`); else vusLogin.set(login, r.ligne); }
    if (email) { if (vusEmail.has(email)) r.erreurs.push(`e-mail déjà présent ligne ${vusEmail.get(email)} du fichier`); else vusEmail.set(email, r.ligne); }
  }
  // Déjà en base
  const valides = resultats.filter((r) => r.compte);
  const pris = await dejaPris(db, valides.map((r) => r.compte.nom_utilisateur.toLowerCase()), valides.map((r) => r.compte.email));
  for (const r of valides) {
    if (pris.logins.has(r.compte.nom_utilisateur.toLowerCase())) r.erreurs.push("login déjà utilisé");
    if (pris.emails.has(r.compte.email)) r.erreurs.push("e-mail déjà utilisé");
  }
  return resultats;
};

const lignesRecues = (req, res) => {
  const lignes = req.body && req.body.lignes;
  if (!Array.isArray(lignes) || !lignes.length) { res.status(400).json({ message: "Aucune ligne à importer." }); return null; }
  if (lignes.length > MAX_LIGNES) { res.status(400).json({ message: `Le fichier contient ${lignes.length} lignes : ${MAX_LIGNES} au maximum par import.` }); return null; }
  return lignes;
};
const sortie = (r, statut) => ({ ligne: r.ligne, login: r.login, nom: r.nom, prenom: r.prenom, statut, erreurs: r.erreurs });

// POST /utilisateur-import/verifier
const verifierImport = async (req, res) => {
  try {
    const g = await createur(req.auth.userId);
    if (!g) return refus(res);
    const lignes = lignesRecues(req, res);
    if (!lignes) return;
    const resultats = await verifierLignes(lignes, await referentiels(g));
    const out = resultats.map((r) => sortie(r, r.erreurs.length ? "ERREUR" : "OK"));
    return res.status(200).json({ total: out.length, valides: out.filter((r) => r.statut === "OK").length, lignes: out });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ message: "Erreur lors de la vérification du fichier." });
  }
};

// POST /utilisateur-import/creer
const creerImport = async (req, res) => {
  let conn;
  try {
    const g = await createur(req.auth.userId);
    if (!g) return refus(res);
    const lignes = lignesRecues(req, res);
    if (!lignes) return;
    const resultats = await verifierLignes(lignes, await referentiels(g));
    const aCreer = resultats.filter((r) => !r.erreurs.length);
    conn = await db.getConnection();
    await conn.beginTransaction();
    for (const r of aCreer) {
      r.id = await insererCompte(conn, r.compte);
      if (r.id_superviseur) {
        await conn.query(`INSERT INTO B_R_SUPERVISEUR_AGENT (id_SUPERVISEUR, id_AGENT, dateCreation) VALUES (?, ?, NOW())`, [r.id_superviseur, r.id]);
      }
      await sansEchec("import de comptes", () => notifierFichesPourUtilisateur(conn, r.id));
    }
    await conn.commit();
    const out = resultats.map((r) => sortie(r, r.erreurs.length ? "ERREUR" : "CREE"));
    return res.status(201).json({ total: out.length, crees: aCreer.length, refusees: out.length - aCreer.length, lignes: out });
  } catch (e) {
    if (conn) await conn.rollback().catch(() => {});
    console.log(e);
    const msg = e && e.code === "ER_DUP_ENTRY"
      ? "Un login ou un e-mail vient d'être utilisé par ailleurs : aucun compte n'a été créé, relancez la vérification."
      : "Erreur lors de la création : aucun compte n'a été créé.";
    return res.status(500).json({ message: msg });
  } finally {
    if (conn) conn.release();
  }
};

module.exports = {
  getReferentielsCreation, creerUtilisateur, verifierImport, creerImport,
  // réutilisés par l'import Excel
  createur, referentiels, validerCompte, dejaPris, insererCompte, estFonctionAdmin,
};
