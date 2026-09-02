-- =====================================================================
-- Quiz : demandes d'acces IP en attente.
-- Quand une machine non autorisee (quiz en mode "Autoriser machines = Non")
-- tente d'acceder, on journalise une demande EN_ATTENTE. Le createur/l'admin
-- ou le superviseur de l'agent peut ensuite l'AUTORISER (l'IP passe dans la
-- liste blanche B_QZ_IP_AUTORISEE) ou la REFUSER.
-- =====================================================================
CREATE TABLE IF NOT EXISTS B_QZ_IP_DEMANDE (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  id_Quiz        INT NOT NULL,
  id_UTILISATEUR INT NOT NULL,          -- l'agent bloque
  adresse_ip     VARCHAR(64) NOT NULL,
  statut         VARCHAR(20) NOT NULL DEFAULT 'EN_ATTENTE', -- EN_ATTENTE | AUTORISE | REFUSE
  dateCreation   DATETIME NULL,
  dateTraitement DATETIME NULL,
  id_traitePar   INT NULL,
  CONSTRAINT fk_qz_ipdem_quiz FOREIGN KEY (id_Quiz)
    REFERENCES B_QZ_QUIZ(id) ON DELETE CASCADE,
  UNIQUE KEY uq_dem (id_Quiz, id_UTILISATEUR, adresse_ip, statut)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
