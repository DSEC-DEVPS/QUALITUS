-- =====================================================================
-- Module Evaluation - Phase 3 : suivi & coaching
--  B_EV_NOTIFICATION : notif in-app du resultat (evaluateur + superviseurs)
--  B_EV_COACHING     : cause racine + 5 pourquoi (evaluation en echec)
--  B_EV_ACTION_TYPE  : liste de valeurs parametrable pour les actions
--  B_EV_ACTION       : plan d'action correctif (plusieurs lignes / evaluation)
-- Tables InnoDB. FK cascade sur l'evaluation / le type d'action.
-- =====================================================================
USE QUALITUS;

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

CREATE TABLE IF NOT EXISTS B_EV_ACTION_TYPE (
  id INT AUTO_INCREMENT PRIMARY KEY,
  libelle VARCHAR(150) NOT NULL,
  Etat VARCHAR(50) DEFAULT 'ACTIF',
  dateCreation DATETIME,
  UNIQUE (libelle)
) ENGINE=InnoDB;

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

-- Types d'action par defaut (idempotent)
INSERT IGNORE INTO B_EV_ACTION_TYPE (libelle, Etat, dateCreation) VALUES
  ('Formation / recyclage', 'ACTIF', NOW()),
  ('Coaching individuel', 'ACTIF', NOW()),
  ('Rappel de procedure', 'ACTIF', NOW()),
  ('Double ecoute', 'ACTIF', NOW()),
  ('Mise a jour de la base de connaissances', 'ACTIF', NOW());
