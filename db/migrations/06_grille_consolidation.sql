-- Consolidation grille : suppression de l'ancienne table B_GRILLE.
-- La grille unique est désormais b_eval_grille (module Évaluation), rattachée à
-- l'utilisateur via B_UTILISATEUR.id_EvalGrille. À exécuter sur une base déjà
-- initialisée (les nouvelles installations sont correctes via init.sql).
USE QUALITUS;

-- 1. S'assurer que la colonne id_EvalGrille existe.
SET @has_col = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='B_UTILISATEUR' AND COLUMN_NAME='id_EvalGrille');
SET @sql = IF(@has_col=0, 'ALTER TABLE B_UTILISATEUR ADD COLUMN id_EvalGrille INT NULL', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- 2. Supprimer la clé étrangère id_Grille -> B_GRILLE (nom auto-généré : on le retrouve).
SET @fk = (SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='B_UTILISATEUR'
    AND COLUMN_NAME='id_Grille' AND REFERENCED_TABLE_NAME IS NOT NULL LIMIT 1);
SET @sql = IF(@fk IS NOT NULL, CONCAT('ALTER TABLE B_UTILISATEUR DROP FOREIGN KEY ', @fk), 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- 3. Supprimer la colonne id_Grille (legacy).
SET @has_old = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='B_UTILISATEUR' AND COLUMN_NAME='id_Grille');
SET @sql = IF(@has_old>0, 'ALTER TABLE B_UTILISATEUR DROP COLUMN id_Grille', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- 4. Nettoyer les rattachements id_EvalGrille pointant vers une grille inexistante.
UPDATE B_UTILISATEUR u
  LEFT JOIN b_eval_grille g ON u.id_EvalGrille = g.id
  SET u.id_EvalGrille = NULL
  WHERE u.id_EvalGrille IS NOT NULL AND g.id IS NULL;

-- 5. Ajouter la clé étrangère id_EvalGrille -> b_eval_grille si absente.
SET @has_fk = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='B_UTILISATEUR'
    AND CONSTRAINT_NAME='fk_utilisateur_eval_grille');
SET @sql = IF(@has_fk=0,
  'ALTER TABLE B_UTILISATEUR ADD CONSTRAINT fk_utilisateur_eval_grille FOREIGN KEY (id_EvalGrille) REFERENCES b_eval_grille(id)',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- 6. Supprimer l'ancienne table B_GRILLE (plus référencée nulle part).
DROP TABLE IF EXISTS B_GRILLE;
