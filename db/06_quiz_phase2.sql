-- =====================================================================
-- Quiz - Phase 2 : participation, scoring, retest, historique
--  B_QZ_TENTATIVE : une passation d'un quiz par un utilisateur
--  B_QZ_REPONSE   : le detail des reponses de cette tentative
-- Tables InnoDB. FK cascade sur le quiz (suppression quiz -> tentatives).
-- id_UTILISATEUR / id_Question / id_Option = simples INT (pas de FK MyISAM).
-- =====================================================================
USE QUALITUS;

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
  FOREIGN KEY (id_Quiz) REFERENCES B_QZ_QUIZ(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS B_QZ_REPONSE (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_Tentative INT NOT NULL,
  id_Question INT NOT NULL,
  id_Option INT NULL,               -- option choisie par l'utilisateur
  est_correcte TINYINT(1) DEFAULT 0,
  FOREIGN KEY (id_Tentative) REFERENCES B_QZ_TENTATIVE(id) ON DELETE CASCADE
) ENGINE=InnoDB;
