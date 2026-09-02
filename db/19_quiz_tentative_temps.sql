-- =====================================================================
-- Suivi du temps reel des tentatives.
--  - B_QZ_SESSION : horodate l'ouverture d'un quiz par un utilisateur
--    (upsert a chaque ouverture). Sert de "date de debut".
--  - B_QZ_TENTATIVE : on ajoute date_debut / date_fin (temps = fin - debut).
-- =====================================================================
CREATE TABLE IF NOT EXISTS B_QZ_SESSION (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  id_Quiz        INT NOT NULL,
  id_UTILISATEUR INT NOT NULL,
  date_debut     DATETIME NOT NULL,
  UNIQUE KEY uq_session (id_Quiz, id_UTILISATEUR)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE B_QZ_TENTATIVE ADD COLUMN date_debut DATETIME NULL AFTER date_tentative;
ALTER TABLE B_QZ_TENTATIVE ADD COLUMN date_fin   DATETIME NULL AFTER date_debut;
