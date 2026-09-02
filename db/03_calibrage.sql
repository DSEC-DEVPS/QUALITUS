-- =====================================================================
-- Calibrage : modele de grille d'evaluation hierarchique (4 niveaux)
-- Phase 1 : modele + categories d'erreur > erreurs > items > sous-items
--           + categories de ressources evaluees et leur association
-- =====================================================================
USE QUALITUS;

-- IMPORTANT : moteur InnoDB explicite. Le serveur cree par defaut en MyISAM,
-- qui ignore les cles etrangeres et les ON DELETE CASCADE. InnoDB est requis
-- pour que la suppression d'un modele supprime tout son arbre.

-- Modele de grille d'evaluation (en-tete)
CREATE TABLE IF NOT EXISTS B_MODELE_GRILLE (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(150) NOT NULL,
  description TEXT,
  Etat VARCHAR(50) DEFAULT 'ACTIF',
  dateCreation DATETIME,
  dateModification DATETIME
) ENGINE=InnoDB;

-- Niveau 1 : Categorie d'erreur (ex: ERREURS CHARTE RELATION CLIENT EFFICACE ORANGE)
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

-- Niveau 2 : Erreur (ex: ACCUEIL, COMPRENDRE ...)
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

-- Niveau 3 : Item (ex: Salutation, double Presentation et mot de bienvenue)
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

-- Niveau 4 : Sous-Item (+ Referentiel)
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

-- Categories de ressources evaluees (Conseiller, Backoffice, SVI, Chatbot...)
CREATE TABLE IF NOT EXISTS B_CATEGORIE_RESSOURCE (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(100) NOT NULL,
  est_robot TINYINT(1) DEFAULT 0,
  Etat VARCHAR(50) DEFAULT 'ACTIF',
  dateCreation DATETIME,
  UNIQUE (nom)
) ENGINE=InnoDB;

-- Association n..n : un modele de grille <-> plusieurs categories de ressources
CREATE TABLE IF NOT EXISTS B_MG_CATEGORIE_RESSOURCE (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_ModeleGrille INT NOT NULL,
  id_CategorieRessource INT NOT NULL,
  dateCreation DATETIME,
  FOREIGN KEY (id_ModeleGrille) REFERENCES B_MODELE_GRILLE(id) ON DELETE CASCADE,
  FOREIGN KEY (id_CategorieRessource) REFERENCES B_CATEGORIE_RESSOURCE(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Seed des categories de ressources (idempotent grace a UNIQUE(nom) + INSERT IGNORE)
INSERT IGNORE INTO B_CATEGORIE_RESSOURCE (nom, est_robot, Etat, dateCreation) VALUES
  ('Conseiller', 0, 'ACTIF', NOW()),
  ('Backoffice', 0, 'ACTIF', NOW()),
  ('SVI',        1, 'ACTIF', NOW()),
  ('Chatbot',    1, 'ACTIF', NOW());
