-- out104 : ARBORESCENCES BI — archivage.
-- Une arborescence utilisée (une évaluation fait référence à l'une de ses options, ou une
-- proposition attend une décision) n'est pas supprimée mais archivée : elle n'est plus
-- proposée dans les évaluations en cours ou à venir ; les évaluations terminées gardent
-- leurs libellés. Elle peut être restaurée. Rejouable sans effet de bord.
USE QUALITUS;

SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS
              WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME) = 'b_eval_bi_arborescence' AND LOWER(COLUMN_NAME) = 'etat');
SET @sql := IF(@col = 0, 'ALTER TABLE b_eval_bi_arborescence ADD COLUMN etat VARCHAR(10) NOT NULL DEFAULT ''ACTIF''', 'SELECT 1');
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS
              WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME) = 'b_eval_bi_arborescence' AND LOWER(COLUMN_NAME) = 'datearchivage');
SET @sql := IF(@col = 0, 'ALTER TABLE b_eval_bi_arborescence ADD COLUMN dateArchivage DATETIME NULL', 'SELECT 1');
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS
              WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME) = 'b_eval_bi_arborescence' AND LOWER(COLUMN_NAME) = 'datemodification');
SET @sql := IF(@col = 0, 'ALTER TABLE b_eval_bi_arborescence ADD COLUMN dateModification DATETIME NULL', 'SELECT 1');
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;
