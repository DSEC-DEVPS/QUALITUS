-- HABILITATIONS 4 : nouvelles matrices de droits BI et VALIDATION_OPTION.
-- Motif : les sous-menus « Arborescences BI » et « Validation d'options » doivent
-- être pilotés par des permissions (lire seul = caché ; les 4 permissions réunies
-- = visible), au lieu d'une liste de rôles en dur.
-- Rattache les nouvelles permissions à tous les rôles (parité avec l'existant :
-- matrice ouverte, durcissement ensuite via l'UI Habilitations).
-- À exécuter sur une base déjà initialisée (init.sql est correct pour les neuves).
USE QUALITUS;

INSERT IGNORE INTO b_permission (module,action,code,libelle) VALUES
  ('BI','LIRE','bi.lire','Consulter — business intelligence'),
  ('BI','CREER','bi.creer','Créer — business intelligence'),
  ('BI','MODIFIER','bi.modifier','Modifier — business intelligence'),
  ('BI','SUPPRIMER','bi.supprimer','Supprimer — business intelligence'),
  ('VALIDATION_OPTION','LIRE','validation_option.lire','Consulter — validation d''options'),
  ('VALIDATION_OPTION','CREER','validation_option.creer','Créer — validation d''options'),
  ('VALIDATION_OPTION','MODIFIER','validation_option.modifier','Modifier — validation d''options'),
  ('VALIDATION_OPTION','SUPPRIMER','validation_option.supprimer','Supprimer — validation d''options');

-- Rattacher les nouvelles permissions à tous les rôles.
INSERT IGNORE INTO b_role_permission (id_role, id_permission)
  SELECT r.id, p.id
    FROM b_role r
    JOIN b_permission p ON p.module IN ('BI','VALIDATION_OPTION');
