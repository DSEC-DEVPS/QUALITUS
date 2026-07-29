CREATE DATABASE IF NOT EXISTS QUALITUS;
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
INSERT INTO B_CATEGORIE (
    nom,
    Etat,
    dateCreationCategorie,
    dateModification
  )
VALUES (
    'Process & Procedures de traitement',
    'ACTIF',
    NOW(),
    NULL
  ),
  ('Offres et Services', 'ACTIF', NOW(), NULL),
  ('Nouvelles offres', 'ACTIF', NOW(), NULL),
  (
    'avis operation sur comptes client',
    'ACTIF',
    NOW(),
    NULL
  ),
  ('Autre Promo', 'ACTIF', NOW(), NULL),
  ('Promo recharge', 'ACTIF', NOW(), NULL),
  ('Argumentaire', 'ACTIF', NOW(), NULL),
  ('Autres infos', 'ACTIF', NOW(), NULL),
  ('Modules de formation', 'ACTIF', NOW(), NULL),
  ('Consignes de production', 'ACTIF', NOW(), NULL),
  (
    'FLYERS MODES OPERATOIRES ENVOYER CLIENTS',
    'ACTIF',
    NOW(),
    NULL
  ),
  ('MODE OPERATOIRE', 'ACTIF', NOW(), NULL),
  ('Lien et application', 'ACTIF', NOW(), NULL);
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
  INDEX idx_created_at (createdAt DESC)
);
-- Si vous devez ajouter la colonne isRead à une table existante
-- ALTER TABLE notifications ADD COLUMN isRead BOOLEAN DEFAULT false;
-- ALTER TABLE notifications ADD COLUMN readAt TIMESTAMP NULL;
-- Index pour optimiser les requêtes
-- CREATE INDEX idx_user_read ON notifications(userId, isRead);
-- CREATE INDEX idx_created_at ON notifications(createdAt DESC);
-- Exemple de requête pour obtenir le nombre de notifications non lues
-- SELECT COUNT(*) as unreadCount 
-- FROM notifications 
-- WHERE userId = ? AND isRead = false;
-- Exemple de requête pour obtenir les notifications récentes
-- SELECT n.*, u.nom 
-- FROM notifications n
-- INNER JOIN users u ON n.createdBy = u.id
-- WHERE n.userId = ?
-- ORDER BY n.createdAt DESC
-- LIMIT 50;
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
INSERT INTO B_SITE (nom, description, Etat, dateCreation)
VALUES (
    'Team Call Center',
    'Team call center est parténaire pour qui est chargé à la reception des appels de nos clients',
    'ACTIF',
    now()
  );
INSERT INTO B_FONCTION (
    nom,
    Role_Associe,
    Permissions_Associe,
    Etat,
    dateCreation
  )
VALUES (
    'Administrateur',
    'R_ADMI',
    'canAdd,canDelete,canEdit,canRead',
    'ACTIF',
    NOW()
  ),
  (
    'Gestionnaire Baseco',
    'R_GB',
    'canAdd,canDelete,canEdit,canRead',
    'ACTIF',
    NOW()
  ),
  (
    'Superviseur',
    'R_SUP',
    'canAdd,canDelete,canEdit,canRead',
    'ACTIF',
    NOW()
  ),
  (
    'Tele Conseiller',
    'R_TC',
    'canAdd,canDelete,canEdit,canRead',
    'ACTIF',
    NOW()
  ),
  (
    'Agent Formateur',
    'R_AF',
    'canAdd,canDelete,canEdit,canRead',
    'ACTIF',
    NOW()
  ),
  (
    'Gestionnaire Exactitude',
    'R_GE',
    'canAdd,canDelete,canEdit,canRead',
    'ACTIF',
    NOW()
  ),
  (
    'Responsable Opérationnel',
    'R_RO',
    'canAdd,canDelete,canEdit,canRead',
    'ACTIF',
    NOW()
  ),
  (
    'Agent Qualité',
    'R_AQ',
    'canAdd,canDelete,canEdit,canRead',
    'ACTIF',
    NOW()
  );
INSERT INTO B_PROGRAMME (nom, description, Etat, dateCreation)
VALUES (
    '7414',
    'Description du programme 7414',
    'ACTIF',
    NOW()
  );
