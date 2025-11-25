CREATE DATABASE IF NOT EXISTS QUALITUS ;
USE QUALITUS;

CREATE TABLE IF NOT EXISTS B_SITE (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(50),
  description TEXT,
  Etat VARCHAR(50),
  dateCreation DATETIME,
  dateModification DATETIME
);

CREATE TABLE IF NOT EXISTS B_FONCTION (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(100),
  Role_Associe VARCHAR(100),
  Permissions_Associe TEXT,
  Etat VARCHAR(50),
  dateCreation DATETIME,
  dateModification DATETIME
);

CREATE TABLE IF NOT EXISTS B_PROGRAMME (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(50),
  description TEXT,
  Etat VARCHAR(50),
  dateCreation DATETIME,
  dateModification DATETIME
);

CREATE TABLE IF NOT EXISTS B_GRILLE (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(50),
  seuil_charte INT,
  seuil_client INT,
  seuil_activite FLOAT,
  seuil_conformite FLOAT,
  url LONGTEXT,
  Etat VARCHAR(50),
  dateCreation DATETIME,
  dateModification DATETIME
);

CREATE TABLE IF NOT EXISTS B_UTILISATEUR (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(100),
  prenom VARCHAR(100),
  nom_utilisateur VARCHAR(100),
  genre VARCHAR(100),
  email VARCHAR(100),
  telephone INT,
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
);

CREATE TABLE IF NOT EXISTS B_MOTIF_MA_VOIX_COMPTE (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nomMotif VARCHAR(50),
  dateCreation DATETIME
);

CREATE TABLE IF NOT EXISTS B_MA_VOIX_COMPTE (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_UTILISATEUR INT,
  motif_ma_voix_compte VARCHAR(100),
  message TEXT,
  dateCreation DATETIME,
  FOREIGN KEY(id_UTILISATEUR) REFERENCES B_UTILISATEUR(id)
);

CREATE TABLE IF NOT EXISTS B_SLA (
  id INT AUTO_INCREMENT PRIMARY KEY,
  source VARCHAR(100),
  type VARCHAR(50),
  delai INT,
  priorite VARCHAR(10),
  Etat VARCHAR(50),
  dateCreationSla DATETIME,
  dateModification DATETIME
);

CREATE TABLE IF NOT EXISTS B_CATEGORIE (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(100),
  Etat VARCHAR(50),
  dateCreationCategorie DATETIME,
  dateModification DATETIME
);
INSERT INTO B_CATEGORIE (nom, Etat, dateCreationCategorie, dateModification) VALUES
('Process & Procedures de traitement', 'ACTIF', NOW(), NULL),
( 'Offres et Services', 'ACTIF', NOW(), NULL),
( 'Nouvelles offres', 'ACTIF', NOW(), NULL),
( 'avis operation sur comptes client', 'ACTIF', NOW(), NULL),
( 'Autre Promo', 'ACTIF', NOW(), NULL),
( 'Promo recharge', 'ACTIF', NOW(), NULL),
( 'Argumentaire', 'ACTIF', NOW(), NULL),
( 'Autres infos', 'ACTIF', NOW(), NULL),
( 'Modules de formation', 'ACTIF', NOW(), NULL),
( 'Consignes de production', 'ACTIF', NOW(), NULL),
( 'FLYERS MODES OPERATOIRES ENVOYER CLIENTS', 'ACTIF', NOW(), NULL),
( 'MODE OPERATOIRE', 'ACTIF', NOW(), NULL),
( 'Lien et application', 'ACTIF', NOW(), NULL);
CREATE TABLE IF NOT EXISTS B_SOUS_CATEGORIE (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(100),
  Etat VARCHAR(50),
  dateCreationSousCategorie DATETIME,
  id_Categorie INT,
  dateModification DATETIME,
  FOREIGN KEY(id_Categorie) REFERENCES B_CATEGORIE(id)
);

CREATE TABLE IF NOT EXISTS B_FICHE (
  id INT AUTO_INCREMENT PRIMARY KEY,
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
  Niveau VARCHAR(10),
  AccesSite VARCHAR(100),
  AccesProfil VARCHAR(100),
  AccesUtilite VARCHAR(100),
  AccesQuiz VARCHAR(100),
  AccesCommentaire VARCHAR(100),
  date_Archive DATETIME,
  archive_par VARCHAR(50),
  url VARCHAR(250),
  extention VARCHAR(10),
  FOREIGN KEY(id_gestionnaire) REFERENCES B_UTILISATEUR(id),
  FOREIGN KEY(id_Categorie) REFERENCES B_CATEGORIE(id),
  FOREIGN KEY(id_SousCategorie) REFERENCES B_SOUS_CATEGORIE(id),
  FOREIGN KEY(id_Sla) REFERENCES B_SLA(id)
);
CREATE TABLE IF NOT EXISTS B_QUIZ (
  id INT AUTO_INCREMENT PRIMARY KEY,
  libelleQuestion TEXT,
  reponseQuestion TEXT,
  dateCreation DATETIME,
  id_Fiche INT,
  FOREIGN KEY(id_Fiche) REFERENCES B_FICHE(id)
);

