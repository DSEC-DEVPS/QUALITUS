-- CALIBRAGE : reprise d'une participation après une coupure (réseau, courant).
--  - b_cal_participant.date_derniere_activite : dernier enregistrement du
--    participant (sert à proposer le temps qui restait à ce moment-là) ;
--  - b_cal_reinitialisation.type : RECOMMENCER (tout effacer) ou REPRENDRE
--    (réponses conservées), et minutes_accordees pour une reprise.
-- Rejouable sans effet de bord.
USE QUALITUS;

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME) = 'b_cal_participant' AND COLUMN_NAME = 'date_derniere_activite');
SET @s := IF(@c = 0, 'ALTER TABLE b_cal_participant ADD COLUMN date_derniere_activite DATETIME DEFAULT NULL AFTER date_cloture', 'SELECT 1');
PREPARE q FROM @s; EXECUTE q; DEALLOCATE PREPARE q;

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME) = 'b_cal_reinitialisation' AND COLUMN_NAME = 'type');
SET @s := IF(@c = 0, 'ALTER TABLE b_cal_reinitialisation ADD COLUMN type VARCHAR(20) NOT NULL DEFAULT ''RECOMMENCER'' AFTER id_auteur', 'SELECT 1');
PREPARE q FROM @s; EXECUTE q; DEALLOCATE PREPARE q;

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME) = 'b_cal_reinitialisation' AND COLUMN_NAME = 'minutes_accordees');
SET @s := IF(@c = 0, 'ALTER TABLE b_cal_reinitialisation ADD COLUMN minutes_accordees INT DEFAULT NULL AFTER type', 'SELECT 1');
PREPARE q FROM @s; EXECUTE q; DEALLOCATE PREPARE q;
