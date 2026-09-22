-- Ajoute l'attribut statut_apres_evaluation à b_evaluation.
-- NON_VALIDER (à la création) -> FELICITER / DEBRIEFER (quand l'agent saisit son
-- avis depuis la lettre de félicitation / débriefing).
-- À exécuter sur une base déjà initialisée (init.sql est correct pour les neuves).
USE QUALITUS;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='b_evaluation' AND COLUMN_NAME='statut_apres_evaluation');
SET @sql = IF(@c=0,
  "ALTER TABLE b_evaluation ADD COLUMN statut_apres_evaluation VARCHAR(20) DEFAULT 'NON_VALIDER' AFTER resolution",
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Aligner les évaluations déjà terminées ayant un avis saisi.
UPDATE b_evaluation
   SET statut_apres_evaluation = CASE WHEN conclusion='SUCCES' THEN 'FELICITER' ELSE 'DEBRIEFER' END
 WHERE statut='TERMINE' AND avis_agent IS NOT NULL AND avis_agent <> ''
   AND (statut_apres_evaluation IS NULL OR statut_apres_evaluation='NON_VALIDER');