CREATE TABLE IF NOT EXISTS B_REPONSE_QUIZ (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_UTILISATEUR INT,
  id_FICHE INT,
  RESULTAT INT,
  ETAT VARCHAR(10),
  STATUT VARCHAR(20),
  NB_RETEST INT,
  date_Quiz DATETIME,
  date_RETEST DATETIME,
  FOREIGN KEY(id_UTILISATEUR) REFERENCES B_UTILISATEUR(id),
  FOREIGN KEY(id_FICHE) REFERENCES B_FICHE(id)
);

CREATE TABLE IF NOT EXISTS B_R_SUPERVISEUR_AGENT (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_SUPERVISEUR INT,
  id_AGENT INT,
  dateCreation DATETIME,
  FOREIGN KEY(id_SUPERVISEUR) REFERENCES B_UTILISATEUR(id),
  FOREIGN KEY(id_AGENT) REFERENCES B_UTILISATEUR(id)
);

CREATE TABLE IF NOT EXISTS B_NOTIFICATION (
  id INT AUTO_INCREMENT PRIMARY KEY,
  titre VARCHAR(100),
  message TEXT,
  type VARCHAR(20),
  dateReception DATETIME,
  id_UTILISATEUR INT,
  id_FICHE INT,
  url LONGTEXT,
  FOREIGN KEY(id_UTILISATEUR) REFERENCES B_UTILISATEUR(id),
  FOREIGN KEY(id_FICHE) REFERENCES B_FICHE(id)
);

CREATE TABLE IF NOT EXISTS B_HISTORIQUE (
  id INT AUTO_INCREMENT PRIMARY KEY,
  dateConsultation DATETIME,
  id_UTILISATEUR INT,
  id_FICHE INT,
  FOREIGN KEY(id_UTILISATEUR) REFERENCES B_UTILISATEUR(id),
  FOREIGN KEY(id_FICHE) REFERENCES B_FICHE(id)
);

CREATE TABLE IF NOT EXISTS B_COMMENTAIRE (
  id INT AUTO_INCREMENT PRIMARY KEY,
  message TEXT,
  dateCommentaire DATETIME,
  id_UTILISATEUR INT,
  id_FICHE INT,
  FOREIGN KEY(id_UTILISATEUR) REFERENCES B_UTILISATEUR(id),
  FOREIGN KEY(id_FICHE) REFERENCES B_FICHE(id)
);

CREATE TABLE IF NOT EXISTS B_SONDAGE (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_UTILISATEUR INT,
  id_FICHE INT,
  utilite INT,
  exactitude INT,
  dateSondage DATETIME,
  FOREIGN KEY(id_UTILISATEUR) REFERENCES B_UTILISATEUR(id),
  FOREIGN KEY(id_FICHE) REFERENCES B_FICHE(id)
);

