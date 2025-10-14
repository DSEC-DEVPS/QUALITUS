const express = require("express");
const morgan = require("morgan");
const colors = require("colors");
const dotenv = require("dotenv");
const mysqlPool = require("./config/db");
const path = require("path");

/** config dotenv */
dotenv.config();
const PORT = process.env.SERVER_PORT;
// rest object

const app = express();
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content, Accept, Content-Type, Authorization"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, PATCH, OPTIONS"
  );
  next();
});
/* middlewares */

app.use(morgan(`dev`));
app.use(express.json());
app.use("/chargements", express.static(path.join(__dirname, "chargements")));

//app.use(express.static("Frontend"));

/** routes */

app.use("/api/v1", require("./Routes/baseco.Routes"));
/*app.get("/{*test}", (req, res) => {
  res.sendFile(path.join(__dirname + "/Frontend/index.html"));
});*/

mysqlPool
  .query("SELECT 1")
  .then(() => {
    //my sql
    console.log("MSQL DB Connected".bgCyan.white);
    // listen
    app.listen(PORT, () => {
      console.log(`server Running  ${PORT}`.bgMagenta.white);
    });
    //createDatabase();
  })
  .catch((error) => {
    console.log(error);
  });
/*
const createDatabase = async () => {
  const query_BASECO = "CREATE DATABASE IF NOT EXISTS COPC";

  const query_SITE = `CREATE TABLE IF NOT EXISTS B_SITE 
      ( id INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
        nom VARCHAR(50),
        Etat VARCHAR(50),
        dateCreation DATETIME,
        dateModification DATETIME
      ) `;

  const query_Fonction = `CREATE TABLE IF NOT EXISTS B_FONCTION
        (id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
        nom VARCHAR(100),
        Role_Associe VARCHAR(100),
        Permissions_Associe TEXT,
        Etat VARCHAR(50),
        dateCreation DATETIME,
        dateModification DATETIME
        )`;

  const query_Programme = `CREATE TABLE IF NOT EXISTS B_PROGRAMME(
        id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
        nom VARCHAR(50),
        Etat VARCHAR(50),
        dateCreation DATETIME,
        dateModification DATETIME)`;

  const query_Grille = `CREATE TABLE IF NOT EXISTS B_GRILLE (
        id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
        nom VARCHAR(50),
        seuil_charte INT,
        seuil_client INT,
        seuil_activite FLOAT,
        seuil_conformite FLOAT,
        url LONGTEXT,
        Etat VARCHAR(50),
        dateCreation DATETIME,
        dateModification DATETIME)`;

  const query_UTILISATEUR = `CREATE TABLE IF NOT EXISTS B_UTILISATEUR (
       id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
       nom VARCHAR(100),
        prenom VARCHAR(100),
       nom_utilisateur VARCHAR(100),
       genre VARCHAR(100),
       email VARCHAR(100),
       telephone VARCHAR(15),
       ville VARCHAR(20),
       adresse VARCHAR(20),
       password TEXT,
       default_password TEXT,
       id_Fonction INT,
       id_Site INT,
       id_Programme INT,
       id_Grille INT,
       status VARCHAR(50),
       dateCreation DATETIME,
       dateModification DATETIME,
       nb_session_login INT,
       UNIQUE(email),
       UNIQUE(nom_utilisateur),
        FOREIGN KEY(id_Fonction) REFERENCES B_FONCTION(id),
       FOREIGN KEY(id_Site) REFERENCES B_SITE(id),
       FOREIGN KEY(id_Programme) REFERENCES B_PROGRAMME(id),
       FOREIGN KEY(id_Grille) REFERENCES B_GRILLE(id)
       )`;

  const query_MOTIF_MA_VOIX_COMPTE = `CREATE TABLE IF NOT EXISTS B_MOTIF_MA_VOIX_COMPTE 
       (
       id INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
       nomMotif VARCHAR(50),
       dateCreation DATETIME
       )`;

  const query_MA_VOIX_COMPTE = `CREATE TABLE IF NOT EXISTS B_MA_VOIX_COMPTE 
       ( id INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
        id_UTILISATEUR INT,
          motif_ma_voix_compte VARCHAR(100),
        message TEXT,
        dateCreation DATETIME,
         FOREIGN KEY(id_UTILISATEUR) REFERENCES B_UTILISATEUR(id) 
       )`;

  const query_SLA = `CREATE TABLE IF NOT EXISTS B_SLA 
       ( id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        source VARCHAR(100),
        type VARCHAR(50),
        delai int,
        priorite VARCHAR(10),
        Etat VARCHAR(50),
        dateCreationSla DATETIME,
        dateModification DATETIME
        )`;

  const query_CATEGORIE = `CREATE TABLE IF NOT EXISTS B_CATEGORIE (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        nom VARCHAR(100),
        Etat VARCHAR(50),
        dateCreationCategorie DATETIME,
        dateModification DATETIME
        )`;

  const query_SOUS_CATEGORIE = `CREATE TABLE IF NOT EXISTS B_SOUS_CATEGORIE 
        ( id INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
         nom VARCHAR(100),
         Etat VARCHAR(50),
         dateCreationSousCategorie DATETIME,
         id_Categorie INT,
         dateModification DATETIME,
         FOREIGN KEY(id_Categorie) REFERENCES B_CATEGORIE(id)
        )`;

  const query_FICHE = `CREATE TABLE IF NOT EXISTS B_FICHE 
        ( id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
         id_gestionnaire INT,
          titre VARCHAR(100),
          dateReception DATETIME,
          dateDebut DATETIME,
          dateVisibilite DATETIME,
          dateFin DATETIME,
          dateEnregistrement DATETIME,
          dateModification DATETIME,
          id_Categorie INT,
          id_SousCategorie INT,
          id_Sla INT,
          ETAT VARCHAR(10),
          date_Archive DATETIME,
          archive_par INT,
          url VARCHAR(250),
          extention VARCHAR(10),
          FOREIGN KEY (id_gestionnaire) REFERENCES B_UTILISATEUR(id),
          FOREIGN KEY (id_Categorie) REFERENCES B_CATEGORIE(id),
          FOREIGN KEY (id_SousCategorie) REFERENCES B_SOUS_CATEGORIE(id),
          FOREIGN KEY (id_Sla) REFERENCES B_SLA(id),
          FOREIGN KEY (archive_par) REFERENCES B_UTILISATEUR(id)
        )`;
  const query_QUIZ = `CREATE TABLE IF NOT EXISTS B_QUIZ(
      id INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
        libelleQuestion  TEXT,
        reponseQuestion TEXT,
        dateCreation DATETIME,
         id_Fiche INT,
        FOREIGN KEY (id_Fiche) REFERENCES B_FICHE(id)
        )`;
  const query_R_SUPERVISEUR_AGENT = `CREATE TABLE IF NOT EXISTS B_R_SUPERVISEUR_AGENT 
        (id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
        id_SUPERVISEUR INT,
        id_AGENT INT,
        dateCreation DATETIME,
        FOREIGN KEY (id_SUPERVISEUR) REFERENCES B_UTILISATEUR(id),
        FOREIGN KEY (id_AGENT) REFERENCES B_UTILISATEUR(id)
        )`;

  const query_REPONSE_QUIZ = `CREATE TABLE IF NOT EXISTS B_REPONSE_QUIZ
        (
        id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
        id_UTILISATEUR INT,
        id_FICHE INT,
        RESULTAT INT,
        ETAT VARCHAR(10),
        STATUT VARCHAR(20),
        NB_RETEST INT,
        date_Quiz DATETIME ,
        date_RETEST DATETIME,
        FOREIGN KEY (id_UTILISATEUR) REFERENCES B_UTILISATEUR(id),
        FOREIGN KEY (id_FICHE) REFERENCES B_FICHE(id)
        )`;

  const query_NOTIFICATION = `CREATE TABLE IF NOT EXISTS B_NOTIFICATION 
        (
        id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
        titre VARCHAR(100),
        message TEXT,
        type VARCHAR(20),
        dateReception DATETIME,
        id_UTILISATEUR INT,
        id_FICHE INT,
        url LONGTEXT,
        FOREIGN KEY (id_UTILISATEUR) REFERENCES B_UTILISATEUR(id),
        FOREIGN KEY (id_FICHE) REFERENCES B_FICHE(id)
        )`;

  const query_HISTORIQUE = `CREATE TABLE IF NOT EXISTS B_HISTORIQUE 
        (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        dateConsultation DATETIME,
        id_UTILISATEUR INT,
        id_FICHE INT,
        FOREIGN KEY (id_UTILISATEUR) REFERENCES B_UTILISATEUR(id),
        FOREIGN KEY (id_FICHE) REFERENCES B_FICHE(id)
        )`;

  const query_COMMENTAIRE = `CREATE TABLE IF NOT EXISTS B_COMMENTAIRE 
        (
        id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
        message TEXT,
        dateCommentaire DATETIME,
        id_UTILISATEUR INT,
        id_FICHE INT,
        FOREIGN KEY (id_UTILISATEUR) REFERENCES B_UTILISATEUR(id),
        FOREIGN KEY (id_FICHE) REFERENCES B_FICHE(id)
        )`;

  const query_SONDAGE = `CREATE TABLE IF NOT EXISTS B_SONDAGE 
        ( id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
         id_UTILISATEUR INT,
          id_FICHE INT,
         utilite INT ,
         exactitude INT,
         dateSondage DATETIME,
         FOREIGN KEY (id_UTILISATEUR) REFERENCES B_UTILISATEUR(id),
         FOREIGN KEY (id_FICHE) REFERENCES B_FICHE(id)
        )`;

  const query_On_Time = `CREATE TABLE IF NOT EXISTS B_ON_TIME(
        id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
        id_Fiche INT,
        temps INT,
        date_effective DATETIME,
        id_Sla INT,
        delai INT,
        on_time VARCHAR(10),
        FOREIGN KEY (id_Fiche) REFERENCES B_FICHE(id),
        FOREIGN KEY (id_Sla) REFERENCES B_SLA(id))`;

  try {
    await mysqlPool.query(query_BASECO);
    await mysqlPool.query(query_Fonction);
    await mysqlPool.query(query_Programme);
    await mysqlPool.query(query_SITE);
    await mysqlPool.query(query_Grille);
    await mysqlPool.query(query_UTILISATEUR);
    await mysqlPool.query(query_MOTIF_MA_VOIX_COMPTE);
    await mysqlPool.query(query_MA_VOIX_COMPTE);
    await mysqlPool.query(query_SLA);
    await mysqlPool.query(query_CATEGORIE);
    await mysqlPool.query(query_SOUS_CATEGORIE);
    await mysqlPool.query(query_FICHE);
    await mysqlPool.query(query_QUIZ);
    await mysqlPool.query(query_REPONSE_QUIZ);

    await mysqlPool.query(query_NOTIFICATION);
    await mysqlPool.query(query_HISTORIQUE);
    await mysqlPool.query(query_COMMENTAIRE);
    await mysqlPool.query(query_SONDAGE);
    await mysqlPool.query(query_On_Time);
    await mysqlPool.query(query_R_SUPERVISEUR_AGENT);
  } catch (error) {
    console.log(error);
    throw error;
  }
};
*/
