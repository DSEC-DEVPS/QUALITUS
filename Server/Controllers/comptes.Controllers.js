// =====================================================================
// Modification complète d'un compte — deux chemins indépendants :
//  - « Gérer les comptes » : compte.gerer (menu) ET compte.jauge, sur son
//    périmètre (son site, ou tous les sites pour le site à vision globale),
//    administrateurs exclus (voir utils/perimetreComptes.js) ;
//  - « Utilisateurs » : utilisateur.modifier, sur tous les comptes de tous les
//    sites.
// Garde-fous communs :
//  - la fonction Administrateur n'est attribuable, et un compte administrateur
//    modifiable, que par un administrateur ;
//  - login et e-mail uniques ; le mot de passe ne se modifie pas ici ;
//  - sur son propre compte : fonction, site et statut verrouillés.
// =====================================================================
const db = require("../config/db");
const { habilitationSite, compteGerable, estFonctionAdmin } = require("../utils/perimetreComptes");
const { notifierFichesPourUtilisateur, sansEchec } = require("../utils/notifFichesCiblees");

const STATUTS = ["ACTIF", "INACTIF"];
const entier = (v) => (/^\d+$/.test(String(v ?? "")) ? Number(v) : null);
const texte = (v) => (v === undefined || v === null ? "" : String(v).trim());

/**
 * Utilisateur autorisé à modifier des comptes, avec son périmètre, ou null.
 * utilisateur.modifier (menu Utilisateurs) : tous les sites ; sinon
 * compte.gerer + compte.jauge (Gérer les comptes) : périmètre de site.
 */
const jauge = async (userId) => {
  const u = await habilitationSite(userId, "utilisateur.modifier");
  if (u) return { ...u, visionGlobale: true, tousLesComptes: true, admin: u.role === "R_ADMI" };
  const g = await habilitationSite(userId, "compte.gerer");
  if (!g) return null;
  return (await habilitationSite(userId, "compte.jauge")) ? { ...g, tousLesComptes: false, admin: g.role === "R_ADMI" } : null;
};
const refus = (res) => res.status(403).json({ message: "Accès refusé : habilitation manquante (compte.jauge ou utilisateur.modifier)." });

/** Compte modifiable : périmètre de site (Jauge) ou tous les comptes (Utilisateurs) ; administrateurs réservés aux administrateurs. */
const cibleModifiable = async (g, id) => {
  if (!g.tousLesComptes) return compteGerable(g, id);
  const [[u]] = await db.query(
    `SELECT UT.id, UT.id_Site, FCT.nom AS fonction, FCT.Role_Associe AS role
       FROM B_UTILISATEUR UT LEFT JOIN B_FONCTION FCT ON UT.id_Fonction = FCT.id WHERE UT.id = ?`, [id]
  );
  if (!u) return { erreur: 404 };
  const estMoi = u.id === g.id;
  if (!estMoi && !g.admin && estFonctionAdmin(u.fonction, u.role)) return { erreur: 403 };
  return { utilisateur: u, estMoi };
};

/** Superviseurs actifs d'un site (fonction Superviseur / rôle R_SUP). */
const superviseursDuSite = async (idSite, exclure) => {
  const [rows] = await db.query(
    `SELECT UT.id, UT.nom_utilisateur, UT.nom, UT.prenom
       FROM B_UTILISATEUR UT JOIN B_FONCTION FCT ON UT.id_Fonction = FCT.id
      WHERE UT.id_Site = ? AND (FCT.Role_Associe = 'R_SUP' OR LOWER(FCT.nom) = 'superviseur')
        AND IFNULL(UT.status, 'ACTIF') = 'ACTIF' AND UT.id <> ?
      ORDER BY UT.nom, UT.prenom`,
    [idSite, exclure || 0]
  );
  return rows;
};

// GET /comptes/:id/edition — fiche complète du compte à modifier
const getCompteEdition = async (req, res) => {
  const id = entier(req.params.id);
  if (!id) return res.status(400).json({ message: "Utilisateur invalide." });
  try {
    const g = await jauge(req.auth.userId);
    if (!g) return refus(res);
    const cible = await cibleModifiable(g, id);
    if (cible.erreur === 404) return res.status(404).json({ message: "Utilisateur introuvable." });
    if (cible.erreur) return res.status(403).json({ message: "Cet utilisateur n'est pas dans votre périmètre." });
    const [[u]] = await db.query(
      `SELECT UT.id, UT.nom, UT.prenom, UT.nom_utilisateur, UT.genre, UT.email, UT.telephone, UT.ville, UT.adresse,
              UT.id_Fonction, UT.id_Site, UT.id_Programme, UT.id_EvalGrille, UT.status,
              (SELECT SA.id_SUPERVISEUR FROM B_R_SUPERVISEUR_AGENT SA WHERE SA.id_AGENT = UT.id ORDER BY SA.id DESC LIMIT 1) AS id_superviseur
         FROM B_UTILISATEUR UT WHERE UT.id = ?`, [id]
    );
    return res.status(200).json({ utilisateur: u, est_moi: cible.estMoi, vision_globale: !!g.visionGlobale });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ message: "Erreur lors du chargement du compte." });
  }
};

