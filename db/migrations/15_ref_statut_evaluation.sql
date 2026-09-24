-- Référentiel paramétrable « Statut après évaluation » (comme le contexte).
-- À exécuter sur une base déjà initialisée.
USE QUALITUS;
CREATE TABLE IF NOT EXISTS b_eval_ref_statut_evaluation (
  id INT AUTO_INCREMENT PRIMARY KEY, libelle VARCHAR(60) NOT NULL,
  description VARCHAR(255) DEFAULT NULL, ordre INT DEFAULT 0,
  etat VARCHAR(10) DEFAULT 'ACTIF', dateCreation DATETIME DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO b_eval_ref_statut_evaluation (libelle, description, ordre, etat, dateCreation)
SELECT * FROM (SELECT 'Non validé' AS l, 'Statut initial à la création' AS d, 1 AS o, 'ACTIF' AS e, NOW() AS c) x
WHERE NOT EXISTS (SELECT 1 FROM b_eval_ref_statut_evaluation);
INSERT INTO b_eval_ref_statut_evaluation (libelle, description, ordre, etat, dateCreation)
SELECT 'Féliciter', 'Évaluation en succès approuvée par l''agent', 2, 'ACTIF', NOW()
WHERE NOT EXISTS (SELECT 1 FROM b_eval_ref_statut_evaluation WHERE libelle='Féliciter');
INSERT INTO b_eval_ref_statut_evaluation (libelle, description, ordre, etat, dateCreation)
SELECT 'Débriefer', 'Évaluation en échec approuvée par l''agent', 3, 'ACTIF', NOW()
WHERE NOT EXISTS (SELECT 1 FROM b_eval_ref_statut_evaluation WHERE libelle='Débriefer');
