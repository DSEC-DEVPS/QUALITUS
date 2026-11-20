-- STATISTIQUES AGENT (cartes du tableau de bord agent / page « détail agent ») :
-- index (agent, date) pour les comptages du jour, (agent, lu) pour les
-- notifications non lues (cloche et cartes). Rejouable sans effet de bord.
USE QUALITUS;

SET @c := (SELECT COUNT(*) FROM information_schema.STATISTICS
            WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME) = 'b_historique' AND INDEX_NAME = 'ix_historique_utilisateur_date');
SET @s := IF(@c = 0, 'ALTER TABLE B_HISTORIQUE ADD INDEX ix_historique_utilisateur_date (id_UTILISATEUR, dateConsultation)', 'SELECT 1');
PREPARE q FROM @s; EXECUTE q; DEALLOCATE PREPARE q;

SET @c := (SELECT COUNT(*) FROM information_schema.STATISTICS
            WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME) = 'b_reponse_quiz' AND INDEX_NAME = 'ix_reponse_quiz_utilisateur_date');
SET @s := IF(@c = 0, 'ALTER TABLE B_REPONSE_QUIZ ADD INDEX ix_reponse_quiz_utilisateur_date (id_UTILISATEUR, date_Quiz)', 'SELECT 1');
PREPARE q FROM @s; EXECUTE q; DEALLOCATE PREPARE q;

SET @c := (SELECT COUNT(*) FROM information_schema.STATISTICS
            WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME) = 'b_sondage' AND INDEX_NAME = 'ix_sondage_utilisateur_date');
SET @s := IF(@c = 0, 'ALTER TABLE B_SONDAGE ADD INDEX ix_sondage_utilisateur_date (id_UTILISATEUR, dateSondage)', 'SELECT 1');
PREPARE q FROM @s; EXECUTE q; DEALLOCATE PREPARE q;

SET @c := (SELECT COUNT(*) FROM information_schema.STATISTICS
            WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME) = 'b_notification' AND INDEX_NAME = 'ix_notification_utilisateur_lu');
SET @s := IF(@c = 0, 'ALTER TABLE B_NOTIFICATION ADD INDEX ix_notification_utilisateur_lu (id_UTILISATEUR, lu)', 'SELECT 1');
PREPARE q FROM @s; EXECUTE q; DEALLOCATE PREPARE q;

SET @c := (SELECT COUNT(*) FROM information_schema.STATISTICS
            WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME) = 'b_qz_notification' AND INDEX_NAME = 'ix_qz_notification_utilisateur_lu');
SET @s := IF(@c = 0, 'ALTER TABLE B_QZ_NOTIFICATION ADD INDEX ix_qz_notification_utilisateur_lu (id_UTILISATEUR, lu)', 'SELECT 1');
PREPARE q FROM @s; EXECUTE q; DEALLOCATE PREPARE q;
