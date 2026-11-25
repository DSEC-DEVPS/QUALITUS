-- QUIZ : retests maîtrisés (page « Retests à autoriser »).
--  1) Retest désormais OPT-IN : retest_auto = 0 par défaut (« Autoriser les retests »
--     dans l'éditeur), nb_retest_max = nombre maximum de retests par agent.
--  2) B_QZ_RETEST_REFUS : échec classé « retest non autorisé » (décision tracée).
--     Une ligne par tentative : un nouvel échec (après réinitialisation) redemande
--     une décision.
--  3) Reprise unique (au premier passage seulement) : les quiz existants passent à
--     « retest non autorisé », sauf ceux qui ont déjà eu un retest (autorisé ou passé).
-- Rejouable sans effet de bord : la reprise 3) ne s'exécute qu'à la création de la table.
USE QUALITUS;

SET @premiere := (SELECT COUNT(*) = 0 FROM information_schema.TABLES
                   WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME) = 'b_qz_retest_refus');

CREATE TABLE IF NOT EXISTS B_QZ_RETEST_REFUS (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  id_Quiz        INT NOT NULL,
  id_UTILISATEUR INT NOT NULL,
  id_Tentative   INT NOT NULL,
  refuse_par     INT NULL,
  date_refus     DATETIME NOT NULL,
  UNIQUE KEY uq_qz_retest_refus_tentative (id_Tentative),
  KEY idx_qz_retest_refus_quiz_user (id_Quiz, id_UTILISATEUR),
  CONSTRAINT fk_qz_retest_refus_quiz FOREIGN KEY (id_Quiz) REFERENCES B_QZ_QUIZ(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE B_QZ_QUIZ ALTER COLUMN retest_auto SET DEFAULT 0;
UPDATE B_QZ_QUIZ SET nb_retest_max = 1 WHERE nb_retest_max IS NULL OR nb_retest_max < 1;

UPDATE B_QZ_QUIZ q
   SET q.retest_auto = 0
 WHERE @premiere = 1
   AND NOT EXISTS (SELECT 1 FROM B_QZ_RETEST r WHERE r.id_Quiz = q.id)
   AND NOT EXISTS (SELECT 1 FROM B_QZ_TENTATIVE t WHERE t.id_Quiz = q.id AND t.num_essai > 1);
