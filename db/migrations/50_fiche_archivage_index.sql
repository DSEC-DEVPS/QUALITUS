-- FICHES — archivage automatique sans blocage (correctif du « Lock wait timeout » en production).
-- 1) Index sur B_FICHE(dateFin, ETAT) : l'archivage automatique (UPDATE … WHERE dateFin <= maintenant
--    AND ETAT <> 'ARCHIVE') ne verrouille plus que les fiches concernées au lieu de toute la table.
--    Même nom que l'index éventuellement créé à la main en production : rejouable sans effet de bord.
-- 2) Suppression du déclencheur provisoire trg_fiche_garder_archive (s'il a été posé en production
--    avant ce déploiement) : le code n'écrase plus la date d'archivage des fiches déjà archivées.
USE QUALITUS;

SET @c := (SELECT COUNT(*) FROM information_schema.STATISTICS
            WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME) = 'b_fiche' AND INDEX_NAME = 'idx_fiche_datefin_etat');
SET @s := IF(@c = 0, 'ALTER TABLE B_FICHE ADD INDEX idx_fiche_datefin_etat (dateFin, ETAT)', 'SELECT 1');
PREPARE q FROM @s; EXECUTE q; DEALLOCATE PREPARE q;

DROP TRIGGER IF EXISTS trg_fiche_garder_archive;
