-- HABILITATIONS : nouvelle permission quiz.participer.
--  - quiz.participer : permet de PARTICIPER aux quiz (liste « Participer », saisie
--    du code PIN, passage et soumission, « Mes scores »), QUEL QUE SOIT LE PROFIL.
--    Remplace les exclusions codées en dur (superviseur / gestionnaire Baseco)
--    et le contrôle quiz.creer qui était exigé pour soumettre.
--  - En plus de la permission, seul un PARTICIPANT DÉSIGNÉ (onglet Diffusion)
--    peut passer un quiz (quiz public : visible directement ; quiz privé : PIN).
-- Rattachée à TOUS les rôles (ajuster ensuite via la matrice des droits).
-- À exécuter sur une base déjà initialisée (init.sql est correct pour les neuves).
USE QUALITUS;

INSERT IGNORE INTO b_permission (module,action,code,libelle) VALUES
  ('QUIZ','PARTICIPER','quiz.participer','Participer — quiz');

INSERT IGNORE INTO b_role_permission (id_role, id_permission)
  SELECT r.id, p.id
    FROM b_role r
    JOIN b_permission p ON p.code = 'quiz.participer';
