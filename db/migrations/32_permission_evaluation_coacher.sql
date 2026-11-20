-- ÉVALUATION : permission dédiée au coaching et au plan d'actions.
--   evaluation.coacher  Coacher — coaching et plan d'actions d'une évaluation
-- Enregistrer / terminer un coaching et ajouter / modifier / supprimer une ligne
-- de plan d'actions exigent désormais evaluation.coacher (au lieu de
-- evaluation.creer / modifier / supprimer) ; evaluation.creer reste la création
-- des évaluations. Le périmètre est contrôlé en plus côté serveur
-- (administrateur, assistant qualité, responsable d'opération, évaluateur ou
-- superviseur de l'agent évalué).
-- Reprise : donnée aux profils et aux utilisateurs qui détenaient
-- evaluation.creer, personne ne perd l'accès. Rejouable sans effet de bord.
USE QUALITUS;

INSERT IGNORE INTO b_permission (module, action, code, libelle) VALUES
  ('EVALUATION', 'COACHER', 'evaluation.coacher', 'Coacher — coaching et plan d''actions d''une évaluation');

INSERT IGNORE INTO b_role_permission (id_role, id_permission)
  SELECT DISTINCT rp.id_role, px.id
    FROM b_role_permission rp
    JOIN b_permission p  ON p.id = rp.id_permission AND p.code = 'evaluation.creer'
    JOIN b_permission px ON px.code = 'evaluation.coacher';

INSERT IGNORE INTO b_utilisateur_permission (id_utilisateur, id_permission, sens)
  SELECT DISTINCT up.id_utilisateur, px.id, 'GRANT'
    FROM b_utilisateur_permission up
    JOIN b_permission p  ON p.id = up.id_permission AND p.code = 'evaluation.creer'
    JOIN b_permission px ON px.code = 'evaluation.coacher'
   WHERE up.sens = 'GRANT';