INSERT INTO B_GRILLE (nom, Etat, dateCreation)
VALUES ('GRILLE EVALUATION RS', 'ACTIF', NOW());
INSERT INTO B_UTILISATEUR (
    nom,
    prenom,
    nom_utilisateur,
    genre,
    email,
    telephone,
    ville,
    adresse,
    password,
    default_password,
    id_Fonction,
    id_Site,
    id_Programme,
    id_Grille,
    status,
    dateCreation
  )
VALUES (
    'sidibe',
    'Diakalia',
    'sidibe',
    'homme',
    'diacksidibe500@gamil.com',
    73462937,
    'Bamako',
    '1 rue de la Paix',
    '$2b$10$T8/EB3/e8CQLus6oG849yesRz1nm23kCMX9yZtBHNjLVczg6ncxAu',
    '$2b$10$T8/EB3/e8CQLus6oG849yesRz1nm23kCMX9yZtBHNjLVczg6ncxAu',
    1,
    1,
    1,
    1,
    'ACTIF',
    NOW()
  );
INSERT INTO B_GRILLE (nom, Etat, dateCreation)
VALUES ('GRILLE EVALUATION SCGP', 'ACTIF', NOW()),
  ('GRILLE EVALUATION BO', 'ACTIF', NOW()),
  ('GRILLE EVALUATION RS', 'ACTIF', NOW()),
  ('GRILLE EVALUATION CC 7414', 'ACTIF', NOW()),
  ('GRILLE EVALUATION BO 7414', 'ACTIF', NOW()),
  ('GRILLE EVALUATION EMAIL', 'ACTIF', NOW()),
  ('GRILLE EVALUATION TO 7444', 'ACTIF', NOW()),
  ('GRILLE EVALUATION BO 7444', 'ACTIF', NOW()),
  ('GRILLE EVALUATION EMAIL 7444', 'ACTIF', NOW()),
  ('SONDAGE', 'ACTIF', NOW());
INSERT INTO B_SLA (
    source,
    type,
    delai,
    priorite,
    Etat,
    dateCreationSla
  )
VALUES (
    'Marketing',
    'Promo Recharge',
    15,
    'P1',
    'ACTIF',
    NOW()
  ),
  (
    'Marketing',
    'Autres Promos',
    60,
    'P3',
    'ACTIF',
    NOW()
  ),
  (
    'Marketing',
    'Lancement Offre',
    4320,
    'P5',
    'ACTIF',
    NOW()
  ),
  (
    'Process',
    'Mise à jours',
    1440,
    'P4',
    'ACTIF',
    NOW()
  ),
  (
    'Process',
    'Nouvelle Procédure',
    1440,
    'P4',
    'ACTIF',
    NOW()
  ),
  (
    'Opération Service CLient',
    'Avis Opération sur Comptes clients',
    1440,
    'P6',
    'ACTIF',
    NOW()
  ),
  (
    'Opération Service Client',
    'incident réseau',
    15,
    'P1',
    'ACTIF',
    NOW()
  );
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
/**
 MLD DE LA PARTIE EVALUATIONS
 */
