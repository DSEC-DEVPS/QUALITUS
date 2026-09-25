-- HABILITATIONS 5 : nouvelles matrices de droits ARBRE_COACHING, CALENDRIER,
-- CREATION_MASSE.
-- Motif : les sous-menus « Arbre de coaching », « Périodes / Calendrier » et
-- « Création en masse » doivent être pilotés par des permissions (lire seul =
-- caché ; les 4 permissions réunies = visible), au lieu d'une liste de rôles.
-- Rattache les nouvelles permissions à tous les rôles (parité avec l'existant).
-- À exécuter sur une base déjà initialisée (init.sql est correct pour les neuves).
USE QUALITUS;

INSERT IGNORE INTO b_permission (module,action,code,libelle) VALUES
  ('ARBRE_COACHING','LIRE','arbre_coaching.lire','Consulter — arbre de coaching'),
  ('ARBRE_COACHING','CREER','arbre_coaching.creer','Créer — arbre de coaching'),
  ('ARBRE_COACHING','MODIFIER','arbre_coaching.modifier','Modifier — arbre de coaching'),
  ('ARBRE_COACHING','SUPPRIMER','arbre_coaching.supprimer','Supprimer — arbre de coaching'),
  ('CALENDRIER','LIRE','calendrier.lire','Consulter — périodes / calendrier'),
  ('CALENDRIER','CREER','calendrier.creer','Créer — périodes / calendrier'),
  ('CALENDRIER','MODIFIER','calendrier.modifier','Modifier — périodes / calendrier'),
  ('CALENDRIER','SUPPRIMER','calendrier.supprimer','Supprimer — périodes / calendrier'),
  ('CREATION_MASSE','LIRE','creation_masse.lire','Consulter — création en masse'),
  ('CREATION_MASSE','CREER','creation_masse.creer','Créer — création en masse'),
  ('CREATION_MASSE','MODIFIER','creation_masse.modifier','Modifier — création en masse'),
  ('CREATION_MASSE','SUPPRIMER','creation_masse.supprimer','Supprimer — création en masse');

-- Rattacher les nouvelles permissions à tous les rôles.
INSERT IGNORE INTO b_role_permission (id_role, id_permission)
  SELECT r.id, p.id
    FROM b_role r
    JOIN b_permission p ON p.module IN ('ARBRE_COACHING','CALENDRIER','CREATION_MASSE');
