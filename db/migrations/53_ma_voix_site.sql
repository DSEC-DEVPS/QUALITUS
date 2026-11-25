-- MA VOIX COMPTE : messages anonymes, site conservé pour l'analyse.
--  - id_Site : site de l'auteur au moment de l'envoi (l'auteur lui-même n'est plus
--    enregistré : id_UTILISATEUR reste NULL pour les nouveaux messages) ;
--  - reprise : site renseigné pour les messages existants, d'après leur auteur.
-- Rejouable sans effet de bord.
USE QUALITUS;

SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS
              WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME) = 'b_ma_voix_compte'
                AND LOWER(COLUMN_NAME) = 'id_site');
SET @sql := IF(@col = 0, 'ALTER TABLE B_MA_VOIX_COMPTE ADD COLUMN id_Site INT NULL AFTER id_UTILISATEUR', 'SELECT 1');
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

UPDATE B_MA_VOIX_COMPTE m JOIN B_UTILISATEUR u ON u.id = m.id_UTILISATEUR
   SET m.id_Site = u.id_Site
 WHERE m.id_Site IS NULL;
