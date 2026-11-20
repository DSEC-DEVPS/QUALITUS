-- Arbre de coaching : suppression des permissions ARBRE_COACHING (4 permissions).
-- Comme BI / VALIDATION_OPTION (36), elles ne contrôlaient aucune action côté
-- serveur, seulement l'affichage du sous-menu. Règles réelles :
--   Arbre de coaching / Arborescences BI (menu et page) -> evaluation.parametrer
--   Proposer une option pendant un coaching             -> evaluation.coacher
-- Rejouable sans effet de bord.
USE QUALITUS;

DELETE rp FROM b_role_permission rp JOIN b_permission p ON p.id = rp.id_permission
 WHERE p.module = 'ARBRE_COACHING';
DELETE up FROM b_utilisateur_permission up JOIN b_permission p ON p.id = up.id_permission
 WHERE p.module = 'ARBRE_COACHING';
DELETE FROM b_permission WHERE module = 'ARBRE_COACHING';
