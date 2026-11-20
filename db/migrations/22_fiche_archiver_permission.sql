-- HABILITATIONS : nouvelle permission fiche.archiver.
--  - fiche.archiver : affiche l'icône « archiver » en haut de la zone de lecture
--    d'une fiche, autorise l'archivage d'une fiche (PUT /archive_fiche/:id) et la
--    restauration depuis le sous-menu Archives (PUT /restore_archive/:id).
--    Ces deux routes exigeaient auparavant fiche.modifier.
-- Rattache la permission à tous les rôles (parité avec l'existant : aucun
-- utilisateur ne perd l'archivage au déploiement ; ajuster ensuite via la matrice).
-- À exécuter sur une base déjà initialisée (init.sql est correct pour les neuves).
USE QUALITUS;

INSERT IGNORE INTO b_permission (module,action,code,libelle) VALUES
  ('FICHE','ARCHIVER','fiche.archiver','Archiver / restaurer — fiche');

INSERT IGNORE INTO b_role_permission (id_role, id_permission)
  SELECT r.id, p.id
    FROM b_role r
    JOIN b_permission p ON p.code = 'fiche.archiver';
