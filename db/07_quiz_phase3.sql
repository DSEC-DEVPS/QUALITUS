-- =====================================================================
-- Quiz - Phase 3 : notifications "nouveaux quiz", badges, (rapports = requetes)
--  B_QZ_NOTIFICATION       : notif dediee quiz (section "Nouveautes"),
--                            independante du bandeau notifications legacy.
--  B_QZ_BADGE              : catalogue de badges/recompenses
--  B_QZ_BADGE_UTILISATEUR  : badges obtenus par utilisateur
-- Tables InnoDB. FK cascade sur le quiz / le badge.
-- =====================================================================
USE QUALITUS;

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

CREATE TABLE IF NOT EXISTS B_QZ_BADGE_UTILISATEUR (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_Badge INT NOT NULL,
  id_UTILISATEUR INT NOT NULL,
  dateObtention DATETIME,
  UNIQUE (id_Badge, id_UTILISATEUR),
  FOREIGN KEY (id_Badge) REFERENCES B_QZ_BADGE(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Catalogue de badges par defaut (idempotent via UNIQUE(code) + INSERT IGNORE)
INSERT IGNORE INTO B_QZ_BADGE (code, nom, description, icone, condition_type, condition_valeur) VALUES
  ('PREMIER_REUSSI', 'Premier pas',      'Reussir votre premier quiz',       'military_tech', 'QUIZ_REUSSIS', 1),
  ('TROIS_REUSSIS',  'Sur la lancee',    'Reussir 3 quiz',                   'workspace_premium', 'QUIZ_REUSSIS', 3),
  ('CINQ_REUSSIS',   'Expert',           'Reussir 5 quiz',                   'emoji_events', 'QUIZ_REUSSIS', 5),
  ('SCORE_PARFAIT',  'Sans faute',       'Obtenir 100% a un quiz',           'grade', 'SCORE_PARFAIT', 100);
