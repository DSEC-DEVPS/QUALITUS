-- =====================================================================
-- Module Evaluation - Phase 1 : fondations (donnees de reference)
--  B_EV_CONTEXTE   : liste de valeurs parametrable (contexte d'evaluation)
--  B_EV_EVALUATEUR : evaluateurs habilites (avec site)
--  B_EV_AGENT      : roster des agents a evaluer (login genesys + type)
-- Tables InnoDB. Pas de FK vers les tables legacy MyISAM (B_SITE,
-- B_UTILISATEUR) ni vers B_CATEGORIE_RESSOURCE : simples colonnes INT.
-- =====================================================================
USE QUALITUS;

CREATE TABLE IF NOT EXISTS B_EV_CONTEXTE (
  id INT AUTO_INCREMENT PRIMARY KEY,
  libelle VARCHAR(150) NOT NULL,
  Etat VARCHAR(50) DEFAULT 'ACTIF',
  dateCreation DATETIME,
  dateModification DATETIME
) ENGINE=InnoDB;

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

-- Quelques contextes par defaut (idempotent : on n'insere que si la table est vide)
INSERT INTO B_EV_CONTEXTE (libelle, Etat, dateCreation)
SELECT * FROM (
  SELECT 'A distance' AS libelle, 'ACTIF' AS Etat, NOW() AS dateCreation
  UNION ALL SELECT 'En simultane', 'ACTIF', NOW()
  UNION ALL SELECT 'Enregistrement', 'ACTIF', NOW()
) AS defauts
WHERE NOT EXISTS (SELECT 1 FROM B_EV_CONTEXTE);
