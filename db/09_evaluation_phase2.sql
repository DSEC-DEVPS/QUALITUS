-- =====================================================================
-- Module Evaluation - Phase 2 : creation + execution
--  B_EV_EVALUATION : en-tete d'une evaluation (contexte, agent, grille auto,
--                    champs d'appel, statut, resolution, conclusion)
--  B_EV_RESULTAT   : conformite par sous-item de la grille (conforme par defaut)
-- Tables InnoDB. FK cascade evaluation -> resultats. Pas de FK vers les
-- tables legacy MyISAM ni vers les tables Calibrage (colonnes INT simples).
-- =====================================================================
USE QUALITUS;

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
  date_creation DATETIME,
  date_execution DATETIME NULL,
  date_modification DATETIME
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS B_EV_RESULTAT (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_Evaluation INT NOT NULL,
  id_SousItem INT NOT NULL,
  conforme TINYINT(1) DEFAULT 1,
  commentaire TEXT,
  FOREIGN KEY (id_Evaluation) REFERENCES B_EV_EVALUATION(id) ON DELETE CASCADE
) ENGINE=InnoDB;
