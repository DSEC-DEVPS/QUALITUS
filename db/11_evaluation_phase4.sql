-- =====================================================================
-- Module Evaluation - Phase 4 : contre-evaluations
--  - Lien evaluation -> evaluateur (referentiel) pour la navigation par site
--  - B_EV_CONTRE_EVALUATION : contre-evaluation liee a une evaluation initiale
--  - B_EV_CONTRE_RESULTAT   : conformite (nouvelle) par sous-item
-- Tables InnoDB. FK cascade sur la contre-evaluation / l'evaluation.
-- =====================================================================
USE QUALITUS;

-- Attribue une evaluation a un evaluateur du referentiel (nullable).
-- (Ajout idempotent : ignorer l'erreur "Duplicate column" si rejoue.)
ALTER TABLE B_EV_EVALUATION ADD COLUMN id_Evaluateur INT NULL AFTER id_createur;

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

CREATE TABLE IF NOT EXISTS B_EV_CONTRE_RESULTAT (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_ContreEvaluation INT NOT NULL,
  id_SousItem INT NOT NULL,
  conforme TINYINT(1) DEFAULT 1,
  FOREIGN KEY (id_ContreEvaluation) REFERENCES B_EV_CONTRE_EVALUATION(id) ON DELETE CASCADE
) ENGINE=InnoDB;
