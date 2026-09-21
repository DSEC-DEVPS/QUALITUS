-- Ajoute la colonne id_option (option de niveau catalogée) aux tables de choix
-- BI et coaching. Sans elle, le chargement/enregistrement de la section BI d'une
-- évaluation renvoie une erreur 500 (contrôleurs evalBI / evalCoaching).
-- À exécuter sur une base déjà initialisée (init.sql est correct pour les neuves).
USE QUALITUS;

-- b_evaluation_bi.id_option
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='b_evaluation_bi' AND COLUMN_NAME='id_option');
SET @sql = IF(@c=0, 'ALTER TABLE b_evaluation_bi ADD COLUMN id_option INT DEFAULT NULL AFTER niveau', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @fk = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='b_evaluation_bi' AND CONSTRAINT_NAME='fk_evaluation_bi_option');
SET @sql = IF(@fk=0,
  'ALTER TABLE b_evaluation_bi ADD CONSTRAINT fk_evaluation_bi_option FOREIGN KEY (id_option) REFERENCES b_eval_bi_option(id) ON DELETE SET NULL',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- b_eval_coaching_niveau.id_option
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='b_eval_coaching_niveau' AND COLUMN_NAME='id_option');
SET @sql = IF(@c=0, 'ALTER TABLE b_eval_coaching_niveau ADD COLUMN id_option INT DEFAULT NULL AFTER niveau', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @fk = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='b_eval_coaching_niveau' AND CONSTRAINT_NAME='fk_coaching_niveau_option');
SET @sql = IF(@fk=0,
  'ALTER TABLE b_eval_coaching_niveau ADD CONSTRAINT fk_coaching_niveau_option FOREIGN KEY (id_option) REFERENCES b_eval_coaching_option(id) ON DELETE SET NULL',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
