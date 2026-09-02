-- =====================================================================
-- Quiz : liste blanche d'adresses IP autorisees a passer un quiz.
-- Si un quiz a >=1 IP dans cette table, seuls ces IP peuvent participer.
-- Si aucune IP => quiz ouvert (comportement inchange).
-- InnoDB : FK cascade sur B_QZ_QUIZ (table InnoDB).
-- =====================================================================
CREATE TABLE IF NOT EXISTS B_QZ_IP_AUTORISEE (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  id_Quiz      INT NOT NULL,
  adresse_ip   VARCHAR(64) NOT NULL,
  libelle      VARCHAR(150) NULL,
  dateCreation DATETIME NULL,
  CONSTRAINT fk_qz_ip_quiz FOREIGN KEY (id_Quiz)
    REFERENCES B_QZ_QUIZ(id) ON DELETE CASCADE,
  UNIQUE KEY uq_quiz_ip (id_Quiz, adresse_ip)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Retro-migration : les quiz crees avant cette fonctionnalite avaient
-- autoriser_machines=0 (Non) par defaut mais restaient accessibles (liste IP
-- inexistante). Avec la nouvelle regle (Non + liste vide = aucune machine),
-- on les repasse a Oui (ouvert) pour ne verrouiller aucun quiz existant.
-- La restriction s'active ensuite volontairement (Non + ajout d'IP).
UPDATE B_QZ_QUIZ SET autoriser_machines = 1
 WHERE autoriser_machines = 0 OR autoriser_machines IS NULL;
