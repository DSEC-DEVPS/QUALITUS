-- QUIZ PRIVÉ : déverrouillage mémorisé par participant.
--   Un participant qui a saisi le bon code PIN (machine autorisée) n'a plus à le
--   ressaisir : le quiz apparaît dans « Mes quiz privés » et l'écran d'accueil /
--   le démarrage l'acceptent. code_pin : code au moment de la validation (si le code
--   du quiz change, le déverrouillage ne vaut plus).
-- Rejouable sans effet de bord.
USE QUALITUS;

CREATE TABLE IF NOT EXISTS B_QZ_PIN_VALIDE (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  id_Quiz         INT NOT NULL,
  id_UTILISATEUR  INT NOT NULL,
  code_pin        VARCHAR(20) NOT NULL,
  date_validation DATETIME NOT NULL,
  UNIQUE KEY uq_qz_pin_valide (id_Quiz, id_UTILISATEUR),
  KEY idx_qz_pin_valide_user (id_UTILISATEUR),
  CONSTRAINT fk_qz_pin_valide_quiz FOREIGN KEY (id_Quiz) REFERENCES B_QZ_QUIZ(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Reprise de l'existant : un participant qui a déjà passé (ou commencé) un quiz privé
-- disposait du code PIN ; il est considéré comme déverrouillé (code actuel du quiz).
INSERT IGNORE INTO B_QZ_PIN_VALIDE (id_Quiz, id_UTILISATEUR, code_pin, date_validation)
SELECT x.id_Quiz, x.id_UTILISATEUR, q.code_pin, COALESCE(MIN(x.d), NOW())
  FROM (SELECT id_Quiz, id_UTILISATEUR, COALESCE(date_debut, date_tentative) AS d FROM B_QZ_TENTATIVE
        UNION ALL
        SELECT id_Quiz, id_UTILISATEUR, date_debut AS d FROM B_QZ_SESSION) x
  JOIN B_QZ_QUIZ q ON q.id = x.id_Quiz
 WHERE COALESCE(q.acces, 'PRIVATE') <> 'PUBLIC'
   AND q.code_pin IS NOT NULL AND q.code_pin <> ''
 GROUP BY x.id_Quiz, x.id_UTILISATEUR, q.code_pin;
