-- Matrice de droits dédiée à la contre-évaluation (module CONTRE_EVALUATION).
-- Ajoute les permissions et les rattache à tous les rôles existants (comportement
-- courant : matrice ouverte ; le durcissement se fait ensuite via l'UI Habilitations).
-- À exécuter sur une base déjà initialisée (init.sql est correct pour les neuves).
USE QUALITUS;

INSERT IGNORE INTO b_permission (module,action,code,libelle) VALUES
  ('CONTRE_EVALUATION','LIRE','contre_evaluation.lire','Consulter — contre-évaluation'),
  ('CONTRE_EVALUATION','CREER','contre_evaluation.creer','Créer — contre-évaluation'),
  ('CONTRE_EVALUATION','DESACTIVER','contre_evaluation.desactiver','Désactiver — contre-évaluation'),
  ('CONTRE_EVALUATION','SUPPRIMER','contre_evaluation.supprimer','Supprimer — contre-évaluation'),
  ('CALIBRAGE','LIRE','calibrage.lire','Consulter — calibrage'),
  ('CALIBRAGE','ORGANISER','calibrage.organiser','Organiser — calibrage');

-- Rattacher les nouvelles permissions à tous les rôles (parité avec l'existant).
INSERT IGNORE INTO b_role_permission (id_role, id_permission)
  SELECT r.id, p.id
    FROM b_role r
    JOIN b_permission p ON p.module IN ('CONTRE_EVALUATION','CALIBRAGE');
