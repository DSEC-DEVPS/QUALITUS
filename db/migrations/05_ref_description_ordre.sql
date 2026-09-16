-- Ajoute les colonnes description + ordre aux référentiels gérés par le CRUD
-- générique (evalRef.Controllers). À exécuter sur une base déjà initialisée
-- (les nouvelles installations les ont déjà via init.sql).
USE QUALITUS;
ALTER TABLE b_eval_ref_contexte          ADD COLUMN description VARCHAR(255) NULL AFTER libelle, ADD COLUMN ordre INT DEFAULT 0 AFTER description;
ALTER TABLE b_eval_ref_nature_ressource  ADD COLUMN description VARCHAR(255) NULL AFTER libelle, ADD COLUMN ordre INT DEFAULT 0 AFTER description;
ALTER TABLE b_eval_ref_action_pa         ADD COLUMN description VARCHAR(255) NULL AFTER libelle, ADD COLUMN ordre INT DEFAULT 0 AFTER description;
ALTER TABLE b_eval_ref_statut_pa         ADD COLUMN description VARCHAR(255) NULL AFTER libelle, ADD COLUMN ordre INT DEFAULT 0 AFTER description;
ALTER TABLE b_eval_ref_kpi               ADD COLUMN description VARCHAR(255) NULL AFTER libelle, ADD COLUMN ordre INT DEFAULT 0 AFTER description;
