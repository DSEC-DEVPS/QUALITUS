-- QUIZ : points par question (barème pondéré).
--  - b_qz_question.points : points de la question (entier 1..100, 5 par défaut :
--    les questions existantes gardent leur poids, l'ancien affichage étant 5 points/question).
--  - b_qz_tentative.nb_points / nb_points_total : points obtenus / points du quiz
--    au moment du calcul. Score (%) = nb_points / nb_points_total x 100.
--    Reprise : nb_bonnes x 5 / nb_total x 5 (scores existants inchangés).
--  - b_qz_quiz.date_reinitialisation : date de la dernière réinitialisation de toutes
--    les tentatives (ajout d'une question ou modification de ses réponses) ; une
--    session de passage ouverte avant cette date est périmée.
-- Rejouable sans effet de bord.
USE QUALITUS;

SET @existe := (SELECT COUNT(*) FROM information_schema.COLUMNS
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'b_qz_question' AND COLUMN_NAME = 'points');
SET @sql := IF(@existe = 0,
  'ALTER TABLE b_qz_question ADD COLUMN points INT NOT NULL DEFAULT 5 AFTER libelle',
  'SELECT ''colonne points deja presente''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @existe := (SELECT COUNT(*) FROM information_schema.COLUMNS
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'b_qz_tentative' AND COLUMN_NAME = 'nb_points');
SET @sql := IF(@existe = 0,
  'ALTER TABLE b_qz_tentative ADD COLUMN nb_points INT NULL AFTER nb_total, ADD COLUMN nb_points_total INT NULL AFTER nb_points',
  'SELECT ''colonnes nb_points deja presentes''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE b_qz_tentative
   SET nb_points = IFNULL(nb_bonnes, 0) * 5,
       nb_points_total = IFNULL(nb_total, 0) * 5
 WHERE nb_points IS NULL OR nb_points_total IS NULL;

SET @existe := (SELECT COUNT(*) FROM information_schema.COLUMNS
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'b_qz_quiz' AND COLUMN_NAME = 'date_reinitialisation');
SET @sql := IF(@existe = 0,
  'ALTER TABLE b_qz_quiz ADD COLUMN date_reinitialisation DATETIME NULL',
  'SELECT ''colonne date_reinitialisation deja presente''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
