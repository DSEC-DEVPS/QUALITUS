-- QUIZ : réinitialisation de la participation d'un agent.
-- Un utilisateur du site propriétaire (quiz.modifier) demande la réinitialisation
-- de la participation d'un agent qui n'a fait qu'UN essai ; elle ne prend effet
-- que lorsque l'agent la CONFIRME (son essai et ses réponses sont alors supprimés
-- et il repasse le quiz en 1er essai).
-- statut : EN_ATTENTE | CONFIRMEE | REFUSEE | ANNULEE | EXPIREE
--   (EXPIREE : quiz clôturé, inactif ou date de fermeture dépassée avant la réponse).
-- Rejouable sans effet de bord.
USE QUALITUS;

CREATE TABLE IF NOT EXISTS b_qz_reinitialisation (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  id_Quiz        INT NOT NULL,
  id_UTILISATEUR INT NOT NULL,                 -- agent dont la participation est réinitialisée
  id_demandeur   INT NOT NULL,                 -- utilisateur du site propriétaire
  statut         VARCHAR(20) NOT NULL DEFAULT 'EN_ATTENTE',
  score_initial  DECIMAL(5,2) NULL,            -- score de l'essai concerné (trace)
  dateDemande    DATETIME NOT NULL,
  dateReponse    DATETIME NULL,
  id_traitePar   INT NULL,                     -- agent (réponse) ou annulateur
  CONSTRAINT fk_qz_reinit_quiz FOREIGN KEY (id_Quiz)
    REFERENCES b_qz_quiz(id) ON DELETE CASCADE,
  KEY idx_reinit_agent (id_Quiz, id_UTILISATEUR, statut)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
