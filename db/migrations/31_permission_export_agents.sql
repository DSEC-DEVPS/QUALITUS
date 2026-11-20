-- EXPORTATIONS : permission dédiée à l'export « Liste des agents ».
--   utilisateur.exporter  Exporter — liste des agents (menu Exportations)
-- L'export exige désormais reporting.lire + utilisateur.exporter (au lieu de
-- utilisateur.creer ou compte.gerer). Les règles de site ne changent pas
-- (site à vision globale : choix du site ; sinon son propre site).
-- Reprise : la permission est donnée aux profils et aux utilisateurs qui
-- détenaient utilisateur.creer ou compte.gerer, personne ne perd l'accès.
-- Rejouable sans effet de bord.
USE QUALITUS;

INSERT IGNORE INTO b_permission (module, action, code, libelle) VALUES
  ('UTILISATEUR', 'EXPORTER', 'utilisateur.exporter', 'Exporter — liste des agents (Exportations)');

-- Profils
INSERT IGNORE INTO b_role_permission (id_role, id_permission)
  SELECT DISTINCT rp.id_role, px.id
    FROM b_role_permission rp
    JOIN b_permission p  ON p.id = rp.id_permission AND p.code IN ('utilisateur.creer', 'compte.gerer')
    JOIN b_permission px ON px.code = 'utilisateur.exporter';

-- Droits individuels accordés (GRANT) ; un refus existant n'est pas écrasé.
INSERT IGNORE INTO b_utilisateur_permission (id_utilisateur, id_permission, sens)
  SELECT DISTINCT up.id_utilisateur, px.id, 'GRANT'
    FROM b_utilisateur_permission up
    JOIN b_permission p  ON p.id = up.id_permission AND p.code IN ('utilisateur.creer', 'compte.gerer')
    JOIN b_permission px ON px.code = 'utilisateur.exporter'
   WHERE up.sens = 'GRANT';