// GET /comptes/referentiels?id_site=&exclure= — listes du formulaire
const getReferentielsCompte = async (req, res) => {
  try {
    const g = await jauge(req.auth.userId);
    if (!g) return refus(res);
    const idSite = entier(req.query.id_site);
    if (idSite && !g.visionGlobale && idSite !== g.id_Site) {
      return res.status(403).json({ message: "Ce site n'est pas dans votre périmètre." });
    }
    // Fonction Administrateur : proposée uniquement à un administrateur
    const [fonctions] = await db.query(
      `SELECT id, nom, Role_Associe AS role, Etat FROM B_FONCTION
        WHERE ? OR (IFNULL(Role_Associe, '') <> 'R_ADMI' AND LOWER(IFNULL(nom, '')) <> 'administrateur') ORDER BY nom`,
      [g.admin ? 1 : 0]
    );
    const [sites] = g.visionGlobale
      ? await db.query(`SELECT id, nom FROM B_SITE ORDER BY nom`)
      : await db.query(`SELECT id, nom FROM B_SITE WHERE id = ?`, [g.id_Site]);
    const [programmes] = await db.query(`SELECT id, nom, Etat FROM B_PROGRAMME ORDER BY nom`);
    const [grilles] = await db.query(`SELECT id, nom FROM b_eval_grille WHERE IFNULL(etat, 'ACTIF') = 'ACTIF' ORDER BY nom`);
    const superviseurs = idSite ? await superviseursDuSite(idSite, entier(req.query.exclure)) : [];
    return res.status(200).json({ fonctions, sites, programmes, grilles, superviseurs, vision_globale: !!g.visionGlobale });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ message: "Erreur lors du chargement des listes." });
  }
};

