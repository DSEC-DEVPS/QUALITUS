-- =====================================================================
-- Quiz - association n..n a plusieurs contenus (fiches)
--  B_QZ_QUIZ_FICHE : liaison quiz <-> fiche (un quiz peut porter sur
--  plusieurs contenus). L'ancienne colonne B_QZ_QUIZ.id_Fiche est
--  conservee (compat) mais l'association passe desormais par cette table.
-- =====================================================================
USE QUALITUS;

CREATE TABLE IF NOT EXISTS B_QZ_QUIZ_FICHE (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_Quiz INT NOT NULL,
  id_Fiche INT NOT NULL,
  dateCreation DATETIME,
  FOREIGN KEY (id_Quiz) REFERENCES B_QZ_QUIZ(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Migration des liens existants (id_Fiche simple -> table de liaison)
INSERT INTO B_QZ_QUIZ_FICHE (id_Quiz, id_Fiche, dateCreation)
SELECT id, id_Fiche, NOW() FROM B_QZ_QUIZ
WHERE id_Fiche IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM B_QZ_QUIZ_FICHE qf WHERE qf.id_Quiz = B_QZ_QUIZ.id AND qf.id_Fiche = B_QZ_QUIZ.id_Fiche);
