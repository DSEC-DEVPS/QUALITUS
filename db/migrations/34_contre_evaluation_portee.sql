-- CONTRE-ÉVALUATION : site à vision globale + simplification des permissions.
--   contre_evaluation.voir_tous  Accès transverse (remplace l'accès codé en dur
--                                de l'administrateur et de l'assistant qualité) :
--                                tous les sites pour le site à vision globale
--                                (paramètre site_vision_globale) et l'administrateur,
--                                sinon les contre-évaluations dont l'évaluation
--                                initiale est de son site.
--   contre_evaluation.modifier   Supprimée : elle ne contrôlait aucune action ;
--                                le sous-menu « Contre-évaluation » s'ouvre avec
--                                contre_evaluation.creer (ou voir_tous).
-- Création : site à vision globale / administrateur -> tous les sites ; sinon
-- uniquement les évaluations de son site. Désactiver / supprimer une
-- contre-évaluation terminée exige la permission dédiée, même pour son créateur.
-- Reprise : voir_tous -> profils R_ADMI et R_AQ. Rejouable sans effet de bord.
USE QUALITUS;

INSERT IGNORE INTO b_permission (module, action, code, libelle) VALUES
  ('CONTRE_EVALUATION', 'VOIR_TOUS', 'contre_evaluation.voir_tous', 'Voir toutes les contre-évaluations (son site ; tous les sites pour le site à vision globale)');

INSERT IGNORE INTO b_role_permission (id_role, id_permission)
  SELECT r.id, p.id FROM b_role r JOIN b_permission p ON p.code = 'contre_evaluation.voir_tous'
   WHERE r.code IN ('R_ADMI', 'R_AQ');

DELETE rp FROM b_role_permission rp JOIN b_permission p ON p.id = rp.id_permission
 WHERE p.code = 'contre_evaluation.modifier';
DELETE up FROM b_utilisateur_permission up JOIN b_permission p ON p.id = up.id_permission
 WHERE p.code = 'contre_evaluation.modifier';
DELETE FROM b_permission WHERE code = 'contre_evaluation.modifier';
