// GET ALL UTILISATEUR
const db = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const path = require("path");
const fs = require("fs");

/**les controllers pour l'authentification */
const sign_in = async (req, res, next) => {
  const {
    nom,
    prenom,
    nom_utilisateur,
    genre,
    email,
    telephone,
    ville,
    adresse,
    id_Fonction,
    id_Site,
    id_Programme,
    id_Grille,
  } = req.body;
  try {
    const Query =
      "SELECT * FROM B_UTILISATEUR WHERE email=? or nom_utilisateur=? ";
    const resultat = await db.query(Query, [email, nom_utilisateur]);
    if (resultat[0] <= 0) {
      const Query = `INSERT INTO B_UTILISATEUR (nom,prenom,nom_utilisateur,genre,email,telephone,ville,adresse,password,default_password,id_Fonction,id_Site,id_Programme,id_Grille,status,dateCreation) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
      const statut = "ACTIF";
      const dateCreation = new Date();
      const password = nom_utilisateur + "Orange" + dateCreation.getFullYear();
      const passwordHast = await bcrypt.hash(password, 10);
      //const default_password = await bcrypt.hash(password, 10);
      const resultat = await db.query(Query, [
        nom,
        prenom,
        nom_utilisateur,
        genre,
        email,
        telephone,
        ville,
        adresse,
        passwordHast,
        passwordHast,
        id_Fonction,
        id_Site,
        id_Programme,
        id_Grille,
        statut,
        dateCreation,
      ]);
      return res
        .status(201)
        .json({ message: "Votre compte a été bien enregister" });
    } else {
      return res.status(400).json({
        message: "L'addresse mail ou le nom d'utilisateur existent déjà!",
      });
    }
  } catch (error) {
    console.log(error);
    throw error;
  }
};
const login = async (req, res, next) => {
  const { nom_utilisateur, password } = req.body;
  if (!nom_utilisateur || !password) {
    return res
      .status(403)
      .json({ message: "Nom d'utilisateur ou mot de passe vide!" });
  }

  try {
    const Query = `SELECT * from B_UTILISATEUR where nom_utilisateur=?`;
    const Query_update = `UPDATE B_UTILISATEUR SET nb_session_login=? WHERE nom_utilisateur=?`;
    const [resultat] = await db.query(Query, [nom_utilisateur]);
    if (resultat.length <= 0) {
      return res.status(401).json({
        message: "Le nom utilisateur ou le mot de passe est incorrect",
      });
    } else {
      bcrypt
        .compare(password, resultat[0].password)
        .then(async (valid) => {
          if (!valid) {
            return res.status(401).json({
              message: "Le nom utilisateur ou le mot de passe est incorrect",
            });
          } else {
            if (resultat[0].status == "INACTIF") {
              return res.status(401).json({
                message:
                  "Désolé votre compte est desactivé! Merci de contacter l'Administrateur.",
              });
            } else {
              if (bcrypt.compare(password, resultat[0].password)) {
                const nb_session_login = resultat[0].nb_session_login + 1;
                await db.query(Query_update, [
                  nb_session_login,
                  nom_utilisateur,
                ]);
                const reponse = { userId: resultat[0].id };
                const accesToken = jwt.sign(reponse, "DevpsDsec", {
                  expiresIn: "2h",
                });
                delete resultat[0]["password"];
                return res.status(200).json({
                  access_token: accesToken,
                  token_type: "bearer",
                  nb_session: nb_session_login,
                });
              } else {
                return res.status(400).json({
                  message:
                    "Une erreur s'est produite, veuillez réessayer plus tard",
                });
              }
            }
          }
        })
        .catch((error) => {
          console.log(error);
          throw error;
        });
    }
  } catch (error) {
    console.log(error);
    throw error;
  }
};
const getMe = async (req, res, next) => {
  const id = req.auth.userId;
  if (!id) {
    return res.status(403).json({ message: "L'id de utilisateur est vide" });
  }
  try {
    const Query = `SELECT UT.id,UT.nom,UT.prenom, UT.nom_utilisateur as name,UT.email,UT.telephone,UT.adresse,UT.ville,
    UT.genre,FCT.nom as fonction,pr.nom as programme,st.nom as site,FCT.Role_Associe as roles,
     UT.dateCreation,FCT.Permissions_Associe as permissions  from 
     B_UTILISATEUR UT INNER JOIN B_FONCTION FCT on UT.id_Fonction=FCT.id
     INNER JOIN B_PROGRAMME pr on UT.id_Programme=pr.id
     INNER JOIN B_SITE st on UT.id_Site=st.id
     where UT.id=? 
  `;
    const [resultat] = await db.query(Query, [id]);
    resultat[0].permissions = resultat[0]["permissions"].split(",");
    return res.status(200).json(resultat[0]);
  } catch (error) {
    console.log(error);
    throw error;
  }
};
/** fin de controllers pour authentification */
/** les controllers des utilisateurs */
const addUtilisateur = async (req, res, next) => {
  const {
    nom,
    prenom,
    nom_utilisateur,
    genre,
    email,
    telephone,
    ville,
    adresse,
    id_Fonction,
    id_Site,
    id_Programme,
    id_Grille,
  } = req.body;

  if (
    !nom ||
    !prenom ||
    !nom_utilisateur ||
    !genre ||
    !email ||
    !telephone ||
    !ville ||
    !adresse ||
    !id_Fonction ||
    !id_Site ||
    !id_Programme ||
    !id_Grille
  ) {
    return res
      .status(403)
      .json({ message: "Veuillez bien renseigner les parametres." });
  }
  try {
    const Query = `INSERT INTO B_UTILISATEUR (nom,prenom,nom_utilisateur,genre,email,telephone,ville,adresse,password,id_Fonction,id_Site,id_Programme,id_Grille,status,dateCreation) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
    const statut = "ACTIF";
    const password = nom_utilisateur + "Orange" + dateCreation.getFullYear();
    const passwordHast = await bcrypt.hash(password, 10);
    const dateCreation = new Date();
    const resutlat = await db.query(Query, [
      nom,
      prenom,
      nom_utilisateur,
      genre,
      email,
      telephone,
      ville,
      adresse,
      passwordHast,
      id_Fonction,
      id_Site,
      id_Programme,
      id_Grille,
      statut,
      dateCreation,
    ]);
    return res
      .status(201)
      .send({ message: "Le compte de l'utilisateur a été bien enregistrer" });
  } catch (error) {
    res.status(500).json({ message: "Error request" });
  }
};
const getAllUtilisateur = async (req, res, next) => {
  const Query = `SELECT UT.id,UT.nom,UT.prenom,UT.nom_utilisateur,UT.email, UT.telephone,Ft.nom Fonction,St.nom Site,Pr.nom Programme,Gr.nom Grille,UT.status,UT.dateCreation from B_UTILISATEUR UT 
  left join B_FONCTION Ft on UT.id_Fonction=Ft.id
  left join B_SITE St on UT.id_Site=St.id 
  left join B_PROGRAMME Pr on UT.id_Programme=Pr.id
  left join B_GRILLE Gr on UT.id_Grille=Gr.id ORDER BY dateCreation DESC`;
  try {
    const [resultat] = await db.query(Query);
    return res.status(200).send(resultat);
  } catch (error) {
    res.status(500).json({ message: "Error resques" });
  }
};
const getOneUtilisateur = async (req, res, next) => {
  const { id } = req.params.id;
  if (!id) {
    return res
      .status(403)
      .json({ message: "Veuillez bien renseigner les parametres." });
  }
  try {
    const Query = `SELECT * from B_UTILISATEUR WHERE id=?`;
    const [resultat] = await db.query(Query, [id]);
    return res.status(200).send(resultat[0]);
  } catch (error) {
    res.status(500).json({ message: "Error request" });
  }
};
const getDetailsUtilisateur = async (req, res, next) => {
  const { id } = req.params;
  if (!id) {
    return res
      .status(403)
      .json({ message: "Merci de bien renseigner les parametres" });
  }
  try {
    const Query = `SELECT UT.id, UT.nom,UT.prenom,UT.telephone,UT.email,FCT.nom as Fonction,st.nom as Site,pr.nom as Programme from
     B_UTILISATEUR UT INNER JOIN B_FONCTION FCT
      on UT.id_Fonction=FCT.id 
      INNER JOIN B_SITE st on UT.id_Site=st.id INNER JOIN B_PROGRAMME pr on UT.id_Programme=pr.id
    where UT.id=?`;
    const Query2 = `SELECT count(*) nb_consultation, fch.id,fch.titre,fch.url, UT.nom_utilisateur as Gestionnaire,max(ht.dateConsultation) as dateConsultation from B_HISTORIQUE ht INNER JOIN B_FICHE fch on ht.id_FICHE=fch.id INNER JOIN B_UTILISATEUR UT on fch.id_gestionnaire=UT.id where ht.id_UTILISATEUR=? GROUP BY fch.id`;
    const Query3 = `SELECT fch.id,fch.titre,ct.message,fch.url,UT.nom_utilisateur as Gestionnaire,ct.dateCommentaire  from B_COMMENTAIRE ct INNER JOIN B_FICHE fch on ct.id_FICHE=fch.id INNER JOIN  B_UTILISATEUR UT on fch.id_gestionnaire=UT.id where ct.id_UTILISATEUR=?`;
    const [result] = await db.query(Query, [id]);
    const [result2] = await db.query(Query2, [id]);
    const [result3] = await db.query(Query3, [id]);
    result[0]["consultations"] = result2;
    result[0]["commentaires"] = result3;
    return res.status(200).send(result[0]);
  } catch (error) {
    console.log(error);
    throw error;
  }
};
const updateUtilisateur = async (req, res, next) => {
  const {
    id,
    prenom,
    nom,
    userName,
    email,
    tel,
    id_Role,
    id_Fonction,
    id_Site,
    id_Programme,
    id_Grille,
    statut,
  } = req.body;
  if (
    !id ||
    !prenom ||
    !nom ||
    !userName ||
    !email ||
    !tel ||
    !id_Role ||
    !id_Fonction ||
    !id_Site ||
    !id_Programme ||
    !id_Grille ||
    !statut
  ) {
    return res
      .status(403)
      .json({ message: "Veuillez bien renseigner les parametres." });
  }
  try {
    const Query = `UPDATE B_UTILISATEUR SET (prenom=?,nom=?,userName=?,email=?,tel=?,id_Role=?,id_Fonction=?,
      id_Site=?,id_Programme=?,id_Grille=?,statut=?,dateModification=?) where id=?`;
    const dateCreationModif = new Date();
    const resultat = await db.query(Query, [
      prenom,
      nom,
      userName,
      email,
      tel,
      id_Role,
      id_Fonction,
      id_Site,
      id_Programme,
      id_Grille,
      statut,
      dateCreationModif,
    ]);
    return res
      .status(201)
      .json({ message: "Les modifications ont été effectuée avec succes" });
  } catch (error) {
    res.status(500).json({ message: "Error request" });
  }
};
const deleteUtilisateur = async (req, res, next) => {
  const { id } = req.params;
  if (!id) {
    return res
      .status(403)
      .json({ message: "Merci de spécifier l'utilisateur à supprimer" });
  }
  try {
    const Query = `DELETE  from B_UTILISATEUR WHERE id=?`;
    const resultat = await db.query(Query, [id]);
    return res
      .status(201)
      .json({ message: "L'utilisateur a été supprimer avec succès." });
  } catch (error) {
    console.log(error);
    throw error;
  }
};
const update_utilisateur = async (req, res, next) => {
  const { id } = req.params;
  const { ETAT } = req.body;
  if (!id) {
    return res
      .status(403)
      .json({ message: "Merci de spécifier l'utilisateur à desactiver ." });
  }
  try {
    const Query = `UPDATE B_UTILISATEUR SET status=? where id=?`;
    const resultat = await db.query(Query, [ETAT, id]);
    return res
      .status(201)
      .json({ message: `L'utilisateur est ${ETAT} maintenant.` });
  } catch (error) {
    console.log(error);
    throw error;
  }
};

/**  fin des controllers des utilisateurs */
/** les controllers pour les Sla */
const addSla = async (req, res, next) => {
  const { source, type, delai, priorite } = req.body;
  if (!source || !type || !delai || !priorite) {
    return res
      .status(500)
      .json({ message: "Veuillez bien renseigner les parametres." });
  }
  try {
    const Query = `INSERT INTO B_SLA (source,type,delai,priorite,Etat,dateCreationSla)  VALUES(?,?,?,?,?,?)`;
    const dateCreation = new Date();
    const Etat = "Actif";
    const resultat = await db.query(Query, [
      source,
      type,
      delai,
      priorite,
      Etat,
      dateCreation,
    ]);
    return res.status(201).json({
      message: " Vous venez d'ajouter un nouveau SLA avec succes .",
    });
  } catch (error) {
    console.log(error);
    throw error;
  }
};
const getAllSla = async (req, res, next) => {
  try {
    const Query = `SELECT * from B_SLA`;
    const [resultat] = await db.query(Query);
    return res.status(200).send(resultat);
  } catch (error) {
    res.status(500).json({ message: "Eroor request" });
  }
};
const getSlaById = async (req, res, next) => {
  const id = req.params.id;
  //console.log(id);
  try {
    const Query = `SELECT * from B_SLA WHERE id=?`;
    const [resultat] = await db.query(Query, [id]);
    return res.status(200).send(resultat[0]);
  } catch (error) {
    res.status(500).json({ message: "Eroor request" });
  }
};
const updateSla = async (req, res, next) => {
  const { source, type, delai, priorite } = req.body;
  const { id } = req.params;
  if (!source || !type || !delai || !priorite || !id)
    return res
      .status(403)
      .json({ message: "Veuillez bien renseigner les parametres . " });
  try {
    const Query = `UPDATE B_SLA SET source=?,type=?,delai=?,priorite=?,dateModification=? WHERE id=?`;
    const dateModification = new Date();
    const resultat = await db.query(Query, [
      source,
      type,
      delai,
      priorite,
      dateModification,
      id,
    ]);
    return res
      .status(201)
      .json({ message: " vous venez de modifier ce SLA avec succes." });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request." });
  }
};
const deleteSla = async (req, res, next) => {
  const id = req.params.id;
  //console.log(id);
  if (!id) {
    return res
      .status(403)
      .json({ message: "Veuillez bien renseigner les parametres . " });
  }
  try {
    const Query = `DELETE  from B_SLA WHERE id=?`;
    const resultat = await db.query(Query, [id]);
    return res
      .status(201)
      .json({ message: " vous venez de supprimer ce SLA avec succes." });
  } catch (error) {
    res.status(500).json({ message: "Error request." });
  }
};
/** fin des controllers pour Sla */

/** les controllers pour sous categorie  */
const addSousCategorie = async (req, res, next) => {
  const { nom, id_Categorie } = req.body;
  if (!nom || !id_Categorie) {
    return res
      .status(403)
      .json({ message: "Veuillez bien renseigner les parametres." });
  }
  try {
    const Query = `INSERT INTO B_SOUS_CATEGORIE (nom,Etat,id_Categorie,dateCreationSousCategorie) VALUES (?,?,?,?)`;
    const dateCreation = new Date();
    const etat = "ACTIF";
    const resultat = await db.query(Query, [
      nom,
      etat,
      id_Categorie,
      dateCreation,
    ]);
    return res.status(201).json({
      message: " vous venez d'ajouter une nouvelle sous_catégorie avec succes.",
    });
  } catch (error) {
    console.log(error);
    throw error;
  }
};
const getAllSousCategorie = async (req, res, next) => {
  try {
    const Query = `SELECT * from B_SOUS_CATEGORIE`;
    const [resultat] = await db.query(Query);
    return res.status(200).send(resultat);
  } catch (error) {
    console.log(error);
    throw error;
  }
};
const getAllSousCategorieByIdCategorie = async (req, res, next) => {
  const id = req.params.id;
  try {
    const Query = ` SELECT A.id,A.nom,A.dateCreation,B.nom as nom_Categorie
    from B_SOUS_CATEGORIE A
     INNER JOIN B_CATEGORIE B
    on A.id=B.id 
    where A.id_Categorie=? `;
    const [resultat] = await db.query(Query, [id]);
    return res.status(200).send(resultat);
  } catch (error) {
    console.log(error);
    throw error;
  }
};
const deleteSousCategorie = async (req, res, next) => {
  const id = req.params.id;
  if (!id) {
    return res
      .status(403)
      .json({ message: "Veuillez bien renseigné les parametres." });
  }
  try {
    const Query = `DELETE from B_SOUS_CATEGORIE WHERE id=?`;
    const resultat = await db.query(Query, [id]);
    return res.status(201).json({
      message: " vous venez de supprimer cette sous_catégorie avec succes.",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request." });
  }
};
/** fin des controllers sous categorie */
/** debut des controllers categorie */

const addCategorie = async (req, res, next) => {
  const { nom } = req.body;
  if (!nom) {
    return res
      .status(403)
      .json({ message: "Veuillez bien renseigner les parametres." });
  }
  try {
    const Query = `INSERT INTO B_CATEGORIE (nom,Etat,dateCreationCategorie) VALUES (?,?,?)`;
    const ETAT = "ACTIF";
    const dateCreation = new Date();
    const resultat = await db.query(Query, [nom, ETAT, dateCreation]);
    return res.status(201).json({
      message: " vous venez d'ajouter une nouvelle catégorie avec succes.",
    });
  } catch (error) {
    console.log(error);
    throw error;
  }
};
const getAllCategorie = async (req, res, next) => {
  try {
    const Query = `SELECT * from B_CATEGORIE`;
    const [resultat] = await db.query(Query);
    return res.status(200).send(resultat);
  } catch (error) {
    console.log(error);
    throw error;
  }
};
const getOneCatgorie = async (req, res, next) => {
  const { id } = req.params;
  try {
    const Query = `SELECT * from B_CATEGORIE where id=?`;
    const [resultat] = await db.query(Query, [id]);
    return res.status(200).send(resultat[0]);
  } catch (error) {
    console.log(error);
    throw error;
  }
};
const getAllCategorieAndSousCategorie = async (req, res, next) => {
  try {
    const Query = `SELECT id,nom as Categorie from B_CATEGORIE`;
    const QuerySousCategorie = `SELECT id,id_Categorie,nom from B_SOUS_CATEGORIE where id_Categorie=?`;
    const [resultat] = await db.query(Query);
    for (let i = 0; i < resultat.length; i++) {
      const [resultatSousCat] = await db.query(QuerySousCategorie, [
        resultat[i].id,
      ]);
      resultat[i]["Sous_Categorie"] = resultatSousCat;
    }
    return res.status(200).send(resultat);
  } catch (error) {
    console.log(error);
    throw error;
  }
};
const deleteCategorie = async (req, res, next) => {
  const { id } = req.params;
  if (!id) {
    return res
      .status(403)
      .json({ message: "Veuillez bien renseigné les parametres." });
  }
  try {
    const Query = `DELETE from B_CATEGORIE WHERE id=?`;
    const resultat = await db.query(Query, [id]);
    return res.status(201).json({
      message: " vous venez de supprimer cette  catégorie avec succes.",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request." });
  }
};
const updateCategorie = async (req, res, next) => {
  const { id } = req.params;
  const { nom } = req.body;
  if (!id || !nom) {
    return res
      .status(403)
      .json({ message: "Merci de bien renseigner les parametres" });
  }
  try {
    const Query = `UPDATE B_CATEGORIE SET nom=? ,dateModification=? WHERE id=?`;
    const dateModif = new Date();
    const resultat = await db.query(Query, [nom, dateModif, id]);
    return res
      .status(201)
      .json({ message: "Vous avez modifier cette catégorie avec succes." });
  } catch (error) {
    res.status(500).json({ message: "Error request" });
  }
};

/** fin de controllers categories */
/*controlleurs sur les fonctionnalités de  Historique*/

const addHistorique = async (req, res, next) => {
  const { id_Utilisateur, id_Fiche } = req.body;
  if (!id_Utilisateur || !id_Fiche) {
    return res
      .status(403)
      .json({ message: "Veuillez bien renseigner les parametres" });
  }
  try {
    const Query = `INSERT INTO B_HISTORIQUE (dateConsultation,id_UTILISATEUR,id_FICHE) VALUES(?,?,?)`;
    const dateConsultation = new Date();
    const resultat = await db.query(Query, [
      dateConsultation,
      id_Utilisateur,
      id_Fiche,
    ]);
    return res.status(201).json({ message: "Historique a été bien inserrée!" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};
const getAllHistoriqueByIdUtilisateur = async (req, res, next) => {
  const id = req.params.id;
  try {
    const Query = `select   B.id_FICHE,A.* FROM B_UTILISATEUR A
    INNER JOIN B_HISTORIQUE B on A.id=B.id_UTILISATEUR
    where B.id_FICHE?
    `;
    const [resultat] = await db.query(Query, [id]);
    return res.status(200).send(resultat);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};
const getAllHistoriqueByIdFiche = async (req, res, next) => {
  const id = req.params.id;
  try {
    const retour = {};
    const Query = `select
    FH.id,FH.titre, FH.dateReception,FH.dateDebut,FH.dateVisibilite,FH.dateFin,
    St.type as type,Ct.nom as categorie,FH.url,FH.extention
    FROM B_FICHE FH
    INNER JOIN B_CATEGORIE Ct on FH.id_categorie=Ct.id
    INNER JOIN B_SLA St on FH.id_Sla=St.id
    where FH.id=?`;
    const QueryConsultation = `
      SELECT MAX(HT.id) as id, 
             COUNT(HT.id_FICHE) as nb_consultation,
             UT.nom_utilisateur,
             MAX(HT.dateConsultation) as date_consultation 
      FROM B_HISTORIQUE HT 
      INNER JOIN B_UTILISATEUR UT on HT.id_UTILISATEUR=UT.id 
      WHERE HT.id_FICHE=? 
      GROUP BY UT.nom_utilisateur, UT.id
    `;
    const QueryMessage = `SELECT CT.id ,UT.nom_utilisateur,CT.message,CT.dateCommentaire from B_COMMENTAIRE CT INNER JOIN B_UTILISATEUR UT on CT.id_UTILISATEUR=UT.id where CT.id_FICHE=?`;
    const [resultCommentaire] = await db.query(QueryMessage, [id]);
    const [result] = await db.query(QueryConsultation, [id]);
    const [resutlat] = await db.query(Query, [id]);
    retour["infos_fiche"] = resutlat[0];
    retour["Consultations"] = result;
    retour["Commentaires"] = resultCommentaire;
    return res.status(200).send(retour);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};
/** fin des fonctionnalités  */
/*controlleurs sur les fonctionnalités de  Site*/

const addSite = async (req, res, next) => {
  const { nom, description } = req.body;
  if (!nom || !description) {
    return res
      .status(403)
      .json({ message: "Veuillez bien renseigner les parametres." });
  }
  try {
    const Query = `INSERT INTO B_SITE (nom,Etat,description,dateCreation) VALUES(?,?,?,?)`;
    const dateCreation = new Date();
    const etat = "ACTIF";
    const resultat = await db.query(Query, [
      nom,
      etat,
      description,
      dateCreation,
    ]);
    return res.status(201).json({
      message: " vous avez d'ajouter un nouveau site avec succes.",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request." });
  }
};
const getAllSite = async (req, res, next) => {
  try {
    const Query = `SELECT * from B_SITE`;
    const [resultat] = await db.query(Query);
    return res.status(200).send(resultat);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};
const getDeatilsSite = async (req, res, next) => {
  const id = req.params.id;
  if (!id) {
    return res
      .status(403)
      .json({ message: "Veuillez bien renseigner les parametres." });
  }
  try {
    const resultat = {};
    const Query = `SELECT nom,Etat,DATE_FORMAT(dateCreation, '%Y-%m-%d') as dateCreation,description from B_SITE where id=?`;
    const Query2 = `SELECT BU.nom,BU.prenom,BU.nom_utilisateur as login,BF.nom as fonction from B_UTILISATEUR BU INNER JOIN B_FONCTION BF on BU.id_Fonction=BF.id where BU.id_Site=?`;
    const resultat1 = await db.query(Query, [id]);
    const resultat2 = await db.query(Query2, [id]);
    resultat["infos_site"] = resultat1[0];
    resultat["utilisateurs"] = resultat2[0];
    return res.status(200).send(resultat);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};
const getOneSite = async (req, res, next) => {
  const id = req.params.id;
  try {
    const Query = `SELECT id, nom,description from B_SITE where id=?`;
    const resultat = await db.query(Query, [id]);
    return res.status(200).send(resultat[0]);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};
const updateSite = async (req, res, next) => {
  const id = req.params.id;
  const { nom, description } = req.body;
  try {
    const Query = `UPDATE B_SITE SET nom=?, description=?,dateModification=? WHERE id=?`;
    const dateModification = new Date();
    await db.query(Query, [nom, description, dateModification, id]);
    return res.status(200).json({ message: "Site mis à jour avec succès." });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request." });
  }
};
const deleteSite = async (req, res, next) => {
  const id = req.params.id;
  try {
    const Query = `DELETE from B_SITE WHERE id=?`;
    const resultat = await db.query(Query, [id]);
    return res.status(201).json({
      message: " vous venez de supprimer cette site avec succes.",
    });
  } catch (error) {
    console.log(error);
    throw error;
  }
};

/** fin des controllers sites */
/*controlleurs sur les fonctionnalités de  Fonction*/

const addFonction = async (req, res, next) => {
  const { nom } = req.body;
  try {
    const Query = `INSERT INTO B_FONCTION (nom,Role_Associe,Permissions_Associe,Etat,dateCreation) VALUES (?,?,?,?,?)`;
    const dateCreation = new Date();
    const Etat = "ACTIF";
    const Role_Associe = RoleFormatter(nom);
    const Permissions_Associe = PermissionsFormatter(nom);

    const resultat = await db.query(Query, [
      nom,
      Role_Associe,
      Permissions_Associe,
      Etat,
      dateCreation,
    ]);
    return res.status(201).json({
      message: " vous venez d'ajouter une nouvelle Fonction avec succes.",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request." });
  }
};
const RoleFormatter = (nom) => {
  let Role = "";
  const tableSplit = nom.split(" ");
  if (tableSplit.length <= 1) {
    return "R_" + tableSplit[0].substring(0, 4).toUpperCase();
  } else {
    for (let i = 0; i < tableSplit.length; i++) {
      Role = Role + tableSplit[i].charAt(0);
    }
    return "R_" + Role.toUpperCase();
  }

  return null;
};
const PermissionsFormatter = (nom) => {
  let Permissions = "";
  Permissions = "canAdd,canDelete,canEdit,canRead";
  return Permissions;
};
const getAllFonction = async (req, res, next) => {
  try {
    const Query = `SELECT * from B_FONCTION `;
    const [resultat] = await db.query(Query);
    return res.status(200).send(resultat);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request." });
  }
};
const getOneFonction = async (req, res, next) => {
  const { id } = req.params;
  try {
    const Query = `SELECT * from B_FONCTION where id=?`;
    const [result] = await db.query(Query, [id]);
    return res.status(200).send(result[0]);
  } catch (error) {
    console.log(error);
    throw error;
  }
};
const deleteFonction = async (req, res, next) => {
  const { id } = req.params;
  try {
    const Query = `DELETE from B_FONCTION WHERE id=?`;
    const resultat = await db.query(Query, [id]);
    return res.status(201).json({
      message: " vous venez de supprimer cette Fonction avec succes.",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};
const update_Fonction = async (req, res, next) => {
  const { nom } = req.body;
  const id = req.params.id;
  const Role_Associe = RoleFormatter(nom);
  const Permissions_Associe = PermissionsFormatter(nom);
  try {
    const Query = `UPDATE B_FONCTION SET nom=?,Role_Associe=?,Permissions_Associe=? where id=?`;
    const resultat = await db.query(Query, [
      nom,
      Role_Associe,
      Permissions_Associe,
      id,
    ]);
    return res.status(201).json({ message: "La mise à jour est effective." });
  } catch (error) {
    console.log(error);
    throw error;
  }
};
/** fin des controllers site */
/*les requêtes sur les fonctionnalités de  Nofication*/

const addNotification = async (req, res, next) => {
  const { titre, message, type, id_Utilisateur, id_Fiche, url } = req.body;
  if (!titre || !message || !type || !id_Utilisateur || !id_Fiche || !url) {
    return res
      .status(403)
      .json({ message: "Veuillez bien renseigner les parametres." });
  }
  try {
    const Query = `INSERT INTO B_NOTIFICATION (titre,message,type,dateReception,id_Utilisateur,id_Fiche,url) VALUES(?,?,?,?,?,?,?)`;
    const dateCreation = new Date();
    const resultat = await db.query(Query, [
      titre,
      message,
      type,
      dateCreation,
      id_Utilisateur,
      id_Fiche,
      url,
    ]);
    return res.status(201).json({
      message: " vous venez d'ajouter une nouvelle fiche avec succes.",
    });
  } catch (error) {
    //console.log();
    res.status(500).json({ message: "Error request." });
  }
};
const getAllNotification = async (req, res) => {
  try {
    const userId = req.auth.userId; // Depuis votre middleware d'authentification
    
    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    // Exemple avec une base de données SQL
    const [notifications] = await db.query(`
      SELECT 
        BN.id,
        BN.id_FICHE,
        f.titre,
        IF(n.id_NOTIFICATION is null,0,1 ) isRead,
        BN.dateReception as createdAt,
        u.nom
      FROM B_NOTIFICATION BN 
      LEFT JOIN (select id_NOTIFICATION,createdBy from B_notifications where createdBy=?) n
      on BN.id=n.id_NOTIFICATION
      INNER JOIN B_UTILISATEUR u on BN.id_UTILISATEUR=u.ID
      INNER JOIN B_FICHE f on BN.id_FICHE=f.id
      ORDER BY n.createdBy ASC
    `,[userId]);
    console.log(notifications);
    return res.status(200).json(notifications);
  } catch (error) {
    console.error('Erreur lors de la récupération des notifications:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}
const redOneNotifcation= async (req, res) => {
  try {
    const notificationId = parseInt(req.params.id);
    const userId = req.auth.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    // Vérifier que la notification appartient à l'utilisateur
    const [result1]=await db.query(`Select F.id, F.titre from B_NOTIFICATION BN ,B_FICHE F where BN.id_FICHE=F.id and BN.id=?`,[notificationId]);
    const createdAt=new Date();
    const titre=result1[0].titre;
    const isRead=true;
    const id_FICHE=result1[0].id;
    const result = await db.query(`
      INSERT INTO B_notifications (id_UTILISATEUR,id_NOTIFICATION,id_FICHE,titre,createdBy,isRead,createdAt,readAt) VALUES(?,?,?,?,?,?,?,?) `, [userId,notificationId,id_FICHE,titre,userId,isRead,createdAt,createdAt]);
   /* if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Notification non trouvée' });
    }*/
    
    res.json({ success: true, message: 'Notification marquée comme lue' });
  } catch (error) {
    console.error('Erreur lors du marquage de la notification:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}
const redAllNotification=async (req, res) => {
  try {
    const { ids } = req.body;
    const userId = req.auth.userId;
    console.log(ids);
    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'IDs invalides' });
    }

    // Marquer toutes les notifications spécifiées comme lues
    const result = await db.query(`
      UPDATE B_notifications 
      SET isRead = true, readAt = NOW()
      WHERE id IN (?) AND id_UTILISATEUR = ?
    `, [ids, userId]);
    
    res.json({ 
      success: true, 
      message: `${result.affectedRows} notification(s) marquée(s) comme lue(s)` 
    });
  } catch (error) {
    console.error('Erreur lors du marquage des notifications:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}
const createNotification=async (req ,res) => {
  try {
    const { userId, id_FICHE, titre } = req.body;
    const createdBy = req.auth.userId;
    
    if (!userId || !id_FICHE || !titre) {
      return res.status(400).json({ error: 'Données manquantes' });
    }

    const result = await db.query(`
      INSERT INTO notifications (userId, id_FICHE, titre, createdBy, isRead, createdAt)
      VALUES (?, ?, ?, ?, false, NOW())
    `, [userId, id_FICHE, titre, createdBy]);
    
    res.status(201).json({ 
      success: true, 
      id: result.insertId,
      message: 'Notification créée' 
    });
  } catch (error) {
    console.error('Erreur lors de la création de la notification:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

/** fin de controllers historique */
/*controlleurs sur les fonctionnalités de  COMMENTAIRE*/

const addCommentaire = async (req, res, next) => {
  const { message, id_Fiche } = req.body;
  const userId = req.auth.userId;
  if (!id_Fiche || !message) {
    return res
      .status(403)
      .json({ message: "Veuillez bien renseigné les parametres." });
  }
  try {
    const Query = `INSERT INTO B_COMMENTAIRE (message,dateCommentaire,id_Utilisateur,id_FICHE) VALUES (?,?,?,?)`;
    const dateCreation = new Date();
    const resultat = await db.query(Query, [
      message,
      dateCreation,
      userId,
      id_Fiche,
    ]);
    return res
      .status(201)
      .json({ message: "Votre Commentaire a été bien enregistrer." });
  } catch (error) {
    res.status(500).json({ message: "Error Request" });
  }
};
const getAllCommentaireByIdFiche = async (req, res, next) => {
  const { id } = req.body;
  if (!id) {
    return res
      .status(403)
      .json({ message: "Veuillez bien renseigner les parametres" });
  }
  try {
    const Query = `Select A.ID,A.message,A.dateCommentaire,B.nom,B.userName from 
    B_COMMENTAIRE A INNER JOIN  B_UTILISATEUR B on A.id_UTILISATEUR=B.id`;
    const [resultat] = await db.query(Query, [id]);
    return res.status(200).send(resultat);
  } catch (error) {
    console.log(error);
  }
};
const getAllCommentaireByIdUtilisateur = async (req, res, next) => {
  const { id } = req.body;
  if (!id) {
    return res
      .status(403)
      .json({ message: "Veuillez bien renseigner les parametres" });
  }
  try {
    const Query = `Select A.ID,A.message,A.dateCommentaire,B.nom,B.userName from 
    B_COMMENTAIRE A INNER JOIN B_UTILISATEUR B on A.id_UTILISATEUR=B.id
    where id_UTILISATEUR=?`;
    const [resultat] = await db.query(Query, [id]);
    return res.status(200).send(resultat);
  } catch (error) {}
};
const exportCommentaire = async (req, res, next) => {};
/** fin des controllers COMMENTAIRES */
// les requêtes pour les fonctionnalités de Motif_ma_ voix_compte

const addMotifMaVoixCompte = async (req, res, next) => {
  const { nom } = req.body;
  if (!nom) {
    return res
      .status(403)
      .json({ message: "Merci de bien renseigner les parametres" });
  }
  try {
    const Query = `INSERT INTO B_MOTIF_MA_VOIX_COMPTE (nomMotif,dateCreation) VALUES(?,?)`;
    const dateCreation = new Date();
    const resultat = await db.query(Query, [nom, dateCreation]);
    return res
      .status(201)
      .json({ message: "Vous venez d'ajouter un nouveau motif " });
  } catch (error) {
    res.status(500).json({ message: "Error request" });
  }
};

const getAllMotifMaVoixCompte = async (req, res, next) => {
  try {
    const Query = `SELECT id,nomMotif,DATE_FORMAT(dateCreation,'%Y-%m-%d') as dateCreation from B_MOTIF_MA_VOIX_COMPTE`;
    const [resultat] = await db.query(Query);
    return res.status(200).send(resultat);
  } catch (error) {
    res.status(500).json({ message: "Error request" });
  }
};
const getOneMotifMaVoixCompte = async (req, res, next) => {
  const { id } = req.params;
  try {
    const Query = `SELECT id,nomMotif from B_MOTIF_MA_VOIX_COMPTE WHERE id=?`;
    const resultat = await db.query(Query, [id]);
    return res.status(200).send(resultat[0]);
  } catch (error) {
    res.status(500).json({ message: "Error request" });
  }
};
const updateMotifMaVoixCompte = async (req, res, next) => {
  const { id } = req.params;
  const { nomMotif } = req.body;
  //console.log(nomMotif);
  try {
    if (!nomMotif) {
      return res
        .status(403)
        .json({ message: "Merci de bien renseigner les parametres" });
    }
    const Query = `UPDATE B_MOTIF_MA_VOIX_COMPTE SET nomMotif=? WHERE id=?`;
    await db.query(Query, [nomMotif, id]);
    return res.status(201).json({ message: "Motif mis à jour avec succès" });
  } catch (error) {
    res.status(500).json({ message: "Error request" });
  }
};
const deleteMotifMaVoixCompte = async (req, res, next) => {
  const { id } = req.params;
  try {
    const Query = `DELETE  from B_MOTIF_MA_VOIX_COMPTE WHERE id=?`;
    const resultat = await db.query(Query, [id]);
    return res.status(201).json({ message: "Ce motif a été bien effacé" });
  } catch (error) {
    res.status(500).json({ message: "Error request" });
  }
};
/** fin de controllers motif de ma voix compte */

const addMaVoixCompte = async (req, res, next) => {
  const { motif_ma_voix_compte, message } = req.body;
  const userId = req.auth.userId;
  //console.log(req.body);
  if (!motif_ma_voix_compte || !message) {
    return res
      .status(403)
      .json({ message: "Merci de bien renseigner les parametres" });
  }
  try {
    const Query = `INSERT INTO B_MA_VOIX_COMPTE (id_UTILISATEUR,motif_ma_voix_compte,message,dateCreation) VALUES(?,?,?,?)`;
    const dateCreation = new Date();
    const resultat = await db.query(Query, [
      userId,
      motif_ma_voix_compte,
      message,
      dateCreation,
    ]);
    return res
      .status(201)
      .json({ message: "Vous venez de faire attendre votre voix" });
  } catch (error) {
    res.status(500).json({ message: "Error request" });
  }
};
const getAllExport = async (req, res, next) => {
  const { dataType, dateDebut, dateFin } = req.body;
  try {
    let Query = "";
    if (dataType === "Ma voix compte") {
      Query = `SELECT A.nomMotif as MOTIF_DU_MESSAGE,MVCP.message as MESSAGE, 
      DATE_FORMAT(MVCP.dateCreation,'%Y-%m-%d %H:%i:%s') as DATE,UT.nom_utilisateur as LOGIN,st.nom as SITE,UT.nom as NOM ,UT.prenom as PRENOM  from B_MA_VOIX_COMPTE MVCP 
     INNER JOIN B_MOTIF_MA_VOIX_COMPTE A on MVCP.motif_ma_voix_compte=A.id
    LEFT join B_UTILISATEUR UT on MVCP.id_UTILISATEUR=UT.id
    INNER JOIN B_SITE st on UT.id_Site=st.id 
    where DATE_FORMAT(MVCP.dateCreation,'%Y-%m-%d')  between ? and ?
    `;
    } else {
      if (dataType === "Commentaires") {
        Query = `SELECT FCH.titre as DESCRIPTION,BCT.message as COMMENTAIRE,DATE_FORMAT(BCT.dateCommentaire,'%Y-%m-%d %H:%i:%s') as DATE_COMMENTAIRE,UT.nom as NOM,UT.nom_utilisateur as LOGIN,st.nom as SITE
        from B_COMMENTAIRE BCT
         LEFT JOIN B_UTILISATEUR UT on BCT.id_UTILISATEUR=UT.id
         LEFT JOIN B_FICHE FCH on BCT.id_FICHE=FCH.id
         LEFT JOIN B_SITE st on UT.id_Site=st.id 
         where DATE_FORMAT(BCT.dateCommentaire,'%Y-%m-%d') between DATE_FORMAT(?,'%Y-%m-%d') and DATE_FORMAT(?,'%Y-%m-%d')
         `;
      } else {
        if (dataType === "Chargements") {
          Query = `SELECT FCH.titre as DESCRIPTION,DATE_FORMAT(FCH.dateReception,'%Y-%m-%d %H:%i:%s') as DATE_RECEPTION,DATE_FORMAT(FCH.dateEnregistrement,'%Y-%m-%d %H:%i:%s') as DATE_ENREGISTREMENT,DATE_FORMAT(FCH.dateDebut,'%Y-%m-%d %H:%i:%s') as DATE_DEBUT,DATE_FORMAT(FCH.dateFin,'%Y-%m-%d %H:%i:%s') as DATE_FIN,
          FCH.ETAT,sl.delai as DELAI,DATE_FORMAT(FCH.date_Archive,'%Y-%m-%d %H:%i:%s') as DATE_ARCHIVE,UT2.nom_utilisateur as ARCHIVE_PAR,UT.nom_utilisateur as GESTIONNAIRE
          from B_FICHE FCH 
          LEFT JOIN B_UTILISATEUR UT on FCH.id_Gestionnaire=UT.id
          LEFT JOIN B_SLA sl on FCH.id_Sla=sl.id
          LEFT JOIN B_UTILISATEUR UT2 on FCH.archive_par=UT2.id
          where DATE_FORMAT(FCH.dateEnregistrement,'%Y-%m-%d') BETWEEN DATE_FORMAT(?,'%Y-%m-%d') and DATE_FORMAT(?,'%Y-%m-%d')
          `;
        } else {
          if (dataType === "Exactitude") {
            Query = `SELECT FCH.titre as DESCRIPTION,UT.nom as NOM ,UT.nom_utilisateur as LOGIN,ST.nom as SITE,
            BS.exactitude as EXACTITUDE,DATE_FORMAT(BS.dateSondage,'%Y-%m-%d %H:%i:%s') AS DATE_SONDAGE
            FROM B_SONDAGE BS 
            LEFT JOIN B_FICHE FCH on BS.id_FICHE=FCH.id
            LEFT JOIN B_UTILISATEUR UT on BS.id_UTILISATEUR=UT.id
            LEFT JOIN B_SITE ST on UT.id_Site=ST.id
            where DATE_FORMAT(BS.dateSondage,'%Y-%m-%d')   BETWEEN DATE_FORMAT(?,'%Y-%m-%d')  and DATE_FORMAT(?,'%Y-%m-%d')
            `;
          } else {
            if (dataType === "Utilité") {
              Query = `SELECT FCH.titre as DESCRIPTION,UT.nom as NOM,UT.nom_utilisateur as LOGIN,ST.nom as SITE,
           IF(BS.utilite=1,'OUI','NON') as UTILITE,DATE_FORMAT(BS.dateSondage,'%Y-%m-%d %H:%i:%s' )as DATE_SONDAGE,BC.message as Commentaire
            FROM B_SONDAGE BS 
            LEFT JOIN B_COMMENTAIRE BC on BS.id_FICHE=BC.id_FICHE
            LEFT JOIN B_FICHE FCH on BS.id_FICHE=FCH.id
            LEFT JOIN B_UTILISATEUR UT on BS.id_UTILISATEUR=UT.id
            LEFT JOIN B_SITE ST on UT.id_Site=ST.id
            where DATE_FORMAT(BS.dateSondage ,'%Y-%m-%d') BETWEEN DATE_FORMAT(?,'%Y-%m-%d') and DATE_FORMAT(?,'%Y-%m-%d')
            `;
            } else {
              if (dataType === "Quiz") {
                Query = `select FCH.titre as DESCRIPTION,RQ.ETAT as RESULTAT,DATE_FORMAT(RQ.date_Quiz,'%Y-%m-%d %H:%i:%s' ) as DATE_QUIZ,UT.nom as NOM,UT.nom_utilisateur as LOGIN,ST.nom as SITE from B_REPONSE_QUIZ RQ 
                LEFT JOIN B_FICHE FCH on RQ.id_FICHE=FCH.id
                LEFT JOIN B_UTILISATEUR UT on RQ.id_UTILISATEUR=UT.id
                LEFT JOIN B_SITE ST on UT.id_Site=ST.id
                where  DATE_FORMAT( RQ.date_Quiz ,'%Y-%m-%d')  BETWEEN DATE_FORMAT(?,'%Y-%m-%d') and DATE_FORMAT(?,'%Y-%m-%d')
                `;
              } else {
                if (dataType === "Taux de lecture J") {
                  Query = `SELECT FCH.titre as Description,DATE_FORMAT(FCH.dateDebut,'%Y-%m-%d %H:%i:%s') as dateDebut,DATE_FORMAT(FCH.dateReception,'%Y-%m-%d %H:%i:%s') as dateReception,DATE_FORMAT(FCH.dateFin,'%Y-%m-%d %H:%i:%s')  as dateFin,UT.nom_utilisateur as Gestionnaire,DATE_FORMAT(FCH.dateEnregistrement,'%Y-%m-%d') as dateEnregistrement,DATE_FORMAT(A.min_dateConsultation,'%Y-%m-%d') as dateConsultation from 
(SELECT id_FICHE,MIN(dateConsultation) as min_dateConsultation from B_HISTORIQUE GROUP BY id_FICHE)A INNER JOIN B_FICHE FCH on A.id_FICHE=FCH.id 
INNER JOIN B_UTILISATEUR UT on FCH.id_gestionnaire=UT.id

where DATE_FORMAT(FCH.dateEnregistrement,'%Y-%m-%d') BETWEEN DATE_FORMAT(?,'%Y-%m-%d') and DATE_FORMAT(?,'%Y-%m-%d') and DATE_FORMAT(A.min_dateConsultation,'%Y-%m-%d')=DATE_FORMAT(FCH.dateEnregistrement,'%Y-%m-%d')  ;`;
                }
              }
            }
          }
        }
      }
    }
    const [resultat] = await db.query(Query, [dateDebut, dateFin]);
    return res.status(200).send(resultat);
  } catch (error) {
    console.log(error);
    throw error;
  }
};
const exportMaVoixCompte = async (req, res, next) => {};
/** fin de controllers mavoix compte */
/*controlleurs sur les fonctionnalités de SONDAGE*/
const getAllDashboard = async (req, res, next) => {
  const userId = req.auth.userId;
  try {
    /** les modes pour les stats */
    const model_on_time = {
      title: "On time",
      amount: "",
      progress: {
        value: 0,
      },
      color: "bg-azure-50",
      permissions: ["R_ADMI", "R_GB"],
    };
    const model_exactitude = {
      title: "Exactitude",
      amount: "",
      progress: {
        value: 0,
      },
      color: "bg-blue-50",
      permissions: ["R_ADMI", "R_GB"],
    };
    const model_utilite = {
      title: "Utilite",
      amount: "",
      progress: {
        value: 0,
      },
      color: "bg-blue-50",
      permissions: ["R_ADMI", "R_GB"],
    };
    const model_taux_maitrise = {
      title: "Taux de maitrise TEST",
      amount: "",
      progress: {
        value: 0,
      },
      color: "bg-cyan-50",
      permissions: ["R_ADMI", "R_SUP", "R_GB"],
    };
    const model_taux_maitrise_retest = {
      title: "Taux de maitrise RETEST",
      amount: "",
      progress: {
        value: 0,
      },
      color: "bg-orange-50",
      permissions: ["R_ADMI", "R_SUP", "R_GB"],
    };
    const model_taux_lecture_J = {
      title: "Taux de lecture J",
      amount: "",
      progress: {
        value: 0,
      },
      color: "bg-yellow-50",
      permissions: ["R_ADMI", "R_SUP", "R_GB"],
    };
    const model_taux_lecture_J_2 = {
      title: "Taux de lecture J+2",
      amount: "",
      progress: {
        value: 0,
      },
      color: "bg-violet-50",
      permissions: ["R_ADMI", "R_SUPE", "R_GB"],
    };
    const model_taux_lecture = {
      title: "Taux de lecture ",
      amount: "",
      progress: {
        value: 0,
      },
      color: "bg-red-50",
      permissions: ["R_ADMI", "R_SUP", "R_GB"],
    };
    /** fin de models  */
    let retour_table = [];
    const Query = `Select COUNT(*) as nombre_chargement from B_SONDAGE BS 
    INNER JOIN B_FICHE FCH on BS.id_FICHE=FCH.id
     where id_Gestionnaire=?`;
    const Query2 = `Select COUNT(*) as nombre_chargement_utile from B_SONDAGE BS 
    INNER JOIN B_FICHE FCH on BS.id_FICHE=FCH.id
     where id_Gestionnaire=? and BS.utilite=1`;
    const Query3 = `Select COUNT(*) as nombre_chargement_exactitude from B_SONDAGE BS 
    INNER JOIN B_FICHE FCH on BS.id_FICHE=FCH.id
     where id_Gestionnaire=? and BS.exactitude=1`;
    const Query_on_time = `select COUNT(*) as nombre_chargement_on_time from B_FICHE FCH 
        INNER JOIN B_ON_TIME BOT on FCH.id=BOT.id_Fiche
        where FCH.id_Gestionnaire=? and BOT.on_time='OUI'`;
    const Query_all_chargement = `SELECT COUNT(*) as nombre_chargement from B_FICHE where id_Gestionnaire=?`;
    const Query_taux_maitrise = `SELECT COUNT(*) as nombre_quiz from B_REPONSE_QUIZ RQ INNER JOIN B_FICHE FCH on RQ.id_FICHE=FCH.id where FCH.id_Gestionnaire=?`;
    const Query_taux_maitrise_1 = `SELECT COUNT(*) as nombre_quiz_succes from B_REPONSE_QUIZ RQ INNER JOIN B_FICHE FCH on RQ.id_FICHE=FCH.id where FCH.id_Gestionnaire=? and RQ.ETAT='succes' and RQ.NB_RETEST=1;`;
    const Query_taux_maitrise_retest = `SELECT COUNT(*) as nombre_quiz_succes from B_REPONSE_QUIZ RQ INNER JOIN B_FICHE FCH on RQ.id_FICHE=FCH.id where FCH.id_Gestionnaire=?  and RQ.NB_RETEST>1;`;
    const Query_taux_lecture_J = `SELECT COUNT(*) as nombre_chargement_lu from (SELECT id_FICHE from B_HISTORIQUE GROUP BY id_FICHE)A INNER JOIN B_FICHE FCH on A.id_FICHE=FCH.id where FCH.id_gestionnaire=?;`;
    const Query_taux_lecture_J_ = `SELECT COUNT(*) as nombre_chargement_lu_J from (SELECT id_FICHE,MIN(dateConsultation) as min_dateConsultation from B_HISTORIQUE GROUP BY id_FICHE)A INNER JOIN B_FICHE FCH on A.id_FICHE=FCH.id where FCH.id_gestionnaire=? and DATE_FORMAT(A.min_dateConsultation,'%Y-%m-%d')=DATE_FORMAT(FCH.dateEnregistrement,'%Y-%m-%d') ;`;
    const Query_taux_lecture_J_2 = `SELECT COUNT(*) as nombre_chargement_lu_J_2 from (SELECT id_FICHE,MIN(dateConsultation) as min_dateConsultation from B_HISTORIQUE GROUP BY id_FICHE)A INNER JOIN B_FICHE FCH on A.id_FICHE=FCH.id where FCH.id_gestionnaire=? and DATE_FORMAT(A.min_dateConsultation,'%Y-%m-%d')=DATE_FORMAT(DATE_ADD(FCH.dateEnregistrement,INTERVAL 2 DAY),'%Y-%m-%d') ;`;
    const Query_allSite = `SELECT * from B_SITE`;

    const [resultat1] = await db.query(Query, [userId]);
    const [resultat2] = await db.query(Query2, [userId]);
    const [resultat3] = await db.query(Query3, [userId]);
    const [resultat5] = await db.query(Query_all_chargement, [userId]);
    const [resultat4] = await db.query(Query_on_time, [userId]);
    const [resultat6] = await db.query(Query_taux_maitrise, [userId]);
    const [resultat7] = await db.query(Query_taux_maitrise_1, [userId]);
    const [resultat8] = await db.query(Query_taux_maitrise_retest, [userId]);
    const [resultat9] = await db.query(Query_taux_lecture_J, [userId]);
    const [resultat10] = await db.query(Query_taux_lecture_J_, [userId]);
    const [resultat11] = await db.query(Query_taux_lecture_J_2, [userId]);

    /*********   taux utilite ****************/
    if (
      resultat1[0].nombre_chargement == 0 ||
      resultat2[0].nombre_chargement_utile == 0
    ) {
      const taux_utilite = 0;
      model_utilite["amount"] = `${taux_utilite} %`;
      model_utilite["progress"].value = taux_utilite;
    } else {
      const taux_utilite = Math.round(
        (resultat2[0].nombre_chargement_utile /
          resultat1[0].nombre_chargement) *
          100
      );
      model_utilite["amount"] = `${taux_utilite} %`;
      model_utilite["progress"].value = taux_utilite;
    }
    /*********   taux utilite FIN ****************/
    /*********   taux exactitude ****************/
    if (
      resultat3[0].nombre_chargement_exactitude == 0 ||
      resultat1[0].nombre_chargement == 0
    ) {
      const taux_exactitude = 0;
      model_exactitude["amount"] = `${taux_exactitude} %`;
      model_exactitude["progress"].value = taux_exactitude;
    } else {
      const taux_exactitude = Math.round(
        (resultat3[0].nombre_chargement_exactitude /
          resultat1[0].nombre_chargement) *
          100
      );
      model_exactitude["amount"] = `${taux_exactitude} %`;
      model_exactitude["progress"].value = taux_exactitude;
    }
    /*********   taux exactitude FIN ****************/
    /*********   taux ontime ****************/
    if (
      resultat5[0].nombre_chargement == 0 ||
      resultat4[0].nombre_chargement_on_time == 0
    ) {
      const taux_on_time = 0;
      model_on_time["amount"] = `${taux_on_time} %`;
      model_on_time["progress"].value = taux_on_time;
    } else {
      //console.log(resultat4);
      //console.log(resultat5);
      const taux_on_time = Math.round(
        (resultat4[0].nombre_chargement_on_time /
          resultat5[0].nombre_chargement) *
          100
      );
      //console.log(taux_on_time);
      model_on_time["amount"] = `${taux_on_time} %`;
      model_on_time["progress"].value = taux_on_time;
    }
    /*********   taux ontime ****************/
    /*********   taux maitrise ****************/
    if (resultat6[0].nombre_quiz == 0 || resultat7[0].nombre_quiz_succes == 0) {
      const taux_maitrisse = 0;
      model_taux_maitrise["amount"] = `${taux_maitrisse} %`;
      model_taux_maitrise["progress"].value = taux_maitrisse;
    } else {
      const taux_maitrisse = Math.round(
        (resultat7[0].nombre_quiz_succes / resultat6[0].nombre_quiz) * 100
      );
      model_taux_maitrise["amount"] = `${taux_maitrisse} %`;
      model_taux_maitrise["progress"].value = taux_maitrisse;
    }
    /*********   taux maitrise ****************/
    /*********   taux taux_maitrise_retest ****************/
    if (resultat6[0].nombre_quiz == 0) {
      const taux_maitrise_retest = 0;
      model_taux_maitrise_retest["amount"] = `${taux_maitrise_retest} %`;
      model_taux_maitrise_retest["progress"].value = taux_maitrise_retest;
    } else {
      const taux_maitrise_retest = Math.round(
        (resultat8[0].nombre_quiz_succes / resultat6[0].nombre_quiz) * 100
      );
      model_taux_maitrise_retest["amount"] = `${taux_maitrise_retest} %`;
      model_taux_maitrise_retest["progress"].value = taux_maitrise_retest;
    }
    /*********   taux taux_maitrise_retest FIN****************/
    /*********   taux lecture_JJ ****************/
    if (
      resultat9[0].nombre_chargement_lu == 0 ||
      resultat10[0].nombre_chargement_lu_J == 0
    ) {
      const taux_lecture_JJ = 0;
      model_taux_lecture_J["amount"] = `${taux_lecture_JJ} %`;
      model_taux_lecture_J["progress"].value = taux_lecture_JJ;
    } else {
      const taux_lecture_JJ = Math.round(
        (resultat10[0].nombre_chargement_lu_J /
          resultat9[0].nombre_chargement_lu) *
          100
      );
      model_taux_lecture_J["amount"] = `${taux_lecture_JJ} %`;
      model_taux_lecture_J["progress"].value = taux_lecture_JJ;
    }
    /*********   taux lecture_JJ FIN ****************/
    /*********   taux lecture_J_2 ****************/
    if (
      resultat11[0].nombre_chargement_lu_J_2 == 0 ||
      resultat9[0].nombre_chargement_lu == 0
    ) {
      const taux_lecture_J_2 = 0;
      model_taux_lecture_J_2["amount"] = `${taux_lecture_J_2} %`;
      model_taux_lecture_J_2["progress"].value = taux_lecture_J_2;
    } else {
      const taux_lecture_J_2 = Math.round(
        (resultat11[0].nombre_chargement_lu_J_2 /
          resultat9[0].nombre_chargement_lu) *
          100
      );
      model_taux_lecture_J_2["amount"] = `${taux_lecture_J_2} %`;
      model_taux_lecture_J_2["progress"].value = taux_lecture_J_2;
    }

    /*********   taux lecture_J_2 FIN ****************/
    /*********   taux lecture ****************/
    if (
      resultat9[0].nombre_chargement_lu == 0 ||
      resultat1[0].nombre_chargement == 0
    ) {
      const taux_lecture = 0;
      model_taux_lecture["amount"] = `${taux_lecture} %`;
      model_taux_lecture["progress"].value = taux_lecture;
    } else {
      //console.log(resultat9);
      //console.log(resultat1);
      const taux_lecture = Math.round(
        (resultat9[0].nombre_chargement_lu / resultat5[0].nombre_chargement) *
          100
      );
      model_taux_lecture["amount"] = `${taux_lecture} %`;
      model_taux_lecture["progress"].value = taux_lecture;
    }
    /*********   taux lecture FIN****************/
    retour_table[0] = model_on_time;
    retour_table[1] = model_exactitude;
    retour_table[2] = model_utilite;
    retour_table[3] = model_taux_maitrise;
    retour_table[4] = model_taux_maitrise_retest;
    retour_table[5] = model_taux_lecture_J;
    retour_table[6] = model_taux_lecture_J_2;
    retour_table[7] = model_taux_lecture;
    // //console.log(resultat10[0]);
    return res.status(200).send(retour_table);
  } catch (error) {
    console.log(error);
    throw error;
  }
};
const getAllDashboard_admin = async (req, res, next) => {
  try {
    /** les modes pour les stats */
    const model_on_time = {
      title: "On time",
      amount: "",
      progress: {
        value: 0,
      },
      color: "bg-azure-50",
      permissions: ["R_ADMI", "R_GB"],
    };
    const model_exactitude = {
      title: "Exactitude",
      amount: "",
      progress: {
        value: 0,
      },
      color: "bg-blue-50",
      permissions: ["R_ADMI", "R_GB"],
    };
    const model_utilite = {
      title: "Utilite",
      amount: "",
      progress: {
        value: 0,
      },
      color: "bg-blue-50",
      permissions: ["R_ADMI", "R_GB"],
    };
    const model_taux_maitrise = {
      title: "Taux de maitrise TEST",
      amount: "",
      progress: {
        value: 0,
      },
      color: "bg-cyan-50",
      permissions: ["R_ADMI", "R_SUPE", "R_GB"],
    };
    const model_taux_maitrise_retest = {
      title: "Taux de maitrise RETEST",
      amount: "",
      progress: {
        value: 0,
      },
      color: "bg-orange-50",
      permissions: ["R_ADMI", "R_SUPE", "R_GB"],
    };
    const model_taux_lecture_J = {
      title: "Taux de lecture J",
      amount: "",
      progress: {
        value: 0,
      },
      color: "bg-yellow-50",
      permissions: ["R_ADMI", "R_SUPE", "R_GB"],
    };
    const model_taux_lecture_J_2 = {
      title: "Taux de lecture J+2",
      amount: "",
      progress: {
        value: 0,
      },
      color: "bg-violet-50",
      permissions: ["R_ADMI", "R_SUPE", "R_GB"],
    };
    const model_taux_lecture = {
      title: "Taux de lecture ",
      amount: "",
      progress: {
        value: 0,
      },
      color: "bg-red-50",
      permissions: ["R_ADMI", "R_SUPE", "R_GB"],
    };
    /** fin de models  */
    let retour_table = [];
    const Query = `Select COUNT(*) as nombre_chargement from B_SONDAGE BS 
    INNER JOIN B_FICHE FCH on BS.id_FICHE=FCH.id`;
    const Query2 = `Select COUNT(*) as nombre_chargement_utile from B_SONDAGE BS 
    INNER JOIN B_FICHE FCH on BS.id_FICHE=FCH.id
     where  BS.utilite=1`;
    const Query3 = `Select COUNT(*) as nombre_chargement_exactitude from B_SONDAGE BS 
    INNER JOIN B_FICHE FCH on BS.id_FICHE=FCH.id
     where BS.exactitude=1`;
    const Query_on_time = `select COUNT(*) as nombre_chargement_on_time from B_FICHE FCH 
        INNER JOIN B_ON_TIME BOT on FCH.id=BOT.id_Fiche
        where BOT.on_time='OUI'`;
    const Query_all_chargement = `SELECT COUNT(*) as nombre_chargement from B_FICHE `;
    const Query_taux_maitrise = `SELECT COUNT(*) as nombre_quiz from B_REPONSE_QUIZ RQ INNER JOIN B_FICHE FCH on RQ.id_FICHE=FCH.id `;
    const Query_taux_maitrise_1 = `SELECT COUNT(*) as nombre_quiz_succes from B_REPONSE_QUIZ RQ INNER JOIN B_FICHE FCH on RQ.id_FICHE=FCH.id where  RQ.ETAT='succes' and RQ.NB_RETEST=1;`;
    const Query_taux_maitrise_retest = `SELECT COUNT(*) as nombre_quiz_succes from B_REPONSE_QUIZ RQ INNER JOIN B_FICHE FCH on RQ.id_FICHE=FCH.id where  RQ.NB_RETEST>1;`;
    const Query_taux_lecture_J = `SELECT COUNT(*) as nombre_chargement_lu from (SELECT id_FICHE from B_HISTORIQUE GROUP BY id_FICHE)A INNER JOIN B_FICHE FCH on A.id_FICHE=FCH.id ;`;
    const Query_taux_lecture_J_ = `SELECT COUNT(*) as nombre_chargement_lu_J from (SELECT id_FICHE,MIN(dateConsultation) as min_dateConsultation from B_HISTORIQUE GROUP BY id_FICHE)A INNER JOIN B_FICHE FCH on A.id_FICHE=FCH.id where  DATE_FORMAT(A.min_dateConsultation,'%Y-%m-%d')=DATE_FORMAT(FCH.dateEnregistrement,'%Y-%m-%d') ;`;
    const Query_taux_lecture_J_2 = `
    SELECT COUNT(*) as nombre_chargement_lu_J_2 from 
(SELECT id_FICHE,MIN(dateConsultation) as min_dateConsultation from B_HISTORIQUE GROUP BY id_FICHE)A INNER JOIN B_FICHE FCH on A.id_FICHE=FCH.id where DATE_FORMAT(A.min_dateConsultation,'%Y-%m-%d')=DATE_FORMAT(DATE_ADD(FCH.dateEnregistrement,INTERVAL 2 DAY),'%Y-%m-%d') `;

    const [resultat1] = await db.query(Query);
    const [resultat2] = await db.query(Query2);
    const [resultat3] = await db.query(Query3);
    const [resultat5] = await db.query(Query_all_chargement);
    const [resultat4] = await db.query(Query_on_time);
    const [resultat6] = await db.query(Query_taux_maitrise);
    const [resultat7] = await db.query(Query_taux_maitrise_1);
    const [resultat8] = await db.query(Query_taux_maitrise_retest);
    const [resultat9] = await db.query(Query_taux_lecture_J);
    const [resultat10] = await db.query(Query_taux_lecture_J_);
    const [resultat11] = await db.query(Query_taux_lecture_J_2);

    /*********   taux utilite ****************/
    if (
      resultat1[0].nombre_chargement == 0 ||
      resultat2[0].nombre_chargement_utile == 0
    ) {
      const taux_utilite = 0;
      model_utilite["amount"] = `${taux_utilite} %`;
      model_utilite["progress"].value = taux_utilite;
    } else {
      const taux_utilite = Math.round(
        (resultat2[0].nombre_chargement_utile /
          resultat1[0].nombre_chargement) *
          100
      );
      model_utilite["amount"] = `${taux_utilite} %`;
      model_utilite["progress"].value = taux_utilite;
    }
    /*********   taux utilite FIN ****************/
    /*********   taux exactitude ****************/
    if (
      resultat3[0].nombre_chargement_exactitude == 0 ||
      resultat1[0].nombre_chargement == 0
    ) {
      const taux_exactitude = 0;
      model_exactitude["amount"] = `${taux_exactitude} %`;
      model_exactitude["progress"].value = taux_exactitude;
    } else {
      const taux_exactitude = Math.round(
        (resultat3[0].nombre_chargement_exactitude /
          resultat1[0].nombre_chargement) *
          100
      );
      model_exactitude["amount"] = `${taux_exactitude} %`;
      model_exactitude["progress"].value = taux_exactitude;
    }
    /*********   taux exactitude FIN ****************/
    /*********   taux ontime ****************/
    if (
      resultat5[0].nombre_chargement == 0 ||
      resultat4[0].nombre_chargement_on_time == 0
    ) {
      const taux_on_time = 0;
      model_on_time["amount"] = `${taux_on_time} %`;
      model_on_time["progress"].value = taux_on_time;
    } else {
      const taux_on_time = Math.round(
        (resultat4[0].nombre_chargement_on_time /
          resultat5[0].nombre_chargement) *
          100
      );
      model_on_time["amount"] = `${taux_on_time} %`;
      model_on_time["progress"].value = taux_on_time;
    }
    /*********   taux ontime ****************/
    /*********   taux maitrise ****************/
    if (resultat6[0].nombre_quiz == 0 || resultat7[0].nombre_quiz_succes == 0) {
      const taux_maitrisse = 0;
      model_taux_maitrise["amount"] = `${taux_maitrisse} %`;
      model_taux_maitrise["progress"].value = taux_maitrisse;
    } else {
      const taux_maitrisse = Math.round(
        (resultat7[0].nombre_quiz_succes / resultat6[0].nombre_quiz) * 100
      );
      model_taux_maitrise["amount"] = `${taux_maitrisse} %`;
      model_taux_maitrise["progress"].value = taux_maitrisse;
    }
    /*********   taux maitrise ****************/
    /*********   taux taux_maitrise_retest ****************/
    if (resultat6[0].nombre_quiz == 0 || resultat7[0].nombre_quiz_succes == 0) {
      const taux_maitrise_retest = 0;
      model_taux_maitrise_retest["amount"] = `${taux_maitrise_retest} %`;
      model_taux_maitrise_retest["progress"].value = taux_maitrise_retest;
    } else {
      const taux_maitrise_retest = Math.round(
        (resultat8[0].nombre_quiz_succes / resultat6[0].nombre_quiz) * 100
      );
      model_taux_maitrise_retest["amount"] = `${taux_maitrise_retest} %`;
      model_taux_maitrise_retest["progress"].value = taux_maitrise_retest;
    }
    /*********   taux taux_maitrise_retest FIN****************/
    /*********   taux lecture_JJ ****************/
    if (
      resultat9[0].nombre_chargement_lu == 0 ||
      resultat10[0].nombre_chargement_lu_J == 0
    ) {
      const taux_lecture_JJ = 0;
      model_taux_lecture_J["amount"] = `${taux_lecture_JJ} %`;
      model_taux_lecture_J["progress"].value = taux_lecture_JJ;
    } else {
      const taux_lecture_JJ = Math.round(
        (resultat10[0].nombre_chargement_lu_J /
          resultat9[0].nombre_chargement_lu) *
          100
      );
      model_taux_lecture_J["amount"] = `${taux_lecture_JJ} %`;
      model_taux_lecture_J["progress"].value = taux_lecture_JJ;
    }
    /*********   taux lecture_JJ FIN ****************/
    /*********   taux lecture_J_2 ****************/
    if (
      resultat11[0].nombre_chargement_lu_J_2 == 0 ||
      resultat9[0].nombre_chargement_lu == 0
    ) {
      const taux_lecture_J_2 = 0;
      model_taux_lecture_J_2["amount"] = `${taux_lecture_J_2} %`;
      model_taux_lecture_J_2["progress"].value = taux_lecture_J_2;
    } else {
      const taux_lecture_J_2 = Math.round(
        (resultat11[0].nombre_chargement_lu_J_2 /
          resultat9[0].nombre_chargement_lu) *
          100
      );
      model_taux_lecture_J_2["amount"] = `${taux_lecture_J_2} %`;
      model_taux_lecture_J_2["progress"].value = taux_lecture_J_2;
    }

    /*********   taux lecture_J_2 FIN ****************/
    /*********   taux lecture ****************/
    if (
      resultat9[0].nombre_chargement_lu == 0 ||
      resultat1[0].nombre_chargement == 0
    ) {
      const taux_lecture = 0;
      model_taux_lecture["amount"] = `${taux_lecture} %`;
      model_taux_lecture["progress"].value = taux_lecture;
    } else {
      const taux_lecture = Math.round(
        (resultat9[0].nombre_chargement_lu / resultat1[0].nombre_chargement) *
          100
      );
      model_taux_lecture["amount"] = `${taux_lecture} %`;
      model_taux_lecture["progress"].value = taux_lecture;
    }
    /*********   taux lecture FIN****************/
    retour_table[0] = model_on_time;
    retour_table[1] = model_exactitude;
    retour_table[2] = model_utilite;
    retour_table[3] = model_taux_maitrise;
    retour_table[4] = model_taux_maitrise_retest;
    retour_table[5] = model_taux_lecture_J;
    retour_table[6] = model_taux_lecture_J_2;
    retour_table[7] = model_taux_lecture;
    // //console.log(resultat10[0]);
    return res.status(200).send(retour_table);
  } catch (error) {
    console.log(error);
    throw error;
  }
};
const getStatistique_par_site = async (req, res, next) => {
  try {
    const Query_allSite = `SELECT id, nom from B_SITE`;
    const Query2 = `SELECT COUNT(*) as nombre_utilisateur_sur_ce_site from B_UTILISATEUR where id_Site=?`;
    const Query_taux_lecture_J = `SELECT COUNT(*) as nombre_chargement_lu_J from (SELECT id_FICHE,MIN(dateConsultation) as min_dateConsultation from B_HISTORIQUE GROUP BY id_FICHE)A INNER JOIN B_FICHE FCH on A.id_FICHE=FCH.id where  DATE_FORMAT(A.min_dateConsultation,'%Y-%m-%d')=DATE_FORMAT(FCH.dateEnregistrement,'%Y-%m-%d') ;`;
    const [resultat1] = await db.query(Query_allSite);
    resultat1.forEach(async (element) => {
      //console.log(element);
      /* const [resultat2] = await db.query(Query2,[element.id]);
      element["nombre_utilisateur_sur_ce_site"]=resultat2[0].nombre_utilisateur_sur_ce_site
    */
    });
    return res.status(200).send(resultat1);
  } catch (error) {
    console.log(error);
    throw error;
  }
};
const faireSondage = async (req, res, next) => {};
const getAllSondage = async (req, res, next) => {};
/** fin de controllers de SONDAGE */
/*controlleurs sur les fonctionnalités de QUESTIONNAIRE*/

const addQUestionnaire = async (req, res, next) => {
  const { libelleQuestion, libelleReponse, id_Fiche } = req.body;
  if (!libelleQuestion || !libelleReponse || !id_Fiche) {
    return res
      .status(403)
      .json({ message: "Merci de bien renseigner les parametres" });
  }
  try {
    const Query = `INSERT INTO B_QUESTIONNAIRE (libelleQuestion,libelleReponse,dateCreation,id_Fiche) VALUES(?,?,?,?)`;
    const dateCreation = new Date();
    const resultat = await db.query(Query, [
      libelleQuestion,
      libelleReponse,
      dateCreation,
      id_Fiche,
    ]);
    return res
      .status(201)
      .json({ message: "Vous venez d'ajouter un nouveau Questionnaire " });
  } catch (error) {
    res.status(500).json({ message: "Error request" });
  }
};
const getAllQuestionnaire = async (req, res, next) => {
  try {
    const Query = `SELECT * from B_QUESTIONNAIRE`;
    const [resultat] = await db.query(Query);
    return res.status(200).send(resultat);
  } catch (error) {
    res.status(500).json({ message: "Error request" });
  }
};
/** fin de controllers de Questionnaire */
/** debut de controllers  ResponseQuestionnaire*/

const addReponseQuestionnaire = async (req, res, next) => {
  const { libelleReponse, id_Question, id_Utilisateur, id_Fiche } = req.body;
  if (!libelleReponse || !id_Question || !id_Utilisateur || id_Fiche) {
    return res
      .status(403)
      .json({ message: "Merci de bien renseigner les parametres" });
  }
  try {
    const Query = `INSERT INTO B_REPONSE_QUESTIONNAIRE (libelleReponse,dateReponse,id_Question,id_Utilisateur,id_Fiche) VALUES(?,?,?,?,?)`;
    const dateCreation = new Date();
    const resultat = await db.query(Query, [
      libelleQuestion,
      dateCreation,
      id_Question,
      id_Utilisateur,
      id_Fiche,
    ]);
    return res
      .status(201)
      .json({ message: "Vous venez d'ajouter un nouveau Questionnaire " });
  } catch (error) {
    res.status(500).json({ message: "Error request" });
  }
};
const getAllReponseByFiche = async (req, res, next) => {
  try {
    const Query = `SELECT RQ.*,UT.nom,UT.prenom from B_REPONSE_QUESTIONNAIRE RQ INNER join B_UTILISATEUR UT on RQ.id_Utilisateur=UT.id WHERE RQ.id_Fiche=? `;
    const [resultat] = await db.query(Query);
    return res.status(200).send(resultat);
  } catch (error) {
    res.status(500).json({ message: "Error request" });
  }
};
/** fin de controllers ResponseQuestionnaire */
/*controlleurs sur les fonctionnalités de  PROGRAMME*/

const addProgramme = async (req, res, next) => {
  const { nom, description } = req.body;
  if (!nom) {
    return res
      .status(403)
      .json({ message: "Merci de bien renseigner les parametres" });
  }
  try {
    const Query =
      "INSERT INTO B_PROGRAMME (nom,description,Etat,dateCreation) VALUE (?,?,?,?)";
    const ETAT = "ACTIF";
    const dateCreation = new Date();
    const resultat = await db.query(Query, [
      nom,
      description,
      ETAT,
      dateCreation,
    ]);
    return res.status(201).json({
      message: "Vous venez d'ajouter un nouveau programme avec succès.",
    });
  } catch (error) {
    res.status(500).json({ message: "Error request" });
  }
};
const getAllProgramme = async (req, res, next) => {
  try {
    const Query = `SELECT * from B_PROGRAMME`;
    const [resultat] = await db.query(Query);
    return res.status(200).send(resultat);
  } catch (error) {
    return res.status(500).json({ message: "Error request" });
  }
};
const getDetailsProgramme = async (req, res, next) => {
  const { id } = req.params;
  if (!id) {
    return res
      .status(403)
      .json({ message: "Veuillez bien renseigner les parametres." });
  }
  try {
    const resultat = {};
    const Query = `SELECT nom,Etat,DATE_FORMAT(dateCreation, '%Y-%m-%d') as dateCreation,description from B_PROGRAMME where id=?`;
    const Query2 = `SELECT BU.nom,BU.prenom,BU.nom_utilisateur as login,BF.nom as programme from B_UTILISATEUR BU INNER JOIN B_PROGRAMME BF on BU.id_Programme=BF.id where BU.id_Programme=?`;
    const resultat1 = await db.query(Query, [id]);
    const resultat2 = await db.query(Query2, [id]);
    resultat["infos_programme"] = resultat1[0];
    resultat["utilisateurs"] = resultat2[0];
    return res.status(200).send(resultat);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};
const getOneProgramme = async (req, res, next) => {
  const id = req.params;
  if (!id) {
    return res
      .status(403)
      .json({ message: "Veuillez bien renseigner les parametres." });
  }
  try {
    const Query = `SELECT id, nom,description from B_PROGRAMME where id=?`;
    const resultat = await db.query(Query, [id]);
    return res.status(200).send(resultat[0]);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};
const updateProgramme = async (req, res, next) => {
  const { id } = req.params;
  const { nom, description } = req.body;

  if (!nom || !description) {
    return res
      .status(403)
      .json({ message: "Merci de bien renseigner les parametres" });
  }
  try {
    const Query = `UPDATE B_PROGRAMME SET nom=?, description=?, dateModification=? where id=?`;
    const dateModif = new Date();
    const resultat = await db.query(Query, [nom, description, dateModif, id]);
    return res
      .status(201)
      .json({ message: "Vous avez modifié ce programme avec succès." });
  } catch (error) {
    res.status(500).json({ message: "Error request" });
  }
};
const deleteProgramme = async (req, res, next) => {
  const { id } = req.params;
  try {
    const Query = `DELETE from B_PROGRAMME WHERE id=?`;
    const resultat = await db.query(Query, [id]);
    return res
      .status(201)
      .json({ message: "Vous venez de supprimer ce programme avec succès" });
  } catch (error) {
    console.log(error);
  }
};
/**  fin de controller programme */
/*controlleurs sur les fonctionnalités de  MA_VOIX_COMPTE*/

const addGrille = async (req, res, next) => {
  const { nom } = req.body;
  if (!nom) {
    return res
      .status(403)
      .json({ message: "Merci de bien renseigner les parametres" });
  }
  try {
    const Query = `INSERT INTO B_GRILLE (nom,Etat,dateCreation) VALUES (?,?,?)`;
    const ETAT = "ACTIF";
    const dateCreation = new Date();
    const resultat = await db.query(Query, [nom, ETAT, dateCreation]);
    return res
      .status(201)
      .json({ message: "Vous avez ajouter une nouvelle grille avec succes." });
  } catch (error) {
    res.status(500).json({ message: "Error request" });
  }
};
const getAllGrille = async (req, res, next) => {
  try {
    const Query = `SELECT id,nom from B_GRILLE`;
    const [resultat] = await db.query(Query);
    return res.status(200).send(resultat);
  } catch (error) {
    res.status(500).json({ message: "Error request" });
  }
};
const getOneGrile = async (req, res, next) => {
  const { id } = req.params;
  try {
    const Query = `SELECT * from B_GRILLE where id=?`;
    const [resultat] = await db.query(Query, [id]);
    return res.status(200).send(resultat[0]);
  } catch (error) {
    console.log(error);
    throw error;
  }
};
const updateGrille = async (req, res, next) => {
  const { id } = req.params;
  const { nom } = req.body;
  if (!id || !nom) {
    return res
      .status(403)
      .json({ message: "Merci de bien renseigner les parametres" });
  }
  try {
    const Query = `UPDATE B_GRILLE SET nom=?,dateModification=? WHERE id=? `;
    const dateModif = new Date();
    const resultat = await db.query(Query, [nom, dateModif, id]);
    return res.status(201).json({ message: "La Grille a été bien modifiée" });
  } catch (error) {
    res.status(500).json({ message: "Error request" });
  }
};
const deleteGrille = async (req, res, next) => {
  const { id } = req.params;
  if (!id) {
    return res
      .status(403)
      .json({ message: "Merci de bien renseigner les parametres" });
  }
  try {
    const Query = `DELETE  from B_GRILLE WHERE id=? `;
    const resultat = await db.query(Query, [id]);
    return res
      .status(201)
      .json({ message: "Vous avez supprimer cette grille avec succes" });
  } catch (error) {
    res.status(500).json({ message: "Error resquest" });
  }
};

/** fin de controllers de Grille */

const method_addNotification = async (
  titre,
  message,
  type,
  dateReception,
  id_Utilisateur,
  id_FICHE,
  url
) => {
  const Query = `INSERT INTO B_NOTIFICATION (titre,message,type,dateReception,id_Utilisateur,id_Fiche,url) VALUES(?,?,?,?,?,?,?)`;
  try {
    const resultat = await db.query(Query, [
      titre,
      message,
      type,
      dateReception,
      id_Utilisateur,
      id_FICHE,
      url,
    ]);
    return resultat;
  } catch (error) {
    console.log(error);
    throw error;
  }
};
/** debut de controllers FICHE  */

const addFiche = async (req, res, next) => {
  //console.log(req.body);
  const data = JSON.parse(req.body.data);
  //console.log(data);
  const userId = req.auth.userId;
  const extention = path.extname(req.file.filename);
  // const url = `${req.protocol}://${req.get("host")}/chargements/${
  const url = `/chargements/${req.file.filename}`;
  const {
    titre,
    dateReception,
    dateDebut,
    dateVisibilite,
    dateFin,
    id_Categorie,
    id_SousCategorie,
    id_Sla,
    niveau,
    utiliteAutorisation,
    quizAutorisation,
    accesAutorisation,
    siteAutorisation,
    commentaireAutorisation,
  } = data;
  try {
    const Query = `INSERT INTO B_FICHE (id_gestionnaire,titre,dateReception,dateDebut,dateVisibilite,dateFin,dateEnregistrement,id_Categorie
    ,id_SousCategorie,id_Sla,Niveau,ETAT,AccesSite,AccesProfil,AccesUtilite,AccesQuiz,AccesCommentaire,url,extention) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
    const QueryInsertOnTime = `INSERT INTO B_ON_TIME (id_Fiche,temps,date_effective,id_Sla,delai,on_time) VALUES (?,?,?,?,?,?)`;
    const Query1 = `INSERT INTO B_QUIZ (libelleQuestion,reponseQuestion,dateCreation,id_Fiche) VALUES (?,?,?,?) `;
    const QyeryInsertNotification = `INSERT INTO B_NOTIFICATION (titre,message,type,dateReception,id_UTILISATEUR,id_FICHE,url) VALUES (?,?,?,?,?,?,?)`;
    const Query_Sla = `select * from B_SLA where id=?`;
    const dateEnregistrement = new Date();
    const titre_notification = "nouveau document";
    const message = `Vous venez d'ajouter une nouvelle fiche`;
    const type = "chargement";
    const diff_date = new Date(dateEnregistrement) - new Date(dateReception);
    const calcul_diff_time = Calcul_on_time(diff_date);
    const ETAT = "ACTIF";
    const resultat = await db.query(Query, [
      userId,
      titre,
      dateReception,
      dateDebut,
      dateVisibilite,
      dateFin,
      dateEnregistrement,
      id_Categorie,
      id_SousCategorie,
      id_Sla,
      niveau,
      ETAT,
      siteAutorisation,
      accesAutorisation,
      utiliteAutorisation,
      quizAutorisation,
      commentaireAutorisation,
      url,
      extention,
    ]);
    const [resultat_sla] = await db.query(Query_Sla, [id_Sla]);
    const diff_on_time = resultat_sla[0].delai - calcul_diff_time;
    let on_time = "";
    if (diff_on_time > +0) {
      on_time = "OUI";
    } else {
      on_time = "NON";
    }
    await db.query(QueryInsertOnTime, [
      resultat[0].insertId,
      calcul_diff_time,
      dateEnregistrement,
      resultat_sla[0].id,
      resultat_sla[0].delai,
      on_time,
    ]);
    const id_fiche = resultat[0].insertId;
    await db.query(QyeryInsertNotification, [
      titre_notification,
      message,
      type,
      dateEnregistrement,
      userId,
      id_fiche,
      url,
    ]);
    if (data.isChecked) {
      await db.query(Query1, [
        data.Quiz1.Question1,
        data.Quiz1.Reponse1,
        dateEnregistrement,
        id_fiche,
      ]);
      await db.query(Query1, [
        data.Quiz2.Question2,
        data.Quiz2.Reponse2,
        dateEnregistrement,
        id_fiche,
      ]);
      await db.query(Query1, [
        data.Quiz3.Question3,
        data.Quiz3.Reponse3,
        dateEnregistrement,
        id_fiche,
      ]);
      await db.query(Query1, [
        data.Quiz4.Question4,
        data.Quiz4.Reponse4,
        dateEnregistrement,
        id_fiche,
      ]);
    }
    return res
      .status(201)
      .json({ message: "Vous avez ajouté une nouvelle fiche" });
  } catch (error) {
    console.log(error);
    throw error;
  }
};
const getAllFiche = async (req, res, next) => {
  const userId = req.auth.userId;
  try {
    Auto_archivage();
    const Query = ` SELECT FH.id,FH.titre,SL.type,SL.priorite,FH.ETAT,FH.Niveau,DATE_FORMAT(FH.dateEnregistrement,'%Y-%m-%d %H:%i:%s') as dateEnregistrement,DATE_FORMAT(FH.dateDebut,'%Y-%m-%d %H:%i:%s') as dateDebut,DATE_FORMAT(FH.dateFin,'%Y-%m-%d %H:%i:%s') as dateFin,CT.nom as Categorie,SCT.nom as Sous_Categorie, UT.nom_utilisateur as Gestionnaire ,FH.url,FH.extention from
    B_FICHE FH 
    LEFT JOIN B_UTILISATEUR UT
    on FH.id_gestionnaire=UT.id
    LEFT JOIN B_SLA SL
    on FH.id_Sla=SL.id
    LEFT JOIN B_CATEGORIE CT
    on CT.id=FH.id_Categorie
    LEFT JOIN B_SOUS_CATEGORIE SCT
    on FH.id_SousCategorie=SCT.id 
    where FH.ETAT =? and FH.AccesSite like ? and FH.AccesProfil like ?
    ORDER BY dateEnregistrement DESC`;
    const Query2 = `SELECT id,id_Site,id_Fonction from B_UTILISATEUR  where id=?`;
    const ETAT = "ACTIF";
    const [resultat1] = await db.query(Query2, [userId]);
    const id_Site = `%${resultat1[0].id_Site}%`;
    const id_Fonction = `%${resultat1[0].id_Fonction}%`;
    //console.log(id_Site, id_Fonction);
    const [resutat] = await db.query(Query, [ETAT, id_Site, id_Fonction]);
    //console.log(resutat);
    return res.status(200).send(resutat);
  } catch (error) {
    console.error("Erreur getAllFiche:", error);

    res.status(500).json({ message: "Error request" });
  }
};
const getAllFiche_Archive = async (req, res, next) => {
  const userId = req.auth.userId;
  try {
    Auto_archivage();
    const Query = ` SELECT FH.id,FH.titre,SL.type,SL.priorite,FH.ETAT,DATE_FORMAT(FH.dateEnregistrement,'%Y-%m-%d %H:%i:%s') as dateEnregistrement,DATE_FORMAT(FH.dateDebut,'%Y-%m-%d %H:%i:%s') as dateDebut,DATE_FORMAT(FH.date_Archive,'%Y-%m-%d %H:%i:%s') as dateFin,CT.nom as Categorie,SCT.nom as Sous_Categorie, UT.nom_utilisateur as Gestionnaire ,FH.url,FH.extention from
    B_FICHE FH 
    LEFT JOIN B_UTILISATEUR UT
    on FH.id_gestionnaire=UT.id
    LEFT JOIN B_SLA SL
    on FH.id_Sla=SL.id
    LEFT JOIN B_CATEGORIE CT
    on CT.id=FH.id_Categorie
    LEFT JOIN B_SOUS_CATEGORIE SCT
    on FH.id_SousCategorie=SCT.id 
    where FH.ETAT =? and FH.AccesSite like ? and FH.AccesProfil like ?
    ORDER BY dateEnregistrement DESC`;
    const Query2 = `SELECT UT.id,ST.id as id_Site,F.id as id_Fonction from B_UTILISATEUR UT,B_SITE ST, B_FONCTION F where UT.id_Site=ST.id and UT.id_Fonction=F.id and UT.id=?`;
    const ETAT = "ARCHIVE";
    const [resultat1] = await db.query(Query2, [userId]);
    const id_Site = `%${resultat1[0].id_Site}%`;
    const id_Fonction = `%${resultat1[0].id_Fonction}%`;
    const [resutat] = await db.query(Query, [ETAT, id_Site, id_Fonction]);
    return res.status(200).send(resutat);
  } catch (error) {
    res.status(500).json({ message: "Error request" });
  }
};
const getAllFicheByGestionnaire = async (req, res, next) => {
  try {
    const Query = `SELECT FH.id,FH.titre,SL.source,SL.type,SL.priorite,SL.delai,FH.ETAT,DATE_FORMAT(FH.dateEnregistrement,'%Y-%m-%d %H:%i:%s') as dateEnregistrement,DATE_FORMAT(FH.dateDebut,'%Y-%m-%d %H:%i:%s') as dateDebut,DATE_FORMAT(FH.dateFin,'%Y-%m-%d %H:%i:%s') as dateFin,DATE_FORMAT(FH.date_Archive,'%Y-%m-%d %H:%i:%s') as date_Archive,FH.archive_par,CT.nom as Categorie,SCT.nom as Sous_Categorie,BOT.on_time, UT.nom_utilisateur as Gestionnaire  from
                  B_FICHE FH 
                  LEFT JOIN B_UTILISATEUR UT
                  on FH.id_gestionnaire=UT.id
                  LEFT JOIN B_SLA SL
                  on FH.id_Sla=SL.id
                  LEFT JOIN B_CATEGORIE CT
                  on CT.id=FH.id_Categorie
                  LEFT JOIN B_SOUS_CATEGORIE SCT
                  on FH.id_SousCategorie=SCT.id 
                  LEFT JOIN B_ON_TIME BOT on FH.id=BOT.id_Fiche
                  ORDER BY dateDebut DESC`;
    const [resutat] = await db.query(Query);
    resutat;
    return res.status(200).send(resutat);
  } catch (error) {
    res.status(500).json({ message: "Error request" });
  }
};
const Calcul_on_time = (dure) => {
  const minute = Math.floor(dure / 60000);
  return minute;
};

const getAllFicheByIDFiche = async (req, res, next) => {
  const { id } = req.params;
  const userId = req.auth.userId;
  if (!id) {
    return res
      .status(403)
      .json({ message: "Merci de bien renseigner les parametres" });
  }
  try {
    Auto_archivage();
    const Query = `Select id,titre,url,extention,AccesUtilite,AccesQuiz,AccesCommentaire from B_FICHE where id=?`;
    const Query2 = `SELECT id,libelleQuestion,reponseQuestion,id_Fiche from B_QUIZ where id_Fiche=? LIMIT 2`;
    const Query3 = `INSERT INTO B_HISTORIQUE (dateConsultation,id_UTILISATEUR,id_FICHE) VALUES (?,?,?)`;
    const Query4 = `SELECT * from B_REPONSE_QUIZ where id_UTILISATEUR=? and id_FICHE=? `;
    const Query5 = `SELECT id_Fonction from B_UTILISATEUR where id=?`;
    const ETAT = "Echecs";
    const STATUT = "Encours_retest";
    const dateConsultation = new Date();
    const [resultat] = await db.query(Query, [id]);
    if (resultat.length === 0) {
      return res
        .status(404)
        .json({ message: "Aucune fiche trouvée avec cet ID." });
    } else {
      await db.query(Query3, [dateConsultation, userId, id]);
      const [resultat_id_fonction] = await db.query(Query5, [userId]);
      const id_Fonction = `${resultat_id_fonction[0].id_Fonction.toString()}`;
      //console.log(id_Fonction);
      if (resultat[0].AccesUtilite.includes(`${id_Fonction}`)) {
        resultat[0]["Utilite"] = true;
      } else {
        resultat[0]["Utilite"] = false;
      }
      if (resultat[0].AccesQuiz.includes(`${id_Fonction}`)) {
        const [result_Quiz] = await db.query(Query2, [id]);
        const [resultat_reponse_quiz] = await db.query(Query4, [
          userId,
          id,
          ETAT,
          STATUT,
        ]);
        if (resultat_reponse_quiz.length > 0) {
          if (resultat_reponse_quiz[0].ETAT == "succes") {
            resultat[0]["Quiz"] = [];
          } else {
            if (resultat_reponse_quiz[0].STATUT == "Encours_Retest") {
              resultat[0]["Quiz"] = result_Quiz;
            } else {
              resultat[0]["Quiz"] = [];
            }
          }
        } else {
          resultat[0]["Quiz"] = result_Quiz;
        }
      } else {
        resultat[0]["Quiz"] = [];
      }
      if (resultat[0].AccesCommentaire.includes(`${id_Fonction}`)) {
        resultat[0]["Commentaire"] = true;
      } else {
        resultat[0]["Commentaire"] = false;
      }
    }
    delete resultat[0].AccesUtilite;
    delete resultat[0].AccesQuiz;
    delete resultat[0].AccesCommentaire;
    //console.log(resultat[0]);
    return res.status(200).send(resultat[0]);
  } catch (error) {
    console.log(error);
    throw error;
  }
};
const getExcelFile = async (req, res, next) => {
  const { id } = req.params;
  const userId = req.auth.userId;
  try {
    Auto_archivage();
    const Query = `Select id,titre,url,extention from B_FICHE where id=?`;
    const Query3 = `INSERT INTO B_HISTORIQUE (dateConsultation,id_UTILISATEUR,id_FICHE) VALUES (?,?,?)`;
    const dateConsultation = new Date();
    const [resultat] = await db.query(Query, [id]);
    if (resultat.length === 0) {
      return res
        .status(404)
        .json({ message: "Aucune fiche trouvée avec cet ID." });
    } else {
      await db.query(Query3, [dateConsultation, userId, id]);
    }

    const filePath = removeHostFromUrl(resultat[0].url);
    const fullPath = filePath.startsWith("/")
      ? filePath
      : path.join("/chargements", filePath);
    const fullPath2 = path.join(__dirname, "..", fullPath);

    //console.log("Chemins du fichier:");
    //console.log("- Path relatif:", filePath);
    //console.log("- Full path 1:", fullPath);
    //console.log("- Full path 2:", fullPath2);

    if (!fs.existsSync(fullPath2)) {
      //console.log("Fichier non trouvé à:", fullPath2);
      return res.status(404).json({
        message: "Fichier non trouvé",
      });
    }

    //console.log("Fichier trouvé, lecture en cours...");

    // Utiliser une promesse pour traiter la lecture du fichier de manière plus claire
    fs.readFile(fullPath2, (err, data) => {
      if (err) {
        console.error("Erreur de lecture du fichier:", err);
        return res.status(500).json({
          message: "Erreur lors de la lecture du fichier",
          error: err.message,
        });
      }

      // Vérifier que data est bien présent et de la bonne taille
      //console.log("Fichier lu avec succès, taille:", data.length, "octets");

      try {
        // Définir les en-têtes pour un fichier Excel
        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${path.basename(filePath)}"`
        );
        res.setHeader("Content-Length", data.length);

        // Envoyer le fichier et terminer la réponse
        //console.log("Envoi du fichier en cours...");
        res.status(200).send(data);
        //console.log("Fichier envoyé avec succès");
      } catch (sendError) {
        console.error("Erreur lors de l'envoi de la réponse:", sendError);
        // Ne pas essayer d'envoyer une autre réponse si celle-ci a échoué
      }
    });
  } catch (error) {
    console.error("Erreur dans getExcelFile:", error);
    return res.status(500).json({
      message: "Erreur serveur lors de la récupération du fichier",
      error: error.message,
    });
  }
};

const getOneFiche = async (req, res, next) => {
  const { id } = req.params;
  if (!id) {
    return res
      .status(403)
      .json({ message: "Merci de bien renseigner les paramettres." });
  }
  try {
    //console.log(id);
    const Query = `Select id,titre,id_Sla,id_Categorie,id_SousCategorie,dateReception,dateDebut,dateVisibilite,dateFin,Niveau as niveau,url,AccesSite,AccesProfil,AccesUtilite,AccesQuiz,AccesCommentaire,extention from B_FICHE where id=?`;
    const Query2 = `SELECT id,libelleQuestion,reponseQuestion,id_Fiche from B_QUIZ where id_Fiche=? `;
    const [resultat] = await db.query(Query, [id]);
    const [resultat2] = await db.query(Query2, [id]);
    if (resultat2.length > 0) {
      resultat[0]["isChecked"] = true;
    } else {
      resultat[0]["isChecked"] = false;
    }
    resultat[0]["Quiz"] = resultat2;
    resultat[0]["fichier"] = {
      nom:
        resultat[0].url.split("/chargements/")[1] + "." + resultat[0].extention,
      url: resultat[0].url,
    };
    //console.log(resultat[0]);
    return res.status(200).send(resultat[0]);
  } catch (error) {
    console.log(error);
    throw error;
  }
};
const getAllFicheByIdCategorieAndIdSousCategorie = async (req, res, next) => {
  const userId = req.auth.userId;
  const { id_Categorie, id_SousCategorie } = req.body;
  try {
    const Query = `select FH.id, FH.titre,FH.Niveau,sla.type from B_FICHE FH INNER JOIN B_SLA sla on FH.id_Sla=sla.id where FH.AccesSite like ? and FH.AccesProfil like ? and  FH.ETAT=?  and FH.id_Categorie=? and FH.id_SousCategorie=?`;
    const Query2 = `SELECT UT.id,ST.id as id_Site,F.id as id_Fonction from B_UTILISATEUR UT,B_SITE ST, B_FONCTION F where UT.id_Site=ST.id and UT.id_Fonction=F.id  and UT.id=?`;
    const [resultat2] = await db.query(Query2, [userId]);
    const id_Site = `%${resultat2[0].id_Site}%`;
    const id_Fonction = `%${resultat2[0].id_Fonction}%`;
    const ETAT = "ACTIF";
    const [resultat] = await db.query(Query, [
      id_Site,
      id_Fonction,
      ETAT,
      id_Categorie,
      id_SousCategorie,
    ]);

    return res.status(200).send(resultat);
  } catch (error) {
    console.log(error);
    throw error;
  }
};
const updateFiche = async (req, res, next) => {
 const data = JSON.parse(req.body.data);
  //console.log(data);
  const userId = req.auth.userId;
  const {id}=req.params;
  

  try {
    if(req.file){
     const extention = path.extname(req.file.filename);
  // const url = `${req.protocol}://${req.get("host")}/chargements/${
  const url = `/chargements/${req.file.filename}`;
  const Query=`UPDATE B_FICHE set url=? where id=?`;
  await db.query(Query,[url,id]);
  }
    if(data['isChecked']){
      const Query=`DELETE FROM B_QUIZ where id_FICHE=?`;
      await db.query(Query,[id]);
      const Query2=`INSERT INTO B_QUIZ (libelleQuestion,reponseQuestion,dateCreation,id_Fiche) VALUES (?,?,?,?) `;
          const dateEnregistrement = new Date(); 
      await db.query(Query2, [
        data.Quiz1.Question1,
        data.Quiz1.Reponse1,
        dateEnregistrement,
        id,
      ]);
      await db.query(Query2, [
        data.Quiz2.Question2,
        data.Quiz2.Reponse2,
        dateEnregistrement,
        id,
      ]);
      await db.query(Query2, [
        data.Quiz3.Question3,
        data.Quiz3.Reponse3,
        dateEnregistrement,
        id,
      ]);
      await db.query(Query2, [
        data.Quiz4.Question4,
        data.Quiz4.Reponse4,
        dateEnregistrement,
        id,
      ]);
   
    }
    // suppression des questionnaire dans json data
    delete data.isChecked;
    delete data.Quiz1;
    delete data.Quiz2;
    delete data.Quiz3;
    delete data.Quiz4;
    Object.entries(data).forEach(async([key, value]) => {
  if (value !== null && value !== undefined) {
    const Query=`UPDATE B_FICHE set ${key}=? where id=?`;
    await db.query(Query,[value,id]);
  }});
    return res.status(201).json({message:"La modification a été bien effectuée."});
  } catch (error) {
  console.log(error);
    throw error;  
  }

};
const deleteFiche = async (req, res, next) => {
  const userId = req.auth.userId;
  const { id } = req.params;
  if (!id) {
    return res
      .status(201)
      .json({ message: "Merci de bien renseigner les parametres." });
  }
  try {
    const Query1 = `select * from B_FICHE where id=? and id_Gestionnaire=?`;
    const Query = `DELETE from B_FICHE where id=?`;
    const [result] = await db.query(Query1, [id, userId]);

    if (result.length < 0) {
      return res.status(401).json({ message: "Vous n'êtes pas autorisé !" });
    } else {
      // Delete all related records first
      await db.query(`DELETE FROM B_HISTORIQUE WHERE id_FICHE=?`, [id]);
      await db.query(`DELETE FROM B_REPONSE_QUIZ WHERE id_FICHE=?`, [id]);
      await db.query(`DELETE FROM B_QUIZ WHERE id_FICHE=?`, [id]);
      await db.query(`DELETE FROM B_NOTIFICATION WHERE id_FICHE=?`, [id]);
      await db.query(`DELETE FROM B_COMMENTAIRE WHERE id_FICHE=?`, [id]);
      await db.query(`DELETE FROM B_SONDAGE WHERE id_FICHE=?`, [id]);
      await db.query(`DELETE FROM B_ON_TIME WHERE id_FICHE=?`, [id]);
      const filename = result[0].url.split("/chargements/")[1];
      fs.unlink(`/app/chargements/${filename}`, async () => {
        try {
          const result = await db.query(Query, [id]);
          return res
            .status(201)
            .json({ message: "La suppression a été effective." });
        } catch (error) {
          console.log(error);
          throw error;
        }
      });
    }
  } catch (error) {
    console.log(error);
    throw error;
  }
};
const Auto_archivage = async (req, res, next) => {
  try {
    const Query = `UPDATE B_FICHE set ETAT=?,date_Archive=?,archive_par=? where dateFin<=?`;
    const ETAT = "ARCHIVE";
    const Date_current = new Date();

    await db.query(Query, [ETAT, Date_current, "Système", Date_current]);
  } catch (error) {
    console.log(error);
    throw error;
  }
};
const exportFiche = async (req, res, next) => {};
/** fin de controllers fiche */
/**debut pour les controllers Pour les archives */
const archive_fiche = async (req, res, next) => {
  const { id } = req.params;
  const userId = req.auth.userId;
  if (!id) {
    return res
      .status(403)
      .json({ message: "Merci de bien renseigner le parametre" });
  }
  try {
    const Query1 = `SELECT nom_utilisateur from B_UTILISATEUR where id=? `;
    const Query = `UPDATE B_FICHE SET ETAT=?,date_Archive=?,archive_par=? where ID=?`;
    const ETAT = "ARCHIVE";
    const date_Archive = new Date();
    const [result1] = await db.query(Query1, [userId]);
    const result = await db.query(Query, [
      ETAT,
      date_Archive,
      result1[0].nom_utilisateur,
      id,
    ]);
    return res
      .status(201)
      .json({ message: "Cette fiche a été archivée avec succes." });
  } catch (error) {
    console.log(error);
    throw error;
  }
};
const getAllArchiveByGestionnaire = async (req, res, next) => {
  const { id } = req.params;
  try {
    const Query = ` SELECT FH.id,FH.titre,SL.type,SL.priorite,FH.ETAT,DATE_FORMAT(FH.dateDebut,'%Y-%m-%d %H:%i:%s') as dateDebut,DATE_FORMAT(FH.date_Archive,'%Y-%m-%d %H:%i:%s') as dateFin,CT.nom as Categorie,SCT.nom as Sous_Categorie, UT.nom_utilisateur as Gestionnaire ,FH.url,FH.extention from
    B_FICHE FH 
    LEFT JOIN B_UTILISATEUR UT
    on FH.id_gestionnaire=UT.id
    LEFT JOIN B_SLA SL
    on FH.id_Sla=SL.id
    LEFT JOIN B_CATEGORIE CT
    on CT.id=FH.id_Categorie
    LEFT JOIN B_SOUS_CATEGORIE SCT
    on CT.id=SCT.id_Categorie 
    where FH.ETAT=? and FH.id_gestionnaire=?
    ORDER BY dateDebut DESC`;
    const ETAT = "ARCHIVE";
    const [resutat] = await db.query(Query, [ETAT, id]);
    return res.status(200).send(resutat);
  } catch (error) {
    res.status(500).json({ message: "Error request" });
  }
};
const getAllArchive = async (req, res, next) => {
  try {
    const Query = ` SELECT FH.id,FH.titre,SL.type,SL.priorite,FH.ETAT,DATE_FORMAT(FH.date_Archive,'%Y-%m-%d %H:%i:%s') as dateFin,FH.archive_par,CT.nom as Categorie,SCT.nom as Sous_Categorie, UT.nom_utilisateur as Gestionnaire from
    B_FICHE FH 
    LEFT JOIN B_UTILISATEUR UT
    on FH.id_gestionnaire=UT.id
    LEFT JOIN B_SLA SL
    on FH.id_Sla=SL.id
    LEFT JOIN B_CATEGORIE CT
    on CT.id=FH.id_Categorie
    LEFT JOIN B_SOUS_CATEGORIE SCT
    on FH.id_SousCategorie=SCT.id  
    where FH.ETAT=? 
    ORDER BY dateDebut DESC`;
    const ETAT = "ARCHIVE";
    const [resutat] = await db.query(Query, [ETAT]);
    return res.status(200).send(resutat);
  } catch (error) {
    res.status(500).json({ message: "Error request" });
  }
};
const restore_archive = async (req, res, next) => {
  const { id } = req.params;
  if (!id) {
    return res
      .status(403)
      .json({ message: "Merci de bien renseigner les parametres" });
  }
  try {
    const Query_update = `UPDATE B_FICHE SET ETAT=? where id=?`;
    const ETAT_update = "ACTIF";
    const resultat = await db.query(Query_update, [ETAT_update, id]);
    return res
      .status(201)
      .json({ message: "Vous avez restorer cette fiche avec succes." });
  } catch (error) {
    console.log(error);
    throw error;
  }
};
/**fin de controllers fiches */
const getAllAgentB = async (req, res, next) => {
  try {
    const Query = `SELECT * from B_UTILISATEUR UT INNER JOIN B_UTILISATEUR UTT  on UT.id_Site=UTT.id_Site 
    INNER JOIN B_FONCTION FCT on UTT.id_Fonction=FCT.id
    where FCT.Role_Associe=?
    `;
    const Role_Associe = "R_TC";
    const [resultat] = await db.query(Query, [Role_Associe]);
    return res.status(200).send(resultat);
  } catch (error) {
    console.log(error);
    throw error;
  }
};

/** debut pour le controllers R_SUPERVISEUR_AGENT */
const affecte_agent_to_superviseur = async (req, res, next) => {
  const { id_SUPERVISEUR, id_AGENT } = req.body;
  if (!id_AGENT || !id_SUPERVISEUR) {
    return res
      .status(403)
      .json({ message: "Merci de bien renseigner tous les parametres" });
  }
  try {
    const Query =
      "INSERT INTO B_R_SUPERVISEUR_AGENT (id_SUPERVISEUR,id_AGENT,dateCreation) VALUE (?,?,?)";
    const dateCreation = new Date();
    const result = await db.query(Query, [
      id_SUPERVISEUR,
      id_AGENT,
      dateCreation,
    ]);
    return res
      .status(201)
      .json({ message: "Votre opératon a été effectuée avec succes." });
  } catch (error) {
    console.log(error);
    throw error;
  }
};
const getAllAgentBySuperviseur = async (req, res, next) => {
  const { id } = req.params;
  if (!id) {
    return res
      .status(403)
      .json({ message: "Merci de bien renseigner les parametres" });
  }
  try {
    const Query = ` 
    SELECT UT.id,UT.nom,UT.prenom,UT.email,UT.telephone,UT.adresse,FCT.nom as Fonction,
     st.nom as Site,pr.nom as Programme,UT.status 
     from
     (select * from B_R_SUPERVISEUR_AGENT where id_SUPERVISEUR=? ) R_SA
     INNER JOIN B_UTILISATEUR as UT on R_SA.id_AGENT=UT.id 
     INNER JOIN B_FONCTION FCT on UT.id_Fonction=FCT.id
     INNER JOIN B_SITE st on UT.id_SITE=st.id 
     INNER JOIN B_PROGRAMME pr on UT.id_PROGRAMME=pr.id
    `;
    const [result] = await db.query(Query, [id]);
    return res.status(200).send(result);
  } catch (error) {
    console.log(error);
    throw error;
  }
};
/** fin de controllers  */
/*** les controllers de Responsable operation */
const getAllAgentByRo = async (req, res, next) => {
  const userId = req.auth.userId;
  try {
    const Query1 = `SELECT id_Site FROM B_UTILISATEUR where id=? `;
    const Query2 = `SELECT UT1.id,UT1.nom_utilisateur,FCT.nom as fonction,pr.nom as programme,st.nom as site,UT1.status,UT3.nom_utilisateur as superviseur,UT1.dateCreation FROM B_UTILISATEUR UT1 INNER JOIN B_UTILISATEUR UT2 on UT1.id=UT2.id
    LEFT JOIN B_FONCTION FCT on UT1.id_Fonction=FCT.id 
    LEFT JOIN B_PROGRAMME pr on UT1.id_Programme=pr.id
    LEFT JOIN B_SITE st on UT1.id_Site=st.id
    LEFT  JOIN B_R_SUPERVISEUR_AGENT SA on UT1.id=SA.id_AGENT
    LEFT JOIN B_UTILISATEUR UT3 on SA.id_SUPERVISEUR=UT3.id
    where UT1.id_Site=? and UT1.id!=? and FCT.nom!="administrateur" and FCT.nom!="Gestionnaire Baseco" ORDER BY UT1.dateCreation DESC`;
    const [result1] = await db.query(Query1, [userId]);
    const id_site = result1[0].id_Site;
    const [result] = await db.query(Query2, [id_site, userId]);
    return res.status(200).send(result);
  } catch (error) {
    console.log(error);
    throw error;
  }
};
const getAllAgentByRo_Assignable = async (req, res, next) => {
  const userId = req.auth.userId;
  try {
    const retour = [];
    const Query1 = `SELECT id_Site FROM B_UTILISATEUR where id=? `;
    const Query2 = `SELECT UT1.nom_utilisateur FROM B_UTILISATEUR UT1 INNER JOIN B_UTILISATEUR UT2 on UT1.id=UT2.id
    LEFT JOIN B_FONCTION FCT on UT1.id_Fonction=FCT.id 
    LEFT JOIN B_PROGRAMME pr on UT1.id_Programme=pr.id
    LEFT JOIN B_SITE st on UT1.id_Site=st.ID
    LEFT  JOIN B_R_SUPERVISEUR_AGENT SA on UT1.id=SA.id_AGENT
    LEFT JOIN B_UTILISATEUR UT3 on SA.id_SUPERVISEUR=UT3.id
    where UT1.id_Site=? and UT1.id!=? and FCT.nom!="Superviseur" and FCT.nom!="Gestionnaire Baseco" and FCT.nom!="administrateur"`;
    const [result1] = await db.query(Query1, [userId]);
    const id_site = result1[0].id_Site;
    const [result] = await db.query(Query2, [id_site, userId]);
    for (let index = 0; index < result.length; index++) {
      retour[index] = result[index].nom_utilisateur;
    }

    return res.status(200).send(retour);
  } catch (error) {
    console.log(error);
    throw error;
  }
};
const getAllSuperviseurByRo = async (req, res, next) => {
  const userId = req.auth.userId;
  try {
    const Qery_superviseur = `SELECT UT2.id,UT2.nom_utilisateur from B_UTILISATEUR UT1 INNER JOIN B_UTILISATEUR UT2 on UT1.id_Site=UT2.id_Site 
    LEFT JOIN B_FONCTION FCT on UT2.id_Fonction=FCT.id
    where UT1.id=? and UT2.id!=? and FCT.nom="Superviseur"`;
    const [resultat] = await db.query(Qery_superviseur, [userId, userId]);
    return res.status(200).send(resultat);
  } catch (error) {
    console.log(error);
    throw error;
  }
};
const restore_password = async (req, res, next) => {
  const { id } = req.params;
  if (!id) {
    return res.status(403).json({ message: "Merci de bien renseigner" });
  }
  try {
    const Query = `SELECT default_password from B_UTILISATEUR where id=?`;
    const Query_update = `UPDATE B_UTILISATEUR SET password=? where id=?`;
    const [resultat] = await db.query(Query, [id]);
    const default_password = resultat[0].password;
    const resultat_update = await db.query(Query_update, [
      default_password,
      id,
    ]);
    return res
      .status(201)
      .json({ message: "Le mot de passe a été rénitialiser avec succes." });
  } catch (error) {
    console.log(error);
    throw error;
  }
};
const change_password = async (req, res, next) => {
  const { ancien_mot_de_passe, nouveau_mot_de_passe } = req.body;
  const userId = req.auth.userId;
  try {
    const Query = `SELECT password from B_UTILISATEUR where id=?`;
    const Query_update = `Update B_UTILISATEUR SET password=? where id=?`;
    const password = await bcrypt.hash(nouveau_mot_de_passe, 10);
    const [resultat] = await db.query(Query, [userId]);
    bcrypt
      .compare(ancien_mot_de_passe, resultat[0].password)
      .then((valid) => {
        if (!valid) {
          return res.status(401).json({
            message: "Le mot de passe par défaut est incorrect.",
          });
        } else {
          const resultat = db.query(Query_update, [password, userId]);
          return res
            .status(201)
            .json({ message: "Votre mot de passe a été modifié avec succes." });
        }
      })
      .catch((error) => {
        console.log(error);
      });
  } catch (error) {
    console.log(error);
    throw error;
  }
};
const assignation_agent = async (req, res, next) => {
  const { id_SUPERVISEUR, liste_agents } = req.body;
  try {
    const Query = `select * from B_R_SUPERVISEUR_AGENT RSA INNER JOIN B_UTILISATEUR UT on RSA.id_AGENT=UT.id where  UT.nom_utilisateur=?`;
    const Query_select_id_agent = `SELECT id from B_UTILISATEUR where nom_utilisateur=?`;
    const Query_update = `UPDATE B_R_SUPERVISEUR_AGENT set id_SUPERVISEUR=?,dateCreation=? where id_AGENT=?`;
    const Query_insert = `INSERT INTO B_R_SUPERVISEUR_AGENT (id_SUPERVISEUR,id_AGENT,dateCreation) VALUES (?,?,?)`;
    const Creation_date = new Date();
    for (let index = 0; index < liste_agents.length; index++) {
      const [resultat] = await db.query(Query, [liste_agents[index]]);
      if (resultat.length > 0) {
        const [resultat] = await db.query(Query_select_id_agent, [
          liste_agents[index],
        ]);
        const result = await db.query(Query_update, [
          id_SUPERVISEUR,
          Creation_date,
          [resultat[0].id],
        ]);
      } else {
        const [resultat] = await db.query(Query_select_id_agent, [
          liste_agents[index],
        ]);
        const result = await db.query(Query_insert, [
          id_SUPERVISEUR,
          [resultat[0].id],
          Creation_date,
        ]);
      }
    }
    return res
      .status(201)
      .json({ message: "Vous avez assigné ces agents avec success." });
  } catch (error) {
    console.log(error);
    throw error;
  }
};
/** */
/** les controllers pour Reponse_Quiz */
const response_Quiz = async (req, res, next) => {
  const { id } = req.params;
  const userId = req.auth.userId;
  const { resultat_Quiz } = req.body;
  if (!id || !userId) {
    return res
      .status(403)
      .json({ message: "Merci de bien renseigner les parametres" });
  }
  try {
    let ETAT = "";
    const Query1 = `SELECT id, NB_RETEST from B_REPONSE_QUIZ where id_UTILISATEUR=? and id_FICHE=?`;
    const Query = `INSERT INTO B_REPONSE_QUIZ (id_UTILISATEUR,id_FICHE,RESULTAT,ETAT,NB_RETEST, date_Quiz) VALUES (?,?,?,?,?,?)`;
    const Query2 = `UPDATE B_REPONSE_QUIZ SET RESULTAT=?,ETAT=?,STATUT=?,NB_RETEST=?,date_Quiz=? WHERE ID=?`;
    const date_Quiz = new Date();
    if (resultat_Quiz === 0) {
      ETAT = "Echecs";
    } else {
      ETAT = "succes";
    }

    const [resultat1] = await db.query(Query1, [userId, id]);
    let nb_restest = 0;
    if (resultat1.length > 0) {
      const id = resultat1[0].id;
      const nb_retest_old = resultat1[0].NB_RETEST;
      nb_restest = nb_retest_old + 1;
      const resultat = await db.query(Query2, [
        resultat_Quiz,
        ETAT,
        "retest",
        nb_restest,
        date_Quiz,
        id,
      ]);
    } else {
      nb_restest = 1;
      const resultat = await db.query(Query, [
        userId,
        id,
        resultat_Quiz,
        ETAT,
        nb_restest,
        date_Quiz,
      ]);
    }

    return res
      .status(201)
      .json({ message: "Votre reponse à enregister avec succes." });
  } catch (error) {
    console.log(error);
    throw error;
  }
};
const Quiz_en_echecs = async (req, res, next) => {
  const userId = req.auth.userId;
  try {
    const Query = `Select RQ.id,RQ.id_UTILISATEUR,RQ.id_FICHE,FH.titre,RQ.date_Quiz,RQ.ETAT,UT.nom_utilisateur from
    B_R_SUPERVISEUR_AGENT RSA INNER JOIN B_REPONSE_QUIZ RQ on RSA.id_AGENT=RQ.id_UTILISATEUR
    INNER JOIN B_UTILISATEUR UT ON RQ.id_UTILISATEUR=UT.id
    INNER JOIN B_FICHE FH on RQ.id_FICHE=FH.id
    where RSA.id_SUPERVISEUR=? and RQ.ETAT=? and (RQ.STATUT is null or RQ.STATUT='retest')
    `;
    const ETAT = "Echecs";
    const [resultat] = await db.query(Query, [userId, ETAT]);
    return res.status(200).send(resultat);
  } catch (error) {
    console.log(error);
    throw error;
  }
};
const Quiz_encours_retest = async (req, res, next) => {
  const userId = req.auth.userId;
  try {
    const Query = `Select RQ.id,RQ.id_FICHE,FH.titre,RQ.date_RETEST as date_retest,RQ.ETAT,RQ.STATUT,UT.nom_utilisateur from
    B_R_SUPERVISEUR_AGENT RSA INNER JOIN B_REPONSE_QUIZ RQ on RSA.id_AGENT=RQ.id_UTILISATEUR
    INNER JOIN B_UTILISATEUR UT ON RQ.id_UTILISATEUR=UT.id
    INNER JOIN B_FICHE FH on RQ.id_FICHE=FH.id
    where RSA.id_SUPERVISEUR=? and RQ.ETAT=? and RQ.STATUT=?
    `;
    const ETAT = "Echecs";
    const STATUT = "Encours_Retest";
    const [resultat] = await db.query(Query, [userId, ETAT, STATUT]);
    return res.status(200).send(resultat);
  } catch (error) {
    console.log(error);
    throw error;
  }
};
const Quiz_Retest = async (req, res, next) => {
  const { id_UTILISATEUR, id_FICHE } = req.body;
  try {
    const Query = `UPDATE B_REPONSE_QUIZ SET STATUT=?,date_RETEST=? where id_UTILISATEUR=? and id_FICHE=?`;
    const STATUT = "Encours_Retest";
    const date_retest = new Date();
    const result = await db.query(Query, [
      STATUT,
      date_retest,
      id_UTILISATEUR,
      id_FICHE,
    ]);
    return res
      .status(201)
      .json({ message: "Les Quiz de cet utilisateur sont relancés" });
  } catch (error) {
    console.log(error);
    throw error;
  }
};
/** fin de controllers reponse QUIZ */
/** les controllers sur sondages */
const reponse_utilite = async (req, res, next) => {
  const userId = req.auth.userId;
  const id = req.params.id;
  const { resultat_utilite } = req.body;
  if (!id) {
    return res
      .status(403)
      .json({ message: "Merci de bien renseigner les paramettres." });
  }
  try {
    const Query = `SELECT * from B_SONDAGE where id_UTILISATEUR=? and id_FICHE=?`;
    const Query_insert = `INSERT INTO B_SONDAGE (id_UTILISATEUR,id_FICHE,utilite,dateSondage) VALUES(?,?,?,?)`;
    const Query_update = `UPDATE B_SONDAGE SET utilite=? and dateSondage=?`;
    const dateSondage = new Date();
    const [result] = await db.query(Query, [userId, id]);
    if (result.length > 0) {
      await db.query(Query_update, [resultat_utilite, dateSondage]);
    } else {
      await db.query(Query_insert, [userId, id, resultat_utilite, dateSondage]);
    }
    return res
      .status(201)
      .json({ message: "L'utilité a été enregister avec succes." });
  } catch (error) {
    console.log(error);
    throw error;
  }
};
const reponse_exactitude = async (req, res, next) => {
  const userId = req.auth.userId;
  const id = req.params.id;
  const { resultat_exactitude } = req.body;
  if (!id) {
    return res
      .status(403)
      .json({ message: "Merci de bien renseigner les paramettres." });
  }
  try {
    const Query = `SELECT * from B_SONDAGE where id_UTILISATEUR=? and id_FICHE=?`;
    const Query_insert = `INSERT INTO B_SONDAGE (id_UTILISATEUR,id_FICHE,exactitude,dateSondage) VALUES(?,?,?,?)`;
    const Query_update = `UPDATE B_SONDAGE SET exactitude=? and dateSondage=?`;
    const dateSondage = new Date();
    const [result] = await db.query(Query, [userId, id]);
    if (result.length > 0) {
      await db.query(Query_update, [resultat_exactitude, dateSondage]);
    } else {
      await db.query(Query_insert, [
        userId,
        id,
        resultat_exactitude,
        dateSondage,
      ]);
    }
    return res
      .status(201)
      .json({ message: "L'exactitude a été enregister avec succes." });
  } catch (error) {
    console.log(error);
    throw error;
  }
};
/** fin de controllers sur les sondages */
/** les controllers pour les differents exports */
const export_ma_voix_compte = async (req, res, next) => {
  const { start_date, end_date } = req.body;
  try {
    const Query = `SELECT * form B_MA_VOIX_COMPTE where dateCreation between ? and ?`;
    const [resultat] = await db.query(Query, [start_date, end_date]);
    return res.status(200).send(resultat);
  } catch (error) {
    console.log(error);
    throw error;
  }
};

/** fin de controllers pour les differents exports */
/** les controllers sur les stats */
const statistic = async (req, res, next) => {
  const userId = req.auth.userId;
  try {
    const resultat = {};
    const Query = `select A.* from (SELECT * FROM B_FICHE where ETAT='ACTIF') A LEFT JOIN (select id_FICHE from B_HISTORIQUE where id_UTILISATEUR=? GROUP BY id_FICHE) B on A.id=B.id_FICHE where  B.id_FICHE is null`;
    const Query2 = `  
    SELECT FH.id,FH.titre,sl.type,FH.dateDebut,FH.dateFin,UT.nom_utilisateur as Gestionnaire,FH.extention FROM
    (SELECT * FROM 
    (SELECT A.id_FICHE FROM
    (SELECT id_UTILISATEUR,id_FICHE from B_HISTORIQUE WHERE id_UTILISATEUR=? GROUP BY id_FICHE)A
    INNER JOIN
    (SELECT id_FICHE as id_Fiche_Quiz FROM B_QUIZ GROUP BY id_FICHE)B on A.id_FICHE=B.id_Fiche_Quiz)C
    LEFT JOIN
    (SELECT id_UTILISATEUR as user_id,id_FICHE as id_Fiche_RQ FROM B_REPONSE_QUIZ WHERE id_UTILISATEUR=?) D on C.id_FICHE=D.id_Fiche_RQ
    WHERE D.id_Fiche_RQ is null)temp
    INNER JOIN B_FICHE FH ON temp.id_FICHE=FH.id
    INNER JOIN B_SLA sl on FH.id_Sla=sl.id
    INNER JOIN B_UTILISATEUR UT ON FH.id_gestionnaire=UT.id
    `;
    const Query3 = `SELECT temp.id,temp.titre,sl.type,temp.dateDebut,temp.dateFin,UT.nom_utilisateur as Gestionnaire,temp.extention FROM
    (SELECT * from 
    (SELECT id_UTILISATEUR,id_FICHE from B_HISTORIQUE where id_UTILISATEUR=? GROUP BY id_FICHE) A
    INNER JOIN B_FICHE FH on A.id_FICHE=FH.id)temp LEFT JOIN 
    (SELECT id_UTILISATEUR,id_FICHE from B_SONDAGE WHERE id_UTILISATEUR=? and utilite is not null GROUP BY id_FICHE)B 
    on temp.id_FICHE=B.id_FICHE 
    INNER JOIN B_UTILISATEUR UT on temp.id_Gestionnaire=UT.id
    INNER JOIN B_SLA sl on temp.id_Sla=sl.id
    where B.id_FICHE is null
`;

    const [resultat_Query1] = await db.query(Query, [userId]);
    const [resultat_Query2] = await db.query(Query2, [userId, userId]);
    const [resultat_Query3] = await db.query(Query3, [userId, userId]);
    resultat["fiche_non_lu"] = resultat_Query1;
    resultat["Quiz_encours"] = resultat_Query2;
    resultat["sondage_encours"] = resultat_Query3;
    return res.status(200).send(resultat);
  } catch (error) {
    console.log(error);
    throw error;
  }
};
const statistic_TC = async (req, res, next) => {
  const date = req.body.date + "%";
  const userId = req.auth.userId;

  if (!date) {
    return res
      .status(430)
      .json({ message: "Merci de bien renseigner les parametres." });
  }
  try {
    const resultat = {};
    const Query1 = `select COUNT(id_FICHE) as nombre_fiche_lue from ( select id_FICHE from B_HISTORIQUE where dateConsultation like ? and id_UTILISATEUR =?  GROUP BY id_FICHE) A`;
    const Query2 = `select COUNT(id_FICHE) as nombre_sondage_effectue from ( select id_FICHE from B_SONDAGE where dateSondage like ? and id_UTILISATEUR =?  GROUP BY id_FICHE) A`;
    const Query3 = `select COUNT(id_FICHE) as nombre_quiz_effectue from ( select id_FICHE from B_REPONSE_QUIZ where date_Quiz like ? and id_UTILISATEUR =?  GROUP BY id_FICHE) A`;
    const [resultat1] = await db.query(Query1, [date, userId]);
    const [resultat2] = await db.query(Query2, [date, userId]);
    const [resultat3] = await db.query(Query3, [date, userId]);
    resultat["nombre_fiche_lue"] = resultat1[0].nombre_fiche_lue;
    resultat["nombre_sondage_effectue"] = resultat2[0].nombre_sondage_effectue;
    resultat["nombre_quiz_effectue"] = resultat3[0].nombre_quiz_effectue;
   // //console.log(resultat);
    return res.status(200).send(resultat);
  } catch (error) {
    console.log(error);
    throw error;
  }
};
const statistic_TC_FOR_SUP = async (req, res, next) => {
  const { data } = req.body;
  const date = data.date + "%";
  const userId = data.userId;
  if (!date) {
    return res
      .status(430)
      .json({ message: "Merci de bien renseigner les parametres." });
  }
  try {
    const resultat = {};
    const Query1 = `select COUNT(id_FICHE) as nombre_fiche_lue from ( select id_FICHE from B_HISTORIQUE where dateConsultation like ? and id_UTILISATEUR =?  GROUP BY id_FICHE) A`;
    const Query2 = `select COUNT(id_FICHE) as nombre_sondage_effectue from ( select id_FICHE from B_SONDAGE where dateSondage like ? and id_UTILISATEUR =?  GROUP BY id_FICHE) A`;
    const Query3 = `select COUNT(id_FICHE) as nombre_quiz_en_retest from ( select id_FICHE from B_REPONSE_QUIZ where date_Quiz like ? and id_UTILISATEUR =? and STATUT=?  GROUP BY id_FICHE) A`;
    const Query4 = `select COUNT(id_FICHE) as nombre_quiz_echecs from ( select id_FICHE from B_REPONSE_QUIZ where date_Quiz like ? and id_UTILISATEUR =? and ETAT=?   GROUP BY id_FICHE) A`;
    const Query5 = `select COUNT(id_FICHE) as nombre_total_quiz_en_retest from ( select id_FICHE from B_REPONSE_QUIZ where  id_UTILISATEUR =? and STATUT=?  GROUP BY id_FICHE) A`;
    const Query6 = `select COUNT(id_FICHE) as nombre_total_quiz_Echecs from ( select id_FICHE from B_REPONSE_QUIZ where id_UTILISATEUR =? and ETAT=?  GROUP BY id_FICHE) A`;

    const [resultat1] = await db.query(Query1, [date, userId]);
    const [resultat2] = await db.query(Query2, [date, userId]);
    const [resultat3] = await db.query(Query3, [
      date,
      userId,
      "Encours_Retest",
    ]);
    const [resultat4] = await db.query(Query4, [date, userId, "Echecs"]);
    const [resultat5] = await db.query(Query5, [userId, "Encours_Retest"]);
    const [resultat6] = await db.query(Query6, [userId, "Echecs"]);
    resultat["nombre_fiche_lue"] = resultat1[0].nombre_fiche_lue;
    resultat["nombre_sondage_effectue"] = resultat2[0].nombre_sondage_effectue;
    resultat["nombre_quiz_en_retest"] = resultat3[0].nombre_quiz_en_retest;
    resultat["nombre_quiz_Echecs"] = resultat4[0].nombre_quiz_echecs;
    resultat["nombre_total_quiz_en_retest"] =
      resultat5[0].nombre_total_quiz_en_retest;
    resultat["nombre_total_quiz_Echecs"] =
      resultat6[0].nombre_total_quiz_Echecs;
    //console.log(resultat);
    return res.status(200).send(resultat);
  } catch (error) {
    console.log(error);
    throw error;
  }
};
/** fin des controller sur les stats */
/** */
/***  debut des contrôles pour le profil Gestionnaire d'exactitude */
const controle_actif = async (req, res, next) => {
  const {quantite_echantillon}=req.body
  //console.log(quantite_echantillon);
  try {
    const dateCreation = new Date();
    const yers = new Date(
      dateCreation.getFullYear(),
      dateCreation.getMonth(),
      dateCreation.getDay()
    );
   // console.log(yers);
    const ETAT = "ACTIF";
    const Query = `SELECT FCH.id, FCH.titre,sl.type,DATE_FORMAT(FCH.dateDebut,'%Y-%m-%d') as dateDebut,DATE_FORMAT(FCH.dateFin,'%Y-%m-%d') as dateFin,UT.nom_utilisateur as Gestionnaire FROM B_FICHE FCH
    LEFT JOIN B_SLA sl on FCH.id=sl.id
    LEFT JOIN B_UTILISATEUR UT on FCH.id_Gestionnaire=UT.id 
    where  DATE_FORMAT(FCH.dateEnregistrement,'%Y-%m')!=DATE_FORMAT(?,'%Y-%m') and FCH.ETAT=?  ORDER BY RAND() LIMIT ?;`;
    const [resultat] = await db.query(Query, [yers, ETAT,quantite_echantillon]);
    return res.status(200).send(resultat);
  } catch (error) {
    console.log(error);
    throw error;
  }
};
const controle_m_1 = async (req, res, next) => {
  try {
    const dateCreation = new Date();
    const yers = new Date(
      dateCreation.getFullYear(),
      dateCreation.getMonth()-1,
      dateCreation.getDay()
    );
    const Query1 = `SELECT COUNT(*) as nombre_fiche from B_FICHE`;
    const Query = `SELECT FCH.id, FCH.titre,sl.type,DATE_FORMAT(FCH.dateDebut,'%Y-%m-%d') as dateDebut,DATE_FORMAT(FCH.dateFin,'%Y-%m-%d') as dateFin,UT.nom_utilisateur as Gestionnaire FROM B_FICHE FCH
    LEFT JOIN B_SLA sl on FCH.id=sl.id
    LEFT JOIN B_UTILISATEUR UT on FCH.id_Gestionnaire=UT.id 
    where  DATE_FORMAT(FCH.dateEnregistrement,'%Y-%m')=DATE_FORMAT(?,'%Y-%m') ORDER BY RAND() LIMIT ?;`;
    const [resultat1] = await db.query(Query1);
    const LIMIT = Math.ceil(resultat1[0].nombre_fiche / 2);
    const [resultat] = await db.query(Query, [yers, LIMIT]);
    return res.status(200).send(resultat);
  } catch (error) {
    console.log(error);
    throw error;
  }
};
const getReporting = async (req, res, next) => {
  const userId = req.auth.userId;
  console.log(req.body);
  console.log(userId);
  const { typeControle, dateDebut, dateFin } = req.body;
  //console.log(dateDebut, typeControle, dateFin);
  try {
    const resultat = {};
    const Query = `select F.id,C.id_CONTROLE,F.titre,F.ETAT,U.nom_utilisateur,IF(C.exactitude=1,'oui','non') as exactitude,BOT.on_time,DATE_FORMAT(C.dateControle,'%Y-%m-%d') as dateControle 
    from B_CONTROLE C INNER JOIN B_RESULTAT_CONTROLE RC on C.id_CONTROLE=RC.id_CONTROLE
    INNER JOIN B_FICHE F on C.id_FICHE=F.id INNER JOIN B_UTILISATEUR U on C.id_UTILISATEUR=U.id
    INNER JOIN B_ON_TIME BOT on C.id_FICHE=BOT.id_Fiche
    where C.id_UTILISATEUR=? and C.typeControle=? and DATE_FORMAT(C.dateControle,'%Y-%m-%d') between DATE_FORMAT(?,'%Y-%m-%d') and DATE_FORMAT(?,'%Y-%m-%d')`;
    const Query2 = `select score from B_RESULTAT_CONTROLE where id_CONTROLEUR=? and id_CONTROLE=? and DATE_FORMAT(dateControle,'%Y-%m-%d') between DATE_FORMAT(?,'%Y-%m-%d') and DATE_FORMAT(?,'%Y-%m-%d')`;
    const [resultat1] = await db.query(Query, [
      userId,
      typeControle,
      dateDebut,
      dateFin,
    ]);
    console.log(resultat1[0]);

    const id_CONTROLE = resultat1[0].id_CONTROLE;
    const [resultat2] = await db.query(Query2, [
      userId,
      id_CONTROLE,
      dateDebut,
      dateFin,
    ]);
    resultat["reporting_data"] = resultat1;
    resultat["score"] = resultat2[0].score;
    //console.log(resultat);
    return res.status(200).send(resultat);
  } catch (error) {
    console.log(error);
    throw error;
  }
};
function removeHostFromUrl(fullUrl) {
  try {
    const parsedUrl = new URL(fullUrl);
    return parsedUrl.pathname + parsedUrl.search + parsedUrl.hash;
  } catch (error) {
    console.error("URL invalide:", error);
    return fullUrl; // Retourner l'URL d'origine en cas d'erreur
  }
}
const addControle = async (req, res, next) => {
  const userId = req.auth.userId;
  const { score, typeControle } = req.body;

  try {
    const data = req.body.Data;
    //console.log(data);
    const id_controle = Math.floor(Math.random() * 100000) + 1;
    //console.log(id_controle);
    const date_controle = new Date();
    if (Array.isArray(data) && data.length > 0) {
      for (const profile of data) {
        db.query(
          `INSERT INTO B_CONTROLE (id_CONTROLE,id_FICHE,id_UTILISATEUR,typeControle,exactitude,dateControle) VALUES (?,?,?,?,?,?)`,
          [
            id_controle,
            profile.id,
            userId,
            typeControle,
            profile.response,
            date_controle,
          ]
        );
      }
      db.query(
        `INSERT INTO B_RESULTAT_CONTROLE(id_CONTROLEUR,id_CONTROLE,score,dateControle) VALUES (?,?,?,?)`,
        [userId, id_controle, score, date_controle]
      );
      return res.status(201).json({ message: "Contrôle ajouté avec succès." });
    }
  } catch (error) {
    console.log(error);
    throw error;
  }
};

/*** fin de contrôle  */
module.exports = {
  sign_in,
  login,
  getMe,
  getAllUtilisateur,
  addUtilisateur,
  getOneUtilisateur,
  updateUtilisateur,
  deleteUtilisateur,
  update_utilisateur,
  addSla,
  getAllSla,
  getSlaById,
  updateSla,
  deleteSla,
  addSousCategorie,
  getAllSousCategorie,
  getAllSousCategorieByIdCategorie,
  deleteSousCategorie,
  addCategorie,
  getAllCategorie,
  getAllCategorieAndSousCategorie,
  deleteCategorie,
  updateCategorie,
  addHistorique,
  getAllHistoriqueByIdFiche,
  getAllHistoriqueByIdUtilisateur,
  addSite,
  deleteSite,
  updateMotifMaVoixCompte,
  getAllSite,
  addFonction,
  getAllFonction,
  deleteFonction,
  addNotification,
  getAllNotification,
  getDetailsProgramme,
  addCommentaire,
  getAllCommentaireByIdFiche,
  getAllCommentaireByIdUtilisateur,
  exportCommentaire,
  addMotifMaVoixCompte,
  deleteMotifMaVoixCompte,
  getAllMotifMaVoixCompte,
  getOneMotifMaVoixCompte,
  addMaVoixCompte,
  getAllExport,
  exportMaVoixCompte,
  addQUestionnaire,
  getAllQuestionnaire,
  addReponseQuestionnaire,
  getAllReponseByFiche,
  addProgramme,
  getAllProgramme,
  updateProgramme,
  deleteProgramme,
  addGrille,
  getAllGrille,
  deleteGrille,
  updateGrille,
  faireSondage,
  getAllSondage,
  addFiche,
  getAllFiche,
  getAllFicheByGestionnaire,
  getAllFicheByIDFiche,
  updateFiche,
  deleteFiche,
  exportFiche,
  getOneCatgorie,
  getDeatilsSite,
  affecte_agent_to_superviseur,
  getAllAgentBySuperviseur,
  getDetailsUtilisateur,
  getAllArchiveByGestionnaire,
  restore_archive,
  restore_password,
  getOneGrile,
  getAllFiche,
  getAllFicheByIdCategorieAndIdSousCategorie,
  archive_fiche,
  getAllAgentByRo,
  getStatistique_par_site,
  getAllArchive,
  getOneSite,
  response_Quiz,
  Quiz_Retest,
  Quiz_en_echecs,
  Quiz_encours_retest,
  reponse_exactitude,
  reponse_utilite,
  export_ma_voix_compte,
  statistic,
  change_password,
  getOneFonction,
  update_Fonction,
  getAllAgentByRo_Assignable,
  assignation_agent,
  getAllSuperviseurByRo,
  getOneFiche,
  getAllDashboard,
  controle_actif,
  controle_m_1,
  getAllDashboard_admin,
  getExcelFile,
  statistic_TC,
  addControle,
  getReporting,
  updateSite,
  getOneProgramme,
  getAllFiche_Archive,
  statistic_TC_FOR_SUP,
  redOneNotifcation,
  redAllNotification,
  createNotification
};
