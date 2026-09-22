-- =====================================================================
-- QUALITUS - INITIALISATION COMPLETE DE LA BASE
-- =====================================================================
-- Ce fichier consolide le schema initial et les migrations 01..22.
-- Il est destine a une installation neuve de QUALITUS et represente
-- l'etat final du schema apres toutes les migrations fournies.
--
-- Les operations de retro-migration/backfill presentes dans certaines
-- migrations (UPDATE/INSERT SELECT sur des donnees deja existantes) ne
-- sont pas reprises : elles servent uniquement a mettre a niveau une
-- base existante et ne sont pas necessaires lors d'une creation neuve.
-- Les donnees de reference/seed utiles au fonctionnement sont conservees.

-- Inclut desormais : module Evaluation (cahier) + socle S5 habilitations

-- (matrice des droits) avec seed permissions/roles. Le fichier legacy_eval_backup.sql

-- reste SEPARE (sauvegarde de l'ancien module supprime, a ne PAS rejouer).
-- =====================================================================

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

-- B_GRILLE (ancien système) supprimée : la grille unique est b_eval_grille (module Évaluation).

CREATE TABLE IF NOT EXISTS B_UTILISATEUR (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(100),
  prenom VARCHAR(100),
  nom_utilisateur VARCHAR(100),
  genre VARCHAR(100),
  email VARCHAR(100),
  telephone INT,
  ville VARCHAR(150),
  adresse VARCHAR(255),
  password TEXT,
  default_password TEXT,
  id_Fonction INT,
  id_Site INT,
  id_Programme INT,
  id_EvalGrille INT,
  status VARCHAR(50),
  dateCreation DATETIME,
  dateModification DATETIME,
  nb_session_login INT,
  UNIQUE(email),
  UNIQUE(nom_utilisateur),
  FOREIGN KEY(id_Fonction) REFERENCES B_FONCTION(id),
  FOREIGN KEY(id_Site) REFERENCES B_SITE(id),
  FOREIGN KEY(id_Programme) REFERENCES B_PROGRAMME(id)
  -- Grille unique : id_EvalGrille -> b_eval_grille (FK ajoutée après création de b_eval_grille)
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


CREATE TABLE IF NOT EXISTS B_QZ_QUIZ (
  id INT AUTO_INCREMENT PRIMARY KEY,
  titre VARCHAR(200) NOT NULL,
  code_pin VARCHAR(10) NULL,
  type VARCHAR(50) NULL,
  description TEXT,
  id_Fiche INT NULL,
  note_passage INT DEFAULT 70,
  retest_auto TINYINT(1) DEFAULT 1,
  nb_retest_max INT DEFAULT 1,
  duree INT NULL,
  date_fermeture DATETIME NULL,
  acces VARCHAR(20) DEFAULT 'PRIVATE',
  alterner_questions TINYINT(1) DEFAULT 0,
  autoriser_machines TINYINT(1) DEFAULT 0,
  Etat VARCHAR(50) DEFAULT 'ACTIF',
  id_createur INT NULL,
  dateCreation DATETIME,
  dateModification DATETIME
) ENGINE=InnoDB;

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
  nature_objet VARCHAR(50),
  id_objet INT,
  lu TINYINT(1) DEFAULT 0,
  dateLecture DATETIME,
  FOREIGN KEY(id_UTILISATEUR) REFERENCES B_UTILISATEUR(id),
  FOREIGN KEY(id_FICHE) REFERENCES B_FICHE(id)
);

-- Schéma de base de données pour le système de notifications

-- Table des notifications
CREATE TABLE IF NOT EXISTS B_notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_UTILISATEUR INT NOT NULL,
  id_NOTIFICATION INT NOT NULL,
  id_FICHE INT NOT NULL,
  titre VARCHAR(255) NOT NULL,
  createdBy INT NOT NULL,
  isRead BOOLEAN DEFAULT false,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  readAt TIMESTAMP NULL,
  
  -- Clés étrangères
  FOREIGN KEY (id_UTILISATEUR) REFERENCES B_UTILISATEUR(id) ON DELETE CASCADE,
  FOREIGN KEY (id_FICHE) REFERENCES B_FICHE(id) ON DELETE CASCADE,
  FOREIGN KEY (id_NOTIFICATION) REFERENCES B_NOTIFICATION(id) ON DELETE CASCADE,
  FOREIGN KEY (createdBy) REFERENCES B_UTILISATEUR(id) ON DELETE CASCADE,
  
  -- Index pour améliorer les performances
  INDEX idx_user_read (id_UTILISATEUR, isRead),
  INDEX idx_created_at (createdAt)
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
INSERT INTO B_UTILISATEUR (nom, prenom, nom_utilisateur,genre,email,
telephone,ville,adresse,password,default_password,id_Fonction ,id_Site,id_Programme,status,dateCreation) VALUES
('sidibe', 'Diakalia', 'sidibe', 'homme', 'diacksidibe500@gamil.com', 73462937, 'Bamako', '1 rue de la Paix', '$2b$10$T8/EB3/e8CQLus6oG849yesRz1nm23kCMX9yZtBHNjLVczg6ncxAu', '$2b$10$T8/EB3/e8CQLus6oG849yesRz1nm23kCMX9yZtBHNjLVczg6ncxAu', 1, 1, 1, 'ACTIF', NOW());
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

-- =====================================================================
-- MODULES AJOUTES PAR LES MIGRATIONS 03..22
-- =====================================================================

-- Source: 03_calibrage.sql
/*CREATE TABLE IF NOT EXISTS B_MODELE_GRILLE (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(150) NOT NULL,
  description TEXT,
  Etat VARCHAR(50) DEFAULT 'ACTIF',
  dateCreation DATETIME,
  dateModification DATETIME
) ENGINE=InnoDB;

-- Source: 03_calibrage.sql
CREATE TABLE IF NOT EXISTS B_MG_CATEGORIE_ERREUR (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_ModeleGrille INT NOT NULL,
  nom VARCHAR(255) NOT NULL,
  poids DOUBLE DEFAULT 0,
  ordre INT DEFAULT 0,
  dateCreation DATETIME,
  dateModification DATETIME,
  FOREIGN KEY (id_ModeleGrille) REFERENCES B_MODELE_GRILLE(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Source: 03_calibrage.sql
CREATE TABLE IF NOT EXISTS B_MG_ERREUR (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_CategorieErreur INT NOT NULL,
  nom VARCHAR(255) NOT NULL,
  poids DOUBLE DEFAULT 0,
  ordre INT DEFAULT 0,
  dateCreation DATETIME,
  dateModification DATETIME,
  FOREIGN KEY (id_CategorieErreur) REFERENCES B_MG_CATEGORIE_ERREUR(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Source: 03_calibrage.sql
CREATE TABLE IF NOT EXISTS B_MG_ITEM (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_Erreur INT NOT NULL,
  nom VARCHAR(500) NOT NULL,
  poids DOUBLE DEFAULT 0,
  ordre INT DEFAULT 0,
  dateCreation DATETIME,
  dateModification DATETIME,
  FOREIGN KEY (id_Erreur) REFERENCES B_MG_ERREUR(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Source: 03_calibrage.sql
CREATE TABLE IF NOT EXISTS B_MG_SOUS_ITEM (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_Item INT NOT NULL,
  nom VARCHAR(500) NOT NULL,
  referentiel TEXT,
  poids DOUBLE DEFAULT 0,
  ordre INT DEFAULT 0,
  dateCreation DATETIME,
  dateModification DATETIME,
  FOREIGN KEY (id_Item) REFERENCES B_MG_ITEM(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Source: 03_calibrage.sql
CREATE TABLE IF NOT EXISTS B_CATEGORIE_RESSOURCE (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(100) NOT NULL,
  est_robot TINYINT(1) DEFAULT 0,
  Etat VARCHAR(50) DEFAULT 'ACTIF',
  dateCreation DATETIME,
  UNIQUE (nom)
) ENGINE=InnoDB;

-- Source: 03_calibrage.sql
CREATE TABLE IF NOT EXISTS B_MG_CATEGORIE_RESSOURCE (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_ModeleGrille INT NOT NULL,
  id_CategorieRessource INT NOT NULL,
  dateCreation DATETIME,
  FOREIGN KEY (id_ModeleGrille) REFERENCES B_MODELE_GRILLE(id) ON DELETE CASCADE,
  FOREIGN KEY (id_CategorieRessource) REFERENCES B_CATEGORIE_RESSOURCE(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Source: 04_calibrage_phase2.sql
CREATE TABLE IF NOT EXISTS B_MG_POURQUOI (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_ModeleGrille INT NOT NULL,
  niveau INT NOT NULL,
  libelle VARCHAR(255) NOT NULL,
  id_parent INT NULL,
  ordre INT DEFAULT 0,
  dateCreation DATETIME,
  FOREIGN KEY (id_ModeleGrille) REFERENCES B_MODELE_GRILLE(id) ON DELETE CASCADE,
  FOREIGN KEY (id_parent) REFERENCES B_MG_POURQUOI(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Source: 04_calibrage_phase2.sql
CREATE TABLE IF NOT EXISTS B_MG_CRITERE_REGLE (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_ModeleGrille INT NOT NULL,
  type_ecart VARCHAR(255) NOT NULL,
  operateur VARCHAR(5) DEFAULT '>',
  valeur_objectif DECIMAL(7,3),
  libelle_echec VARCHAR(255),
  libelle_reussite VARCHAR(255),
  ordre INT DEFAULT 0,
  dateCreation DATETIME,
  dateModification DATETIME,
  FOREIGN KEY (id_ModeleGrille) REFERENCES B_MODELE_GRILLE(id) ON DELETE CASCADE
) ENGINE=InnoDB;
*/
-- Source: 05_quiz.sql
CREATE TABLE IF NOT EXISTS B_QZ_QUESTION (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_Quiz INT NOT NULL,
  type VARCHAR(20) DEFAULT 'VRAI_FAUX',   -- extensible : QCM, MULTIPLE...
  libelle TEXT NOT NULL,
  ordre INT DEFAULT 0,
  dateCreation DATETIME,
  FOREIGN KEY (id_Quiz) REFERENCES B_QZ_QUIZ(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Source: 05_quiz.sql
CREATE TABLE IF NOT EXISTS B_QZ_OPTION (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_Question INT NOT NULL,
  libelle VARCHAR(255) NOT NULL,
  est_correcte TINYINT(1) DEFAULT 0,
  ordre INT DEFAULT 0,
  FOREIGN KEY (id_Question) REFERENCES B_QZ_QUESTION(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Source: 06_quiz_phase2.sql
CREATE TABLE IF NOT EXISTS B_QZ_TENTATIVE (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_Quiz INT NOT NULL,
  id_UTILISATEUR INT NOT NULL,
  score DECIMAL(5,2) DEFAULT 0,     -- pourcentage de bonnes reponses
  nb_bonnes INT DEFAULT 0,
  nb_total INT DEFAULT 0,
  reussi TINYINT(1) DEFAULT 0,
  num_essai INT DEFAULT 1,          -- 1 = premiere tentative, 2 = 1er retest...
  statut VARCHAR(20),               -- REUSSI | ECHEC_RETEST | ECHEC_FINAL
  date_tentative DATETIME,
  date_debut DATETIME NULL,
  date_fin DATETIME NULL,
  FOREIGN KEY (id_Quiz) REFERENCES B_QZ_QUIZ(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Source: 06_quiz_phase2.sql
CREATE TABLE IF NOT EXISTS B_QZ_REPONSE (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_Tentative INT NOT NULL,
  id_Question INT NOT NULL,
  id_Option INT NULL,               -- option choisie par l'utilisateur
  est_correcte TINYINT(1) DEFAULT 0,
  FOREIGN KEY (id_Tentative) REFERENCES B_QZ_TENTATIVE(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Source: 07_quiz_phase3.sql
CREATE TABLE IF NOT EXISTS B_QZ_NOTIFICATION (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_Quiz INT NOT NULL,
  id_UTILISATEUR INT NOT NULL,
  titre VARCHAR(200),
  message VARCHAR(255),
  lu TINYINT(1) DEFAULT 0,
  dateCreation DATETIME,
  FOREIGN KEY (id_Quiz) REFERENCES B_QZ_QUIZ(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Source: 07_quiz_phase3.sql
CREATE TABLE IF NOT EXISTS B_QZ_BADGE (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(40) NOT NULL,
  nom VARCHAR(100) NOT NULL,
  description VARCHAR(255),
  icone VARCHAR(50),
  condition_type VARCHAR(30) NOT NULL,   -- QUIZ_REUSSIS | SCORE_PARFAIT
  condition_valeur INT DEFAULT 1,
  UNIQUE (code)
) ENGINE=InnoDB;

-- Source: 07_quiz_phase3.sql
CREATE TABLE IF NOT EXISTS B_QZ_BADGE_UTILISATEUR (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_Badge INT NOT NULL,
  id_UTILISATEUR INT NOT NULL,
  dateObtention DATETIME,
  UNIQUE (id_Badge, id_UTILISATEUR),
  FOREIGN KEY (id_Badge) REFERENCES B_QZ_BADGE(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Source: 08_evaluation.sql
/*
CREATE TABLE IF NOT EXISTS B_EV_CONTEXTE (
  id INT AUTO_INCREMENT PRIMARY KEY,
  libelle VARCHAR(150) NOT NULL,
  Etat VARCHAR(50) DEFAULT 'ACTIF',
  dateCreation DATETIME,
  dateModification DATETIME
) ENGINE=InnoDB;

-- Source: 08_evaluation.sql
CREATE TABLE IF NOT EXISTS B_EV_EVALUATEUR (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(100) NOT NULL,
  prenom VARCHAR(100),
  email VARCHAR(150),
  login VARCHAR(100),
  id_Site INT,                    -- reference B_SITE (call, tcc...)
  id_UTILISATEUR INT NULL,        -- lien compte appli optionnel
  Etat VARCHAR(50) DEFAULT 'ACTIF',
  dateCreation DATETIME,
  dateModification DATETIME
) ENGINE=InnoDB;

-- Source: 08_evaluation.sql
CREATE TABLE IF NOT EXISTS B_EV_AGENT (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(100) NOT NULL,
  prenom VARCHAR(100),
  login_genesys VARCHAR(100),
  id_CategorieRessource INT,      -- type : Conseiller / BO ... (B_CATEGORIE_RESSOURCE)
  id_Site INT,
  Etat VARCHAR(50) DEFAULT 'ACTIF',
  dateCreation DATETIME,
  dateModification DATETIME
) ENGINE=InnoDB;

-- Source: 09_evaluation_phase2.sql
CREATE TABLE IF NOT EXISTS B_EV_EVALUATION (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_Contexte INT,
  id_Agent INT NOT NULL,
  id_ModeleGrille INT,            -- grille auto selon le type de l'agent (snapshot)
  id_appel VARCHAR(100),
  n_case VARCHAR(100),
  date_appel DATETIME NULL,
  dmt VARCHAR(12),                -- hh:mm:ss (saisie libre)
  motif_appel VARCHAR(255),
  resolution VARCHAR(3),          -- OUI / NON (rempli a l'execution)
  conclusion VARCHAR(10),         -- SUCCES / ECHEC (auto)
  score_global DECIMAL(6,2),
  statut VARCHAR(20) DEFAULT 'NON_TERMINE',
  actif TINYINT(1) DEFAULT 1,
  id_createur INT,
  id_Evaluateur INT NULL,
  date_creation DATETIME,
  date_execution DATETIME NULL,
  date_modification DATETIME
) ENGINE=InnoDB;

-- Source: 09_evaluation_phase2.sql
CREATE TABLE IF NOT EXISTS B_EV_RESULTAT (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_Evaluation INT NOT NULL,
  id_SousItem INT NOT NULL,
  conforme TINYINT(1) DEFAULT 1,
  commentaire TEXT,
  FOREIGN KEY (id_Evaluation) REFERENCES B_EV_EVALUATION(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Source: 10_evaluation_phase3.sql
CREATE TABLE IF NOT EXISTS B_EV_NOTIFICATION (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_Evaluation INT NOT NULL,
  id_UTILISATEUR INT NOT NULL,
  titre VARCHAR(200),
  message VARCHAR(255),
  lu TINYINT(1) DEFAULT 0,
  dateCreation DATETIME,
  FOREIGN KEY (id_Evaluation) REFERENCES B_EV_EVALUATION(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Source: 10_evaluation_phase3.sql
CREATE TABLE IF NOT EXISTS B_EV_COACHING (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_Evaluation INT NOT NULL,
  cause_racine TEXT,
  pourquoi1 VARCHAR(255),
  pourquoi2 VARCHAR(255),
  pourquoi3 VARCHAR(255),
  pourquoi4 VARCHAR(255),
  pourquoi5 VARCHAR(255),
  id_createur INT,
  dateCreation DATETIME,
  dateModification DATETIME,
  UNIQUE (id_Evaluation),
  FOREIGN KEY (id_Evaluation) REFERENCES B_EV_EVALUATION(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Source: 10_evaluation_phase3.sql
CREATE TABLE IF NOT EXISTS B_EV_ACTION_TYPE (
  id INT AUTO_INCREMENT PRIMARY KEY,
  libelle VARCHAR(150) NOT NULL,
  Etat VARCHAR(50) DEFAULT 'ACTIF',
  dateCreation DATETIME,
  UNIQUE (libelle)
) ENGINE=InnoDB;

-- Source: 10_evaluation_phase3.sql
CREATE TABLE IF NOT EXISTS B_EV_ACTION (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_Evaluation INT NOT NULL,
  id_ActionType INT,
  action_libelle VARCHAR(255),
  porteur VARCHAR(150),
  contributeurs VARCHAR(255),
  date_debut DATE NULL,
  date_attendue DATE NULL,
  date_realisation DATE NULL,
  statut VARCHAR(30) DEFAULT 'A_FAIRE',
  kpi VARCHAR(255),
  commentaire TEXT,
  dateCreation DATETIME,
  dateModification DATETIME,
  FOREIGN KEY (id_Evaluation) REFERENCES B_EV_EVALUATION(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Source: 11_evaluation_phase4.sql
CREATE TABLE IF NOT EXISTS B_EV_CONTRE_EVALUATION (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_Evaluation INT NOT NULL,
  resolution VARCHAR(3),
  conclusion VARCHAR(10),
  score_global DECIMAL(6,2),
  date_visibilite DATE NULL,
  statut VARCHAR(20) DEFAULT 'NON_TERMINE',
  actif TINYINT(1) DEFAULT 1,
  id_createur INT,
  date_creation DATETIME,
  date_execution DATETIME NULL,
  date_modification DATETIME,
  FOREIGN KEY (id_Evaluation) REFERENCES B_EV_EVALUATION(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Source: 11_evaluation_phase4.sql
CREATE TABLE IF NOT EXISTS B_EV_CONTRE_RESULTAT (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_ContreEvaluation INT NOT NULL,
  id_SousItem INT NOT NULL,
  conforme TINYINT(1) DEFAULT 1,
  FOREIGN KEY (id_ContreEvaluation) REFERENCES B_EV_CONTRE_EVALUATION(id) ON DELETE CASCADE
) ENGINE=InnoDB;
*/
-- Source: 13_quiz_fiches.sql
CREATE TABLE IF NOT EXISTS B_QZ_QUIZ_FICHE (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_Quiz INT NOT NULL,
  id_Fiche INT NOT NULL,
  dateCreation DATETIME,
  FOREIGN KEY (id_Quiz) REFERENCES B_QZ_QUIZ(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Source: 14_quiz_retest.sql
CREATE TABLE IF NOT EXISTS B_QZ_RETEST (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_Quiz INT NOT NULL,
  id_UTILISATEUR INT NOT NULL,       -- l'agent autorise a refaire
  autorise_par INT,                   -- le superviseur qui autorise
  date_autorisation DATETIME,
  consomme TINYINT(1) DEFAULT 0,
  date_consommation DATETIME NULL,
  FOREIGN KEY (id_Quiz) REFERENCES B_QZ_QUIZ(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Source: 16_quiz_ip.sql
CREATE TABLE IF NOT EXISTS B_QZ_IP_AUTORISEE (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  id_Quiz      INT NOT NULL,
  adresse_ip   VARCHAR(64) NOT NULL,
  libelle      VARCHAR(150) NULL,
  dateCreation DATETIME NULL,
  CONSTRAINT fk_qz_ip_quiz FOREIGN KEY (id_Quiz)
    REFERENCES B_QZ_QUIZ(id) ON DELETE CASCADE,
  UNIQUE KEY uq_quiz_ip (id_Quiz, adresse_ip)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Source: 17_quiz_ip_demande.sql
CREATE TABLE IF NOT EXISTS B_QZ_IP_DEMANDE (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  id_Quiz        INT NOT NULL,
  id_UTILISATEUR INT NOT NULL,          -- l'agent bloque
  adresse_ip     VARCHAR(64) NOT NULL,
  statut         VARCHAR(20) NOT NULL DEFAULT 'EN_ATTENTE', -- EN_ATTENTE | AUTORISE | REFUSE
  dateCreation   DATETIME NULL,
  dateTraitement DATETIME NULL,
  id_traitePar   INT NULL,
  CONSTRAINT fk_qz_ipdem_quiz FOREIGN KEY (id_Quiz)
    REFERENCES B_QZ_QUIZ(id) ON DELETE CASCADE,
  UNIQUE KEY uq_dem (id_Quiz, id_UTILISATEUR, adresse_ip, statut)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Source: 18_quiz_site.sql
CREATE TABLE IF NOT EXISTS B_QZ_QUIZ_SITE (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  id_Quiz      INT NOT NULL,
  id_Site      INT NOT NULL,
  dateCreation DATETIME NULL,
  CONSTRAINT fk_qz_site_quiz FOREIGN KEY (id_Quiz)
    REFERENCES B_QZ_QUIZ(id) ON DELETE CASCADE,
  UNIQUE KEY uq_quiz_site (id_Quiz, id_Site)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Source: 19_quiz_tentative_temps.sql
CREATE TABLE IF NOT EXISTS B_QZ_SESSION (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  id_Quiz        INT NOT NULL,
  id_UTILISATEUR INT NOT NULL,
  date_debut     DATETIME NOT NULL,
  UNIQUE KEY uq_session (id_Quiz, id_UTILISATEUR)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Source: 20_sondage.sql
CREATE TABLE IF NOT EXISTS B_SD_SONDAGE (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  nom              VARCHAR(255) NOT NULL,
  token VARCHAR(40) NULL,
  langue           VARCHAR(20)  NOT NULL DEFAULT 'Francais',
  statut           VARCHAR(20)  NOT NULL DEFAULT 'ENCOURS',  -- ENCOURS | ACTIF | DESACTIF
  bouton_retour    TINYINT(1)   NOT NULL DEFAULT 0,          -- afficher le bouton Retour (page precedente)
  id_createur      INT NULL,
  dateCreation     DATETIME NULL,
  dateModification DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Source: 20_sondage.sql
CREATE TABLE IF NOT EXISTS B_SD_QUESTION (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  id_Sondage   INT NOT NULL,
  page         INT NOT NULL DEFAULT 1,        -- numero de page (P1, P2, ...)
  ordre        INT NOT NULL DEFAULT 0,        -- ordre d'affichage (dans la page)
  type         VARCHAR(30) NOT NULL,          -- CHOIX_UNIQUE | CHOIX_MULTIPLE | OUVERTE | CLASSEMENT | CURSEUR | INFO
  libelle      TEXT NOT NULL,
  obligatoire  TINYINT(1) NOT NULL DEFAULT 1,
  curseur_min  INT NULL,                      -- pour type CURSEUR
  curseur_max  INT NULL,
  dateCreation DATETIME NULL,
  CONSTRAINT fk_sd_q_sondage FOREIGN KEY (id_Sondage)
    REFERENCES B_SD_SONDAGE(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Source: 20_sondage.sql
CREATE TABLE IF NOT EXISTS B_SD_OPTION (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  id_Question INT NOT NULL,
  libelle     VARCHAR(500) NOT NULL,
  ordre       INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_sd_o_question FOREIGN KEY (id_Question)
    REFERENCES B_SD_QUESTION(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Source: 21_sondage_passation.sql
CREATE TABLE IF NOT EXISTS B_SD_CONDITION (
  id                 INT AUTO_INCREMENT PRIMARY KEY,
  id_Question        INT NOT NULL,           -- question conditionnee
  id_Question_source INT NOT NULL,           -- question dont on teste la reponse
  operateur          VARCHAR(20) NOT NULL DEFAULT 'EGAL', -- EGAL|DIFFERENT|SUP_EGAL|INF_EGAL|CONTIENT
  id_Option          INT NULL,               -- pour source de type choix
  valeur             VARCHAR(255) NULL,       -- pour source curseur/ouverte
  CONSTRAINT fk_sd_cond_q FOREIGN KEY (id_Question)
    REFERENCES B_SD_QUESTION(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Source: 21_sondage_passation.sql
CREATE TABLE IF NOT EXISTS B_SD_PASSATION (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  id_Sondage     INT NOT NULL,
  id_UTILISATEUR INT NULL,                   -- null si anonyme (lien public)
  date_debut     DATETIME NULL,
  date_fin       DATETIME NULL,
  termine        TINYINT(1) NOT NULL DEFAULT 0,
  CONSTRAINT fk_sd_pass_sondage FOREIGN KEY (id_Sondage)
    REFERENCES B_SD_SONDAGE(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Source: 21_sondage_passation.sql
CREATE TABLE IF NOT EXISTS B_SD_REPONSE (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  id_Passation INT NOT NULL,
  id_Question  INT NOT NULL,
  id_Option    INT NULL,                     -- pour choix (1 ligne par option choisie)
  valeur_texte TEXT NULL,                    -- pour ouverte
  valeur_num   INT NULL,                     -- pour curseur
  ordre        INT NULL,                     -- pour classement (rang)
  CONSTRAINT fk_sd_rep_pass FOREIGN KEY (id_Passation)
    REFERENCES B_SD_PASSATION(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Source: 22_sondage_cible.sql
CREATE TABLE IF NOT EXISTS B_SD_CIBLE (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  id_Sondage       INT NOT NULL,
  id_UTILISATEUR   INT NULL,               -- si cible interne (annuaire)
  nom              VARCHAR(150) NULL,
  prenom           VARCHAR(150) NULL,
  email            VARCHAR(255) NULL,
  telephone        VARCHAR(50)  NULL,
  date_envoi_email DATETIME NULL,
  date_envoi_sms   DATETIME NULL,
  dateCreation     DATETIME NULL,
  CONSTRAINT fk_sd_cible_sondage FOREIGN KEY (id_Sondage)
    REFERENCES B_SD_SONDAGE(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================================
-- DONNEES DE REFERENCE DES MODULES
-- =====================================================================

-- Source: 03_calibrage.sql
/*
INSERT IGNORE INTO B_CATEGORIE_RESSOURCE (nom, est_robot, Etat, dateCreation) VALUES
  ('Conseiller', 0, 'ACTIF', NOW()),
  ('Backoffice', 0, 'ACTIF', NOW()),
  ('SVI',        1, 'ACTIF', NOW()),
  ('Chatbot',    1, 'ACTIF', NOW());
*/
-- Source: 07_quiz_phase3.sql
INSERT IGNORE INTO B_QZ_BADGE (code, nom, description, icone, condition_type, condition_valeur) VALUES
  ('PREMIER_REUSSI', 'Premier pas',      'Reussir votre premier quiz',       'military_tech', 'QUIZ_REUSSIS', 1),
  ('TROIS_REUSSIS',  'Sur la lancee',    'Reussir 3 quiz',                   'workspace_premium', 'QUIZ_REUSSIS', 3),
  ('CINQ_REUSSIS',   'Expert',           'Reussir 5 quiz',                   'emoji_events', 'QUIZ_REUSSIS', 5),
  ('SCORE_PARFAIT',  'Sans faute',       'Obtenir 100% a un quiz',           'grade', 'SCORE_PARFAIT', 100);

-- Source: 08_evaluation.sql
/*
INSERT INTO B_EV_CONTEXTE (libelle, Etat, dateCreation)
SELECT * FROM (
  SELECT 'A distance' AS libelle, 'ACTIF' AS Etat, NOW() AS dateCreation
  UNION ALL SELECT 'En simultane', 'ACTIF', NOW()
  UNION ALL SELECT 'Enregistrement', 'ACTIF', NOW()
) AS defauts
WHERE NOT EXISTS (SELECT 1 FROM B_EV_CONTEXTE);

-- Source: 10_evaluation_phase3.sql
INSERT IGNORE INTO B_EV_ACTION_TYPE (libelle, Etat, dateCreation) VALUES
  ('Formation / recyclage', 'ACTIF', NOW()),
  ('Coaching individuel', 'ACTIF', NOW()),
  ('Rappel de procedure', 'ACTIF', NOW()),
  ('Double ecoute', 'ACTIF', NOW()),
  ('Mise a jour de la base de connaissances', 'ACTIF', NOW());

*/


-- =====================================================================
-- MODULE ÉVALUATION QUALITÉ (cahier) — b_eval_* / b_evaluation*
-- =====================================================================
-- (Table b_eval_notification retirée : notifications unifiées dans B_NOTIFICATION — socle S6.)
USE QUALITUS;

-- 1. RÉFÉRENTIELS + PARAMÈTRE SYSTÈME
CREATE TABLE IF NOT EXISTS b_eval_ref_contexte (
  id INT AUTO_INCREMENT PRIMARY KEY, libelle VARCHAR(150) NOT NULL,
  description VARCHAR(255) DEFAULT NULL, ordre INT DEFAULT 0,
  etat VARCHAR(10) DEFAULT 'ACTIF', dateCreation DATETIME DEFAULT NULL, dateModification DATETIME DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS b_eval_ref_nature_ressource (
  id INT AUTO_INCREMENT PRIMARY KEY, libelle VARCHAR(100) NOT NULL,
  description VARCHAR(255) DEFAULT NULL, ordre INT DEFAULT 0,
  etat VARCHAR(10) DEFAULT 'ACTIF', dateCreation DATETIME DEFAULT NULL, dateModification DATETIME DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS b_eval_ref_type_evaluation (
  id INT AUTO_INCREMENT PRIMARY KEY, code VARCHAR(40) NOT NULL, libelle VARCHAR(100) NOT NULL,
  etat VARCHAR(10) DEFAULT 'ACTIF', dateCreation DATETIME DEFAULT NULL, UNIQUE(code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS b_eval_ref_action_pa (
  id INT AUTO_INCREMENT PRIMARY KEY, libelle VARCHAR(150) NOT NULL,
  description VARCHAR(255) DEFAULT NULL, ordre INT DEFAULT 0,
  etat VARCHAR(10) DEFAULT 'ACTIF', dateCreation DATETIME DEFAULT NULL, dateModification DATETIME DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS b_eval_ref_statut_pa (
  id INT AUTO_INCREMENT PRIMARY KEY, libelle VARCHAR(60) NOT NULL,
  description VARCHAR(255) DEFAULT NULL, ordre INT DEFAULT 0,
  etat VARCHAR(10) DEFAULT 'ACTIF', dateCreation DATETIME DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS b_eval_ref_kpi (
  id INT AUTO_INCREMENT PRIMARY KEY, libelle VARCHAR(150) NOT NULL,
  description VARCHAR(255) DEFAULT NULL, ordre INT DEFAULT 0,
  etat VARCHAR(10) DEFAULT 'ACTIF', dateCreation DATETIME DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS b_eval_param_systeme (
  id INT AUTO_INCREMENT PRIMARY KEY, cle VARCHAR(80) NOT NULL, valeur VARCHAR(255) NOT NULL,
  description VARCHAR(255) DEFAULT NULL, dateModification DATETIME DEFAULT NULL, UNIQUE(cle)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. PARAMÉTRAGE GRILLE (F.37bis)
CREATE TABLE IF NOT EXISTS b_eval_grille (
  id INT AUTO_INCREMENT PRIMARY KEY, nom VARCHAR(150) NOT NULL,
  mode_ponderation VARCHAR(10) DEFAULT 'AUTO', type_ressource_cible VARCHAR(15) DEFAULT 'HUMAINE',
  statut VARCHAR(10) DEFAULT 'BROUILLON', etat VARCHAR(10) DEFAULT 'ACTIF',
  dateCreation DATETIME DEFAULT NULL, dateModification DATETIME DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Grille unique : rattachement utilisateur -> b_eval_grille (créée ci-dessus)
ALTER TABLE B_UTILISATEUR
  ADD CONSTRAINT fk_utilisateur_eval_grille FOREIGN KEY (id_EvalGrille) REFERENCES b_eval_grille(id);

CREATE TABLE IF NOT EXISTS b_eval_categorie_erreur (
  id INT AUTO_INCREMENT PRIMARY KEY, id_grille INT NOT NULL, libelle VARCHAR(200) NOT NULL,
  poids DECIMAL(12,6) DEFAULT 0, seuil_reussite DECIMAL(12,6) DEFAULT 0, comparateur VARCHAR(2) DEFAULT '>',
  critique TINYINT(1) DEFAULT 0, ordre INT DEFAULT 0, etat VARCHAR(10) DEFAULT 'ACTIF',
  dateCreation DATETIME DEFAULT NULL, dateModification DATETIME DEFAULT NULL,
  FOREIGN KEY (id_grille) REFERENCES b_eval_grille(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS b_eval_sous_categorie_erreur (
  id INT AUTO_INCREMENT PRIMARY KEY, id_categorie_erreur INT NOT NULL, libelle VARCHAR(200) NOT NULL,
  poids_calcule DECIMAL(12,6) DEFAULT 0, poids_saisi DECIMAL(12,6) DEFAULT NULL, etat VARCHAR(10) DEFAULT 'ACTIF',
  dateCreation DATETIME DEFAULT NULL, dateModification DATETIME DEFAULT NULL,
  FOREIGN KEY (id_categorie_erreur) REFERENCES b_eval_categorie_erreur(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS b_eval_erreur (
  id INT AUTO_INCREMENT PRIMARY KEY, id_sous_categorie_erreur INT NOT NULL, item VARCHAR(255) NOT NULL,
  sous_item VARCHAR(255) DEFAULT NULL, referentiel TEXT, poids_calcule DECIMAL(12,6) DEFAULT 0,
  poids_saisi DECIMAL(12,6) DEFAULT NULL, etat VARCHAR(10) DEFAULT 'ACTIF',
  dateCreation DATETIME DEFAULT NULL, dateModification DATETIME DEFAULT NULL,
  FOREIGN KEY (id_sous_categorie_erreur) REFERENCES b_eval_sous_categorie_erreur(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. ÉVALUATION (snapshot immuable) — F.37ter / 38bis / 38ter
CREATE TABLE IF NOT EXISTS b_evaluation (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type_ressource VARCHAR(15) NOT NULL, id_nature_ressource INT DEFAULT NULL,
  id_agent INT DEFAULT NULL, id_evaluateur INT NOT NULL, id_site INT DEFAULT NULL, id_programme INT DEFAULT NULL,
  id_grille_origine INT DEFAULT NULL, id_contexte INT DEFAULT NULL,
  identifiant_appel VARCHAR(100) DEFAULT NULL, numero_case VARCHAR(100) DEFAULT NULL, numero_appel VARCHAR(100) DEFAULT NULL,
  motif_appel TEXT, date_appel DATETIME DEFAULT NULL, dmt INT DEFAULT 0,
  id_type_evaluation INT DEFAULT NULL, id_evaluation_parente INT DEFAULT NULL, nb_supplementaires_attendues INT DEFAULT NULL,
  statut VARCHAR(30) DEFAULT 'NON_TERMINE', conclusion VARCHAR(10) DEFAULT NULL, resolution VARCHAR(3) DEFAULT NULL,
  statut_apres_evaluation VARCHAR(20) DEFAULT 'NON_VALIDER', -- NON_VALIDER | FELICITER | DEBRIEFER
  synthese TEXT, avis_agent TEXT, date_avis DATETIME DEFAULT NULL,
  date_creation DATETIME DEFAULT NULL, date_evaluation DATETIME DEFAULT NULL, actif TINYINT(1) DEFAULT 1,
  FOREIGN KEY (id_nature_ressource) REFERENCES b_eval_ref_nature_ressource(id),
  FOREIGN KEY (id_grille_origine) REFERENCES b_eval_grille(id),
  FOREIGN KEY (id_contexte) REFERENCES b_eval_ref_contexte(id),
  FOREIGN KEY (id_type_evaluation) REFERENCES b_eval_ref_type_evaluation(id),
  FOREIGN KEY (id_evaluation_parente) REFERENCES b_evaluation(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS b_evaluation_categorie (
  id INT AUTO_INCREMENT PRIMARY KEY, id_evaluation INT NOT NULL, libelle VARCHAR(200) NOT NULL,
  poids DECIMAL(12,6) DEFAULT 0, seuil_reussite DECIMAL(12,6) DEFAULT 0, comparateur VARCHAR(2) DEFAULT '>',
  critique TINYINT(1) DEFAULT 0, score_obtenu DECIMAL(12,6) DEFAULT 0, nb_erreurs_decochees INT DEFAULT 0,
  ordre INT DEFAULT 0, id_categorie_origine INT DEFAULT NULL,
  FOREIGN KEY (id_evaluation) REFERENCES b_evaluation(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS b_evaluation_erreur (
  id INT AUTO_INCREMENT PRIMARY KEY, id_evaluation INT NOT NULL, id_evaluation_categorie INT NOT NULL,
  item VARCHAR(255) NOT NULL, sous_item VARCHAR(255) DEFAULT NULL, referentiel TEXT,
  poids DECIMAL(12,6) DEFAULT 0, score_pct DECIMAL(12,6) DEFAULT 0, score_sur20 DECIMAL(12,6) DEFAULT 0,
  libelle_sous_categorie VARCHAR(200) DEFAULT NULL, poids_sous_categorie DECIMAL(12,6) DEFAULT 0,
  coche TINYINT(1) DEFAULT 1, commentaire TEXT, id_erreur_origine INT DEFAULT NULL, id_sous_categorie_origine INT DEFAULT NULL,
  FOREIGN KEY (id_evaluation) REFERENCES b_evaluation(id),
  FOREIGN KEY (id_evaluation_categorie) REFERENCES b_evaluation_categorie(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. BUSINESS INTELLIGENCE — 5 pourquoi par couple grille/site (F.39ter)
CREATE TABLE IF NOT EXISTS b_eval_bi_arborescence (
  id INT AUTO_INCREMENT PRIMARY KEY, id_grille INT NOT NULL, id_site INT NOT NULL,
  point_depart_libelle VARCHAR(200) NOT NULL, dateCreation DATETIME DEFAULT NULL,
  UNIQUE (id_grille, id_site),
  FOREIGN KEY (id_grille) REFERENCES b_eval_grille(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS b_eval_bi_option (
  id INT AUTO_INCREMENT PRIMARY KEY, id_arborescence INT NOT NULL, id_parent INT DEFAULT NULL,
  niveau INT NOT NULL, libelle VARCHAR(255) NOT NULL, etat VARCHAR(20) DEFAULT 'ACTIF',
  propose_par INT DEFAULT NULL, id_evaluation_origine INT DEFAULT NULL, valide_par INT DEFAULT NULL,
  motif_rejet TEXT, dateCreation DATETIME DEFAULT NULL, dateDecision DATETIME DEFAULT NULL,
  FOREIGN KEY (id_arborescence) REFERENCES b_eval_bi_arborescence(id),
  FOREIGN KEY (id_parent) REFERENCES b_eval_bi_option(id),
  FOREIGN KEY (id_evaluation_origine) REFERENCES b_evaluation(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS b_evaluation_bi (
  id INT AUTO_INCREMENT PRIMARY KEY, id_evaluation INT NOT NULL, niveau INT NOT NULL,
  id_option INT DEFAULT NULL, libelle VARCHAR(255) NOT NULL,
  FOREIGN KEY (id_evaluation) REFERENCES b_evaluation(id),
  FOREIGN KEY (id_option) REFERENCES b_eval_bi_option(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. COACHING — arborescence unique (F.39quinquies A)
CREATE TABLE IF NOT EXISTS b_eval_coaching (
  id INT AUTO_INCREMENT PRIMARY KEY, id_evaluation INT NOT NULL, id_superviseur INT NOT NULL,
  statut VARCHAR(30) DEFAULT 'NON_TERMINE', dateCreation DATETIME DEFAULT NULL, dateCloture DATETIME DEFAULT NULL,
  FOREIGN KEY (id_evaluation) REFERENCES b_evaluation(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS b_eval_coaching_option (
  id INT AUTO_INCREMENT PRIMARY KEY, id_parent INT DEFAULT NULL, niveau INT NOT NULL, libelle VARCHAR(255) NOT NULL,
  etat VARCHAR(20) DEFAULT 'ACTIF', propose_par INT DEFAULT NULL, id_coaching_origine INT DEFAULT NULL,
  valide_par INT DEFAULT NULL, motif_rejet TEXT, dateCreation DATETIME DEFAULT NULL, dateDecision DATETIME DEFAULT NULL,
  FOREIGN KEY (id_parent) REFERENCES b_eval_coaching_option(id),
  FOREIGN KEY (id_coaching_origine) REFERENCES b_eval_coaching(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS b_eval_coaching_niveau (
  id INT AUTO_INCREMENT PRIMARY KEY, id_coaching INT NOT NULL, niveau INT NOT NULL,
  id_option INT DEFAULT NULL, libelle VARCHAR(255) NOT NULL,
  FOREIGN KEY (id_coaching) REFERENCES b_eval_coaching(id),
  FOREIGN KEY (id_option) REFERENCES b_eval_coaching_option(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. PLAN D'ACTION (F.39quinquies B)
CREATE TABLE IF NOT EXISTS b_eval_plan_action_ligne (
  id INT AUTO_INCREMENT PRIMARY KEY, id_evaluation INT NOT NULL, id_action INT DEFAULT NULL, id_porteur INT DEFAULT NULL,
  date_debut DATETIME DEFAULT NULL, date_attendue DATETIME DEFAULT NULL, date_realisation DATETIME DEFAULT NULL,
  id_statut INT DEFAULT NULL, id_kpi INT DEFAULT NULL, commentaire TEXT,
  dateCreation DATETIME DEFAULT NULL, dateModification DATETIME DEFAULT NULL,
  FOREIGN KEY (id_evaluation) REFERENCES b_evaluation(id),
  FOREIGN KEY (id_action) REFERENCES b_eval_ref_action_pa(id),
  FOREIGN KEY (id_statut) REFERENCES b_eval_ref_statut_pa(id),
  FOREIGN KEY (id_kpi) REFERENCES b_eval_ref_kpi(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS b_eval_plan_action_contributeur (
  id INT AUTO_INCREMENT PRIMARY KEY, id_ligne INT NOT NULL, id_utilisateur INT NOT NULL,
  FOREIGN KEY (id_ligne) REFERENCES b_eval_plan_action_ligne(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. LETTRES + APPROBATION (F.39sexies)
CREATE TABLE IF NOT EXISTS b_eval_lettre_modele (
  id INT AUTO_INCREMENT PRIMARY KEY, type VARCHAR(20) NOT NULL, texte TEXT,
  dateModification DATETIME DEFAULT NULL, UNIQUE(type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS b_evaluation_avis_histo (
  id INT AUTO_INCREMENT PRIMARY KEY, id_evaluation INT NOT NULL, avis TEXT, dateSaisie DATETIME DEFAULT NULL,
  FOREIGN KEY (id_evaluation) REFERENCES b_evaluation(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. CONTRE-ÉVALUATION (F.42bis)
CREATE TABLE IF NOT EXISTS b_eval_contre_evaluation (
  id INT AUTO_INCREMENT PRIMARY KEY, id_evaluation_initiale INT NOT NULL, id_responsable INT NOT NULL,
  statut VARCHAR(30) DEFAULT 'NON_TERMINE', resolution VARCHAR(3) DEFAULT NULL, synthese TEXT, conclusion VARCHAR(10) DEFAULT NULL,
  date_visibilite DATETIME DEFAULT NULL, date_creation DATETIME DEFAULT NULL, date_evaluation DATETIME DEFAULT NULL, actif TINYINT(1) DEFAULT 1,
  UNIQUE (id_evaluation_initiale),
  FOREIGN KEY (id_evaluation_initiale) REFERENCES b_evaluation(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS b_eval_contre_categorie (
  id INT AUTO_INCREMENT PRIMARY KEY, id_contre_evaluation INT NOT NULL, libelle VARCHAR(200) NOT NULL,
  poids DECIMAL(12,6) DEFAULT 0, seuil_reussite DECIMAL(12,6) DEFAULT 0, comparateur VARCHAR(2) DEFAULT '>',
  critique TINYINT(1) DEFAULT 0, score_obtenu DECIMAL(12,6) DEFAULT 0, nb_erreurs_decochees INT DEFAULT 0,
  ordre INT DEFAULT 0, id_categorie_origine INT DEFAULT NULL,
  FOREIGN KEY (id_contre_evaluation) REFERENCES b_eval_contre_evaluation(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS b_eval_contre_erreur (
  id INT AUTO_INCREMENT PRIMARY KEY, id_contre_evaluation INT NOT NULL, id_contre_categorie INT NOT NULL,
  item VARCHAR(255) NOT NULL, sous_item VARCHAR(255) DEFAULT NULL, referentiel TEXT,
  poids DECIMAL(12,6) DEFAULT 0, score_pct DECIMAL(12,6) DEFAULT 0, score_sur20 DECIMAL(12,6) DEFAULT 0,
  libelle_sous_categorie VARCHAR(200) DEFAULT NULL, poids_sous_categorie DECIMAL(12,6) DEFAULT 0,
  coche TINYINT(1) DEFAULT 1, commentaire TEXT, id_erreur_origine INT DEFAULT NULL, id_sous_categorie_origine INT DEFAULT NULL,
  FOREIGN KEY (id_contre_evaluation) REFERENCES b_eval_contre_evaluation(id),
  FOREIGN KEY (id_contre_categorie) REFERENCES b_eval_contre_categorie(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS b_eval_contre_bi (
  id INT AUTO_INCREMENT PRIMARY KEY, id_contre_evaluation INT NOT NULL, niveau INT NOT NULL, libelle VARCHAR(255) NOT NULL,
  FOREIGN KEY (id_contre_evaluation) REFERENCES b_eval_contre_evaluation(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. CALENDRIER & POLITIQUE DE FERMETURE (F.38quater)
CREATE TABLE IF NOT EXISTS b_eval_calendrier_mois (
  id INT AUTO_INCREMENT PRIMARY KEY, id_site INT NOT NULL, mois INT NOT NULL, libelle VARCHAR(20) DEFAULT NULL,
  annee INT NOT NULL, etat VARCHAR(10) DEFAULT 'FERME', dateModification DATETIME DEFAULT NULL,
  UNIQUE (id_site, mois, annee)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS b_eval_politique_fermeture (
  id INT AUTO_INCREMENT PRIMARY KEY, id_site INT NOT NULL, politique VARCHAR(30) DEFAULT 'MOIS_COURANT',
  dateModification DATETIME DEFAULT NULL, UNIQUE (id_site)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 11. DONNÉES DE RÉFÉRENCE INITIALES
INSERT INTO b_eval_ref_type_evaluation (code, libelle, etat, dateCreation) VALUES
  ('EVALUATION', 'Évaluation', 'ACTIF', NOW()),
  ('EVALUATION_SUPPLEMENTAIRE', 'Évaluation supplémentaire', 'ACTIF', NOW());

INSERT INTO b_eval_ref_nature_ressource (libelle, etat, dateCreation) VALUES
  ('SVI', 'ACTIF', NOW()), ('Chat bot', 'ACTIF', NOW());

INSERT INTO b_eval_ref_contexte (libelle, etat, dateCreation) VALUES
  ('Appel entrant', 'ACTIF', NOW()), ('Appel sortant', 'ACTIF', NOW()), ('Back office', 'ACTIF', NOW());

INSERT INTO b_eval_ref_statut_pa (libelle, etat, dateCreation) VALUES
  ('À faire', 'ACTIF', NOW()), ('En cours', 'ACTIF', NOW()), ('Réalisé', 'ACTIF', NOW());

INSERT INTO b_eval_param_systeme (cle, valeur, description, dateModification) VALUES
  ('nb_supplementaires_attendues', '2', 'Nombre d''évaluations supplémentaires attendues après un échec (F.39quater)', NOW());

INSERT INTO b_eval_lettre_modele (type, texte, dateModification) VALUES
  ('FELICITATION', 'Bonjour {{prenom}} {{nom}},\n\nNous vous félicitons pour votre évaluation du {{date_evaluation}} (contexte : {{contexte}}).\n\n{{scores}}\n\n{{synthese}}', NOW()),
  ('DEBRIEFING', 'Bonjour {{prenom}} {{nom}},\n\nSuite à votre évaluation du {{date_evaluation}} (contexte : {{contexte}}), voici les éléments de débriefing.\n\n{{scores}}\n\n{{constats}}\n\n{{synthese}}', NOW());


-- =====================================================================
-- SOCLE S5 — MATRICE DES DROITS (habilitations)
-- =====================================================================
-- =====================================================================
-- Socle commun S5 — Matrice des droits (habilitations)
-- Trajectoire Annexe A : additif, non destructif. Contrôle serveur
-- d'abord en OBSERVATION (aucun refus), activation ultérieure.
--
-- Modèle : rôle = ensemble de permissions (module + action).
--   - b_permission            : référentiel des permissions (module/action)
--   - b_role                  : rôles (codes REPRIS de b_fonction, immuables)
--   - b_role_permission       : matrice rôle <-> permission
--   - b_utilisateur_permission: droits complémentaires (par utilisateur)
--   - b_habilitation_observation : journal des accès qui SERAIENT refusés
--
-- Tables InnoDB. Pas de FK vers les tables socle MyISAM (b_utilisateur,
-- b_fonction) : on garde des colonnes INT simples, cohérence applicative.
-- =====================================================================

CREATE TABLE IF NOT EXISTS b_permission (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  module       VARCHAR(60)  NOT NULL,
  action       VARCHAR(60)  NOT NULL,
  code         VARCHAR(120) NOT NULL,
  libelle      VARCHAR(255) NOT NULL,
  description  VARCHAR(500) NULL,
  etat         VARCHAR(20)  NOT NULL DEFAULT 'ACTIF',
  dateCreation DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_permission_code (code),
  UNIQUE KEY uq_permission_mod_act (module, action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS b_role (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  code         VARCHAR(60)  NOT NULL,        -- REPRIS de b_fonction.Role_Associe, immuable
  libelle      VARCHAR(255) NOT NULL,
  description  VARCHAR(500) NULL,
  etat         VARCHAR(20)  NOT NULL DEFAULT 'ACTIF',
  dateCreation DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_role_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS b_role_permission (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  id_role       INT NOT NULL,
  id_permission INT NOT NULL,
  dateCreation  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_role_perm (id_role, id_permission),
  KEY k_rp_role (id_role),
  KEY k_rp_perm (id_permission),
  CONSTRAINT fk_rp_role FOREIGN KEY (id_role) REFERENCES b_role(id) ON DELETE CASCADE,
  CONSTRAINT fk_rp_perm FOREIGN KEY (id_permission) REFERENCES b_permission(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS b_utilisateur_permission (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  id_utilisateur INT NOT NULL,               -- b_utilisateur.id (pas de FK MyISAM)
  id_permission  INT NOT NULL,
  sens           VARCHAR(10) NOT NULL DEFAULT 'GRANT', -- GRANT | DENY (droit complémentaire)
  attribue_par   INT NULL,
  dateCreation   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_perm (id_utilisateur, id_permission),
  KEY k_up_user (id_utilisateur),
  CONSTRAINT fk_up_perm FOREIGN KEY (id_permission) REFERENCES b_permission(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS b_habilitation_observation (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  id_utilisateur INT NULL,
  role_code      VARCHAR(60) NULL,
  permission     VARCHAR(120) NOT NULL,      -- code module.action requis
  methode        VARCHAR(10) NULL,
  chemin         VARCHAR(255) NULL,
  dateReception  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY k_obs_perm (permission),
  KEY k_obs_user (id_utilisateur)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Interrupteur global du mode de contrôle (OBSERVATION | ACTIF).
-- Réutilise b_eval_param_systeme si présent ; sinon table dédiée.
CREATE TABLE IF NOT EXISTS b_param_habilitation (
  cle    VARCHAR(80) PRIMARY KEY,
  valeur VARCHAR(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO b_param_habilitation (cle, valeur)
VALUES ('mode_controle', 'OBSERVATION')
ON DUPLICATE KEY UPDATE valeur = valeur;


-- =====================================================================
-- SOCLE S5 — SEED permissions / rôles / matrice
-- =====================================================================
-- Seed : permissions (referentiel module/action)
INSERT INTO b_permission (module,action,code,libelle) VALUES
  ('UTILISATEUR','LIRE','utilisateur.lire','Consulter — utilisateur'),
  ('UTILISATEUR','CREER','utilisateur.creer','Créer — utilisateur'),
  ('UTILISATEUR','MODIFIER','utilisateur.modifier','Modifier — utilisateur'),
  ('UTILISATEUR','SUPPRIMER','utilisateur.supprimer','Supprimer — utilisateur'),
  ('SITE','LIRE','site.lire','Consulter — site'),
  ('SITE','CREER','site.creer','Créer — site'),
  ('SITE','MODIFIER','site.modifier','Modifier — site'),
  ('SITE','SUPPRIMER','site.supprimer','Supprimer — site'),
  ('PROGRAMME','LIRE','programme.lire','Consulter — programme'),
  ('PROGRAMME','CREER','programme.creer','Créer — programme'),
  ('PROGRAMME','MODIFIER','programme.modifier','Modifier — programme'),
  ('PROGRAMME','SUPPRIMER','programme.supprimer','Supprimer — programme'),
  ('FONCTION','LIRE','fonction.lire','Consulter — fonction'),
  ('FONCTION','CREER','fonction.creer','Créer — fonction'),
  ('FONCTION','MODIFIER','fonction.modifier','Modifier — fonction'),
  ('FONCTION','SUPPRIMER','fonction.supprimer','Supprimer — fonction'),
  ('FICHE','LIRE','fiche.lire','Consulter — fiche'),
  ('FICHE','CREER','fiche.creer','Créer — fiche'),
  ('FICHE','MODIFIER','fiche.modifier','Modifier — fiche'),
  ('FICHE','SUPPRIMER','fiche.supprimer','Supprimer — fiche'),
  ('SONDAGE','LIRE','sondage.lire','Consulter — sondage'),
  ('SONDAGE','CREER','sondage.creer','Créer — sondage'),
  ('SONDAGE','MODIFIER','sondage.modifier','Modifier — sondage'),
  ('SONDAGE','SUPPRIMER','sondage.supprimer','Supprimer — sondage'),
  ('QUIZ','LIRE','quiz.lire','Consulter — quiz'),
  ('QUIZ','CREER','quiz.creer','Créer — quiz'),
  ('QUIZ','MODIFIER','quiz.modifier','Modifier — quiz'),
  ('QUIZ','SUPPRIMER','quiz.supprimer','Supprimer — quiz'),
  ('GRILLE','LIRE','grille.lire','Consulter — grille'),
  ('GRILLE','CREER','grille.creer','Créer — grille'),
  ('GRILLE','MODIFIER','grille.modifier','Modifier — grille'),
  ('GRILLE','SUPPRIMER','grille.supprimer','Supprimer — grille'),
  ('REFERENTIEL','LIRE','referentiel.lire','Consulter — referentiel'),
  ('REFERENTIEL','CREER','referentiel.creer','Créer — referentiel'),
  ('REFERENTIEL','MODIFIER','referentiel.modifier','Modifier — referentiel'),
  ('REFERENTIEL','SUPPRIMER','referentiel.supprimer','Supprimer — referentiel'),
  ('EVALUATION','LIRE','evaluation.lire','Consulter — evaluation'),
  ('EVALUATION','CREER','evaluation.creer','Créer — evaluation'),
  ('EVALUATION','EXECUTER','evaluation.executer','Exécuter — evaluation'),
  ('EVALUATION','VALIDER','evaluation.valider','Valider — evaluation'),
  ('EVALUATION','CONTRE_EVALUER','evaluation.contre_evaluer','Contre-évaluer — evaluation'),
  ('EVALUATION','SUPPRIMER','evaluation.supprimer','Supprimer — evaluation'),
  ('CONTRE_EVALUATION','LIRE','contre_evaluation.lire','Consulter — contre-évaluation'),
  ('CONTRE_EVALUATION','CREER','contre_evaluation.creer','Créer — contre-évaluation'),
  ('CONTRE_EVALUATION','DESACTIVER','contre_evaluation.desactiver','Désactiver — contre-évaluation'),
  ('CONTRE_EVALUATION','SUPPRIMER','contre_evaluation.supprimer','Supprimer — contre-évaluation'),
  ('CALIBRAGE','LIRE','calibrage.lire','Consulter — calibrage'),
  ('CALIBRAGE','ORGANISER','calibrage.organiser','Organiser — calibrage'),
  ('NOTIFICATION','LIRE','notification.lire','Consulter — notification'),
  ('HABILITATION','LIRE','habilitation.lire','Consulter — habilitation'),
  ('HABILITATION','GERER','habilitation.gerer','Gérer — habilitation'),
  ('REPORTING','LIRE','reporting.lire','Consulter — reporting');

-- Seed : roles (codes repris des fonctions, immuables)
INSERT INTO b_role (code,libelle,description) VALUES
  ('R_ADMI','Administrateur','Rôle repris de la fonction « Administrateur »'),
  ('R_GB','Gestionnaire Baseco','Rôle repris de la fonction « Gestionnaire Baseco »'),
  ('R_SUP','Superviseur','Rôle repris de la fonction « Superviseur »'),
  ('R_TC','Tele Conseiller','Rôle repris de la fonction « Tele Conseiller »'),
  ('R_AF','Agent Formateur','Rôle repris de la fonction « Agent Formateur »'),
  ('R_GE','Gestionnaire Exactitude','Rôle repris de la fonction « Gestionnaire Exactitude »'),
  ('R_RO','Responsable OpÃ©rationnel','Rôle repris de la fonction « Responsable OpÃ©rationnel »'),
  ('R_AQ','Agent QualitÃ©','Rôle repris de la fonction « Agent QualitÃ© »');

-- Seed : matrice role x permission (attribution complete — reprise fidele)
INSERT INTO b_role_permission (id_role,id_permission)
  SELECT r.id, p.id FROM b_role r CROSS JOIN b_permission p;


-- =====================================================================
-- MODULE CALIBRAGE — schéma (F.43 à F.47)
-- =====================================================================
USE QUALITUS;

-- =====================================================================
-- MODULE CALIBRAGE — Schéma (cahier Calibrage, F.43 à F.47)
-- Réutilise le domaine Évaluation : grilles Actives + snapshot d'indépendance
-- + présentation d'exécution (F.39bis). Pas de score, ni BI, ni suites.
-- Tables InnoDB. Pas de FK vers les tables socle MyISAM (b_utilisateur, b_site,
-- b_programme) : colonnes INT simples, intégrité applicative.
-- =====================================================================
-- Session de calibrage
CREATE TABLE IF NOT EXISTS b_cal_session (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(150) NOT NULL,
  description TEXT,
  date_calibrage DATE DEFAULT NULL,
  id_site INT DEFAULT NULL,
  id_grille INT DEFAULT NULL,
  type_ressource_cible VARCHAR(15) DEFAULT 'HUMAINE',
  nombre_transactions INT DEFAULT 0,
  duree_minutes INT DEFAULT 0,                 -- durée de participation (individuelle)
  statut VARCHAR(25) DEFAULT 'BROUILLON',      -- BROUILLON | OUVERTE | RESULTATS_EN_REVISION | CLOTUREE
  visibilite TINYINT(1) DEFAULT 0,             -- interrupteur d'accès des participants
  id_jauge INT DEFAULT NULL,                   -- organisateur = référence
  conclusions TEXT,                            -- conclusions de session (F.47 G)
  dateCreation DATETIME DEFAULT NULL,
  dateModification DATETIME DEFAULT NULL,
  dateOuverture DATETIME DEFAULT NULL,
  dateCloture DATETIME DEFAULT NULL,
  KEY k_cal_session_site (id_site),
  KEY k_cal_session_grille (id_grille)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Transactions (jeu commun imposé)
CREATE TABLE IF NOT EXISTS b_cal_transaction (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_session INT NOT NULL,
  identifiant_appel VARCHAR(100) NOT NULL,
  descriptif TEXT NOT NULL,                     -- descriptif du problème + synthèse de résolution
  numero_case VARCHAR(100) DEFAULT NULL,
  numero_appel VARCHAR(100) DEFAULT NULL,
  date_appel DATE DEFAULT NULL,
  motif_appel TEXT,
  ordre_passage INT NOT NULL DEFAULT 0,
  dateCreation DATETIME DEFAULT NULL,
  UNIQUE KEY uq_cal_tx (id_session, identifiant_appel),
  KEY k_cal_tx_session (id_session),
  CONSTRAINT fk_cal_tx_session FOREIGN KEY (id_session) REFERENCES b_cal_session(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Participants conviés
CREATE TABLE IF NOT EXISTS b_cal_participant (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_session INT NOT NULL,
  id_evaluateur INT NOT NULL,
  invite TINYINT(1) DEFAULT 0,
  date_invitation DATETIME DEFAULT NULL,
  date_debut_participation DATETIME DEFAULT NULL,  -- démarre le chrono
  statut_participation VARCHAR(20) DEFAULT 'NON_COMMENCEE', -- NON_COMMENCEE | EN_COURS | CLOSE
  date_cloture DATETIME DEFAULT NULL,
  dateCreation DATETIME DEFAULT NULL,
  UNIQUE KEY uq_cal_part (id_session, id_evaluateur),
  KEY k_cal_part_session (id_session),
  CONSTRAINT fk_cal_part_session FOREIGN KEY (id_session) REFERENCES b_cal_session(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Évaluation de transaction (constat d'un évaluateur sur une transaction).
-- est_reference=1 => constat du jauge (référence).
CREATE TABLE IF NOT EXISTS b_cal_evaluation (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_session INT NOT NULL,
  id_transaction INT NOT NULL,
  id_evaluateur INT NOT NULL,
  est_reference TINYINT(1) DEFAULT 0,
  etat VARCHAR(20) DEFAULT 'NON_COMMENCEE',    -- NON_COMMENCEE | EN_COURS | TERMINEE
  dateCreation DATETIME DEFAULT NULL,
  dateModification DATETIME DEFAULT NULL,
  UNIQUE KEY uq_cal_eval (id_transaction, id_evaluateur),
  KEY k_cal_eval_session (id_session),
  KEY k_cal_eval_tx (id_transaction),
  CONSTRAINT fk_cal_eval_session FOREIGN KEY (id_session) REFERENCES b_cal_session(id) ON DELETE CASCADE,
  CONSTRAINT fk_cal_eval_tx FOREIGN KEY (id_transaction) REFERENCES b_cal_transaction(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Snapshot des catégories de la grille, par évaluation de transaction
CREATE TABLE IF NOT EXISTS b_cal_evaluation_categorie (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_cal_evaluation INT NOT NULL,
  libelle VARCHAR(200) NOT NULL,
  poids DECIMAL(12,6) DEFAULT 0,
  seuil_reussite DECIMAL(12,6) DEFAULT 0,
  comparateur VARCHAR(2) DEFAULT '>=',
  critique TINYINT(1) DEFAULT 0,
  ordre INT DEFAULT 0,
  id_categorie_origine INT DEFAULT NULL,
  KEY k_cal_ec_eval (id_cal_evaluation),
  CONSTRAINT fk_cal_ec_eval FOREIGN KEY (id_cal_evaluation) REFERENCES b_cal_evaluation(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Snapshot des erreurs, par évaluation de transaction (état coché + commentaires + traçabilité)
CREATE TABLE IF NOT EXISTS b_cal_evaluation_erreur (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_cal_evaluation INT NOT NULL,
  id_cal_evaluation_categorie INT NOT NULL,
  item VARCHAR(255) NOT NULL,
  sous_item VARCHAR(255) DEFAULT NULL,
  referentiel TEXT,
  poids DECIMAL(12,6) DEFAULT 0,
  libelle_sous_categorie VARCHAR(200) DEFAULT NULL,
  poids_sous_categorie DECIMAL(12,6) DEFAULT 0,
  coche TINYINT(1) DEFAULT 1,                   -- état retenu (courant)
  coche_initial TINYINT(1) DEFAULT NULL,        -- état à la clôture des participations (traçabilité révision)
  commentaire TEXT,                             -- commentaire de l'évaluateur (constat)
  appreciation_jauge TEXT,                      -- F.47 14quater : appréciation du jauge (sur la référence)
  modifie_par INT DEFAULT NULL,                 -- auteur d'une correction en révision
  date_modif DATETIME DEFAULT NULL,
  id_erreur_origine INT DEFAULT NULL,           -- clé de confrontation participant<->référence
  id_sous_categorie_origine INT DEFAULT NULL,
  KEY k_cal_ee_eval (id_cal_evaluation),
  KEY k_cal_ee_cat (id_cal_evaluation_categorie),
  KEY k_cal_ee_origine (id_erreur_origine),
  CONSTRAINT fk_cal_ee_eval FOREIGN KEY (id_cal_evaluation) REFERENCES b_cal_evaluation(id) ON DELETE CASCADE,
  CONSTRAINT fk_cal_ee_cat FOREIGN KEY (id_cal_evaluation_categorie) REFERENCES b_cal_evaluation_categorie(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Traçabilité des réinitialisations de participation (F.46 H)
CREATE TABLE IF NOT EXISTS b_cal_reinitialisation (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_session INT NOT NULL,
  id_participant INT NOT NULL,
  id_auteur INT DEFAULT NULL,
  dateReinit DATETIME DEFAULT NULL,
  KEY k_cal_reinit_session (id_session)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- =====================================================================
-- MODULE CALIBRAGE — SEED permission (lire: tous rôles ; organiser: R_ADMI)
-- =====================================================================
INSERT INTO b_permission (module,action,code,libelle) VALUES
  ('CALIBRAGE','LIRE','calibrage.lire','Consulter le calibrage'),
  ('CALIBRAGE','ORGANISER','calibrage.organiser','Organiser un calibrage (jauge)');
INSERT INTO b_role_permission (id_role,id_permission)
  SELECT r.id, p.id FROM b_role r CROSS JOIN b_permission p WHERE p.code='calibrage.lire';
INSERT INTO b_role_permission (id_role,id_permission)
  SELECT r.id, p.id FROM b_role r CROSS JOIN b_permission p WHERE p.code='calibrage.organiser' AND r.code='R_ADMI';