// PUT /comptes/:id — modification complète
const modifierCompte = async (req, res) => {
  const id = entier(req.params.id);
  if (!id) return res.status(400).json({ message: "Utilisateur invalide." });
  const b = req.body || {};
  const champs = {
    nom: texte(b.nom), prenom: texte(b.prenom), nom_utilisateur: texte(b.nom_utilisateur),
    genre: texte(b.genre) || null, email: texte(b.email), ville: texte(b.ville) || null, adresse: texte(b.adresse) || null,
  };
  const tel = texte(b.telephone);
  const idFonction = entier(b.id_Fonction), idSite = entier(b.id_Site), idProgramme = entier(b.id_Programme);
  const idGrille = b.id_EvalGrille === null || b.id_EvalGrille === "" || b.id_EvalGrille === undefined ? null : entier(b.id_EvalGrille);
  const idSup = b.id_superviseur === null || b.id_superviseur === "" || b.id_superviseur === undefined ? null : entier(b.id_superviseur);
  const statut = texte(b.status).toUpperCase();
  if (!champs.nom || !champs.prenom || !champs.nom_utilisateur || !champs.email || !idFonction || !idSite || !idProgramme) {
    return res.status(400).json({ message: "Nom, prénom, login, e-mail, fonction, site et programme sont obligatoires." });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(champs.email)) return res.status(400).json({ message: "Adresse e-mail invalide." });
  if (/\s/.test(champs.nom_utilisateur)) return res.status(400).json({ message: "Le login ne doit pas contenir d'espace." });
  if (tel && (!/^\d{1,10}$/.test(tel) || Number(tel) > 2147483647)) return res.status(400).json({ message: "Téléphone invalide (chiffres uniquement)." });
  if (!STATUTS.includes(statut)) return res.status(400).json({ message: "Statut invalide." });
  if ((b.id_EvalGrille && idGrille === null) || (b.id_superviseur && idSup === null)) return res.status(400).json({ message: "Paramètres invalides." });

  const conn = await db.getConnection();
  try {
    const g = await jauge(req.auth.userId);
    if (!g) return refus(res);
    const cible = await cibleModifiable(g, id);
    if (cible.erreur === 404) return res.status(404).json({ message: "Utilisateur introuvable." });
    if (cible.erreur) return res.status(403).json({ message: "Cet utilisateur n'est pas dans votre périmètre." });
    const [[actuel]] = await conn.query(`SELECT id_Fonction, id_Site, status, id_Programme FROM B_UTILISATEUR WHERE id = ?`, [id]);

    // Son propre compte : fonction, site et statut verrouillés
    if (cible.estMoi && (idFonction !== Number(actuel.id_Fonction) || idSite !== Number(actuel.id_Site) || statut !== String(actuel.status || "ACTIF").toUpperCase())) {
      return res.status(403).json({ message: "Vous ne pouvez pas modifier votre propre fonction, site ou statut." });
    }
    const [[fonction]] = await conn.query(`SELECT id, nom, Role_Associe FROM B_FONCTION WHERE id = ?`, [idFonction]);
    if (!fonction) return res.status(404).json({ message: "Fonction introuvable." });
    if (estFonctionAdmin(fonction.nom, fonction.Role_Associe) && idFonction !== Number(actuel.id_Fonction) && !g.admin) {
      return res.status(403).json({ message: "Seul un administrateur peut attribuer la fonction Administrateur." });
    }
    const [[site]] = await conn.query(`SELECT id FROM B_SITE WHERE id = ?`, [idSite]);
    if (!site) return res.status(404).json({ message: "Site introuvable." });
    if (!g.visionGlobale && idSite !== g.id_Site) return res.status(403).json({ message: "Ce site n'est pas dans votre périmètre." });
    const [[programme]] = await conn.query(`SELECT id, Etat FROM B_PROGRAMME WHERE id = ?`, [idProgramme]);
    if (!programme) return res.status(404).json({ message: "Programme introuvable." });
    if (programme.Etat !== "ACTIF" && idProgramme !== Number(actuel.id_Programme)) return res.status(409).json({ message: "Ce programme n'est pas actif." });
    if (idGrille) {
      const [[gr]] = await conn.query(`SELECT id FROM b_eval_grille WHERE id = ?`, [idGrille]);
      if (!gr) return res.status(404).json({ message: "Grille d'évaluation introuvable." });
    }
    if (idSup) {
      if (idSup === id) return res.status(400).json({ message: "Un utilisateur ne peut pas être son propre superviseur." });
      if (!(await superviseursDuSite(idSite, id)).some((s) => s.id === idSup)) {
        return res.status(400).json({ message: "Le superviseur doit être un superviseur actif du site choisi." });
      }
    }
    const [[doublon]] = await conn.query(
      `SELECT nom_utilisateur, email FROM B_UTILISATEUR WHERE id <> ? AND (nom_utilisateur = ? OR email = ?) LIMIT 1`,
      [id, champs.nom_utilisateur, champs.email]
    );
    if (doublon) {
      const quoi = String(doublon.nom_utilisateur).toLowerCase() === champs.nom_utilisateur.toLowerCase() ? "Ce login" : "Cette adresse e-mail";
      return res.status(409).json({ message: `${quoi} est déjà utilisé(e) par un autre compte.` });
    }

    await conn.beginTransaction();
    await conn.query(
      `UPDATE B_UTILISATEUR SET nom=?, prenom=?, nom_utilisateur=?, genre=?, email=?, telephone=?, ville=?, adresse=?,
              id_Fonction=?, id_Site=?, id_Programme=?, id_EvalGrille=?, status=?, dateModification=NOW()
        WHERE id = ?`,
      [champs.nom, champs.prenom, champs.nom_utilisateur, champs.genre, champs.email, tel ? Number(tel) : null,
       champs.ville, champs.adresse, idFonction, idSite, idProgramme, idGrille, statut, id]
    );
    await conn.query(`DELETE FROM B_R_SUPERVISEUR_AGENT WHERE id_AGENT = ?`, [id]);
    if (idSup) {
      await conn.query(`INSERT INTO B_R_SUPERVISEUR_AGENT (id_SUPERVISEUR, id_AGENT, dateCreation) VALUES (?, ?, NOW())`, [idSup, id]);
    }
    // Fiches actives qui le ciblent désormais : changement de site / fonction
    // (fiches qui ciblaient déjà l'ancien profil ignorées) ou réactivation (toutes).
    const etaitActif = String(actuel.status || "ACTIF").toUpperCase() === "ACTIF";
    const profilChange = idSite !== Number(actuel.id_Site) || idFonction !== Number(actuel.id_Fonction);
    if (statut === "ACTIF" && (!etaitActif || profilChange)) {
      await sansEchec("modification de compte", () =>
        notifierFichesPourUtilisateur(conn, id, etaitActif ? { id_Site: actuel.id_Site, id_Fonction: actuel.id_Fonction } : null));
    }
    await conn.commit();
    return res.status(200).json({ message: `Le compte ${champs.nom_utilisateur} a été mis à jour.` });
  } catch (e) {
    try { await conn.rollback(); } catch (_) {}
    console.log(e);
    return res.status(500).json({ message: "Erreur lors de la modification du compte." });
  } finally {
    conn.release();
  }
};

module.exports = { getCompteEdition, getReferentielsCompte, modifierCompte };
