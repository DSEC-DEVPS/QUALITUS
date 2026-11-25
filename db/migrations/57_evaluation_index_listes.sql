-- out111 : ÉVALUATIONS — index pour les listes (visibilité et pagination côté serveur).
-- b_evaluation n'avait pas d'index sur l'évaluateur ni sur l'agent : chaque liste parcourait
-- toute la table. Rejouable sans effet de bord.
USE QUALITUS;

SET @ix := (SELECT COUNT(*) FROM information_schema.STATISTICS
             WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME) = 'b_evaluation' AND INDEX_NAME = 'ix_evaluation_evaluateur');
SET @sql := IF(@ix = 0, 'CREATE INDEX ix_evaluation_evaluateur ON b_evaluation (id_evaluateur, date_creation)', 'SELECT 1');
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

SET @ix := (SELECT COUNT(*) FROM information_schema.STATISTICS
             WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME) = 'b_evaluation' AND INDEX_NAME = 'ix_evaluation_agent');
SET @sql := IF(@ix = 0, 'CREATE INDEX ix_evaluation_agent ON b_evaluation (id_agent, statut)', 'SELECT 1');
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

SET @ix := (SELECT COUNT(*) FROM information_schema.STATISTICS
             WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME) = 'b_evaluation' AND INDEX_NAME = 'ix_evaluation_site_creation');
SET @sql := IF(@ix = 0, 'CREATE INDEX ix_evaluation_site_creation ON b_evaluation (id_site, date_creation)', 'SELECT 1');
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

SET @ix := (SELECT COUNT(*) FROM information_schema.STATISTICS
             WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME) = 'b_evaluation' AND INDEX_NAME = 'ix_evaluation_creation');
SET @sql := IF(@ix = 0, 'CREATE INDEX ix_evaluation_creation ON b_evaluation (date_creation)', 'SELECT 1');
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

SET @ix := (SELECT COUNT(*) FROM information_schema.STATISTICS
             WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME) = 'b_r_superviseur_agent' AND INDEX_NAME = 'ix_superviseur_agent');
SET @sql := IF(@ix = 0, 'CREATE INDEX ix_superviseur_agent ON b_r_superviseur_agent (id_SUPERVISEUR, id_AGENT)', 'SELECT 1');
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;
