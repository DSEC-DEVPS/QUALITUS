-- QUIZ : autorisations IP par SITE.
-- Les adresses IP des postes peuvent être privées : la même adresse peut exister
-- sur plusieurs sites. Une IP autorisée est donc rattachée à un site, et la
-- machine n'est acceptée que pour les participants de CE site
-- (clé unique : quiz + adresse IP + site).
--
-- Reprise des IP déjà autorisées (sans site), pour ne retirer aucun accès :
--   1) site(s) des agents dont la demande d'accès sur cette IP a été approuvée ;
--   2) sinon, chacun des sites ayant des participants au quiz ;
--   3) sinon, le site du créateur du quiz.
-- Une ligne pour laquelle aucun site ne peut être déterminé reste sans site :
-- elle n'autorise plus personne et peut être supprimée depuis l'écran.
-- Rejouable sans effet de bord.
USE QUALITUS;

-- 0) Tables de diffusion des quiz (participants désignés, utilisateurs autorisés).
--    Présentes dans db/init.sql mais créées par aucune migration : la prod (relevé
--    du 24/11/2026) ne les a pas, et l'étape 3.2 ci-dessous en a besoin.
--    Créées seulement si absentes (même définition que db/init.sql).
CREATE TABLE IF NOT EXISTS B_QZ_PARTICIPANT (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  id_Quiz        INT NOT NULL,
  id_UTILISATEUR INT NOT NULL,
  id_Site        INT NULL,
  notifie        TINYINT(1) DEFAULT 0,
  dateDiffusion  DATETIME NULL,
  id_diffusePar  INT NULL,
  UNIQUE KEY uq_qz_participant (id_Quiz, id_UTILISATEUR),
  CONSTRAINT fk_qz_part_quiz FOREIGN KEY (id_Quiz) REFERENCES B_QZ_QUIZ(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS B_QZ_AUTORISE (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  id_Quiz        INT NOT NULL,
  id_UTILISATEUR INT NOT NULL,
  id_auteur      INT NULL,
  dateCreation   DATETIME NULL,
  UNIQUE KEY uq_qz_autorise (id_Quiz, id_UTILISATEUR),
  CONSTRAINT fk_qz_autorise_quiz FOREIGN KEY (id_Quiz) REFERENCES B_QZ_QUIZ(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 1) Colonne id_Site (ajoutée seulement si absente)
SET @existe := (SELECT COUNT(*) FROM information_schema.COLUMNS
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'b_qz_ip_autorisee' AND COLUMN_NAME = 'id_Site');
SET @sql := IF(@existe = 0,
  'ALTER TABLE b_qz_ip_autorisee ADD COLUMN id_Site INT NULL AFTER adresse_ip',
  'SELECT ''colonne id_Site deja presente''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2) Nouvelle clé unique quiz + IP + site (créée avant de retirer l'ancienne,
--    qui sert aussi d'index à la clé étrangère sur id_Quiz)
SET @existe := (SELECT COUNT(*) FROM information_schema.STATISTICS
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'b_qz_ip_autorisee' AND INDEX_NAME = 'uq_quiz_ip_site');
SET @sql := IF(@existe = 0,
  'ALTER TABLE b_qz_ip_autorisee ADD UNIQUE KEY uq_quiz_ip_site (id_Quiz, adresse_ip, id_Site)',
  'SELECT ''cle uq_quiz_ip_site deja presente''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @existe := (SELECT COUNT(*) FROM information_schema.STATISTICS
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'b_qz_ip_autorisee' AND INDEX_NAME = 'uq_quiz_ip');
SET @sql := IF(@existe > 0,
  'ALTER TABLE b_qz_ip_autorisee DROP INDEX uq_quiz_ip',
  'SELECT ''ancienne cle uq_quiz_ip deja retiree''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3) Reprise des IP sans site
DROP TABLE IF EXISTS mig25_ip;
DROP TABLE IF EXISTS mig25_sites;
CREATE TABLE mig25_ip AS
  SELECT id, id_Quiz, adresse_ip, libelle, dateCreation
    FROM b_qz_ip_autorisee WHERE id_Site IS NULL;
CREATE TABLE mig25_sites (ip_id INT NOT NULL, site INT NOT NULL, PRIMARY KEY (ip_id, site));

-- 3.1) Sites des agents dont la demande sur cette IP a été approuvée
INSERT IGNORE INTO mig25_sites (ip_id, site)
  SELECT i.id, u.id_Site
    FROM mig25_ip i
    JOIN b_qz_ip_demande d ON d.id_Quiz = i.id_Quiz AND d.adresse_ip = i.adresse_ip AND d.statut = 'AUTORISE'
    JOIN b_utilisateur u ON u.id = d.id_UTILISATEUR
   WHERE u.id_Site IS NOT NULL;

-- 3.2) Sinon, les sites des participants du quiz
INSERT IGNORE INTO mig25_sites (ip_id, site)
  SELECT i.id, p.id_Site
    FROM mig25_ip i
    JOIN b_qz_participant p ON p.id_Quiz = i.id_Quiz
   WHERE p.id_Site IS NOT NULL
     AND i.id NOT IN (SELECT ip_id FROM (SELECT ip_id FROM mig25_sites) deja);

-- 3.3) Sinon, le site du créateur du quiz
INSERT IGNORE INTO mig25_sites (ip_id, site)
  SELECT i.id, u.id_Site
    FROM mig25_ip i
    JOIN b_qz_quiz q ON q.id = i.id_Quiz
    JOIN b_utilisateur u ON u.id = q.id_createur
   WHERE u.id_Site IS NOT NULL
     AND i.id NOT IN (SELECT ip_id FROM (SELECT ip_id FROM mig25_sites) deja);

-- 3.4) Une ligne par site, puis retrait de la ligne d'origine sans site
INSERT IGNORE INTO b_qz_ip_autorisee (id_Quiz, adresse_ip, id_Site, libelle, dateCreation)
  SELECT i.id_Quiz, i.adresse_ip, s.site, i.libelle, i.dateCreation
    FROM mig25_ip i JOIN mig25_sites s ON s.ip_id = i.id;

DELETE a FROM b_qz_ip_autorisee a
  JOIN (SELECT DISTINCT ip_id FROM mig25_sites) s ON s.ip_id = a.id;

DROP TABLE mig25_sites;
DROP TABLE mig25_ip;
