-- Ajoute le champ Synthèse à une ligne de plan d'action (renseigné à la clôture
-- de l'action, quand le statut passe à « Réalisé »).
-- À exécuter sur une base déjà initialisée.
USE QUALITUS;
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='b_eval_plan_action_ligne' AND COLUMN_NAME='synthese');
SET @sql = IF(@c=0, 'ALTER TABLE b_eval_plan_action_ligne ADD COLUMN synthese TEXT AFTER commentaire', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
