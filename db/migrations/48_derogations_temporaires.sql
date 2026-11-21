-- HABILITATIONS : dérogations individuelles motivées et temporaires.
--   motif     : raison de la dérogation (ex. « remplacement pendant les congés »)
--   date_fin  : dernier jour d'application ; au-delà, la dérogation n'est plus
--               prise en compte (elle reste visible comme « expirée »)
--   dateModification : dernière modification (la date de création est conservée)
-- Rejouable sans effet de bord.
USE QUALITUS;

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'b_utilisateur_permission' AND COLUMN_NAME = 'motif');
SET @s := IF(@c = 0, 'ALTER TABLE b_utilisateur_permission ADD COLUMN motif VARCHAR(255) NULL AFTER sens', 'SELECT 1');
PREPARE q FROM @s; EXECUTE q; DEALLOCATE PREPARE q;

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'b_utilisateur_permission' AND COLUMN_NAME = 'date_fin');
SET @s := IF(@c = 0, 'ALTER TABLE b_utilisateur_permission ADD COLUMN date_fin DATE NULL AFTER motif', 'SELECT 1');
PREPARE q FROM @s; EXECUTE q; DEALLOCATE PREPARE q;

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'b_utilisateur_permission' AND COLUMN_NAME = 'dateModification');
SET @s := IF(@c = 0, 'ALTER TABLE b_utilisateur_permission ADD COLUMN dateModification DATETIME NULL AFTER dateCreation', 'SELECT 1');
PREPARE q FROM @s; EXECUTE q; DEALLOCATE PREPARE q;
