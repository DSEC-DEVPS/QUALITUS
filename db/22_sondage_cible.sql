-- =====================================================================
-- Module SONDAGE - Phase 3 : cible & diffusion.
-- Une cible = un destinataire du sondage (interne via annuaire ou externe Excel).
-- =====================================================================
CREATE TABLE IF NOT EXISTS B_SD_CIBLE (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  id_Sondage       INT NOT NULL,
  id_UTILISATEUR   INT NULL,               -- si cible interne (annuaire)
  nom              VARCHAR(150) NULL,
  prenom           VARCHAR(150) NULL,
  email            VARCHAR(255) NULL,
  telephone        VARCHAR(50)  NULL,
  date_envoi_email DATETIME NULL,
  date_envoi_sms   DATETIME NULL,
  dateCreation     DATETIME NULL,
  CONSTRAINT fk_sd_cible_sondage FOREIGN KEY (id_Sondage)
    REFERENCES B_SD_SONDAGE(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
