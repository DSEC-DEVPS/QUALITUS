-- Élargit les colonnes ville / adresse de B_UTILISATEUR (VARCHAR(20) trop court
-- provoquait « Data too long for column 'adresse' » à la création d'un utilisateur).
-- À exécuter sur une base déjà initialisée (init.sql est correct pour les neuves).
USE QUALITUS;
ALTER TABLE B_UTILISATEUR MODIFY COLUMN ville VARCHAR(150);
ALTER TABLE B_UTILISATEUR MODIFY COLUMN adresse VARCHAR(255);