CREATE TABLE IF NOT EXISTS B_ON_TIME (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_Fiche INT,
  temps INT,
  date_effective DATETIME,
  id_Sla INT,
  delai INT,
  on_time VARCHAR(10),
  FOREIGN KEY(id_Fiche) REFERENCES B_FICHE(id),
  FOREIGN KEY(id_Sla) REFERENCES B_SLA(id)
);
CREATE TABLE IF NOT EXISTS B_CONTROLE (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_CONTROLE BIGINT,
  id_Fiche INT,
  id_UTILISATEUR INT,
  typeControle VARCHAR(50),
  exactitude INT,
  dateControle DATETIME,
  FOREIGN KEY(id_Fiche) REFERENCES B_FICHE(id),
  FOREIGN KEY(id_UTILISATEUR) REFERENCES B_UTILISATEUR(id)
);
CREATE TABLE IF NOT EXISTS B_RESULTAT_CONTROLE (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_CONTROLEUR INT,
  id_CONTROLE BIGINT,
  score INT, 
  dateControle DATETIME,
  FOREIGN KEY(id_CONTROLEUR) REFERENCES B_UTILISATEUR(id)
);
INSERT INTO B_SITE (nom,description, Etat, dateCreation) VALUES
('Team Call Center','Team call center est parténaire pour qui est chargé à la reception des appels de nos clients','ACTIF', now());
INSERT INTO B_FONCTION (nom, Role_Associe, Permissions_Associe, Etat, dateCreation) VALUES
('Administrateur', 'R_ADMI', 'canAdd,canDelete,canEdit,canRead', 'ACTIF', NOW()),
('Gestionnaire Baseco','R_GB', 'canAdd,canDelete,canEdit,canRead', 'ACTIF', NOW()),
('Superviseur','R_SUP', 'canAdd,canDelete,canEdit,canRead', 'ACTIF', NOW()),
('Tele Conseiller','R_TC', 'canAdd,canDelete,canEdit,canRead', 'ACTIF', NOW()),
('Agent Formateur','R_AF', 'canAdd,canDelete,canEdit,canRead', 'ACTIF', NOW()),
('Gestionnaire Exactitude','R_GE', 'canAdd,canDelete,canEdit,canRead', 'ACTIF', NOW()),
('Responsable Opérationnel','R_RO', 'canAdd,canDelete,canEdit,canRead', 'ACTIF', NOW()),
('Agent Qualité','R_AQ', 'canAdd,canDelete,canEdit,canRead', 'ACTIF', NOW());
INSERT INTO B_PROGRAMME (nom, description, Etat, dateCreation) VALUES
('7414','Description du programme 7414', 'ACTIF', NOW());  
INSERT INTO B_GRILLE (nom, Etat, dateCreation) VALUES
('GRILLE EVALUATION RS', 'ACTIF', NOW()); 
INSERT INTO B_UTILISATEUR (nom, prenom, nom_utilisateur,genre,email,
telephone,ville,adresse,password,default_password,id_Fonction ,id_Site,id_Programme,id_Grille,status,dateCreation) VALUES
('sidibe', 'Diakalia', 'sidibe', 'homme', 'diacksidibe500@gamil.com', 73462937, 'Bamako', '1 rue de la Paix', '$2b$10$T8/EB3/e8CQLus6oG849yesRz1nm23kCMX9yZtBHNjLVczg6ncxAu', '$2b$10$T8/EB3/e8CQLus6oG849yesRz1nm23kCMX9yZtBHNjLVczg6ncxAu', 1, 1, 1, 1, 'ACTIF', NOW());
INSERT INTO B_GRILLE (nom,Etat,dateCreation) VALUES 
('GRILLE EVALUATION SCGP', 'ACTIF', NOW()),
('GRILLE EVALUATION BO', 'ACTIF', NOW()),
('GRILLE EVALUATION RS', 'ACTIF', NOW()),
('GRILLE EVALUATION CC 7414', 'ACTIF', NOW()),
('GRILLE EVALUATION BO 7414', 'ACTIF', NOW()),
('GRILLE EVALUATION EMAIL', 'ACTIF', NOW()),
('GRILLE EVALUATION TO 7444', 'ACTIF', NOW()),
('GRILLE EVALUATION BO 7444', 'ACTIF', NOW()),
('GRILLE EVALUATION EMAIL 7444', 'ACTIF', NOW()),
('SONDAGE','ACTIF',NOW());
INSERT INTO B_SLA (source, type, delai, priorite, Etat, dateCreationSla) VALUES
('Marketing', 'Promo Recharge', 15, 'P1', 'ACTIF', NOW()),
('Marketing', 'Autres Promos', 60, 'P3', 'ACTIF', NOW()),
('Marketing', 'Lancement Offre', 4320, 'P5', 'ACTIF', NOW()),
('Process','Mise à jours',1440,'P4','ACTIF',NOW()),
('Process','Nouvelle Procédure',1440,'P4','ACTIF',NOW()),
('Opération Service CLient','Avis Opération sur Comptes clients',1440,'P6','ACTIF',NOW()),
('Opération Service Client','incident réseau',15,'P1','ACTIF',NOW());
/*
INSERT INTO B_SOUS_CATEGORIE (nom,Etat,dateCreationSousCategorie,id_Categorie) VALUES
('MODE OPERATOIRE OU PROCéDURES N1','ACTIF',NOW(),1),
('MODE OPERATOIRE OU PROCéDURES N2','ACTIF',NOW(),1),
('MODE OPERATOIRE OU PROCéDURES RS','ACTIF',NOW(),1),
('OMY','ACTIF',NOW(),2),
('NAFAMA','ACTIF',NOW(),2),
('TELCO','ACTIF',NOW(),2),
('NOUVELLES OFFRES','ACTIF',NOW(),3),
('BASE DES CLIENTS CONCERNES','ACTIF',NOW(),4),
('TOUTES AUTRES PROMOS HORS PROMO RECHARGE','ACTIF',NOW(),5),
('TOUTES PROMOS RECHARGE GRAND PUBLIC','ACTIF',NOW(),6),
('FICHE INCIDENT','ACTIF',NOW(),7),
('ARGUMENTAIRE','ACTIF',NOW(),8),
('EVENEMENT','ACTIF',NOW(),9),
('MODULES CONçUS LORS DU DéPLOIEMENT DES SI OU MODULES SUR LES PRATIQUES','ACTIF',NOW(),10),
('TOUTES CONSIGNES POUR LA BONNE GESTION DE LA PRODUCTION','ACTIF',NOW(),11),
('FLYERS MODE OPERATOIRES A ENVOYER','ACTIF',NOW(),12),
('MODE OPERATOIRE','ACTIF',NOW(),13),
('MODE OPERATOIRE','ACTIF',NOW(),14);
*/