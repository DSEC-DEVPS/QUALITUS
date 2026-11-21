-- TABLEAU DE BORD — performances : index utilisés par les calculs du tableau de bord
-- (premières lectures d'un chargement, évaluations et passages de quiz par date,
-- réponses aux sondages par destinataire). Rejouable sans effet de bord.
USE QUALITUS;

SET @c := (SELECT COUNT(*) FROM information_schema.STATISTICS
            WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME) = 'b_historique' AND INDEX_NAME = 'ix_historique_fiche_utilisateur');
SET @s := IF(@c = 0, 'ALTER TABLE B_HISTORIQUE ADD INDEX ix_historique_fiche_utilisateur (id_FICHE, id_UTILISATEUR, dateConsultation)', 'SELECT 1');
PREPARE q FROM @s; EXECUTE q; DEALLOCATE PREPARE q;

SET @c := (SELECT COUNT(*) FROM information_schema.STATISTICS
            WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME) = 'b_evaluation' AND INDEX_NAME = 'ix_evaluation_date_site');
SET @s := IF(@c = 0, 'ALTER TABLE b_evaluation ADD INDEX ix_evaluation_date_site (date_evaluation, id_site)', 'SELECT 1');
PREPARE q FROM @s; EXECUTE q; DEALLOCATE PREPARE q;

SET @c := (SELECT COUNT(*) FROM information_schema.STATISTICS
            WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME) = 'b_qz_tentative' AND INDEX_NAME = 'ix_qz_tentative_date_fin');
SET @s := IF(@c = 0, 'ALTER TABLE b_qz_tentative ADD INDEX ix_qz_tentative_date_fin (date_fin)', 'SELECT 1');
PREPARE q FROM @s; EXECUTE q; DEALLOCATE PREPARE q;

SET @c := (SELECT COUNT(*) FROM information_schema.STATISTICS
            WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME) = 'b_qz_tentative' AND INDEX_NAME = 'ix_qz_tentative_quiz_utilisateur');
SET @s := IF(@c = 0, 'ALTER TABLE b_qz_tentative ADD INDEX ix_qz_tentative_quiz_utilisateur (id_Quiz, id_UTILISATEUR, num_essai)', 'SELECT 1');
PREPARE q FROM @s; EXECUTE q; DEALLOCATE PREPARE q;

SET @c := (SELECT COUNT(*) FROM information_schema.STATISTICS
            WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME) = 'b_sd_cible' AND INDEX_NAME = 'ix_sd_cible_sondage_utilisateur');
SET @s := IF(@c = 0, 'ALTER TABLE B_SD_CIBLE ADD INDEX ix_sd_cible_sondage_utilisateur (id_Sondage, id_UTILISATEUR)', 'SELECT 1');
PREPARE q FROM @s; EXECUTE q; DEALLOCATE PREPARE q;

SET @c := (SELECT COUNT(*) FROM information_schema.STATISTICS
            WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME) = 'b_sd_passation' AND INDEX_NAME = 'ix_sd_passation_sondage_utilisateur');
SET @s := IF(@c = 0, 'ALTER TABLE B_SD_PASSATION ADD INDEX ix_sd_passation_sondage_utilisateur (id_Sondage, id_UTILISATEUR, termine)', 'SELECT 1');
PREPARE q FROM @s; EXECUTE q; DEALLOCATE PREPARE q;
