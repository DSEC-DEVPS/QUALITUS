-- =====================================================================
-- Quiz <-> Sites (n..n). Un quiz peut etre attribue a un ou plusieurs sites.
--  - Sites assignes + acces PRIVATE : seuls les utilisateurs de ces sites
--    peuvent faire le quiz, en saisissant le code PIN.
--  - Sites assignes + acces PUBLIC : les utilisateurs de ces sites voient le
--    quiz (liste) et peuvent le faire sans code PIN.
--  - Aucun site assigne : comportement inchange (PIN pour tous).
-- InnoDB : FK cascade sur B_QZ_QUIZ (InnoDB). Pas de FK vers B_SITE (MyISAM).
-- =====================================================================
CREATE TABLE IF NOT EXISTS B_QZ_QUIZ_SITE (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  id_Quiz      INT NOT NULL,
  id_Site      INT NOT NULL,
  dateCreation DATETIME NULL,
  CONSTRAINT fk_qz_site_quiz FOREIGN KEY (id_Quiz)
    REFERENCES B_QZ_QUIZ(id) ON DELETE CASCADE,
  UNIQUE KEY uq_quiz_site (id_Quiz, id_Site)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
