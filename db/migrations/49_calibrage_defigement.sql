-- CALIBRAGE : défigement d'un résultat par un administrateur.
--   statut_avant_figement / publie_avant_figement : état de la session juste
--   avant le figement, pour pouvoir y revenir exactement. Une session figée
--   avant cette migration (valeurs NULL) revient « en révision », non publiée.
--   b_cal_defigement : trace (qui, quand, pourquoi, état rétabli).
-- Rejouable sans effet de bord.
USE QUALITUS;

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'b_cal_session' AND COLUMN_NAME = 'statut_avant_figement');
SET @s := IF(@c = 0, 'ALTER TABLE b_cal_session ADD COLUMN statut_avant_figement VARCHAR(25) NULL AFTER statut', 'SELECT 1');
PREPARE q FROM @s; EXECUTE q; DEALLOCATE PREPARE q;

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'b_cal_session' AND COLUMN_NAME = 'publie_avant_figement');
SET @s := IF(@c = 0, 'ALTER TABLE b_cal_session ADD COLUMN publie_avant_figement TINYINT(1) NULL AFTER resultat_publie', 'SELECT 1');
PREPARE q FROM @s; EXECUTE q; DEALLOCATE PREPARE q;

CREATE TABLE IF NOT EXISTS b_cal_defigement (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_session INT NOT NULL,
  id_auteur INT DEFAULT NULL,
  motif VARCHAR(500) NOT NULL,
  statut_retabli VARCHAR(25) NOT NULL,
  dateFigement DATETIME DEFAULT NULL,
  dateDefigement DATETIME NOT NULL,
  KEY k_cal_defig_session (id_session)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
