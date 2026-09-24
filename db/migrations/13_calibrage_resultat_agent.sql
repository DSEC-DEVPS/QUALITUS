-- Calibrage : publication du résultat non figeante (resultat_publie) + agent
-- sur les transactions. À exécuter sur une base déjà initialisée.
USE QUALITUS;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='b_cal_session' AND COLUMN_NAME='resultat_publie');
SET @sql = IF(@c=0, 'ALTER TABLE b_cal_session ADD COLUMN resultat_publie TINYINT(1) DEFAULT 0 AFTER visibilite', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='b_cal_transaction' AND COLUMN_NAME='id_agent');
SET @sql = IF(@c=0, 'ALTER TABLE b_cal_transaction ADD COLUMN id_agent INT DEFAULT NULL AFTER numero_appel', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Les sessions déjà clôturées sont considérées comme publiées (compat).
UPDATE b_cal_session SET resultat_publie=1 WHERE statut='CLOTUREE';
