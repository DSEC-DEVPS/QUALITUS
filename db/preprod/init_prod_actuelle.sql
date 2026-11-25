-- =====================================================================
-- QUALITUS PRÉ-PROD : base de départ IDENTIQUE À LA PROD (structure)
-- =====================================================================
-- 1) Structure : relevé de la prod du 24/11/2026 (mysqldump --no-data,
--    MySQL 8.4.9), sans les compteurs AUTO_INCREMENT. Comprend aussi les
--    anciennes tables (b_ev_*, b_mg_*, b_categorie_ressource), le déclencheur
--    trg_fiche_garder_archive et les index ajoutés à la main sur la prod.
--    Niveau de migration : 05 à 20 présentes, 21 et suivantes absentes ;
--    b_qz_participant et b_qz_autorise absentes (créées par la migration 25).
-- 2) Données de référence : seed de l'init.sql d'origine (sites, fonctions,
--    rôles, permissions, référentiels, compte administrateur), sans aucune
--    donnée de production.
-- Les migrations 21 à 58 sont appliquées ensuite par
-- db/preprod/appliquer_migrations.sh, comme on le fera en prod.
-- NE PAS utiliser pour une installation neuve (utiliser db/init.sql).
-- =====================================================================

SET NAMES utf8mb4;
CREATE DATABASE IF NOT EXISTS QUALITUS;
USE QUALITUS;

-- ---------------------------------------------------------------------
-- 1) STRUCTURE DE LA PROD
-- ---------------------------------------------------------------------
/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `b_cal_evaluation`
--

DROP TABLE IF EXISTS `b_cal_evaluation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_cal_evaluation` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_session` int NOT NULL,
  `id_transaction` int NOT NULL,
  `id_evaluateur` int NOT NULL,
  `est_reference` tinyint(1) DEFAULT '0',
  `etat` varchar(20) DEFAULT 'NON_COMMENCEE',
  `dateCreation` datetime DEFAULT NULL,
  `dateModification` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_cal_eval` (`id_transaction`,`id_evaluateur`),
  KEY `k_cal_eval_session` (`id_session`),
  KEY `k_cal_eval_tx` (`id_transaction`),
  CONSTRAINT `fk_cal_eval_session` FOREIGN KEY (`id_session`) REFERENCES `b_cal_session` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cal_eval_tx` FOREIGN KEY (`id_transaction`) REFERENCES `b_cal_transaction` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_cal_evaluation_categorie`
--

