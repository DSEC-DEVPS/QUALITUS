-- =====================================================================
-- Quiz (nouveau modele structure) - Phase 1 : generateur
--  Quiz -> Questions (Vrai/Faux, extensible) -> Options (bonne reponse)
-- Coexiste avec le quiz legacy (B_QUIZ / B_REPONSE_QUIZ) qui reste intact.
-- Tables en InnoDB (cascades reelles). Pas de FK vers les tables legacy
-- MyISAM (B_FICHE, B_UTILISATEUR) : id_Fiche / id_createur = simples INT.
-- =====================================================================
USE QUALITUS;

-- Le quiz lui-meme
CREATE TABLE IF NOT EXISTS B_QZ_QUIZ (
  id INT AUTO_INCREMENT PRIMARY KEY,
  titre VARCHAR(200) NOT NULL,
  description TEXT,
  id_Fiche INT NULL,               -- contenu KB associe (pas de FK : B_FICHE est MyISAM)
  note_passage INT DEFAULT 70,     -- seuil de reussite en %
  retest_auto TINYINT(1) DEFAULT 1,
  nb_retest_max INT DEFAULT 1,
  Etat VARCHAR(50) DEFAULT 'ACTIF',
  id_createur INT NULL,
  dateCreation DATETIME,
  dateModification DATETIME
) ENGINE=InnoDB;

-- Une question d'un quiz
CREATE TABLE IF NOT EXISTS B_QZ_QUESTION (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_Quiz INT NOT NULL,
  type VARCHAR(20) DEFAULT 'VRAI_FAUX',   -- extensible : QCM, MULTIPLE...
  libelle TEXT NOT NULL,
  ordre INT DEFAULT 0,
  dateCreation DATETIME,
  FOREIGN KEY (id_Quiz) REFERENCES B_QZ_QUIZ(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Les options / choix d'une question (avec le drapeau bonne reponse)
CREATE TABLE IF NOT EXISTS B_QZ_OPTION (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_Question INT NOT NULL,
  libelle VARCHAR(255) NOT NULL,
  est_correcte TINYINT(1) DEFAULT 0,
  ordre INT DEFAULT 0,
  FOREIGN KEY (id_Question) REFERENCES B_QZ_QUESTION(id) ON DELETE CASCADE
) ENGINE=InnoDB;
