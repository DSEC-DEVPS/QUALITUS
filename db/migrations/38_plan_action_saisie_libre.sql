-- PLAN D'ACTIONS : Action et KPI en saisie libre (au cas par cas).
-- Les référentiels « Actions (plan d'action) » et « KPI » ne sont plus utilisés :
-- chaque ligne porte son propre texte (colonnes action / kpi). Les lignes
-- existantes reprennent le libellé de leur référentiel. Les colonnes id_action /
-- id_kpi et les tables b_eval_ref_action_pa / b_eval_ref_kpi sont conservées
-- (historique) mais ne sont plus lues. Rejouable sans effet de bord.
USE QUALITUS;

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'b_eval_plan_action_ligne' AND COLUMN_NAME = 'action');
SET @s := IF(@c = 0, 'ALTER TABLE b_eval_plan_action_ligne ADD COLUMN action TEXT NULL AFTER id_action', 'SELECT 1');
PREPARE q FROM @s; EXECUTE q; DEALLOCATE PREPARE q;

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'b_eval_plan_action_ligne' AND COLUMN_NAME = 'kpi');
SET @s := IF(@c = 0, 'ALTER TABLE b_eval_plan_action_ligne ADD COLUMN kpi VARCHAR(255) NULL AFTER id_kpi', 'SELECT 1');
PREPARE q FROM @s; EXECUTE q; DEALLOCATE PREPARE q;

-- Reprise des libellés existants (seulement là où le texte est vide)
UPDATE b_eval_plan_action_ligne l JOIN b_eval_ref_action_pa a ON a.id = l.id_action
   SET l.action = a.libelle WHERE (l.action IS NULL OR l.action = '');
UPDATE b_eval_plan_action_ligne l JOIN b_eval_ref_kpi k ON k.id = l.id_kpi
   SET l.kpi = k.libelle WHERE (l.kpi IS NULL OR l.kpi = '');
