-- =====================================================================
-- Calibrage - Phase 2
--  - Business Intelligence : 5 Pourquoi (listes interdependantes en cascade)
--  - Criteres de reussite / echec (feuille REGLES) parametrables
-- Tables en InnoDB (cascades reelles, cf. remarque dans 03_calibrage.sql)
-- =====================================================================
USE QUALITUS;

-- 5 Pourquoi : arbre de valeurs interdependantes (niveau 1..5).
-- Une valeur de niveau N a pour parent une valeur de niveau N-1 (id_parent).
-- Les valeurs de niveau 1 ont id_parent = NULL.
CREATE TABLE IF NOT EXISTS B_MG_POURQUOI (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_ModeleGrille INT NOT NULL,
  niveau INT NOT NULL,
  libelle VARCHAR(255) NOT NULL,
  id_parent INT NULL,
  ordre INT DEFAULT 0,
  dateCreation DATETIME,
  FOREIGN KEY (id_ModeleGrille) REFERENCES B_MODELE_GRILLE(id) ON DELETE CASCADE,
  FOREIGN KEY (id_parent) REFERENCES B_MG_POURQUOI(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Criteres de reussite / echec par type d'ecart (parametrables)
CREATE TABLE IF NOT EXISTS B_MG_CRITERE_REGLE (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_ModeleGrille INT NOT NULL,
  type_ecart VARCHAR(255) NOT NULL,
  operateur VARCHAR(5) DEFAULT '>',
  valeur_objectif DECIMAL(7,3),
  libelle_echec VARCHAR(255),
  libelle_reussite VARCHAR(255),
  ordre INT DEFAULT 0,
  dateCreation DATETIME,
  dateModification DATETIME,
  FOREIGN KEY (id_ModeleGrille) REFERENCES B_MODELE_GRILLE(id) ON DELETE CASCADE
) ENGINE=InnoDB;
