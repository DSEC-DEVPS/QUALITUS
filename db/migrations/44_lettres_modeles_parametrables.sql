-- ÉVALUATION : lettres de félicitation / débriefing paramétrables.
-- b_eval_lettre_modele reçoit deux textes par type de lettre :
--   introduction : début de la lettre (salutation + paragraphe d'ouverture) ;
--   cloture      : formule de fin, avant la signature de l'évaluateur.
-- Variables utilisables : {{prenom}} {{nom}} {{date_evaluation}} {{contexte}}
-- {{appel}} {{evaluateur}}. Modifiables dans Évaluation › Modèles de lettres
-- (permission evaluation.parametrer). La colonne texte (ancien modèle, non
-- utilisé) est conservée. Rejouable sans effet de bord.
USE QUALITUS;

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME) = 'b_eval_lettre_modele' AND COLUMN_NAME = 'introduction');
SET @s := IF(@c = 0, 'ALTER TABLE b_eval_lettre_modele ADD COLUMN introduction TEXT NULL AFTER texte', 'SELECT 1');
PREPARE q FROM @s; EXECUTE q; DEALLOCATE PREPARE q;

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME) = 'b_eval_lettre_modele' AND COLUMN_NAME = 'cloture');
SET @s := IF(@c = 0, 'ALTER TABLE b_eval_lettre_modele ADD COLUMN cloture TEXT NULL AFTER introduction', 'SELECT 1');
PREPARE q FROM @s; EXECUTE q; DEALLOCATE PREPARE q;

-- Textes par défaut (sans écraser un texte déjà personnalisé)
INSERT IGNORE INTO b_eval_lettre_modele (type, texte, dateModification) VALUES ('FELICITATION', '', NOW()), ('DEBRIEFING', '', NOW());
UPDATE b_eval_lettre_modele SET introduction =
  'Bonjour {{prenom}},\n\nNous avons le plaisir de vous adresser nos félicitations pour votre appel évalué le {{date_evaluation}}. Votre évaluation montre une bonne maîtrise des attendus : vous trouverez ci-dessous le détail de vos résultats, ainsi que quelques pistes pour aller encore plus loin.'
 WHERE type = 'FELICITATION' AND (introduction IS NULL OR introduction = '');
UPDATE b_eval_lettre_modele SET cloture =
  'Merci pour votre engagement au quotidien. Continuez ainsi !'
 WHERE type = 'FELICITATION' AND (cloture IS NULL OR cloture = '');
UPDATE b_eval_lettre_modele SET introduction =
  'Bonjour {{prenom}},\n\nSuite à l''évaluation de votre appel du {{date_evaluation}}, voici un retour détaillé sur vos résultats. Les points relevés ci-dessous servent de base à notre échange : l''objectif est de vous accompagner pour progresser.'
 WHERE type = 'DEBRIEFING' AND (introduction IS NULL OR introduction = '');
UPDATE b_eval_lettre_modele SET cloture =
  'Votre superviseur prendra un temps avec vous pour revenir sur ces points. N''hésitez pas à lui faire part de vos questions.'
 WHERE type = 'DEBRIEFING' AND (cloture IS NULL OR cloture = '');
