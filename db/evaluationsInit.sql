/**
 MLD DE LA PARTIE EVALUATIONS
 */
CREATE TABLE IF NOT EXISTS EVALUATIONS (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  contexte VARCHAR(255),
  identifiant_appel VARCHAR(255),
  numero_case VARCHAR(255),
  numero_appel VARCHAR(255),
  date_appel DATETIME,
  date_evaluations DATETIME,
  date_creation DATETIME,
  dmt VARCHAR(255),
  motif_appel VARCHAR(255),
  programme VARCHAR(255),
  site VARCHAR(255),
  synthese TEXT,
  avis_agents TEXT,
  conclusion VARCHAR(255),
  statut VARCHAR(255),
  resolution VARCHAR(255),
  pourquoi1 VARCHAR(255),
  pourquoi2 VARCHAR(255),
  pourquoi3 VARCHAR(255),
  pourquoi4 VARCHAR(255),
  id_Evaluateur INT,
  id_Grille INT,
  id_Agent INT,
  FOREIGN KEY(id_Evaluateur) REFERENCES B_UTILISATEUR(id),
  FOREIGN KEY(id_Agent) REFERENCES B_UTILISATEUR(id),
  FOREIGN KEY(id_Grille) REFERENCES B_GRILLE(id)
);
CREATE TABLE IF NOT EXISTS CATEGORIES_ERREURS (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  titre VARCHAR(255),
  poids DECIMAL(30, 12),
  nom_Grille VARCHAR(255),
  seuil DECIMAL(4, 2),
  id_Grille INT,
  FOREIGN KEY(id_Grille) REFERENCES B_GRILLE(id)
);
CREATE TABLE IF NOT EXISTS SOUS_CATEGORIES_ERREURS (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  titre VARCHAR(255),
  poids DECIMAL(30, 12),
  id_Categories_Erreurs INT UNSIGNED,
  FOREIGN KEY(id_Categories_Erreurs) REFERENCES CATEGORIES_ERREURS(id)
);
CREATE TABLE IF NOT EXISTS ERREURS (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_Categories_Erreurs INT,
  id_Sous_Categories_Erreurs INT UNSIGNED,
  id_Grille INT,
  items TEXT NOT NULL,
  sous_items TEXT NOT NULL,
  referentiels TEXT NOT NULL,
  poids_items DECIMAL(30, 12),
  score_en_pourcent DECIMAL(30, 12),
  score_sur_vingt DECIMAL(30, 12),
  FOREIGN KEY(id_Sous_Categories_Erreurs) REFERENCES SOUS_CATEGORIES_ERREURS(id)
);
CREATE INDEX idx_erreurs_souscat ON ERREURS(id_Sous_Categories_Erreurs);
CREATE INDEX idx_erreurs_cat ON ERREURS(id_Categories_Erreurs);
CREATE TABLE IF NOT EXISTS EVALUATIONS_RESULTATS (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_Categories_Erreurs INT,
  id_Sous_Categories_Erreurs INT,
  items TEXT NOT NULL,
  sous_items TEXT NOT NULL,
  referentiels TEXT NOT NULL,
  poids_items DECIMAL(30, 12),
  score_en_pourcent DECIMAL(30, 12),
  score_sur_vingt DECIMAL(30, 12),
  commentaire TEXT,
  etat TINYINT(1),
  id_Evaluations INT UNSIGNED,
  FOREIGN KEY(id_Evaluations) REFERENCES EVALUATIONS(id)
);
CREATE INDEX idx_eval_cat_etat ON EVALUATIONS_RESULTATS(id_Evaluations, id_Categories_Erreurs, etat);
CREATE TABLE IF NOT EXISTS SCORES (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  score DECIMAL(30, 12),
  nombre TINYINT UNSIGNED,
  id_Categories_Erreurs INT UNSIGNED,
  categorie_erreur VARCHAR(255),
  id_Evaluations INT UNSIGNED,
  FOREIGN KEY(id_Evaluations) REFERENCES EVALUATIONS(id)
);
CREATE INDEX idx_scores_eval_cat ON SCORES(id_Evaluations, id_Categories_Erreurs);
CREATE TABLE IF NOT EXISTS SUPPLEMENTAIRES (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  contexte VARCHAR(255),
  identifiant_appel VARCHAR(255),
  numero_case VARCHAR(255),
  numero_appel VARCHAR(255),
  date_appel DATETIME,
  date_evaluations DATETIME,
  date_creation DATETIME,
  dmt VARCHAR(255),
  motif_appel VARCHAR(255),
  programme VARCHAR(255),
  site VARCHAR(255),
  synthese TEXT,
  avis_agents TEXT,
  conclusion VARCHAR(255),
  statut VARCHAR(255),
  resolution VARCHAR(255),
  pourquoi1 VARCHAR(255),
  pourquoi2 VARCHAR(255),
  pourquoi3 VARCHAR(255),
  pourquoi4 VARCHAR(255),
  id_Evaluations INT UNSIGNED,
  id_Evaluateur INT,
  id_Grille INT,
  id_Agent INT,
  FOREIGN KEY(id_Evaluations) REFERENCES EVALUATIONS(id),
  FOREIGN KEY(id_Evaluateur) REFERENCES B_UTILISATEUR(id),
  FOREIGN KEY(id_Agent) REFERENCES B_UTILISATEUR(id),
  FOREIGN KEY(id_Grille) REFERENCES B_GRILLE(id)
);
CREATE TABLE IF NOT EXISTS SUPPLEMENTAIRES_RESULTATS (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_Categories_Erreurs INT,
  id_Sous_Categories_Erreurs INT,
  items TEXT NOT NULL,
  sous_items TEXT NOT NULL,
  referentiels TEXT NOT NULL,
  poids_items DECIMAL(30, 12),
  score_en_pourcent DECIMAL(30, 12),
  score_sur_vingt DECIMAL(30, 12),
  commentaire TEXT,
  etat TINYINT(1),
  id_Supplementaires INT UNSIGNED,
  FOREIGN KEY(id_Supplementaires) REFERENCES SUPPLEMENTAIRES(id)
);
CREATE TABLE IF NOT EXISTS SCORES_SUPPLEMENTAIRES (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  score DECIMAL(30, 12),
  nombre TINYINT UNSIGNED,
  id_Categories_Erreurs INT UNSIGNED,
  categorie_erreur VARCHAR(255),
  id_Supplementaires INT UNSIGNED,
  FOREIGN KEY(id_Supplementaires) REFERENCES SUPPLEMENTAIRES(id)
);
CREATE TABLE IF NOT EXISTS CALENDARS (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  numero INT,
  mois VARCHAR(255),
  annee VARCHAR(255),
  etat TINYINT(1),
  id_Site INT,
  UNIQUE KEY uq_calendar (id_Site, numero, annee),
  FOREIGN KEY(id_Site) REFERENCES B_SITE(id)
);
CREATE INDEX idx_calandar_site ON CALENDARS(id_Site, numero, annee, etat);
CREATE TABLE IF NOT EXISTS CALENDARS_POLICIES (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  mois_courant_et_posterieurs TINYINT(1),
  mois_courant TINYINT(1),
  tous_les_mois TINYINT(1),
  date_creation DATETIME,
  id_Site INT,
  UNIQUE KEY uq_calendar_policie (id_Site),
  CONSTRAINT chk_one_policy CHECK (
    (
      mois_courant_et_posterieurs + mois_courant + tous_les_mois
    ) = 1
  ),
  CONSTRAINT fk_calendar_policy_site FOREIGN KEY (id_Site) REFERENCES B_SITE(id)
);
CREATE INDEX idx_calandar_policie ON CALENDARS_POLICIES(
  id_Site,
  mois_courant_et_posterieurs,
  mois_courant,
  tous_les_mois
);
CREATE TABLE IF NOT EXISTS BUSINESS_INTELLIGENCE (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(255),
  nom_Site VARCHAR(255),
  id_Site INT,
  id_Grille INT,
  FOREIGN KEY(id_Site) REFERENCES B_SITE(id),
  FOREIGN KEY(id_Grille) REFERENCES B_GRILLE(id)
);
CREATE TABLE IF NOT EXISTS BI_1 (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_Business_Intelligence INT UNSIGNED,
  options VARCHAR(255),
  FOREIGN KEY(id_Business_Intelligence) REFERENCES BUSINESS_INTELLIGENCE(id)
);
CREATE TABLE IF NOT EXISTS BI_2 (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_BI_1 INT UNSIGNED,
  options VARCHAR(255),
  FOREIGN KEY(id_BI_1) REFERENCES BI_1(id)
);
CREATE TABLE IF NOT EXISTS BI_3 (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_BI_2 INT UNSIGNED,
  options VARCHAR(255),
  FOREIGN KEY(id_BI_2) REFERENCES BI_2(id)
);
CREATE TABLE IF NOT EXISTS BI_4 (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_BI_3 INT UNSIGNED,
  options VARCHAR(255),
  FOREIGN KEY(id_BI_3) REFERENCES BI_3(id)
);