CREATE TABLE IF NOT EXISTS EVALUATIONS (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  contexte VARCHAR(255),
  identifiant_appel VARCHAR(255),
  numero_case VARCHAR(255),
  numero_appel VARCHAR(255),
  date_appel DATETIME,
  date_evaluations DATETIME,
  date_creation DATETIME,
  dmt VARCHAR(255),
  motif_appel VARCHAR(255),
  programme VARCHAR(255),
  site VARCHAR(255),
  synthese TEXT,
  avis_agents TEXT,
  conclusion VARCHAR(255),
  statut VARCHAR(255),
  resolution VARCHAR(255),
  pourquoi1 VARCHAR(255),
  pourquoi2 VARCHAR(255),
  pourquoi3 VARCHAR(255),
  pourquoi4 VARCHAR(255),
  type_evaluation VARCHAR(255),
  id_Evaluateur INT,
  id_Evaluations INT UNSIGNED NULL,
  id_Grille INT,
  id_Agent INT,
  FOREIGN KEY(id_Evaluateur) REFERENCES B_UTILISATEUR(id),
  FOREIGN KEY(id_Evaluations) REFERENCES EVALUATIONS(id),
  FOREIGN KEY(id_Agent) REFERENCES B_UTILISATEUR(id),
  FOREIGN KEY(id_Grille) REFERENCES B_GRILLE(id)
);
CREATE TABLE IF NOT EXISTS CATEGORIES_ERREURS (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  titre VARCHAR(255),
  poids DECIMAL(30, 12),
  nom_Grille VARCHAR(255),
  seuil DECIMAL(4, 2),
  id_Grille INT,
  FOREIGN KEY(id_Grille) REFERENCES B_GRILLE(id)
);
CREATE TABLE IF NOT EXISTS SOUS_CATEGORIES_ERREURS (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  titre VARCHAR(255),
  poids DECIMAL(30, 12),
  id_Categories_Erreurs INT UNSIGNED,
  FOREIGN KEY(id_Categories_Erreurs) REFERENCES CATEGORIES_ERREURS(id)
);
CREATE TABLE IF NOT EXISTS ERREURS (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_Categories_Erreurs INT,
  id_Sous_Categories_Erreurs INT UNSIGNED,
  id_Grille INT,
  items TEXT NOT NULL,
  sous_items TEXT NOT NULL,
  referentiels TEXT NOT NULL,
  poids_items DECIMAL(30, 12),
  score_en_pourcent DECIMAL(30, 12),
  score_sur_vingt DECIMAL(30, 12),
  FOREIGN KEY(id_Sous_Categories_Erreurs) REFERENCES SOUS_CATEGORIES_ERREURS(id)
);
CREATE INDEX idx_erreurs_souscat ON ERREURS(id_Sous_Categories_Erreurs);
CREATE INDEX idx_erreurs_cat ON ERREURS(id_Categories_Erreurs);
CREATE TABLE IF NOT EXISTS EVALUATIONS_RESULTATS (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_Categories_Erreurs INT,
  id_Sous_Categories_Erreurs INT,
  items TEXT NOT NULL,
  sous_items TEXT NOT NULL,
  referentiels TEXT NOT NULL,
  poids_items DECIMAL(30, 12),
  score_en_pourcent DECIMAL(30, 12),
  score_sur_vingt DECIMAL(30, 12),
  commentaire TEXT,
  etat TINYINT(1),
  id_Evaluations INT UNSIGNED,
  FOREIGN KEY(id_Evaluations) REFERENCES EVALUATIONS(id)
);
CREATE INDEX idx_eval_cat_etat ON EVALUATIONS_RESULTATS(id_Evaluations, id_Categories_Erreurs, etat);
CREATE TABLE IF NOT EXISTS SCORES (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  score DECIMAL(30, 12),
  nombre TINYINT UNSIGNED,
  id_Categories_Erreurs INT UNSIGNED,
  categorie_erreur VARCHAR(255),
  id_Evaluations INT UNSIGNED,
  FOREIGN KEY(id_Evaluations) REFERENCES EVALUATIONS(id)
);
CREATE INDEX idx_scores_eval_cat ON SCORES(id_Evaluations, id_Categories_Erreurs);
-- CREATE TABLE IF NOT EXISTS SUPPLEMENTAIRES (
--   id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
--   contexte VARCHAR(255),
--   identifiant_appel VARCHAR(255),
--   numero_case VARCHAR(255),
--   numero_appel VARCHAR(255),
--   date_appel DATETIME,
--   date_evaluations DATETIME,
--   date_creation DATETIME,
--   dmt VARCHAR(255),
--   motif_appel VARCHAR(255),
--   programme VARCHAR(255),
--   site VARCHAR(255),
--   synthese TEXT,
--   avis_agents TEXT,
--   conclusion VARCHAR(255),
--   statut VARCHAR(255),
--   resolution VARCHAR(255),
--   pourquoi1 VARCHAR(255),
--   pourquoi2 VARCHAR(255),
--   pourquoi3 VARCHAR(255),
--   pourquoi4 VARCHAR(255),
--   type VARCHAR(255),
--   id_Evaluations INT UNSIGNED,
--   id_Evaluateur INT,
--   id_Grille INT,
--   id_Agent INT,
--   FOREIGN KEY(id_Evaluations) REFERENCES EVALUATIONS(id),
--   FOREIGN KEY(id_Evaluateur) REFERENCES B_UTILISATEUR(id),
--   FOREIGN KEY(id_Agent) REFERENCES B_UTILISATEUR(id),
--   FOREIGN KEY(id_Grille) REFERENCES B_GRILLE(id)
-- );
-- CREATE TABLE IF NOT EXISTS SUPPLEMENTAIRES_RESULTATS (
--   id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
--   id_Categories_Erreurs INT,
--   id_Sous_Categories_Erreurs INT,
--   items TEXT NOT NULL,
--   sous_items TEXT NOT NULL,
--   referentiels TEXT NOT NULL,
--   poids_items DECIMAL(30, 12),
--   score_en_pourcent DECIMAL(30, 12),
--   score_sur_vingt DECIMAL(30, 12),
--   commentaire TEXT,
--   etat TINYINT(1),
--   id_Supplementaires INT UNSIGNED,
--   FOREIGN KEY(id_Supplementaires) REFERENCES SUPPLEMENTAIRES(id)
-- );
-- CREATE TABLE IF NOT EXISTS SCORES_SUPPLEMENTAIRES (
--   id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
--   score DECIMAL(30, 12),
--   nombre TINYINT UNSIGNED,
--   id_Categories_Erreurs INT UNSIGNED,
--   categorie_erreur VARCHAR(255),
--   id_Supplementaires INT UNSIGNED,
--   FOREIGN KEY(id_Supplementaires) REFERENCES SUPPLEMENTAIRES(id)
-- );
CREATE TABLE IF NOT EXISTS CALENDARS (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  numero INT,
  mois VARCHAR(255),
  annee VARCHAR(255),
  etat TINYINT(1),
  id_Site INT,
  UNIQUE KEY uq_calendar (id_Site, numero, annee),
  FOREIGN KEY(id_Site) REFERENCES B_SITE(id)
);
CREATE INDEX idx_calandar_site ON CALENDARS(id_Site, numero, annee, etat);
CREATE TABLE IF NOT EXISTS CALENDARS_POLICIES (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  mois_courant_et_posterieurs TINYINT(1),
  mois_courant TINYINT(1),
  tous_les_mois TINYINT(1),
  date_creation DATETIME,
  id_Site INT,
  UNIQUE KEY uq_calendar_policie (id_Site),
  CONSTRAINT chk_one_policy CHECK (
    (
      mois_courant_et_posterieurs + mois_courant + tous_les_mois
    ) = 1
  ),
  CONSTRAINT fk_calendar_policy_site FOREIGN KEY (id_Site) REFERENCES B_SITE(id)
);
CREATE INDEX idx_calandar_policie ON CALENDARS_POLICIES(
  id_Site,
  mois_courant_et_posterieurs,
  mois_courant,
  tous_les_mois
);
CREATE TABLE IF NOT EXISTS BUSINESS_INTELLIGENCE (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(255),
  nom_Site VARCHAR(255),
  id_Site INT,
  id_Grille INT,
  FOREIGN KEY(id_Site) REFERENCES B_SITE(id),
  FOREIGN KEY(id_Grille) REFERENCES B_GRILLE(id)
);
CREATE TABLE IF NOT EXISTS BI_1 (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_Business_Intelligence INT UNSIGNED,
  options VARCHAR(255),
  FOREIGN KEY(id_Business_Intelligence) REFERENCES BUSINESS_INTELLIGENCE(id)
);
CREATE TABLE IF NOT EXISTS BI_2 (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_BI_1 INT UNSIGNED,
  options VARCHAR(255),
  FOREIGN KEY(id_BI_1) REFERENCES BI_1(id)
);
CREATE TABLE IF NOT EXISTS BI_3 (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_BI_2 INT UNSIGNED,
  options VARCHAR(255),
  FOREIGN KEY(id_BI_2) REFERENCES BI_2(id)
);
CREATE TABLE IF NOT EXISTS BI_4 (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_BI_3 INT UNSIGNED,
  options VARCHAR(255),
  FOREIGN KEY(id_BI_3) REFERENCES BI_3(id)
);