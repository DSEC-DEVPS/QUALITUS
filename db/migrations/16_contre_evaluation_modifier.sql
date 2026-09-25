-- Ajoute la permission « modifier » au module CONTRE_EVALUATION.
-- Motif (HABILITATIONS 1) : le sous-menu « Contre-évaluation » n'est visible
-- qu'avec les 4 permissions lire+creer+modifier+supprimer réunies (gestion).
-- La base ne possédait que lire/creer/desactiver/supprimer ; « modifier »
-- manquait, rendant la règle des 4 permissions impossible à satisfaire.
-- Rattache la nouvelle permission à tous les rôles (parité avec l'existant).
-- À exécuter sur une base déjà initialisée (init.sql est correct pour les neuves).
USE QUALITUS;

INSERT IGNORE INTO b_permission (module,action,code,libelle) VALUES
  ('CONTRE_EVALUATION','MODIFIER','contre_evaluation.modifier','Modifier — contre-évaluation');

INSERT IGNORE INTO b_role_permission (id_role, id_permission)
  SELECT r.id, p.id
    FROM b_role r
    JOIN b_permission p ON p.code = 'contre_evaluation.modifier';
