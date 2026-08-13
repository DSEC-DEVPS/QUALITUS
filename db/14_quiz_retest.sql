-- =====================================================================
-- Quiz - retest autorise par le superviseur
--  Un conseiller en echec ne peut PAS refaire un quiz de lui-meme :
--  le superviseur cree une autorisation, que la nouvelle tentative consomme.
-- =====================================================================
USE QUALITUS;

CREATE TABLE IF NOT EXISTS B_QZ_RETEST (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_Quiz INT NOT NULL,
  id_UTILISATEUR INT NOT NULL,       -- l'agent autorise a refaire
  autorise_par INT,                   -- le superviseur qui autorise
  date_autorisation DATETIME,
  consomme TINYINT(1) DEFAULT 0,
  date_consommation DATETIME NULL,
  FOREIGN KEY (id_Quiz) REFERENCES B_QZ_QUIZ(id) ON DELETE CASCADE
) ENGINE=InnoDB;
