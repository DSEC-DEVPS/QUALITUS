-- QUIZ : distinction STATUT / ÉTAT.
--  - statut : ACTIF | INACTIF  -> quiz en service / mis de côté (comme le sondage).
--             Modifiable uniquement par le site propriétaire (quiz.modifier).
--  - Etat   : OUVERT | CLOTURER -> participations ouvertes / closes.
--             Modifiable par le site propriétaire et les utilisateurs autorisés (quiz.modifier).
-- Un quiz ne peut être passé que s'il est ACTIF, OUVERT et que sa date de fermeture
-- (si renseignée) n'est pas dépassée.
-- Reprise des données : Etat 'ACTIF' -> statut ACTIF + OUVERT ; toute autre valeur
-- -> statut INACTIF + OUVERT (le quiz reste indisponible, comme avant).
-- Rejouable sans effet de bord.
USE QUALITUS;

-- 1) Colonne statut (ajoutée seulement si absente)
SET @existe := (SELECT COUNT(*) FROM information_schema.COLUMNS
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'b_qz_quiz' AND COLUMN_NAME = 'statut');
SET @sql := IF(@existe = 0,
  'ALTER TABLE b_qz_quiz ADD COLUMN statut VARCHAR(20) NOT NULL DEFAULT ''ACTIF'' AFTER Etat',
  'SELECT ''colonne statut deja presente''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2) Reprise des quiz existants (uniquement ceux encore à l'ancien format)
UPDATE b_qz_quiz
   SET statut = IF(Etat = 'ACTIF', 'ACTIF', 'INACTIF'),
       Etat   = 'OUVERT'
 WHERE Etat IS NULL OR Etat NOT IN ('OUVERT', 'CLOTURER');

-- 3) Nouvelle valeur par défaut de l'état
ALTER TABLE b_qz_quiz ALTER COLUMN Etat SET DEFAULT 'OUVERT';
