-- =====================================================================
-- Module SONDAGE - Phase 2 : passation (conditions, reponses, lien public)
-- =====================================================================
ALTER TABLE B_SD_SONDAGE ADD COLUMN token VARCHAR(40) NULL AFTER nom;

-- Conditions d'affichage d'une question (ET logique). Si non remplies -> sautee.
CREATE TABLE IF NOT EXISTS B_SD_CONDITION (
  id                 INT AUTO_INCREMENT PRIMARY KEY,
  id_Question        INT NOT NULL,           -- question conditionnee
  id_Question_source INT NOT NULL,           -- question dont on teste la reponse
  operateur          VARCHAR(20) NOT NULL DEFAULT 'EGAL', -- EGAL|DIFFERENT|SUP_EGAL|INF_EGAL|CONTIENT
  id_Option          INT NULL,               -- pour source de type choix
  valeur             VARCHAR(255) NULL,       -- pour source curseur/ouverte
  CONSTRAINT fk_sd_cond_q FOREIGN KEY (id_Question)
    REFERENCES B_SD_QUESTION(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Une passation = une reponse complete a un sondage (par un utilisateur ou anonyme)
CREATE TABLE IF NOT EXISTS B_SD_PASSATION (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  id_Sondage     INT NOT NULL,
  id_UTILISATEUR INT NULL,                   -- null si anonyme (lien public)
  date_debut     DATETIME NULL,
  date_fin       DATETIME NULL,
  termine        TINYINT(1) NOT NULL DEFAULT 0,
  CONSTRAINT fk_sd_pass_sondage FOREIGN KEY (id_Sondage)
    REFERENCES B_SD_SONDAGE(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS B_SD_REPONSE (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  id_Passation INT NOT NULL,
  id_Question  INT NOT NULL,
  id_Option    INT NULL,                     -- pour choix (1 ligne par option choisie)
  valeur_texte TEXT NULL,                    -- pour ouverte
  valeur_num   INT NULL,                     -- pour curseur
  ordre        INT NULL,                     -- pour classement (rang)
  CONSTRAINT fk_sd_rep_pass FOREIGN KEY (id_Passation)
    REFERENCES B_SD_PASSATION(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
