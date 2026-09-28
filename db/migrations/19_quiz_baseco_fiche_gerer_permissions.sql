-- HABILITATIONS 6 : nouvelles permissions quiz.baseco et fiche.gerer.
--  - quiz.baseco : donne accès au menu Quiz + sous-menus « Quiz en echecs » et
--    « Quiz en retest » (remplace l'ancienne restriction « superviseur »).
--  - fiche.gerer : combinée aux 4 permissions FICHE, ouvre en plus les sous-menus
--    « SLA » et « Catégories » du menu Gestion Contenu.
-- Rattache les nouvelles permissions à tous les rôles (parité avec l'existant).
-- À exécuter sur une base déjà initialisée (init.sql est correct pour les neuves).
USE QUALITUS;

INSERT IGNORE INTO b_permission (module,action,code,libelle) VALUES
  ('QUIZ','BASECO','quiz.baseco','Baseco (échecs / retests) — quiz'),
  ('FICHE','GERER','fiche.gerer','Gérer (SLA / catégories) — fiche');

INSERT IGNORE INTO b_role_permission (id_role, id_permission)
  SELECT r.id, p.id
    FROM b_role r
    JOIN b_permission p ON p.code IN ('quiz.baseco','fiche.gerer');
