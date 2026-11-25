-- out110 : SONDAGE — index pour le rapport (et les exports de réponses).
-- B_SD_REPONSE n'avait d'index que sur id_Passation : chaque statistique par question
-- ou par option parcourait toute la table. Rejouable sans effet de bord.
USE QUALITUS;

-- (id_Passation, id_Question, id_Option) : jointure depuis les passations du sondage, puis regroupement
SET @ix := (SELECT COUNT(*) FROM information_schema.STATISTICS
             WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME) = 'b_sd_reponse' AND INDEX_NAME = 'ix_sd_rep_pass_question');
SET @sql := IF(@ix = 0, 'CREATE INDEX ix_sd_rep_pass_question ON B_SD_REPONSE (id_Passation, id_Question, id_Option)', 'SELECT 1');
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

-- (id_Question, id_Option) : statistiques d'une question ou d'une option
SET @ix := (SELECT COUNT(*) FROM information_schema.STATISTICS
             WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME) = 'b_sd_reponse' AND INDEX_NAME = 'ix_sd_rep_question_option');
SET @sql := IF(@ix = 0, 'CREATE INDEX ix_sd_rep_question_option ON B_SD_REPONSE (id_Question, id_Option)', 'SELECT 1');
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

-- (id_Sondage, termine) : passations terminées d'un sondage
SET @ix := (SELECT COUNT(*) FROM information_schema.STATISTICS
             WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME) = 'b_sd_passation' AND INDEX_NAME = 'ix_sd_pass_sondage_termine');
SET @sql := IF(@ix = 0, 'CREATE INDEX ix_sd_pass_sondage_termine ON B_SD_PASSATION (id_Sondage, termine)', 'SELECT 1');
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;
