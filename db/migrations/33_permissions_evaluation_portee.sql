-- ÉVALUATION : périmètre par permission (et non plus par profil) + paramétrage.
--   evaluation.voir_tous    Voir toutes les évaluations : de tous les sites pour
--                           le site à vision globale (paramètre
--                           site_vision_globale) et l'administrateur ; de son
--                           propre site pour les autres.
--   evaluation.parametrer   Paramétrer : calendrier (générer, mois), politique
--                           d'un site, modèles de lettre, arbres BI / coaching
--                           (arborescences, options côté administration).
-- Sans voir_tous : ses évaluations faites, celles des agents supervisés et les
-- siennes une fois terminées. Les notifications d'options à valider vont aux
-- détenteurs d'evaluation.valider.
-- Reprise : voir_tous -> profils R_ADMI, R_AQ, R_RO (qui voyaient tout) ;
-- parametrer -> profils et utilisateurs ayant evaluation.modifier.
-- Rejouable sans effet de bord.
USE QUALITUS;

INSERT IGNORE INTO b_permission (module, action, code, libelle) VALUES
  ('EVALUATION', 'VOIR_TOUS', 'evaluation.voir_tous', 'Voir toutes les évaluations (son site ; tous les sites pour le site à vision globale)'),
  ('EVALUATION', 'PARAMETRER', 'evaluation.parametrer', 'Paramétrer — calendrier, politique, lettres, arbres BI / coaching');

INSERT IGNORE INTO b_role_permission (id_role, id_permission)
  SELECT r.id, p.id FROM b_role r JOIN b_permission p ON p.code = 'evaluation.voir_tous'
   WHERE r.code IN ('R_ADMI', 'R_AQ', 'R_RO');

INSERT IGNORE INTO b_role_permission (id_role, id_permission)
  SELECT DISTINCT rp.id_role, px.id
    FROM b_role_permission rp
    JOIN b_permission p  ON p.id = rp.id_permission AND p.code = 'evaluation.modifier'
    JOIN b_permission px ON px.code = 'evaluation.parametrer';

INSERT IGNORE INTO b_utilisateur_permission (id_utilisateur, id_permission, sens)
  SELECT DISTINCT up.id_utilisateur, px.id, 'GRANT'
    FROM b_utilisateur_permission up
    JOIN b_permission p  ON p.id = up.id_permission AND p.code = 'evaluation.modifier'
    JOIN b_permission px ON px.code = 'evaluation.parametrer'
   WHERE up.sens = 'GRANT';
