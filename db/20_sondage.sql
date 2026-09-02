-- =====================================================================
-- Module SONDAGE (sondages du personnel) - Phase 1 : fondations.
-- Sondage -> Questions (par page, types varies) -> Options.
-- InnoDB (cascades). Pas de FK vers les tables legacy MyISAM.
-- =====================================================================
CREATE TABLE IF NOT EXISTS B_SD_SONDAGE (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  nom              VARCHAR(255) NOT NULL,
  langue           VARCHAR(20)  NOT NULL DEFAULT 'Francais',
  statut           VARCHAR(20)  NOT NULL DEFAULT 'ENCOURS',  -- ENCOURS | ACTIF | DESACTIF
  bouton_retour    TINYINT(1)   NOT NULL DEFAULT 0,          -- afficher le bouton Retour (page precedente)
  id_createur      INT NULL,
  dateCreation     DATETIME NULL,
  dateModification DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS B_SD_QUESTION (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  id_Sondage   INT NOT NULL,
  page         INT NOT NULL DEFAULT 1,        -- numero de page (P1, P2, ...)
  ordre        INT NOT NULL DEFAULT 0,        -- ordre d'affichage (dans la page)
  type         VARCHAR(30) NOT NULL,          -- CHOIX_UNIQUE | CHOIX_MULTIPLE | OUVERTE | CLASSEMENT | CURSEUR | INFO
  libelle      TEXT NOT NULL,
  obligatoire  TINYINT(1) NOT NULL DEFAULT 1,
  curseur_min  INT NULL,                      -- pour type CURSEUR
  curseur_max  INT NULL,
  dateCreation DATETIME NULL,
  CONSTRAINT fk_sd_q_sondage FOREIGN KEY (id_Sondage)
    REFERENCES B_SD_SONDAGE(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS B_SD_OPTION (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  id_Question INT NOT NULL,
  libelle     VARCHAR(500) NOT NULL,
  ordre       INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_sd_o_question FOREIGN KEY (id_Question)
    REFERENCES B_SD_QUESTION(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
