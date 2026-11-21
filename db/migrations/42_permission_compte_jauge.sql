-- GÉRER LES COMPTES : nouvelle permission « Jauge ».
--   compte.jauge  Jauge — modifier entièrement les comptes de son périmètre
-- S'ajoute à compte.gerer (qui donne l'accès au menu) : bouton « Modifier »
-- sur chaque compte (identité, coordonnées, fonction, site, programme,
-- grille, superviseur, statut). Aucun profil ne la reçoit, sauf R_ADMI ;
-- elle s'attribue dans la matrice des droits.
-- Rejouable sans effet de bord.
USE QUALITUS;

INSERT IGNORE INTO b_permission (module, action, code, libelle) VALUES
  ('COMPTE', 'JAUGE', 'compte.jauge', 'Jauge — modifier entièrement les comptes de son périmètre (Gérer les comptes)');

INSERT IGNORE INTO b_role_permission (id_role, id_permission)
  SELECT r.id, p.id FROM b_role r CROSS JOIN b_permission p WHERE p.code = 'compte.jauge' AND r.code = 'R_ADMI';
