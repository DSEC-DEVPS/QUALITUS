-- HABILITATIONS 8 : ajout du rôle « Back Office » (R_BO), identique à R_TC.
--  - Fonction « Back Office » (pour l'affectation des utilisateurs).
--  - Rôle R_BO dans la matrice des droits (b_role).
--  - Permissions de R_BO = copie exacte de celles de R_TC (« pareil que R_TC »).
-- Les règles métiers de lecture des fiches (filtre de niveau N1/N2/Par défaut)
-- sont pilotées par l'id de fonction (AccesProfil) et le champ Niveau des fiches,
-- déjà gérées de façon générique : R_BO suit donc les mêmes règles que R_TC.
-- À exécuter sur une base déjà initialisée (init.sql est correct pour les neuves).
USE QUALITUS;

-- 1) Fonction « Back Office » (si absente)
INSERT INTO B_FONCTION (nom, Role_Associe, Permissions_Associe, Etat, dateCreation)
SELECT 'Back Office', 'R_BO', 'canAdd,canDelete,canEdit,canRead', 'ACTIF', NOW()
  FROM DUAL
 WHERE NOT EXISTS (SELECT 1 FROM B_FONCTION WHERE Role_Associe = 'R_BO');

-- 2) Rôle R_BO dans la matrice (si absent)
INSERT INTO b_role (code, libelle, description)
SELECT 'R_BO', 'Back Office', 'Rôle repris de la fonction « Back Office » (identique à R_TC)'
  FROM DUAL
 WHERE NOT EXISTS (SELECT 1 FROM b_role WHERE code = 'R_BO');

-- 3) Permissions de R_BO = copie de R_TC
INSERT IGNORE INTO b_role_permission (id_role, id_permission)
  SELECT bo.id, rp.id_permission
    FROM b_role bo
    JOIN b_role tc ON tc.code = 'R_TC'
    JOIN b_role_permission rp ON rp.id_role = tc.id
   WHERE bo.code = 'R_BO';
