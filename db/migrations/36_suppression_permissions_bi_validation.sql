-- Suppression des permissions BI et VALIDATION_OPTION (8 permissions).
-- Elles ne contrôlaient aucune action côté serveur, seulement l'affichage de deux
-- sous-menus (les 4 réunies) ; les règles réelles sont :
--   Arborescences BI      -> evaluation.parametrer (menu), evaluation.lire (page)
--   Validation d'options  -> evaluation.valider (menu, page et actions)
--   Proposer une option   -> evaluation.creer
-- Rejouable sans effet de bord.
USE QUALITUS;

DELETE rp FROM b_role_permission rp JOIN b_permission p ON p.id = rp.id_permission
 WHERE p.module IN ('BI', 'VALIDATION_OPTION');
DELETE up FROM b_utilisateur_permission up JOIN b_permission p ON p.id = up.id_permission
 WHERE p.module IN ('BI', 'VALIDATION_OPTION');
DELETE FROM b_permission WHERE module IN ('BI', 'VALIDATION_OPTION');