DROP TABLE IF EXISTS `b_cal_evaluation_categorie`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_cal_evaluation_categorie` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_cal_evaluation` int NOT NULL,
  `libelle` varchar(200) NOT NULL,
  `poids` decimal(12,6) DEFAULT '0.000000',
  `seuil_reussite` decimal(12,6) DEFAULT '0.000000',
  `comparateur` varchar(2) DEFAULT '>=',
  `critique` tinyint(1) DEFAULT '0',
  `ordre` int DEFAULT '0',
  `id_categorie_origine` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `k_cal_ec_eval` (`id_cal_evaluation`),
  CONSTRAINT `fk_cal_ec_eval` FOREIGN KEY (`id_cal_evaluation`) REFERENCES `b_cal_evaluation` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_cal_evaluation_erreur`
--

DROP TABLE IF EXISTS `b_cal_evaluation_erreur`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_cal_evaluation_erreur` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_cal_evaluation` int NOT NULL,
  `id_cal_evaluation_categorie` int NOT NULL,
  `item` varchar(255) NOT NULL,
  `sous_item` varchar(255) DEFAULT NULL,
  `referentiel` text,
  `poids` decimal(12,6) DEFAULT '0.000000',
  `libelle_sous_categorie` varchar(200) DEFAULT NULL,
  `poids_sous_categorie` decimal(12,6) DEFAULT '0.000000',
  `coche` tinyint(1) DEFAULT '1',
  `coche_initial` tinyint(1) DEFAULT NULL,
  `commentaire` text,
  `appreciation_jauge` text,
  `modifie_par` int DEFAULT NULL,
  `date_modif` datetime DEFAULT NULL,
  `id_erreur_origine` int DEFAULT NULL,
  `id_sous_categorie_origine` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `k_cal_ee_eval` (`id_cal_evaluation`),
  KEY `k_cal_ee_cat` (`id_cal_evaluation_categorie`),
  KEY `k_cal_ee_origine` (`id_erreur_origine`),
  CONSTRAINT `fk_cal_ee_cat` FOREIGN KEY (`id_cal_evaluation_categorie`) REFERENCES `b_cal_evaluation_categorie` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cal_ee_eval` FOREIGN KEY (`id_cal_evaluation`) REFERENCES `b_cal_evaluation` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_cal_participant`
--

DROP TABLE IF EXISTS `b_cal_participant`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_cal_participant` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_session` int NOT NULL,
  `id_evaluateur` int NOT NULL,
  `invite` tinyint(1) DEFAULT '0',
  `date_invitation` datetime DEFAULT NULL,
  `date_debut_participation` datetime DEFAULT NULL,
  `statut_participation` varchar(20) DEFAULT 'NON_COMMENCEE',
  `date_cloture` datetime DEFAULT NULL,
  `dateCreation` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_cal_part` (`id_session`,`id_evaluateur`),
  KEY `k_cal_part_session` (`id_session`),
  CONSTRAINT `fk_cal_part_session` FOREIGN KEY (`id_session`) REFERENCES `b_cal_session` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_cal_reinitialisation`
--

DROP TABLE IF EXISTS `b_cal_reinitialisation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_cal_reinitialisation` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_session` int NOT NULL,
  `id_participant` int NOT NULL,
  `id_auteur` int DEFAULT NULL,
  `dateReinit` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `k_cal_reinit_session` (`id_session`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_cal_session`
--

DROP TABLE IF EXISTS `b_cal_session`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_cal_session` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nom` varchar(150) NOT NULL,
  `description` text,
  `date_calibrage` date DEFAULT NULL,
  `id_site` int DEFAULT NULL,
  `id_grille` int DEFAULT NULL,
  `type_ressource_cible` varchar(15) DEFAULT 'HUMAINE',
  `nombre_transactions` int DEFAULT '0',
  `duree_minutes` int DEFAULT '0',
  `statut` varchar(25) DEFAULT 'BROUILLON',
  `visibilite` tinyint(1) DEFAULT '0',
  `resultat_publie` tinyint(1) DEFAULT '0',
  `id_jauge` int DEFAULT NULL,
  `conclusions` text,
  `dateCreation` datetime DEFAULT NULL,
  `dateModification` datetime DEFAULT NULL,
  `dateOuverture` datetime DEFAULT NULL,
  `dateCloture` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `k_cal_session_site` (`id_site`),
  KEY `k_cal_session_grille` (`id_grille`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_cal_transaction`
--

DROP TABLE IF EXISTS `b_cal_transaction`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_cal_transaction` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_session` int NOT NULL,
  `identifiant_appel` varchar(100) NOT NULL,
  `descriptif` text NOT NULL,
  `numero_case` varchar(100) DEFAULT NULL,
  `numero_appel` varchar(100) DEFAULT NULL,
  `id_agent` int DEFAULT NULL,
  `date_appel` date DEFAULT NULL,
  `motif_appel` text,
  `ordre_passage` int NOT NULL DEFAULT '0',
  `dateCreation` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_cal_tx` (`id_session`,`identifiant_appel`),
  KEY `k_cal_tx_session` (`id_session`),
  CONSTRAINT `fk_cal_tx_session` FOREIGN KEY (`id_session`) REFERENCES `b_cal_session` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_categorie`
--

DROP TABLE IF EXISTS `b_categorie`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_categorie` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nom` varchar(100) DEFAULT NULL,
  `Etat` varchar(50) DEFAULT NULL,
  `dateCreationCategorie` datetime DEFAULT NULL,
  `dateModification` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_categorie_ressource`
--

DROP TABLE IF EXISTS `b_categorie_ressource`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_categorie_ressource` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nom` varchar(100) NOT NULL,
  `est_robot` tinyint(1) DEFAULT '0',
  `Etat` varchar(50) DEFAULT 'ACTIF',
  `dateCreation` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nom` (`nom`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_commentaire`
--

DROP TABLE IF EXISTS `b_commentaire`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_commentaire` (
  `id` int NOT NULL AUTO_INCREMENT,
  `message` text,
  `dateCommentaire` datetime DEFAULT NULL,
  `id_UTILISATEUR` int DEFAULT NULL,
  `id_FICHE` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `id_UTILISATEUR` (`id_UTILISATEUR`),
  KEY `id_FICHE` (`id_FICHE`),
  CONSTRAINT `B_COMMENTAIRE_ibfk_3` FOREIGN KEY (`id_UTILISATEUR`) REFERENCES `b_utilisateur` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `B_COMMENTAIRE_ibfk_4` FOREIGN KEY (`id_FICHE`) REFERENCES `b_fiche` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_controle`
--

DROP TABLE IF EXISTS `b_controle`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_controle` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_CONTROLE` bigint DEFAULT NULL,
  `id_Fiche` int DEFAULT NULL,
  `id_UTILISATEUR` int DEFAULT NULL,
  `typeControle` varchar(50) DEFAULT NULL,
  `exactitude` int DEFAULT NULL,
  `dateControle` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `id_Fiche` (`id_Fiche`),
  KEY `id_UTILISATEUR` (`id_UTILISATEUR`),
  CONSTRAINT `B_CONTROLE_ibfk_3` FOREIGN KEY (`id_Fiche`) REFERENCES `b_fiche` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `B_CONTROLE_ibfk_4` FOREIGN KEY (`id_UTILISATEUR`) REFERENCES `b_utilisateur` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_ev_action`
--

DROP TABLE IF EXISTS `b_ev_action`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_ev_action` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_Evaluation` int NOT NULL,
  `id_ActionType` int DEFAULT NULL,
  `action_libelle` varchar(255) DEFAULT NULL,
  `porteur` varchar(150) DEFAULT NULL,
  `contributeurs` varchar(255) DEFAULT NULL,
  `date_debut` date DEFAULT NULL,
  `date_attendue` date DEFAULT NULL,
  `date_realisation` date DEFAULT NULL,
  `statut` varchar(30) DEFAULT 'A_FAIRE',
  `kpi` varchar(255) DEFAULT NULL,
  `commentaire` text,
  `dateCreation` datetime DEFAULT NULL,
  `dateModification` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `id_Evaluation` (`id_Evaluation`),
  CONSTRAINT `b_ev_action_ibfk_1` FOREIGN KEY (`id_Evaluation`) REFERENCES `b_ev_evaluation` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_ev_action_type`
--

DROP TABLE IF EXISTS `b_ev_action_type`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_ev_action_type` (
  `id` int NOT NULL AUTO_INCREMENT,
  `libelle` varchar(150) NOT NULL,
  `Etat` varchar(50) DEFAULT 'ACTIF',
  `dateCreation` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `libelle` (`libelle`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_ev_agent`
--

DROP TABLE IF EXISTS `b_ev_agent`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_ev_agent` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nom` varchar(100) NOT NULL,
  `prenom` varchar(100) DEFAULT NULL,
  `login_genesys` varchar(100) DEFAULT NULL,
  `id_CategorieRessource` int DEFAULT NULL,
  `id_Site` int DEFAULT NULL,
  `Etat` varchar(50) DEFAULT 'ACTIF',
  `dateCreation` datetime DEFAULT NULL,
  `dateModification` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_ev_coaching`
--

DROP TABLE IF EXISTS `b_ev_coaching`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_ev_coaching` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_Evaluation` int NOT NULL,
  `cause_racine` text,
  `pourquoi1` varchar(255) DEFAULT NULL,
  `pourquoi2` varchar(255) DEFAULT NULL,
  `pourquoi3` varchar(255) DEFAULT NULL,
  `pourquoi4` varchar(255) DEFAULT NULL,
  `pourquoi5` varchar(255) DEFAULT NULL,
  `id_createur` int DEFAULT NULL,
  `dateCreation` datetime DEFAULT NULL,
  `dateModification` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id_Evaluation` (`id_Evaluation`),
  CONSTRAINT `b_ev_coaching_ibfk_1` FOREIGN KEY (`id_Evaluation`) REFERENCES `b_ev_evaluation` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_ev_contexte`
--

DROP TABLE IF EXISTS `b_ev_contexte`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_ev_contexte` (
  `id` int NOT NULL AUTO_INCREMENT,
  `libelle` varchar(150) NOT NULL,
  `Etat` varchar(50) DEFAULT 'ACTIF',
  `dateCreation` datetime DEFAULT NULL,
  `dateModification` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_ev_contre_evaluation`
--

DROP TABLE IF EXISTS `b_ev_contre_evaluation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_ev_contre_evaluation` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_Evaluation` int NOT NULL,
  `resolution` varchar(3) DEFAULT NULL,
  `conclusion` varchar(10) DEFAULT NULL,
  `score_global` decimal(6,2) DEFAULT NULL,
  `date_visibilite` date DEFAULT NULL,
  `statut` varchar(20) DEFAULT 'NON_TERMINE',
  `actif` tinyint(1) DEFAULT '1',
  `id_createur` int DEFAULT NULL,
  `date_creation` datetime DEFAULT NULL,
  `date_execution` datetime DEFAULT NULL,
  `date_modification` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `id_Evaluation` (`id_Evaluation`),
  CONSTRAINT `b_ev_contre_evaluation_ibfk_1` FOREIGN KEY (`id_Evaluation`) REFERENCES `b_ev_evaluation` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_ev_contre_resultat`
--

DROP TABLE IF EXISTS `b_ev_contre_resultat`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_ev_contre_resultat` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_ContreEvaluation` int NOT NULL,
  `id_SousItem` int NOT NULL,
  `conforme` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `id_ContreEvaluation` (`id_ContreEvaluation`),
  CONSTRAINT `b_ev_contre_resultat_ibfk_1` FOREIGN KEY (`id_ContreEvaluation`) REFERENCES `b_ev_contre_evaluation` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_ev_evaluateur`
--

DROP TABLE IF EXISTS `b_ev_evaluateur`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_ev_evaluateur` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nom` varchar(100) NOT NULL,
  `prenom` varchar(100) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `login` varchar(100) DEFAULT NULL,
  `id_Site` int DEFAULT NULL,
  `id_UTILISATEUR` int DEFAULT NULL,
  `Etat` varchar(50) DEFAULT 'ACTIF',
  `dateCreation` datetime DEFAULT NULL,
  `dateModification` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_ev_evaluation`
--

DROP TABLE IF EXISTS `b_ev_evaluation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_ev_evaluation` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_Contexte` int DEFAULT NULL,
  `id_Agent` int NOT NULL,
  `id_ModeleGrille` int DEFAULT NULL,
  `id_appel` varchar(100) DEFAULT NULL,
  `n_case` varchar(100) DEFAULT NULL,
  `date_appel` datetime DEFAULT NULL,
  `dmt` varchar(12) DEFAULT NULL,
  `motif_appel` varchar(255) DEFAULT NULL,
  `resolution` varchar(3) DEFAULT NULL,
  `conclusion` varchar(10) DEFAULT NULL,
  `score_global` decimal(6,2) DEFAULT NULL,
  `statut` varchar(20) DEFAULT 'NON_TERMINE',
  `actif` tinyint(1) DEFAULT '1',
  `id_createur` int DEFAULT NULL,
  `id_Evaluateur` int DEFAULT NULL,
  `date_creation` datetime DEFAULT NULL,
  `date_execution` datetime DEFAULT NULL,
  `date_modification` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_ev_notification`
--

DROP TABLE IF EXISTS `b_ev_notification`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_ev_notification` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_Evaluation` int NOT NULL,
  `id_UTILISATEUR` int NOT NULL,
  `titre` varchar(200) DEFAULT NULL,
  `message` varchar(255) DEFAULT NULL,
  `lu` tinyint(1) DEFAULT '0',
  `dateCreation` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `id_Evaluation` (`id_Evaluation`),
  CONSTRAINT `b_ev_notification_ibfk_1` FOREIGN KEY (`id_Evaluation`) REFERENCES `b_ev_evaluation` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_ev_resultat`
--

DROP TABLE IF EXISTS `b_ev_resultat`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_ev_resultat` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_Evaluation` int NOT NULL,
  `id_SousItem` int NOT NULL,
  `conforme` tinyint(1) DEFAULT '1',
  `commentaire` text,
  PRIMARY KEY (`id`),
  KEY `id_Evaluation` (`id_Evaluation`),
  CONSTRAINT `b_ev_resultat_ibfk_1` FOREIGN KEY (`id_Evaluation`) REFERENCES `b_ev_evaluation` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_eval_bi_arborescence`
--

DROP TABLE IF EXISTS `b_eval_bi_arborescence`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_eval_bi_arborescence` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_grille` int NOT NULL,
  `id_site` int NOT NULL,
  `point_depart_libelle` varchar(200) NOT NULL,
  `dateCreation` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id_grille` (`id_grille`,`id_site`),
  CONSTRAINT `b_eval_bi_arborescence_ibfk_1` FOREIGN KEY (`id_grille`) REFERENCES `b_eval_grille` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_eval_bi_option`
--

DROP TABLE IF EXISTS `b_eval_bi_option`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_eval_bi_option` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_arborescence` int NOT NULL,
  `id_parent` int DEFAULT NULL,
  `niveau` int NOT NULL,
  `libelle` varchar(255) NOT NULL,
  `etat` varchar(20) DEFAULT 'ACTIF',
  `propose_par` int DEFAULT NULL,
  `id_evaluation_origine` int DEFAULT NULL,
  `valide_par` int DEFAULT NULL,
  `motif_rejet` text,
  `dateCreation` datetime DEFAULT NULL,
  `dateDecision` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `id_arborescence` (`id_arborescence`),
  KEY `id_parent` (`id_parent`),
  KEY `id_evaluation_origine` (`id_evaluation_origine`),
  CONSTRAINT `b_eval_bi_option_ibfk_1` FOREIGN KEY (`id_arborescence`) REFERENCES `b_eval_bi_arborescence` (`id`),
  CONSTRAINT `b_eval_bi_option_ibfk_2` FOREIGN KEY (`id_parent`) REFERENCES `b_eval_bi_option` (`id`),
  CONSTRAINT `b_eval_bi_option_ibfk_3` FOREIGN KEY (`id_evaluation_origine`) REFERENCES `b_evaluation` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_eval_calendrier_mois`
--

DROP TABLE IF EXISTS `b_eval_calendrier_mois`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_eval_calendrier_mois` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_site` int NOT NULL,
  `mois` int NOT NULL,
  `libelle` varchar(20) DEFAULT NULL,
  `annee` int NOT NULL,
  `etat` varchar(10) DEFAULT 'FERME',
  `dateModification` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id_site` (`id_site`,`mois`,`annee`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_eval_categorie_erreur`
--

DROP TABLE IF EXISTS `b_eval_categorie_erreur`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_eval_categorie_erreur` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_grille` int NOT NULL,
  `libelle` varchar(200) NOT NULL,
  `poids` decimal(12,6) DEFAULT '0.000000',
  `seuil_reussite` decimal(12,6) DEFAULT '0.000000',
  `comparateur` varchar(2) DEFAULT '>',
  `critique` tinyint(1) DEFAULT '0',
  `ordre` int DEFAULT '0',
  `etat` varchar(10) DEFAULT 'ACTIF',
  `dateCreation` datetime DEFAULT NULL,
  `dateModification` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `id_grille` (`id_grille`),
  CONSTRAINT `b_eval_categorie_erreur_ibfk_1` FOREIGN KEY (`id_grille`) REFERENCES `b_eval_grille` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_eval_coaching`
--

DROP TABLE IF EXISTS `b_eval_coaching`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_eval_coaching` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_evaluation` int NOT NULL,
  `id_superviseur` int NOT NULL,
  `statut` varchar(30) DEFAULT 'NON_TERMINE',
  `dateCreation` datetime DEFAULT NULL,
  `dateCloture` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `id_evaluation` (`id_evaluation`),
  CONSTRAINT `b_eval_coaching_ibfk_1` FOREIGN KEY (`id_evaluation`) REFERENCES `b_evaluation` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_eval_coaching_niveau`
--

DROP TABLE IF EXISTS `b_eval_coaching_niveau`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_eval_coaching_niveau` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_coaching` int NOT NULL,
  `niveau` int NOT NULL,
  `id_option` int DEFAULT NULL,
  `libelle` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `id_coaching` (`id_coaching`),
  KEY `fk_coaching_niveau_option` (`id_option`),
  CONSTRAINT `b_eval_coaching_niveau_ibfk_1` FOREIGN KEY (`id_coaching`) REFERENCES `b_eval_coaching` (`id`),
  CONSTRAINT `fk_coaching_niveau_option` FOREIGN KEY (`id_option`) REFERENCES `b_eval_coaching_option` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_eval_coaching_option`
--

DROP TABLE IF EXISTS `b_eval_coaching_option`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_eval_coaching_option` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_parent` int DEFAULT NULL,
  `niveau` int NOT NULL,
  `libelle` varchar(255) NOT NULL,
  `etat` varchar(20) DEFAULT 'ACTIF',
  `propose_par` int DEFAULT NULL,
  `id_coaching_origine` int DEFAULT NULL,
  `valide_par` int DEFAULT NULL,
  `motif_rejet` text,
  `dateCreation` datetime DEFAULT NULL,
  `dateDecision` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `id_parent` (`id_parent`),
  KEY `id_coaching_origine` (`id_coaching_origine`),
  CONSTRAINT `b_eval_coaching_option_ibfk_1` FOREIGN KEY (`id_parent`) REFERENCES `b_eval_coaching_option` (`id`),
  CONSTRAINT `b_eval_coaching_option_ibfk_2` FOREIGN KEY (`id_coaching_origine`) REFERENCES `b_eval_coaching` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_eval_contre_bi`
--

DROP TABLE IF EXISTS `b_eval_contre_bi`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_eval_contre_bi` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_contre_evaluation` int NOT NULL,
  `niveau` int NOT NULL,
  `libelle` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `id_contre_evaluation` (`id_contre_evaluation`),
  CONSTRAINT `b_eval_contre_bi_ibfk_1` FOREIGN KEY (`id_contre_evaluation`) REFERENCES `b_eval_contre_evaluation` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_eval_contre_categorie`
--

DROP TABLE IF EXISTS `b_eval_contre_categorie`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_eval_contre_categorie` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_contre_evaluation` int NOT NULL,
  `libelle` varchar(200) NOT NULL,
  `poids` decimal(12,6) DEFAULT '0.000000',
  `seuil_reussite` decimal(12,6) DEFAULT '0.000000',
  `comparateur` varchar(2) DEFAULT '>',
  `critique` tinyint(1) DEFAULT '0',
  `score_obtenu` decimal(12,6) DEFAULT '0.000000',
  `nb_erreurs_decochees` int DEFAULT '0',
  `ordre` int DEFAULT '0',
  `id_categorie_origine` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `id_contre_evaluation` (`id_contre_evaluation`),
  CONSTRAINT `b_eval_contre_categorie_ibfk_1` FOREIGN KEY (`id_contre_evaluation`) REFERENCES `b_eval_contre_evaluation` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_eval_contre_erreur`
--

DROP TABLE IF EXISTS `b_eval_contre_erreur`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_eval_contre_erreur` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_contre_evaluation` int NOT NULL,
  `id_contre_categorie` int NOT NULL,
  `item` varchar(255) NOT NULL,
  `sous_item` varchar(255) DEFAULT NULL,
  `referentiel` text,
  `poids` decimal(12,6) DEFAULT '0.000000',
  `score_pct` decimal(12,6) DEFAULT '0.000000',
  `score_sur20` decimal(12,6) DEFAULT '0.000000',
  `libelle_sous_categorie` varchar(200) DEFAULT NULL,
  `poids_sous_categorie` decimal(12,6) DEFAULT '0.000000',
  `coche` tinyint(1) DEFAULT '1',
  `commentaire` text,
  `id_erreur_origine` int DEFAULT NULL,
  `id_sous_categorie_origine` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `id_contre_evaluation` (`id_contre_evaluation`),
  KEY `id_contre_categorie` (`id_contre_categorie`),
  CONSTRAINT `b_eval_contre_erreur_ibfk_1` FOREIGN KEY (`id_contre_evaluation`) REFERENCES `b_eval_contre_evaluation` (`id`),
  CONSTRAINT `b_eval_contre_erreur_ibfk_2` FOREIGN KEY (`id_contre_categorie`) REFERENCES `b_eval_contre_categorie` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_eval_contre_evaluation`
--

DROP TABLE IF EXISTS `b_eval_contre_evaluation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_eval_contre_evaluation` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_evaluation_initiale` int NOT NULL,
  `id_responsable` int NOT NULL,
  `statut` varchar(30) DEFAULT 'NON_TERMINE',
  `resolution` varchar(3) DEFAULT NULL,
  `synthese` text,
  `conclusion` varchar(10) DEFAULT NULL,
  `date_visibilite` datetime DEFAULT NULL,
  `date_creation` datetime DEFAULT NULL,
  `date_evaluation` datetime DEFAULT NULL,
  `actif` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `id_evaluation_initiale` (`id_evaluation_initiale`),
  CONSTRAINT `b_eval_contre_evaluation_ibfk_1` FOREIGN KEY (`id_evaluation_initiale`) REFERENCES `b_evaluation` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_eval_erreur`
--

DROP TABLE IF EXISTS `b_eval_erreur`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_eval_erreur` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_sous_categorie_erreur` int NOT NULL,
  `item` varchar(255) NOT NULL,
  `sous_item` varchar(255) DEFAULT NULL,
  `referentiel` text,
  `poids_calcule` decimal(12,6) DEFAULT '0.000000',
  `poids_saisi` decimal(12,6) DEFAULT NULL,
  `etat` varchar(10) DEFAULT 'ACTIF',
  `dateCreation` datetime DEFAULT NULL,
  `dateModification` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `id_sous_categorie_erreur` (`id_sous_categorie_erreur`),
  CONSTRAINT `b_eval_erreur_ibfk_1` FOREIGN KEY (`id_sous_categorie_erreur`) REFERENCES `b_eval_sous_categorie_erreur` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_eval_grille`
--

DROP TABLE IF EXISTS `b_eval_grille`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_eval_grille` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nom` varchar(150) NOT NULL,
  `mode_ponderation` varchar(10) DEFAULT 'AUTO',
  `type_ressource_cible` varchar(15) DEFAULT 'HUMAINE',
  `statut` varchar(10) DEFAULT 'BROUILLON',
  `etat` varchar(10) DEFAULT 'ACTIF',
  `dateCreation` datetime DEFAULT NULL,
  `dateModification` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_eval_lettre_modele`
--

DROP TABLE IF EXISTS `b_eval_lettre_modele`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_eval_lettre_modele` (
  `id` int NOT NULL AUTO_INCREMENT,
  `type` varchar(20) NOT NULL,
  `texte` text,
  `dateModification` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `type` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_eval_param_systeme`
--

DROP TABLE IF EXISTS `b_eval_param_systeme`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_eval_param_systeme` (
  `id` int NOT NULL AUTO_INCREMENT,
  `cle` varchar(80) NOT NULL,
  `valeur` varchar(255) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `dateModification` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `cle` (`cle`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_eval_plan_action_contributeur`
--

DROP TABLE IF EXISTS `b_eval_plan_action_contributeur`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_eval_plan_action_contributeur` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_ligne` int NOT NULL,
  `id_utilisateur` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `id_ligne` (`id_ligne`),
  CONSTRAINT `b_eval_plan_action_contributeur_ibfk_1` FOREIGN KEY (`id_ligne`) REFERENCES `b_eval_plan_action_ligne` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_eval_plan_action_ligne`
--

DROP TABLE IF EXISTS `b_eval_plan_action_ligne`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_eval_plan_action_ligne` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_evaluation` int NOT NULL,
  `id_action` int DEFAULT NULL,
  `id_porteur` int DEFAULT NULL,
  `date_debut` datetime DEFAULT NULL,
  `date_attendue` datetime DEFAULT NULL,
  `date_realisation` datetime DEFAULT NULL,
  `id_statut` int DEFAULT NULL,
  `id_kpi` int DEFAULT NULL,
  `commentaire` text,
  `synthese` text,
  `dateCreation` datetime DEFAULT NULL,
  `dateModification` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `id_evaluation` (`id_evaluation`),
  KEY `id_action` (`id_action`),
  KEY `id_statut` (`id_statut`),
  KEY `id_kpi` (`id_kpi`),
  CONSTRAINT `b_eval_plan_action_ligne_ibfk_1` FOREIGN KEY (`id_evaluation`) REFERENCES `b_evaluation` (`id`),
  CONSTRAINT `b_eval_plan_action_ligne_ibfk_2` FOREIGN KEY (`id_action`) REFERENCES `b_eval_ref_action_pa` (`id`),
  CONSTRAINT `b_eval_plan_action_ligne_ibfk_3` FOREIGN KEY (`id_statut`) REFERENCES `b_eval_ref_statut_pa` (`id`),
  CONSTRAINT `b_eval_plan_action_ligne_ibfk_4` FOREIGN KEY (`id_kpi`) REFERENCES `b_eval_ref_kpi` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_eval_politique_fermeture`
--

DROP TABLE IF EXISTS `b_eval_politique_fermeture`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_eval_politique_fermeture` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_site` int NOT NULL,
  `politique` varchar(30) DEFAULT 'MOIS_COURANT',
  `dateModification` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id_site` (`id_site`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_eval_ref_action_pa`
--

DROP TABLE IF EXISTS `b_eval_ref_action_pa`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_eval_ref_action_pa` (
  `id` int NOT NULL AUTO_INCREMENT,
  `libelle` varchar(150) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `ordre` int DEFAULT '0',
  `etat` varchar(10) DEFAULT 'ACTIF',
  `dateCreation` datetime DEFAULT NULL,
  `dateModification` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_eval_ref_action_pa_ordre_id` (`ordre`,`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_eval_ref_contexte`
--

DROP TABLE IF EXISTS `b_eval_ref_contexte`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_eval_ref_contexte` (
  `id` int NOT NULL AUTO_INCREMENT,
  `libelle` varchar(150) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `ordre` int DEFAULT '0',
  `etat` varchar(10) DEFAULT 'ACTIF',
  `dateCreation` datetime DEFAULT NULL,
  `dateModification` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_eval_ref_kpi`
--

DROP TABLE IF EXISTS `b_eval_ref_kpi`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_eval_ref_kpi` (
  `id` int NOT NULL AUTO_INCREMENT,
  `libelle` varchar(150) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `ordre` int DEFAULT '0',
  `etat` varchar(10) DEFAULT 'ACTIF',
  `dateCreation` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_eval_ref_nature_ressource`
--

DROP TABLE IF EXISTS `b_eval_ref_nature_ressource`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_eval_ref_nature_ressource` (
  `id` int NOT NULL AUTO_INCREMENT,
  `libelle` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `ordre` int DEFAULT '0',
  `etat` varchar(10) DEFAULT 'ACTIF',
  `dateCreation` datetime DEFAULT NULL,
  `dateModification` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_eval_ref_statut_evaluation`
--

DROP TABLE IF EXISTS `b_eval_ref_statut_evaluation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_eval_ref_statut_evaluation` (
  `id` int NOT NULL AUTO_INCREMENT,
  `libelle` varchar(60) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `ordre` int DEFAULT '0',
  `etat` varchar(10) DEFAULT 'ACTIF',
  `dateCreation` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_eval_ref_statut_pa`
--

DROP TABLE IF EXISTS `b_eval_ref_statut_pa`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_eval_ref_statut_pa` (
  `id` int NOT NULL AUTO_INCREMENT,
  `libelle` varchar(60) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `ordre` int DEFAULT '0',
  `etat` varchar(10) DEFAULT 'ACTIF',
  `dateCreation` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_eval_ref_type_evaluation`
--

DROP TABLE IF EXISTS `b_eval_ref_type_evaluation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_eval_ref_type_evaluation` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(40) NOT NULL,
  `libelle` varchar(100) NOT NULL,
  `etat` varchar(10) DEFAULT 'ACTIF',
  `dateCreation` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_eval_sous_categorie_erreur`
--

DROP TABLE IF EXISTS `b_eval_sous_categorie_erreur`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_eval_sous_categorie_erreur` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_categorie_erreur` int NOT NULL,
  `libelle` varchar(200) NOT NULL,
  `poids_calcule` decimal(12,6) DEFAULT '0.000000',
  `poids_saisi` decimal(12,6) DEFAULT NULL,
  `etat` varchar(10) DEFAULT 'ACTIF',
  `dateCreation` datetime DEFAULT NULL,
  `dateModification` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `id_categorie_erreur` (`id_categorie_erreur`),
  CONSTRAINT `b_eval_sous_categorie_erreur_ibfk_1` FOREIGN KEY (`id_categorie_erreur`) REFERENCES `b_eval_categorie_erreur` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_evaluation`
--

DROP TABLE IF EXISTS `b_evaluation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_evaluation` (
  `id` int NOT NULL AUTO_INCREMENT,
  `type_ressource` varchar(15) NOT NULL,
  `id_nature_ressource` int DEFAULT NULL,
  `id_agent` int DEFAULT NULL,
  `id_evaluateur` int NOT NULL,
  `id_site` int DEFAULT NULL,
  `id_programme` int DEFAULT NULL,
  `id_grille_origine` int DEFAULT NULL,
  `id_contexte` int DEFAULT NULL,
  `identifiant_appel` varchar(100) DEFAULT NULL,
  `numero_case` varchar(100) DEFAULT NULL,
  `numero_appel` varchar(100) DEFAULT NULL,
  `motif_appel` text,
  `date_appel` datetime DEFAULT NULL,
  `dmt` int DEFAULT '0',
  `id_type_evaluation` int DEFAULT NULL,
  `id_evaluation_parente` int DEFAULT NULL,
  `nb_supplementaires_attendues` int DEFAULT NULL,
  `statut` varchar(30) DEFAULT 'NON_TERMINE',
  `conclusion` varchar(10) DEFAULT NULL,
  `resolution` varchar(3) DEFAULT NULL,
  `statut_apres_evaluation` varchar(20) DEFAULT 'NON_VALIDER',
  `synthese` text,
  `avis_agent` text,
  `date_avis` datetime DEFAULT NULL,
  `date_creation` datetime DEFAULT NULL,
  `date_evaluation` datetime DEFAULT NULL,
  `actif` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `id_nature_ressource` (`id_nature_ressource`),
  KEY `id_grille_origine` (`id_grille_origine`),
  KEY `id_contexte` (`id_contexte`),
  KEY `id_type_evaluation` (`id_type_evaluation`),
  KEY `id_evaluation_parente` (`id_evaluation_parente`),
  CONSTRAINT `b_evaluation_ibfk_1` FOREIGN KEY (`id_nature_ressource`) REFERENCES `b_eval_ref_nature_ressource` (`id`),
  CONSTRAINT `b_evaluation_ibfk_2` FOREIGN KEY (`id_grille_origine`) REFERENCES `b_eval_grille` (`id`),
  CONSTRAINT `b_evaluation_ibfk_3` FOREIGN KEY (`id_contexte`) REFERENCES `b_eval_ref_contexte` (`id`),
  CONSTRAINT `b_evaluation_ibfk_4` FOREIGN KEY (`id_type_evaluation`) REFERENCES `b_eval_ref_type_evaluation` (`id`),
  CONSTRAINT `b_evaluation_ibfk_5` FOREIGN KEY (`id_evaluation_parente`) REFERENCES `b_evaluation` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_evaluation_avis_histo`
--

DROP TABLE IF EXISTS `b_evaluation_avis_histo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_evaluation_avis_histo` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_evaluation` int NOT NULL,
  `avis` text,
  `dateSaisie` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `id_evaluation` (`id_evaluation`),
  CONSTRAINT `b_evaluation_avis_histo_ibfk_1` FOREIGN KEY (`id_evaluation`) REFERENCES `b_evaluation` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_evaluation_bi`
--

DROP TABLE IF EXISTS `b_evaluation_bi`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_evaluation_bi` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_evaluation` int NOT NULL,
  `niveau` int NOT NULL,
  `id_option` int DEFAULT NULL,
  `libelle` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `id_evaluation` (`id_evaluation`),
  KEY `fk_evaluation_bi_option` (`id_option`),
  CONSTRAINT `b_evaluation_bi_ibfk_1` FOREIGN KEY (`id_evaluation`) REFERENCES `b_evaluation` (`id`),
  CONSTRAINT `fk_evaluation_bi_option` FOREIGN KEY (`id_option`) REFERENCES `b_eval_bi_option` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_evaluation_categorie`
--

DROP TABLE IF EXISTS `b_evaluation_categorie`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_evaluation_categorie` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_evaluation` int NOT NULL,
  `libelle` varchar(200) NOT NULL,
  `poids` decimal(12,6) DEFAULT '0.000000',
  `seuil_reussite` decimal(12,6) DEFAULT '0.000000',
  `comparateur` varchar(2) DEFAULT '>',
  `critique` tinyint(1) DEFAULT '0',
  `score_obtenu` decimal(12,6) DEFAULT '0.000000',
  `nb_erreurs_decochees` int DEFAULT '0',
  `ordre` int DEFAULT '0',
  `id_categorie_origine` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `id_evaluation` (`id_evaluation`),
  CONSTRAINT `b_evaluation_categorie_ibfk_1` FOREIGN KEY (`id_evaluation`) REFERENCES `b_evaluation` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_evaluation_erreur`
--

DROP TABLE IF EXISTS `b_evaluation_erreur`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_evaluation_erreur` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_evaluation` int NOT NULL,
  `id_evaluation_categorie` int NOT NULL,
  `item` varchar(255) NOT NULL,
  `sous_item` varchar(255) DEFAULT NULL,
  `referentiel` text,
  `poids` decimal(12,6) DEFAULT '0.000000',
  `score_pct` decimal(12,6) DEFAULT '0.000000',
  `score_sur20` decimal(12,6) DEFAULT '0.000000',
  `libelle_sous_categorie` varchar(200) DEFAULT NULL,
  `poids_sous_categorie` decimal(12,6) DEFAULT '0.000000',
  `coche` tinyint(1) DEFAULT '1',
  `commentaire` text,
  `id_erreur_origine` int DEFAULT NULL,
  `id_sous_categorie_origine` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `id_evaluation` (`id_evaluation`),
  KEY `id_evaluation_categorie` (`id_evaluation_categorie`),
  CONSTRAINT `b_evaluation_erreur_ibfk_1` FOREIGN KEY (`id_evaluation`) REFERENCES `b_evaluation` (`id`),
  CONSTRAINT `b_evaluation_erreur_ibfk_2` FOREIGN KEY (`id_evaluation_categorie`) REFERENCES `b_evaluation_categorie` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_fiche`
--

DROP TABLE IF EXISTS `b_fiche`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_fiche` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_gestionnaire` int DEFAULT NULL,
  `titre` varchar(100) DEFAULT NULL,
  `dateReception` datetime DEFAULT NULL,
  `dateDebut` datetime DEFAULT NULL,
  `dateVisibilite` datetime DEFAULT NULL,
  `dateFin` datetime DEFAULT NULL,
  `dateEnregistrement` datetime DEFAULT NULL,
  `dateModification` datetime DEFAULT NULL,
  `id_Categorie` int DEFAULT NULL,
  `id_SousCategorie` int DEFAULT NULL,
  `id_Sla` int DEFAULT NULL,
  `ETAT` varchar(10) DEFAULT NULL,
  `Niveau` varchar(10) DEFAULT NULL,
  `AccesSite` varchar(100) DEFAULT NULL,
  `AccesProfil` varchar(100) DEFAULT NULL,
  `AccesUtilite` varchar(100) DEFAULT NULL,
  `AccesQuiz` varchar(100) DEFAULT NULL,
  `AccesCommentaire` varchar(100) DEFAULT NULL,
  `date_Archive` datetime DEFAULT NULL,
  `archive_par` varchar(50) DEFAULT NULL,
  `url` varchar(250) DEFAULT NULL,
  `extention` varchar(10) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `id_Categorie` (`id_Categorie`),
  KEY `id_SousCategorie` (`id_SousCategorie`),
  KEY `id_Sla` (`id_Sla`),
  KEY `id_gestionnaire` (`id_gestionnaire`),
  KEY `idx_fiche_datefin_etat` (`dateFin`,`ETAT`),
  CONSTRAINT `B_FICHE_ibfk_2` FOREIGN KEY (`id_Categorie`) REFERENCES `b_categorie` (`id`),
  CONSTRAINT `B_FICHE_ibfk_3` FOREIGN KEY (`id_SousCategorie`) REFERENCES `b_sous_categorie` (`id`),
  CONSTRAINT `B_FICHE_ibfk_4` FOREIGN KEY (`id_Sla`) REFERENCES `b_sla` (`id`),
  CONSTRAINT `B_FICHE_ibfk_5` FOREIGN KEY (`id_gestionnaire`) REFERENCES `b_utilisateur` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = latin1 */ ;
/*!50003 SET character_set_results = latin1 */ ;
/*!50003 SET collation_connection  = latin1_swedish_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50003 TRIGGER `trg_fiche_garder_archive` BEFORE UPDATE ON `b_fiche` FOR EACH ROW BEGIN
  IF OLD.ETAT = 'ARCHIVE' AND NEW.ETAT = 'ARCHIVE' AND NEW.archive_par = 'Systme' THEN
    SET NEW.date_Archive = OLD.date_Archive, NEW.archive_par = OLD.archive_par;
  END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `b_fonction`
--

DROP TABLE IF EXISTS `b_fonction`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_fonction` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nom` varchar(100) DEFAULT NULL,
  `Role_Associe` varchar(100) DEFAULT NULL,
  `Permissions_Associe` text,
  `Etat` varchar(50) DEFAULT NULL,
  `dateCreation` datetime DEFAULT NULL,
  `dateModification` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_habilitation_observation`
--

DROP TABLE IF EXISTS `b_habilitation_observation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_habilitation_observation` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_utilisateur` int DEFAULT NULL,
  `role_code` varchar(60) DEFAULT NULL,
  `permission` varchar(120) NOT NULL,
  `methode` varchar(10) DEFAULT NULL,
  `chemin` varchar(255) DEFAULT NULL,
  `dateReception` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `k_obs_perm` (`permission`),
  KEY `k_obs_user` (`id_utilisateur`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_historique`
--

DROP TABLE IF EXISTS `b_historique`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_historique` (
  `id` int NOT NULL AUTO_INCREMENT,
  `dateConsultation` datetime DEFAULT NULL,
  `id_UTILISATEUR` int DEFAULT NULL,
  `id_FICHE` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `id_UTILISATEUR` (`id_UTILISATEUR`),
  KEY `id_FICHE` (`id_FICHE`),
  CONSTRAINT `B_HISTORIQUE_ibfk_3` FOREIGN KEY (`id_UTILISATEUR`) REFERENCES `b_utilisateur` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `B_HISTORIQUE_ibfk_4` FOREIGN KEY (`id_FICHE`) REFERENCES `b_fiche` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_ma_voix_compte`
--

DROP TABLE IF EXISTS `b_ma_voix_compte`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_ma_voix_compte` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_UTILISATEUR` int DEFAULT NULL,
  `motif_ma_voix_compte` varchar(100) DEFAULT NULL,
  `message` text,
  `dateCreation` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `id_UTILISATEUR` (`id_UTILISATEUR`),
  CONSTRAINT `B_MA_VOIX_COMPTE_ibfk_1` FOREIGN KEY (`id_UTILISATEUR`) REFERENCES `b_utilisateur` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_mg_categorie_erreur`
--

DROP TABLE IF EXISTS `b_mg_categorie_erreur`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_mg_categorie_erreur` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_ModeleGrille` int NOT NULL,
  `nom` varchar(255) NOT NULL,
  `poids` double DEFAULT '0',
  `ordre` int DEFAULT '0',
  `dateCreation` datetime DEFAULT NULL,
  `dateModification` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `id_ModeleGrille` (`id_ModeleGrille`),
  CONSTRAINT `b_mg_categorie_erreur_ibfk_1` FOREIGN KEY (`id_ModeleGrille`) REFERENCES `b_modele_grille` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_mg_categorie_ressource`
--

DROP TABLE IF EXISTS `b_mg_categorie_ressource`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_mg_categorie_ressource` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_ModeleGrille` int NOT NULL,
  `id_CategorieRessource` int NOT NULL,
  `dateCreation` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `id_ModeleGrille` (`id_ModeleGrille`),
  KEY `id_CategorieRessource` (`id_CategorieRessource`),
  CONSTRAINT `b_mg_categorie_ressource_ibfk_1` FOREIGN KEY (`id_ModeleGrille`) REFERENCES `b_modele_grille` (`id`) ON DELETE CASCADE,
  CONSTRAINT `b_mg_categorie_ressource_ibfk_2` FOREIGN KEY (`id_CategorieRessource`) REFERENCES `b_categorie_ressource` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_mg_critere_regle`
--

DROP TABLE IF EXISTS `b_mg_critere_regle`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_mg_critere_regle` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_ModeleGrille` int NOT NULL,
  `type_ecart` varchar(255) NOT NULL,
  `operateur` varchar(5) DEFAULT '>',
  `valeur_objectif` decimal(7,3) DEFAULT NULL,
  `libelle_echec` varchar(255) DEFAULT NULL,
  `libelle_reussite` varchar(255) DEFAULT NULL,
  `ordre` int DEFAULT '0',
  `dateCreation` datetime DEFAULT NULL,
  `dateModification` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `id_ModeleGrille` (`id_ModeleGrille`),
  CONSTRAINT `b_mg_critere_regle_ibfk_1` FOREIGN KEY (`id_ModeleGrille`) REFERENCES `b_modele_grille` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_mg_erreur`
--

DROP TABLE IF EXISTS `b_mg_erreur`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_mg_erreur` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_CategorieErreur` int NOT NULL,
  `nom` varchar(255) NOT NULL,
  `poids` double DEFAULT '0',
  `ordre` int DEFAULT '0',
  `dateCreation` datetime DEFAULT NULL,
  `dateModification` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `id_CategorieErreur` (`id_CategorieErreur`),
  CONSTRAINT `b_mg_erreur_ibfk_1` FOREIGN KEY (`id_CategorieErreur`) REFERENCES `b_mg_categorie_erreur` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_mg_item`
--

DROP TABLE IF EXISTS `b_mg_item`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_mg_item` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_Erreur` int NOT NULL,
  `nom` varchar(500) NOT NULL,
  `poids` double DEFAULT '0',
  `ordre` int DEFAULT '0',
  `dateCreation` datetime DEFAULT NULL,
  `dateModification` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `id_Erreur` (`id_Erreur`),
  CONSTRAINT `b_mg_item_ibfk_1` FOREIGN KEY (`id_Erreur`) REFERENCES `b_mg_erreur` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_mg_pourquoi`
--

DROP TABLE IF EXISTS `b_mg_pourquoi`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_mg_pourquoi` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_ModeleGrille` int NOT NULL,
  `niveau` int NOT NULL,
  `libelle` varchar(255) NOT NULL,
  `id_parent` int DEFAULT NULL,
  `ordre` int DEFAULT '0',
  `dateCreation` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `id_ModeleGrille` (`id_ModeleGrille`),
  KEY `id_parent` (`id_parent`),
  CONSTRAINT `b_mg_pourquoi_ibfk_1` FOREIGN KEY (`id_ModeleGrille`) REFERENCES `b_modele_grille` (`id`) ON DELETE CASCADE,
  CONSTRAINT `b_mg_pourquoi_ibfk_2` FOREIGN KEY (`id_parent`) REFERENCES `b_mg_pourquoi` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_mg_sous_item`
--

DROP TABLE IF EXISTS `b_mg_sous_item`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_mg_sous_item` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_Item` int NOT NULL,
  `nom` varchar(500) NOT NULL,
  `referentiel` text,
  `poids` double DEFAULT '0',
  `ordre` int DEFAULT '0',
  `dateCreation` datetime DEFAULT NULL,
  `dateModification` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `id_Item` (`id_Item`),
  CONSTRAINT `b_mg_sous_item_ibfk_1` FOREIGN KEY (`id_Item`) REFERENCES `b_mg_item` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_motif_ma_voix_compte`
--

DROP TABLE IF EXISTS `b_motif_ma_voix_compte`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_motif_ma_voix_compte` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nomMotif` varchar(50) DEFAULT NULL,
  `dateCreation` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_notification`
--

DROP TABLE IF EXISTS `b_notification`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_notification` (
  `id` int NOT NULL AUTO_INCREMENT,
  `titre` varchar(100) DEFAULT NULL,
  `message` text,
  `type` varchar(20) DEFAULT NULL,
  `nature_objet` varchar(50) DEFAULT NULL,
  `id_objet` int DEFAULT NULL,
  `dateReception` datetime DEFAULT NULL,
  `id_UTILISATEUR` int DEFAULT NULL,
  `id_FICHE` int DEFAULT NULL,
  `url` longtext,
  `lu` tinyint(1) DEFAULT '0',
  `dateLecture` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `id_UTILISATEUR` (`id_UTILISATEUR`),
  KEY `id_FICHE` (`id_FICHE`),
  KEY `idx_notification_module` (`id_UTILISATEUR`,`nature_objet`,`lu`),
  CONSTRAINT `B_NOTIFICATION_ibfk_3` FOREIGN KEY (`id_UTILISATEUR`) REFERENCES `b_utilisateur` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `B_NOTIFICATION_ibfk_4` FOREIGN KEY (`id_FICHE`) REFERENCES `b_fiche` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_notifications`
--

DROP TABLE IF EXISTS `b_notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_notifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_UTILISATEUR` int NOT NULL,
  `id_NOTIFICATION` int NOT NULL,
  `id_FICHE` int NOT NULL,
  `titre` varchar(255) NOT NULL,
  `createdBy` int NOT NULL,
  `isRead` tinyint(1) DEFAULT '0',
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `readAt` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `id_FICHE` (`id_FICHE`),
  KEY `id_NOTIFICATION` (`id_NOTIFICATION`),
  KEY `createdBy` (`createdBy`),
  KEY `idx_user_read` (`id_UTILISATEUR`,`isRead`),
  KEY `idx_created_at` (`createdAt` DESC),
  CONSTRAINT `B_notifications_ibfk_1` FOREIGN KEY (`id_UTILISATEUR`) REFERENCES `b_utilisateur` (`id`) ON DELETE CASCADE,
  CONSTRAINT `B_notifications_ibfk_2` FOREIGN KEY (`id_FICHE`) REFERENCES `b_fiche` (`id`) ON DELETE CASCADE,
  CONSTRAINT `B_notifications_ibfk_3` FOREIGN KEY (`id_NOTIFICATION`) REFERENCES `b_notification` (`id`) ON DELETE CASCADE,
  CONSTRAINT `B_notifications_ibfk_4` FOREIGN KEY (`createdBy`) REFERENCES `b_utilisateur` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_on_time`
--

DROP TABLE IF EXISTS `b_on_time`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_on_time` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_Fiche` int DEFAULT NULL,
  `temps` int DEFAULT NULL,
  `date_effective` datetime DEFAULT NULL,
  `id_Sla` int DEFAULT NULL,
  `delai` int DEFAULT NULL,
  `on_time` varchar(10) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `id_Sla` (`id_Sla`),
  KEY `id_Fiche` (`id_Fiche`),
  CONSTRAINT `B_ON_TIME_ibfk_2` FOREIGN KEY (`id_Sla`) REFERENCES `b_sla` (`id`),
  CONSTRAINT `B_ON_TIME_ibfk_3` FOREIGN KEY (`id_Fiche`) REFERENCES `b_fiche` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_param_habilitation`
--

DROP TABLE IF EXISTS `b_param_habilitation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_param_habilitation` (
  `cle` varchar(80) NOT NULL,
  `valeur` varchar(255) NOT NULL,
  PRIMARY KEY (`cle`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_permission`
--

DROP TABLE IF EXISTS `b_permission`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_permission` (
  `id` int NOT NULL AUTO_INCREMENT,
  `module` varchar(60) NOT NULL,
  `action` varchar(60) NOT NULL,
  `code` varchar(120) NOT NULL,
  `libelle` varchar(255) NOT NULL,
  `description` varchar(500) DEFAULT NULL,
  `etat` varchar(20) NOT NULL DEFAULT 'ACTIF',
  `dateCreation` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_permission_code` (`code`),
  UNIQUE KEY `uq_permission_mod_act` (`module`,`action`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_programme`
--

DROP TABLE IF EXISTS `b_programme`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_programme` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nom` varchar(50) DEFAULT NULL,
  `description` text,
  `Etat` varchar(50) DEFAULT NULL,
  `dateCreation` datetime DEFAULT NULL,
  `dateModification` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_quiz`
--

DROP TABLE IF EXISTS `b_quiz`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_quiz` (
  `id` int NOT NULL AUTO_INCREMENT,
  `libelleQuestion` text,
  `reponseQuestion` text,
  `dateCreation` datetime DEFAULT NULL,
  `id_Fiche` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `id_Fiche` (`id_Fiche`),
  CONSTRAINT `B_QUIZ_ibfk_1` FOREIGN KEY (`id_Fiche`) REFERENCES `b_fiche` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_qz_badge`
--

DROP TABLE IF EXISTS `b_qz_badge`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_qz_badge` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(40) NOT NULL,
  `nom` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `icone` varchar(50) DEFAULT NULL,
  `condition_type` varchar(30) NOT NULL,
  `condition_valeur` int DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_qz_badge_utilisateur`
--

DROP TABLE IF EXISTS `b_qz_badge_utilisateur`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_qz_badge_utilisateur` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_Badge` int NOT NULL,
  `id_UTILISATEUR` int NOT NULL,
  `dateObtention` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id_Badge` (`id_Badge`,`id_UTILISATEUR`),
  CONSTRAINT `b_qz_badge_utilisateur_ibfk_1` FOREIGN KEY (`id_Badge`) REFERENCES `b_qz_badge` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_qz_ip_autorisee`
--

DROP TABLE IF EXISTS `b_qz_ip_autorisee`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_qz_ip_autorisee` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_Quiz` int NOT NULL,
  `adresse_ip` varchar(64) NOT NULL,
  `libelle` varchar(150) DEFAULT NULL,
  `dateCreation` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_quiz_ip` (`id_Quiz`,`adresse_ip`),
  CONSTRAINT `fk_qz_ip_quiz` FOREIGN KEY (`id_Quiz`) REFERENCES `b_qz_quiz` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_qz_ip_demande`
--

DROP TABLE IF EXISTS `b_qz_ip_demande`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_qz_ip_demande` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_Quiz` int NOT NULL,
  `id_UTILISATEUR` int NOT NULL,
  `adresse_ip` varchar(64) NOT NULL,
  `statut` varchar(20) NOT NULL DEFAULT 'EN_ATTENTE',
  `dateCreation` datetime DEFAULT NULL,
  `dateTraitement` datetime DEFAULT NULL,
  `id_traitePar` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_dem` (`id_Quiz`,`id_UTILISATEUR`,`adresse_ip`,`statut`),
  CONSTRAINT `fk_qz_ipdem_quiz` FOREIGN KEY (`id_Quiz`) REFERENCES `b_qz_quiz` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_qz_notification`
--

DROP TABLE IF EXISTS `b_qz_notification`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_qz_notification` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_Quiz` int NOT NULL,
  `id_UTILISATEUR` int NOT NULL,
  `titre` varchar(200) DEFAULT NULL,
  `message` varchar(255) DEFAULT NULL,
  `lu` tinyint(1) DEFAULT '0',
  `dateCreation` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `id_Quiz` (`id_Quiz`),
  CONSTRAINT `b_qz_notification_ibfk_1` FOREIGN KEY (`id_Quiz`) REFERENCES `b_qz_quiz` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_qz_option`
--

DROP TABLE IF EXISTS `b_qz_option`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_qz_option` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_Question` int NOT NULL,
  `libelle` varchar(255) NOT NULL,
  `est_correcte` tinyint(1) DEFAULT '0',
  `ordre` int DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `id_Question` (`id_Question`),
  CONSTRAINT `b_qz_option_ibfk_1` FOREIGN KEY (`id_Question`) REFERENCES `b_qz_question` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_qz_question`
--

DROP TABLE IF EXISTS `b_qz_question`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_qz_question` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_Quiz` int NOT NULL,
  `type` varchar(20) DEFAULT 'VRAI_FAUX',
  `libelle` text NOT NULL,
  `ordre` int DEFAULT '0',
  `dateCreation` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `id_Quiz` (`id_Quiz`),
  CONSTRAINT `b_qz_question_ibfk_1` FOREIGN KEY (`id_Quiz`) REFERENCES `b_qz_quiz` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_qz_quiz`
--

DROP TABLE IF EXISTS `b_qz_quiz`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_qz_quiz` (
  `id` int NOT NULL AUTO_INCREMENT,
  `titre` varchar(200) NOT NULL,
  `code_pin` varchar(10) DEFAULT NULL,
  `type` varchar(50) DEFAULT NULL,
  `description` text,
  `id_Fiche` int DEFAULT NULL,
  `note_passage` int DEFAULT '70',
  `retest_auto` tinyint(1) DEFAULT '1',
  `nb_retest_max` int DEFAULT '1',
  `duree` int DEFAULT NULL,
  `date_fermeture` datetime DEFAULT NULL,
  `acces` varchar(20) DEFAULT 'PRIVATE',
  `alterner_questions` tinyint(1) DEFAULT '0',
  `autoriser_machines` tinyint(1) DEFAULT '0',
  `Etat` varchar(50) DEFAULT 'ACTIF',
  `id_createur` int DEFAULT NULL,
  `dateCreation` datetime DEFAULT NULL,
  `dateModification` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_qz_quiz_fiche`
--

DROP TABLE IF EXISTS `b_qz_quiz_fiche`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_qz_quiz_fiche` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_Quiz` int NOT NULL,
  `id_Fiche` int NOT NULL,
  `dateCreation` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `id_Quiz` (`id_Quiz`),
  CONSTRAINT `b_qz_quiz_fiche_ibfk_1` FOREIGN KEY (`id_Quiz`) REFERENCES `b_qz_quiz` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_qz_quiz_site`
--

DROP TABLE IF EXISTS `b_qz_quiz_site`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_qz_quiz_site` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_Quiz` int NOT NULL,
  `id_Site` int NOT NULL,
  `dateCreation` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_quiz_site` (`id_Quiz`,`id_Site`),
  CONSTRAINT `fk_qz_site_quiz` FOREIGN KEY (`id_Quiz`) REFERENCES `b_qz_quiz` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_qz_reponse`
--

DROP TABLE IF EXISTS `b_qz_reponse`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_qz_reponse` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_Tentative` int NOT NULL,
  `id_Question` int NOT NULL,
  `id_Option` int DEFAULT NULL,
  `est_correcte` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `id_Tentative` (`id_Tentative`),
  CONSTRAINT `b_qz_reponse_ibfk_1` FOREIGN KEY (`id_Tentative`) REFERENCES `b_qz_tentative` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_qz_retest`
--

DROP TABLE IF EXISTS `b_qz_retest`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_qz_retest` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_Quiz` int NOT NULL,
  `id_UTILISATEUR` int NOT NULL,
  `autorise_par` int DEFAULT NULL,
  `date_autorisation` datetime DEFAULT NULL,
  `consomme` tinyint(1) DEFAULT '0',
  `date_consommation` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `id_Quiz` (`id_Quiz`),
  CONSTRAINT `b_qz_retest_ibfk_1` FOREIGN KEY (`id_Quiz`) REFERENCES `b_qz_quiz` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_qz_session`
--

DROP TABLE IF EXISTS `b_qz_session`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_qz_session` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_Quiz` int NOT NULL,
  `id_UTILISATEUR` int NOT NULL,
  `date_debut` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_session` (`id_Quiz`,`id_UTILISATEUR`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_qz_tentative`
--

DROP TABLE IF EXISTS `b_qz_tentative`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_qz_tentative` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_Quiz` int NOT NULL,
  `id_UTILISATEUR` int NOT NULL,
  `score` decimal(5,2) DEFAULT '0.00',
  `nb_bonnes` int DEFAULT '0',
  `nb_total` int DEFAULT '0',
  `reussi` tinyint(1) DEFAULT '0',
  `num_essai` int DEFAULT '1',
  `statut` varchar(20) DEFAULT NULL,
  `date_tentative` datetime DEFAULT NULL,
  `date_debut` datetime DEFAULT NULL,
  `date_fin` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `id_Quiz` (`id_Quiz`),
  CONSTRAINT `b_qz_tentative_ibfk_1` FOREIGN KEY (`id_Quiz`) REFERENCES `b_qz_quiz` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_r_superviseur_agent`
--

DROP TABLE IF EXISTS `b_r_superviseur_agent`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_r_superviseur_agent` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_SUPERVISEUR` int DEFAULT NULL,
  `id_AGENT` int DEFAULT NULL,
  `dateCreation` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `id_SUPERVISEUR` (`id_SUPERVISEUR`),
  KEY `id_AGENT` (`id_AGENT`),
  CONSTRAINT `B_R_SUPERVISEUR_AGENT_ibfk_3` FOREIGN KEY (`id_SUPERVISEUR`) REFERENCES `b_utilisateur` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `B_R_SUPERVISEUR_AGENT_ibfk_4` FOREIGN KEY (`id_AGENT`) REFERENCES `b_utilisateur` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_reponse_quiz`
--

DROP TABLE IF EXISTS `b_reponse_quiz`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_reponse_quiz` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_UTILISATEUR` int DEFAULT NULL,
  `id_FICHE` int DEFAULT NULL,
  `RESULTAT` int DEFAULT NULL,
  `ETAT` varchar(10) DEFAULT NULL,
  `STATUT` varchar(20) DEFAULT NULL,
  `NB_RETEST` int DEFAULT NULL,
  `date_Quiz` datetime DEFAULT NULL,
  `date_RETEST` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `id_UTILISATEUR` (`id_UTILISATEUR`),
  KEY `id_FICHE` (`id_FICHE`),
  CONSTRAINT `B_REPONSE_QUIZ_ibfk_3` FOREIGN KEY (`id_UTILISATEUR`) REFERENCES `b_utilisateur` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `B_REPONSE_QUIZ_ibfk_4` FOREIGN KEY (`id_FICHE`) REFERENCES `b_fiche` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_resultat_controle`
--

DROP TABLE IF EXISTS `b_resultat_controle`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_resultat_controle` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_CONTROLEUR` int DEFAULT NULL,
  `id_CONTROLE` bigint DEFAULT NULL,
  `score` int DEFAULT NULL,
  `dateControle` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `id_CONTROLEUR` (`id_CONTROLEUR`),
  CONSTRAINT `B_RESULTAT_CONTROLE_ibfk_1` FOREIGN KEY (`id_CONTROLEUR`) REFERENCES `b_utilisateur` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_role`
--

DROP TABLE IF EXISTS `b_role`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_role` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(60) NOT NULL,
  `libelle` varchar(255) NOT NULL,
  `description` varchar(500) DEFAULT NULL,
  `etat` varchar(20) NOT NULL DEFAULT 'ACTIF',
  `dateCreation` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_role_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_role_permission`
--

DROP TABLE IF EXISTS `b_role_permission`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_role_permission` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_role` int NOT NULL,
  `id_permission` int NOT NULL,
  `dateCreation` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_role_perm` (`id_role`,`id_permission`),
  KEY `k_rp_role` (`id_role`),
  KEY `k_rp_perm` (`id_permission`),
  CONSTRAINT `fk_rp_perm` FOREIGN KEY (`id_permission`) REFERENCES `b_permission` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rp_role` FOREIGN KEY (`id_role`) REFERENCES `b_role` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_sd_cible`
--

DROP TABLE IF EXISTS `b_sd_cible`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_sd_cible` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_Sondage` int NOT NULL,
  `id_UTILISATEUR` int DEFAULT NULL,
  `nom` varchar(150) DEFAULT NULL,
  `prenom` varchar(150) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `telephone` varchar(50) DEFAULT NULL,
  `date_envoi_email` datetime DEFAULT NULL,
  `date_envoi_sms` datetime DEFAULT NULL,
  `dateCreation` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_sd_cible_sondage` (`id_Sondage`),
  CONSTRAINT `fk_sd_cible_sondage` FOREIGN KEY (`id_Sondage`) REFERENCES `b_sd_sondage` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_sd_condition`
--

DROP TABLE IF EXISTS `b_sd_condition`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_sd_condition` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_Question` int NOT NULL,
  `id_Question_source` int NOT NULL,
  `operateur` varchar(20) NOT NULL DEFAULT 'EGAL',
  `id_Option` int DEFAULT NULL,
  `valeur` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_sd_cond_q` (`id_Question`),
  CONSTRAINT `fk_sd_cond_q` FOREIGN KEY (`id_Question`) REFERENCES `b_sd_question` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_sd_option`
--

DROP TABLE IF EXISTS `b_sd_option`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_sd_option` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_Question` int NOT NULL,
  `libelle` varchar(500) NOT NULL,
  `ordre` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `fk_sd_o_question` (`id_Question`),
  CONSTRAINT `fk_sd_o_question` FOREIGN KEY (`id_Question`) REFERENCES `b_sd_question` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_sd_passation`
--

DROP TABLE IF EXISTS `b_sd_passation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_sd_passation` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_Sondage` int NOT NULL,
  `id_UTILISATEUR` int DEFAULT NULL,
  `date_debut` datetime DEFAULT NULL,
  `date_fin` datetime DEFAULT NULL,
  `termine` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `fk_sd_pass_sondage` (`id_Sondage`),
  CONSTRAINT `fk_sd_pass_sondage` FOREIGN KEY (`id_Sondage`) REFERENCES `b_sd_sondage` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_sd_question`
--

DROP TABLE IF EXISTS `b_sd_question`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_sd_question` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_Sondage` int NOT NULL,
  `page` int NOT NULL DEFAULT '1',
  `ordre` int NOT NULL DEFAULT '0',
  `type` varchar(30) NOT NULL,
  `libelle` text NOT NULL,
  `obligatoire` tinyint(1) NOT NULL DEFAULT '1',
  `curseur_min` int DEFAULT NULL,
  `curseur_max` int DEFAULT NULL,
  `dateCreation` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_sd_q_sondage` (`id_Sondage`),
  CONSTRAINT `fk_sd_q_sondage` FOREIGN KEY (`id_Sondage`) REFERENCES `b_sd_sondage` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_sd_reponse`
--

DROP TABLE IF EXISTS `b_sd_reponse`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_sd_reponse` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_Passation` int NOT NULL,
  `id_Question` int NOT NULL,
  `id_Option` int DEFAULT NULL,
  `valeur_texte` text,
  `valeur_num` int DEFAULT NULL,
  `ordre` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_sd_rep_pass` (`id_Passation`),
  CONSTRAINT `fk_sd_rep_pass` FOREIGN KEY (`id_Passation`) REFERENCES `b_sd_passation` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_sd_sondage`
--

DROP TABLE IF EXISTS `b_sd_sondage`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_sd_sondage` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nom` varchar(255) NOT NULL,
  `token` varchar(40) DEFAULT NULL,
  `langue` varchar(20) NOT NULL DEFAULT 'Francais',
  `statut` varchar(20) NOT NULL DEFAULT 'ENCOURS',
  `bouton_retour` tinyint(1) NOT NULL DEFAULT '0',
  `id_createur` int DEFAULT NULL,
  `dateCreation` datetime DEFAULT NULL,
  `dateModification` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_site`
--

DROP TABLE IF EXISTS `b_site`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_site` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nom` varchar(50) DEFAULT NULL,
  `description` text,
  `Etat` varchar(50) DEFAULT NULL,
  `dateCreation` datetime DEFAULT NULL,
  `dateModification` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_sla`
--

DROP TABLE IF EXISTS `b_sla`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_sla` (
  `id` int NOT NULL AUTO_INCREMENT,
  `source` varchar(100) DEFAULT NULL,
  `type` varchar(50) DEFAULT NULL,
  `delai` int DEFAULT NULL,
  `priorite` varchar(10) DEFAULT NULL,
  `Etat` varchar(50) DEFAULT NULL,
  `dateCreationSla` datetime DEFAULT NULL,
  `dateModification` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_sondage`
--

DROP TABLE IF EXISTS `b_sondage`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_sondage` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_UTILISATEUR` int DEFAULT NULL,
  `id_FICHE` int DEFAULT NULL,
  `utilite` int DEFAULT NULL,
  `exactitude` int DEFAULT NULL,
  `dateSondage` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `id_UTILISATEUR` (`id_UTILISATEUR`),
  KEY `id_FICHE` (`id_FICHE`),
  CONSTRAINT `B_SONDAGE_ibfk_3` FOREIGN KEY (`id_UTILISATEUR`) REFERENCES `b_utilisateur` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `B_SONDAGE_ibfk_4` FOREIGN KEY (`id_FICHE`) REFERENCES `b_fiche` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_sous_categorie`
--

DROP TABLE IF EXISTS `b_sous_categorie`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_sous_categorie` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nom` varchar(100) DEFAULT NULL,
  `Etat` varchar(50) DEFAULT NULL,
  `dateCreationSousCategorie` datetime DEFAULT NULL,
  `id_Categorie` int DEFAULT NULL,
  `dateModification` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `id_Categorie` (`id_Categorie`),
  CONSTRAINT `B_SOUS_CATEGORIE_ibfk_1` FOREIGN KEY (`id_Categorie`) REFERENCES `b_categorie` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_utilisateur`
--

DROP TABLE IF EXISTS `b_utilisateur`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_utilisateur` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nom` varchar(100) DEFAULT NULL,
  `prenom` varchar(100) DEFAULT NULL,
  `nom_utilisateur` varchar(100) DEFAULT NULL,
  `genre` varchar(100) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `telephone` int DEFAULT NULL,
  `ville` varchar(150) DEFAULT NULL,
  `adresse` varchar(255) DEFAULT NULL,
  `password` text,
  `default_password` text,
  `id_Fonction` int DEFAULT NULL,
  `id_Site` int DEFAULT NULL,
  `id_Programme` int DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `dateCreation` datetime DEFAULT NULL,
  `dateModification` datetime DEFAULT NULL,
  `nb_session_login` int DEFAULT NULL,
  `id_EvalGrille` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `nom_utilisateur` (`nom_utilisateur`),
  KEY `id_Fonction` (`id_Fonction`),
  KEY `id_Site` (`id_Site`),
  KEY `id_Programme` (`id_Programme`),
  KEY `fk_utilisateur_eval_grille` (`id_EvalGrille`),
  CONSTRAINT `B_UTILISATEUR_ibfk_1` FOREIGN KEY (`id_Fonction`) REFERENCES `b_fonction` (`id`),
  CONSTRAINT `B_UTILISATEUR_ibfk_2` FOREIGN KEY (`id_Site`) REFERENCES `b_site` (`id`),
  CONSTRAINT `B_UTILISATEUR_ibfk_3` FOREIGN KEY (`id_Programme`) REFERENCES `b_programme` (`id`),
  CONSTRAINT `fk_utilisateur_eval_grille` FOREIGN KEY (`id_EvalGrille`) REFERENCES `b_eval_grille` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b_utilisateur_permission`
--

DROP TABLE IF EXISTS `b_utilisateur_permission`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b_utilisateur_permission` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_utilisateur` int NOT NULL,
  `id_permission` int NOT NULL,
  `sens` varchar(10) NOT NULL DEFAULT 'GRANT',
  `attribue_par` int DEFAULT NULL,
  `dateCreation` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_perm` (`id_utilisateur`,`id_permission`),
  KEY `k_up_user` (`id_utilisateur`),
  KEY `fk_up_perm` (`id_permission`),
  CONSTRAINT `fk_up_perm` FOREIGN KEY (`id_permission`) REFERENCES `b_permission` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;


-- ---------------------------------------------------------------------
-- 2) DONNÉES DE RÉFÉRENCE (seed de l'init.sql d'origine)
-- ---------------------------------------------------------------------
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS=0;

INSERT INTO B_CATEGORIE (nom, Etat, dateCreationCategorie, dateModification) VALUES
('Process & Procedures de traitement', 'ACTIF', NOW(), NULL),
( 'Offres et Services', 'ACTIF', NOW(), NULL),
( 'Nouvelles offres', 'ACTIF', NOW(), NULL),
( 'avis operation sur comptes client', 'ACTIF', NOW(), NULL),
( 'Autre Promo', 'ACTIF', NOW(), NULL),
( 'Promo recharge', 'ACTIF', NOW(), NULL),
( 'Argumentaire', 'ACTIF', NOW(), NULL),
( 'Autres infos', 'ACTIF', NOW(), NULL),
( 'Modules de formation', 'ACTIF', NOW(), NULL),
( 'Consignes de production', 'ACTIF', NOW(), NULL),
( 'FLYERS MODES OPERATOIRES ENVOYER CLIENTS', 'ACTIF', NOW(), NULL),
( 'MODE OPERATOIRE', 'ACTIF', NOW(), NULL),
( 'Lien et application', 'ACTIF', NOW(), NULL);

INSERT INTO B_SITE (nom,description, Etat, dateCreation) VALUES
('Team Call Center','Team call center est parténaire pour qui est chargé à la reception des appels de nos clients','ACTIF', now());

INSERT INTO B_FONCTION (nom, Role_Associe, Permissions_Associe, Etat, dateCreation) VALUES
('Administrateur', 'R_ADMI', 'canAdd,canDelete,canEdit,canRead', 'ACTIF', NOW()),
('Gestionnaire Baseco','R_GB', 'canAdd,canDelete,canEdit,canRead', 'ACTIF', NOW()),
('Superviseur','R_SUP', 'canAdd,canDelete,canEdit,canRead', 'ACTIF', NOW()),
('Tele Conseiller','R_TC', 'canAdd,canDelete,canEdit,canRead', 'ACTIF', NOW()),
('Back Office','R_BO', 'canAdd,canDelete,canEdit,canRead', 'ACTIF', NOW()),
('Agent Formateur','R_AF', 'canAdd,canDelete,canEdit,canRead', 'ACTIF', NOW()),
('Gestionnaire Exactitude','R_GE', 'canAdd,canDelete,canEdit,canRead', 'ACTIF', NOW()),
('Responsable Opérationnel','R_RO', 'canAdd,canDelete,canEdit,canRead', 'ACTIF', NOW()),
('Agent Qualité','R_AQ', 'canAdd,canDelete,canEdit,canRead', 'ACTIF', NOW());

INSERT INTO B_PROGRAMME (nom, description, Etat, dateCreation) VALUES
('7414','Description du programme 7414', 'ACTIF', NOW());

INSERT INTO B_UTILISATEUR (nom, prenom, nom_utilisateur,genre,email,
telephone,ville,adresse,password,default_password,id_Fonction ,id_Site,id_Programme,status,dateCreation) VALUES
('sidibe', 'Diakalia', 'sidibe', 'homme', 'diacksidibe500@gamil.com', 73462937, 'Bamako', '1 rue de la Paix', '$2b$10$T8/EB3/e8CQLus6oG849yesRz1nm23kCMX9yZtBHNjLVczg6ncxAu', '$2b$10$T8/EB3/e8CQLus6oG849yesRz1nm23kCMX9yZtBHNjLVczg6ncxAu', 1, 1, 1, 'ACTIF', NOW());

INSERT INTO B_SLA (source, type, delai, priorite, Etat, dateCreationSla) VALUES
('Marketing', 'Promo Recharge', 15, 'P1', 'ACTIF', NOW()),
('Marketing', 'Autres Promos', 60, 'P3', 'ACTIF', NOW()),
('Marketing', 'Lancement Offre', 4320, 'P5', 'ACTIF', NOW()),
('Process','Mise à jours',1440,'P4','ACTIF',NOW()),
('Process','Nouvelle Procédure',1440,'P4','ACTIF',NOW()),
('Opération Service CLient','Avis Opération sur Comptes clients',1440,'P6','ACTIF',NOW()),
('Opération Service Client','incident réseau',15,'P1','ACTIF',NOW());

INSERT INTO B_SOUS_CATEGORIE (nom,Etat,dateCreationSousCategorie,id_Categorie) VALUES
('MODE OPERATOIRE OU PROCéDURES N1','ACTIF',NOW(),1),
('MODE OPERATOIRE OU PROCéDURES N2','ACTIF',NOW(),1),
('MODE OPERATOIRE OU PROCéDURES RS','ACTIF',NOW(),1),
('OMY','ACTIF',NOW(),2),
('NAFAMA','ACTIF',NOW(),2),
('TELCO','ACTIF',NOW(),2),
('NOUVELLES OFFRES','ACTIF',NOW(),3),
('BASE DES CLIENTS CONCERNES','ACTIF',NOW(),4),
('TOUTES AUTRES PROMOS HORS PROMO RECHARGE','ACTIF',NOW(),5),
('TOUTES PROMOS RECHARGE GRAND PUBLIC','ACTIF',NOW(),6),
('FICHE INCIDENT','ACTIF',NOW(),7),
('ARGUMENTAIRE','ACTIF',NOW(),8),
('EVENEMENT','ACTIF',NOW(),9),
('MODULES CONçUS LORS DU DéPLOIEMENT DES SI OU MODULES SUR LES PRATIQUES','ACTIF',NOW(),10),
('TOUTES CONSIGNES POUR LA BONNE GESTION DE LA PRODUCTION','ACTIF',NOW(),11),
('FLYERS MODE OPERATOIRES A ENVOYER','ACTIF',NOW(),12),
('MODE OPERATOIRE','ACTIF',NOW(),13),
('MODE OPERATOIRE','ACTIF',NOW(),14);

INSERT IGNORE INTO B_CATEGORIE_RESSOURCE (nom, est_robot, Etat, dateCreation) VALUES
  ('Conseiller', 0, 'ACTIF', NOW()),
  ('Backoffice', 0, 'ACTIF', NOW()),
  ('SVI',        1, 'ACTIF', NOW()),
  ('Chatbot',    1, 'ACTIF', NOW());

INSERT IGNORE INTO B_QZ_BADGE (code, nom, description, icone, condition_type, condition_valeur) VALUES
  ('PREMIER_REUSSI', 'Premier pas',      'Reussir votre premier quiz',       'military_tech', 'QUIZ_REUSSIS', 1),
  ('TROIS_REUSSIS',  'Sur la lancee',    'Reussir 3 quiz',                   'workspace_premium', 'QUIZ_REUSSIS', 3),
  ('CINQ_REUSSIS',   'Expert',           'Reussir 5 quiz',                   'emoji_events', 'QUIZ_REUSSIS', 5),
  ('SCORE_PARFAIT',  'Sans faute',       'Obtenir 100% a un quiz',           'grade', 'SCORE_PARFAIT', 100);

INSERT INTO B_EV_CONTEXTE (libelle, Etat, dateCreation)
SELECT * FROM (
  SELECT 'A distance' AS libelle, 'ACTIF' AS Etat, NOW() AS dateCreation
  UNION ALL SELECT 'En simultane', 'ACTIF', NOW()
  UNION ALL SELECT 'Enregistrement', 'ACTIF', NOW()
) AS defauts
WHERE NOT EXISTS (SELECT 1 FROM B_EV_CONTEXTE);

INSERT IGNORE INTO B_EV_ACTION_TYPE (libelle, Etat, dateCreation) VALUES
  ('Formation / recyclage', 'ACTIF', NOW()),
  ('Coaching individuel', 'ACTIF', NOW()),
  ('Rappel de procedure', 'ACTIF', NOW()),
  ('Double ecoute', 'ACTIF', NOW()),
  ('Mise a jour de la base de connaissances', 'ACTIF', NOW());

INSERT INTO b_eval_ref_statut_evaluation (libelle, description, ordre, etat, dateCreation) VALUES
  ('Non validé', 'Statut initial à la création', 1, 'ACTIF', NOW()),
  ('Féliciter', 'Évaluation en succès approuvée par l''agent', 2, 'ACTIF', NOW()),
  ('Débriefer', 'Évaluation en échec approuvée par l''agent', 3, 'ACTIF', NOW());

INSERT INTO b_eval_ref_type_evaluation (code, libelle, etat, dateCreation) VALUES
  ('EVALUATION', 'Évaluation', 'ACTIF', NOW()),
  ('EVALUATION_SUPPLEMENTAIRE', 'Évaluation supplémentaire', 'ACTIF', NOW());

INSERT INTO b_eval_ref_nature_ressource (libelle, etat, dateCreation) VALUES
  ('SVI', 'ACTIF', NOW()), ('Chat bot', 'ACTIF', NOW());

INSERT INTO b_eval_ref_contexte (libelle, etat, dateCreation) VALUES
  ('Appel entrant', 'ACTIF', NOW()), ('Appel sortant', 'ACTIF', NOW()), ('Back office', 'ACTIF', NOW());

INSERT INTO b_eval_ref_statut_pa (libelle, etat, dateCreation) VALUES
  ('À faire', 'ACTIF', NOW()), ('En cours', 'ACTIF', NOW()), ('Réalisé', 'ACTIF', NOW());

INSERT INTO b_eval_param_systeme (cle, valeur, description, dateModification) VALUES
  ('nb_supplementaires_attendues', '2', 'Nombre d''évaluations supplémentaires attendues après un échec (F.39quater)', NOW());

INSERT INTO b_eval_lettre_modele (type, texte, dateModification) VALUES
  ('FELICITATION', 'Bonjour {{prenom}} {{nom}},\n\nNous vous félicitons pour votre évaluation du {{date_evaluation}} (contexte : {{contexte}}).\n\n{{scores}}\n\n{{synthese}}', NOW()),
  ('DEBRIEFING', 'Bonjour {{prenom}} {{nom}},\n\nSuite à votre évaluation du {{date_evaluation}} (contexte : {{contexte}}), voici les éléments de débriefing.\n\n{{scores}}\n\n{{constats}}\n\n{{synthese}}', NOW());

INSERT INTO b_param_habilitation (cle, valeur)
VALUES ('mode_controle', 'OBSERVATION')
ON DUPLICATE KEY UPDATE valeur = valeur;

INSERT INTO b_permission (module,action,code,libelle) VALUES
  ('UTILISATEUR','LIRE','utilisateur.lire','Consulter — utilisateur'),
  ('UTILISATEUR','CREER','utilisateur.creer','Créer — utilisateur'),
  ('UTILISATEUR','MODIFIER','utilisateur.modifier','Modifier — utilisateur'),
  ('UTILISATEUR','SUPPRIMER','utilisateur.supprimer','Supprimer — utilisateur'),
  ('SITE','LIRE','site.lire','Consulter — site'),
  ('SITE','CREER','site.creer','Créer — site'),
  ('SITE','MODIFIER','site.modifier','Modifier — site'),
  ('SITE','SUPPRIMER','site.supprimer','Supprimer — site'),
  ('PROGRAMME','LIRE','programme.lire','Consulter — programme'),
  ('PROGRAMME','CREER','programme.creer','Créer — programme'),
  ('PROGRAMME','MODIFIER','programme.modifier','Modifier — programme'),
  ('PROGRAMME','SUPPRIMER','programme.supprimer','Supprimer — programme'),
  ('FONCTION','LIRE','fonction.lire','Consulter — fonction'),
  ('FONCTION','CREER','fonction.creer','Créer — fonction'),
  ('FONCTION','MODIFIER','fonction.modifier','Modifier — fonction'),
  ('FONCTION','SUPPRIMER','fonction.supprimer','Supprimer — fonction'),
  ('FICHE','LIRE','fiche.lire','Consulter — fiche'),
  ('FICHE','CREER','fiche.creer','Créer — fiche'),
  ('FICHE','MODIFIER','fiche.modifier','Modifier — fiche'),
  ('FICHE','SUPPRIMER','fiche.supprimer','Supprimer — fiche'),
  ('FICHE','GERER','fiche.gerer','Gérer (SLA / catégories) — fiche'),
  ('SONDAGE','LIRE','sondage.lire','Consulter — sondage'),
  ('SONDAGE','CREER','sondage.creer','Créer — sondage'),
  ('SONDAGE','MODIFIER','sondage.modifier','Modifier — sondage'),
  ('SONDAGE','SUPPRIMER','sondage.supprimer','Supprimer — sondage'),
  ('QUIZ','LIRE','quiz.lire','Consulter — quiz'),
  ('QUIZ','CREER','quiz.creer','Créer — quiz'),
  ('QUIZ','MODIFIER','quiz.modifier','Modifier — quiz'),
  ('QUIZ','SUPPRIMER','quiz.supprimer','Supprimer — quiz'),
  ('QUIZ','BASECO','quiz.baseco','Baseco (échecs / retests) — quiz'),
  ('GRILLE','LIRE','grille.lire','Consulter — grille'),
  ('GRILLE','CREER','grille.creer','Créer — grille'),
  ('GRILLE','MODIFIER','grille.modifier','Modifier — grille'),
  ('GRILLE','SUPPRIMER','grille.supprimer','Supprimer — grille'),
  ('REFERENTIEL','LIRE','referentiel.lire','Consulter — referentiel'),
  ('REFERENTIEL','CREER','referentiel.creer','Créer — referentiel'),
  ('REFERENTIEL','MODIFIER','referentiel.modifier','Modifier — referentiel'),
  ('REFERENTIEL','SUPPRIMER','referentiel.supprimer','Supprimer — referentiel'),
  ('EVALUATION','LIRE','evaluation.lire','Consulter — evaluation'),
  ('EVALUATION','CREER','evaluation.creer','Créer — evaluation'),
  ('EVALUATION','MODIFIER','evaluation.modifier','Modifier — evaluation'),
  ('EVALUATION','EXECUTER','evaluation.executer','Exécuter — evaluation'),
  ('EVALUATION','VALIDER','evaluation.valider','Valider — evaluation'),
  ('EVALUATION','SUPPRIMER','evaluation.supprimer','Supprimer — evaluation'),
  ('CONTRE_EVALUATION','LIRE','contre_evaluation.lire','Consulter — contre-évaluation'),
  ('CONTRE_EVALUATION','CREER','contre_evaluation.creer','Créer — contre-évaluation'),
  ('CONTRE_EVALUATION','MODIFIER','contre_evaluation.modifier','Modifier — contre-évaluation'),
  ('CONTRE_EVALUATION','DESACTIVER','contre_evaluation.desactiver','Désactiver — contre-évaluation'),
  ('CONTRE_EVALUATION','SUPPRIMER','contre_evaluation.supprimer','Supprimer — contre-évaluation'),
  ('NOTIFICATION','LIRE','notification.lire','Consulter — notification'),
  ('HABILITATION','LIRE','habilitation.lire','Consulter — habilitation'),
  ('HABILITATION','GERER','habilitation.gerer','Gérer — habilitation'),
  ('AGENT_POLE','LIRE','agent_pole.lire','Consulter — agents en pôle'),
  ('AGENT_POLE','VOIR_TOUS','agent_pole.voir_tous','Voir les agents en pôle de tous les sites'),
  ('BI','LIRE','bi.lire','Consulter — business intelligence'),
  ('BI','CREER','bi.creer','Créer — business intelligence'),
  ('BI','MODIFIER','bi.modifier','Modifier — business intelligence'),
  ('BI','SUPPRIMER','bi.supprimer','Supprimer — business intelligence'),
  ('VALIDATION_OPTION','LIRE','validation_option.lire','Consulter — validation d''options'),
  ('VALIDATION_OPTION','CREER','validation_option.creer','Créer — validation d''options'),
  ('VALIDATION_OPTION','MODIFIER','validation_option.modifier','Modifier — validation d''options'),
  ('VALIDATION_OPTION','SUPPRIMER','validation_option.supprimer','Supprimer — validation d''options'),
  ('ARBRE_COACHING','LIRE','arbre_coaching.lire','Consulter — arbre de coaching'),
  ('ARBRE_COACHING','CREER','arbre_coaching.creer','Créer — arbre de coaching'),
  ('ARBRE_COACHING','MODIFIER','arbre_coaching.modifier','Modifier — arbre de coaching'),
  ('ARBRE_COACHING','SUPPRIMER','arbre_coaching.supprimer','Supprimer — arbre de coaching'),
  ('CALENDRIER','LIRE','calendrier.lire','Consulter — périodes / calendrier'),
  ('CALENDRIER','CREER','calendrier.creer','Créer — périodes / calendrier'),
  ('CALENDRIER','MODIFIER','calendrier.modifier','Modifier — périodes / calendrier'),
  ('CALENDRIER','SUPPRIMER','calendrier.supprimer','Supprimer — périodes / calendrier'),
  ('CREATION_MASSE','LIRE','creation_masse.lire','Consulter — création en masse'),
  ('CREATION_MASSE','CREER','creation_masse.creer','Créer — création en masse'),
  ('CREATION_MASSE','MODIFIER','creation_masse.modifier','Modifier — création en masse'),
  ('CREATION_MASSE','SUPPRIMER','creation_masse.supprimer','Supprimer — création en masse'),
  ('REPORTING','LIRE','reporting.lire','Consulter — reporting');

INSERT INTO b_role (code,libelle,description) VALUES
  ('R_ADMI','Administrateur','Rôle repris de la fonction « Administrateur »'),
  ('R_GB','Gestionnaire Baseco','Rôle repris de la fonction « Gestionnaire Baseco »'),
  ('R_SUP','Superviseur','Rôle repris de la fonction « Superviseur »'),
  ('R_TC','Tele Conseiller','Rôle repris de la fonction « Tele Conseiller »'),
  ('R_BO','Back Office','Rôle repris de la fonction « Back Office » (identique à R_TC)'),
  ('R_AF','Agent Formateur','Rôle repris de la fonction « Agent Formateur »'),
  ('R_GE','Gestionnaire Exactitude','Rôle repris de la fonction « Gestionnaire Exactitude »'),
  ('R_RO','Responsable Opérationnel','Rôle repris de la fonction « Responsable Opérationnel »'),
  ('R_AQ','Agent Qualité','Rôle repris de la fonction « Agent Qualité »');

INSERT INTO b_role_permission (id_role,id_permission)
  SELECT r.id, p.id FROM b_role r CROSS JOIN b_permission p;

INSERT IGNORE INTO b_permission (module,action,code,libelle) VALUES
  ('CALIBRAGE','LIRE','calibrage.lire','Consulter le calibrage'),
  ('CALIBRAGE','ORGANISER','calibrage.organiser','Organiser un calibrage (jauge)');

INSERT IGNORE INTO b_role_permission (id_role,id_permission)
  SELECT r.id, p.id FROM b_role r CROSS JOIN b_permission p WHERE p.code='calibrage.lire';

INSERT IGNORE INTO b_role_permission (id_role,id_permission)
  SELECT r.id, p.id FROM b_role r CROSS JOIN b_permission p WHERE p.code='calibrage.organiser' AND r.code='R_ADMI';

SET FOREIGN_KEY_CHECKS=1;
