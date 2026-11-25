-- out116 : points des questions de quiz décimaux (2 décimales).
-- Les valeurs existantes sont conservées (5 -> 5.00). Rejouable sans effet de bord :
-- chaque colonne n'est modifiée que si elle n'est pas déjà décimale.
USE QUALITUS;

SET @t := (SELECT DATA_TYPE FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME) = 'b_qz_question' AND COLUMN_NAME = 'points');
SET @sql := IF(@t <> 'decimal', 'ALTER TABLE B_QZ_QUESTION MODIFY points DECIMAL(5,2) NOT NULL DEFAULT 5', 'SELECT 1');
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

SET @t := (SELECT DATA_TYPE FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME) = 'b_qz_tentative' AND COLUMN_NAME = 'nb_points');
SET @sql := IF(@t <> 'decimal', 'ALTER TABLE B_QZ_TENTATIVE MODIFY nb_points DECIMAL(6,2) NULL', 'SELECT 1');
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

SET @t := (SELECT DATA_TYPE FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME) = 'b_qz_tentative' AND COLUMN_NAME = 'nb_points_total');
SET @sql := IF(@t <> 'decimal', 'ALTER TABLE B_QZ_TENTATIVE MODIFY nb_points_total DECIMAL(6,2) NULL', 'SELECT 1');
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;
