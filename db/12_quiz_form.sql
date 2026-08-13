-- =====================================================================
-- Quiz - refonte du formulaire de creation (nouveaux champs de la maquette)
--  type (categorie), duree, date_fermeture, acces (PRIVATE/PUBLIC),
--  alterner_questions, autoriser_machines.
--  note_passage (= "Seuil de reussite") et id_Fiche (= "Contenu associe")
--  existent deja. description / retest_auto / nb_retest_max conserves en base
--  (valeurs par defaut) mais retires du formulaire.
-- =====================================================================
USE QUALITUS;

ALTER TABLE B_QZ_QUIZ ADD COLUMN type VARCHAR(50) NULL AFTER titre;
ALTER TABLE B_QZ_QUIZ ADD COLUMN duree INT NULL;
ALTER TABLE B_QZ_QUIZ ADD COLUMN date_fermeture DATETIME NULL;
ALTER TABLE B_QZ_QUIZ ADD COLUMN acces VARCHAR(20) DEFAULT 'PRIVATE';
ALTER TABLE B_QZ_QUIZ ADD COLUMN alterner_questions TINYINT(1) DEFAULT 0;
ALTER TABLE B_QZ_QUIZ ADD COLUMN autoriser_machines TINYINT(1) DEFAULT 0;
