-- NOTIFICATIONS : date de lecture des notifications quiz + permission de ménage.
--  - b_qz_notification.dateLecture : renseignée quand la notification est lue
--    (comme b_notification.dateLecture). Sert à la cloche (lues depuis moins de
--    7 jours) et au ménage (« lues depuis plus de N jours »). Reprise : les
--    notifications déjà lues prennent leur date de création.
--  - notification.supprimer : ménage manuel des notifications (Habilitations ›
--    Ménage des notifications). Rattachée au rôle R_ADMI ; à attribuer ensuite
--    via la matrice des droits.
-- Rejouable sans effet de bord.
USE QUALITUS;

SET @existe := (SELECT COUNT(*) FROM information_schema.COLUMNS
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'b_qz_notification' AND COLUMN_NAME = 'dateLecture');
SET @sql := IF(@existe = 0,
  'ALTER TABLE b_qz_notification ADD COLUMN dateLecture DATETIME NULL AFTER lu',
  'SELECT ''colonne dateLecture deja presente''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE b_qz_notification SET dateLecture = dateCreation WHERE lu = 1 AND dateLecture IS NULL;
UPDATE b_notification SET dateLecture = dateReception WHERE lu = 1 AND dateLecture IS NULL;

INSERT IGNORE INTO b_permission (module,action,code,libelle) VALUES
  ('NOTIFICATION','SUPPRIMER','notification.supprimer','Supprimer — notification (ménage)');

INSERT IGNORE INTO b_role_permission (id_role, id_permission)
  SELECT r.id, p.id
    FROM b_role r
    JOIN b_permission p ON p.code = 'notification.supprimer'
   WHERE r.code = 'R_ADMI';
