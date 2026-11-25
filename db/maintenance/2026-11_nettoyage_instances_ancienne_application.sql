-- =====================================================================
-- NETTOYAGE DES INSTANCES DE L'ANCIENNE APPLICATION
-- (évaluations, plans d'action, coachings, contre-évaluations, quiz,
--  sondages, calibrages et leurs notifications)
-- =====================================================================
-- Supprime les instances créées AVANT le 02/10/2026 00:00 (ou sans date de
-- création) et tout ce qui en dépend. Les instances créées dans la nouvelle
-- application (à partir du 02/10/2026) sont protégées.
--
-- CONSERVÉ : grilles (catégories, sous-catégories, erreurs), référentiels
-- b_eval_ref_*, arborescences BI et coaching (options validées ou rejetées :
-- lien vers l'évaluation/le coaching d'origine vidé), calendrier, politique
-- de fermeture, paramètres, modèles de lettres, définitions des badges,
-- utilisateurs, sites, fonctions, droits, fiches et tout le module Baseco,
-- anciennes tables b_ev_* / b_mg_*.
-- SUPPRIMÉ en plus des instances : propositions d'options BI / coaching EN
-- ATTENTE issues des évaluations supprimées, badges obtenus avant le
-- 02/10/2026, notifications des évaluations, contre-évaluations, calibrages
-- et options reçues avant le 02/10/2026.
--
-- À LANCER APRÈS les migrations 21 à 58 et APRÈS une sauvegarde.
--
-- 1) APERÇU (ne modifie rien) :
--   sudo docker exec -i qualitus-db-1 sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysql --default-character-set=utf8mb4 -uroot -t QUALITUS' < db/maintenance/2026-11_nettoyage_instances_ancienne_application.sql
--   -> affiche les volumes puis s'arrête sur « SUPPRESSION NON CONFIRMÉE ».
-- 2) SUPPRESSION (confirmation explicite) :
--   sudo docker exec -i qualitus-db-1 sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysql --default-character-set=utf8mb4 -uroot -t --init-command="SET @confirmation=\"SUPPRIMER\"" QUALITUS' < db/maintenance/2026-11_nettoyage_instances_ancienne_application.sql
-- En cas d'erreur pendant la suppression, rien n'est enregistré (transaction).
-- Rejouable : un 2e passage ne trouve plus rien à supprimer.
-- =====================================================================
USE QUALITUS;
SET NAMES utf8mb4;
SET @coupure := '2026-10-02 00:00:00';

-- ---------------------------------------------------------------------
-- Sélection des instances à supprimer
-- ---------------------------------------------------------------------
DROP TEMPORARY TABLE IF EXISTS t_eval, t_contre, t_coaching, t_ligne, t_quiz, t_sondage, t_cal, t_notif;
CREATE TEMPORARY TABLE t_eval     (id INT PRIMARY KEY) SELECT id FROM b_evaluation WHERE date_creation < @coupure OR date_creation IS NULL;
CREATE TEMPORARY TABLE t_contre   (id INT PRIMARY KEY) SELECT id FROM b_eval_contre_evaluation WHERE id_evaluation_initiale IN (SELECT id FROM t_eval);
CREATE TEMPORARY TABLE t_coaching (id INT PRIMARY KEY) SELECT id FROM b_eval_coaching WHERE id_evaluation IN (SELECT id FROM t_eval);
CREATE TEMPORARY TABLE t_ligne    (id INT PRIMARY KEY) SELECT id FROM b_eval_plan_action_ligne WHERE id_evaluation IN (SELECT id FROM t_eval);
CREATE TEMPORARY TABLE t_quiz     (id INT PRIMARY KEY) SELECT id FROM b_qz_quiz WHERE dateCreation < @coupure OR dateCreation IS NULL;
CREATE TEMPORARY TABLE t_sondage  (id INT PRIMARY KEY) SELECT id FROM b_sd_sondage WHERE dateCreation < @coupure OR dateCreation IS NULL;
CREATE TEMPORARY TABLE t_cal      (id INT PRIMARY KEY) SELECT id FROM b_cal_session WHERE dateCreation < @coupure OR dateCreation IS NULL;
CREATE TEMPORARY TABLE t_notif    (id INT PRIMARY KEY) SELECT id FROM b_notification
 WHERE (nature_objet = 'EVALUATION'        AND (id_objet IN (SELECT id FROM t_eval)   OR dateReception < @coupure))
    OR (nature_objet = 'CONTRE_EVALUATION' AND (id_objet IN (SELECT id FROM t_contre) OR dateReception < @coupure))
    OR (nature_objet = 'CALIBRAGE'         AND (id_objet IN (SELECT id FROM t_cal)    OR dateReception < @coupure))
    OR (nature_objet IN ('OPTION_BI','OPTION_COACHING') AND dateReception < @coupure)
    OR (nature_objet IS NULL AND id_FICHE IS NULL AND dateReception < @coupure);

-- ---------------------------------------------------------------------
-- 1) APERÇU
-- ---------------------------------------------------------------------
-- (une table temporaire ne peut servir qu'une fois par requête : comptes un par un)
SET @n_eval    := (SELECT COUNT(*) FROM t_eval);
SET @n_cat     := (SELECT COUNT(*) FROM b_evaluation_categorie WHERE id_evaluation IN (SELECT id FROM t_eval));
SET @n_err     := (SELECT COUNT(*) FROM b_evaluation_erreur    WHERE id_evaluation IN (SELECT id FROM t_eval));
SET @n_bi      := (SELECT COUNT(*) FROM b_evaluation_bi        WHERE id_evaluation IN (SELECT id FROM t_eval));
SET @n_avis    := (SELECT COUNT(*) FROM b_evaluation_avis_histo WHERE id_evaluation IN (SELECT id FROM t_eval));
SET @n_ligne   := (SELECT COUNT(*) FROM t_ligne);
SET @n_coach   := (SELECT COUNT(*) FROM t_coaching);
SET @n_contre  := (SELECT COUNT(*) FROM t_contre);
SET @n_optbi   := (SELECT COUNT(*) FROM b_eval_bi_option WHERE etat='EN_ATTENTE' AND id_evaluation_origine IN (SELECT id FROM t_eval));
SET @n_optco   := (SELECT COUNT(*) FROM b_eval_coaching_option WHERE etat='EN_ATTENTE' AND id_coaching_origine IN (SELECT id FROM t_coaching));
SET @n_quiz    := (SELECT COUNT(*) FROM t_quiz);
SET @n_qq      := (SELECT COUNT(*) FROM b_qz_question  WHERE id_Quiz IN (SELECT id FROM t_quiz));
SET @n_qt      := (SELECT COUNT(*) FROM b_qz_tentative WHERE id_Quiz IN (SELECT id FROM t_quiz));
SET @n_badge   := (SELECT COUNT(*) FROM b_qz_badge_utilisateur WHERE dateObtention < @coupure OR dateObtention IS NULL);
SET @n_sd      := (SELECT COUNT(*) FROM t_sondage);
SET @n_sdp     := (SELECT COUNT(*) FROM b_sd_passation WHERE id_Sondage IN (SELECT id FROM t_sondage));
SET @n_sdr     := (SELECT COUNT(*) FROM b_sd_reponse r JOIN b_sd_passation p ON p.id=r.id_Passation WHERE p.id_Sondage IN (SELECT id FROM t_sondage));
SET @n_cal     := (SELECT COUNT(*) FROM t_cal);
SET @n_calt    := (SELECT COUNT(*) FROM b_cal_transaction WHERE id_session IN (SELECT id FROM t_cal));
SET @n_cale    := (SELECT COUNT(*) FROM b_cal_evaluation  WHERE id_session IN (SELECT id FROM t_cal));
SET @n_notif   := (SELECT COUNT(*) FROM t_notif);

SELECT 'A SUPPRIMER' AS etape, x.module, x.lignes FROM (
  SELECT 1 o, 'Évaluations' AS module, CAST(@n_eval AS CHAR) AS lignes
  UNION ALL SELECT 2, '  dont catégories / erreurs',  CONCAT(@n_cat, ' / ', @n_err)
  UNION ALL SELECT 3, '  BI / historique des avis',   CONCAT(@n_bi, ' / ', @n_avis)
  UNION ALL SELECT 4, 'Plans d''action (lignes)',      @n_ligne
  UNION ALL SELECT 5, 'Coachings',                    @n_coach
  UNION ALL SELECT 6, 'Contre-évaluations',           @n_contre
  UNION ALL SELECT 7, 'Options BI en attente issues de ces évaluations', @n_optbi
  UNION ALL SELECT 8, 'Options coaching en attente issues de ces coachings', @n_optco
  UNION ALL SELECT 9, 'Quiz',                         @n_quiz
  UNION ALL SELECT 10,'  dont questions / tentatives', CONCAT(@n_qq, ' / ', @n_qt)
  UNION ALL SELECT 11,'Badges obtenus',               @n_badge
  UNION ALL SELECT 12,'Sondages',                     @n_sd
  UNION ALL SELECT 13,'  dont passations / réponses', CONCAT(@n_sdp, ' / ', @n_sdr)
  UNION ALL SELECT 14,'Calibrages (sessions)',        @n_cal
  UNION ALL SELECT 15,'  dont transactions / évaluations de calibrage', CONCAT(@n_calt, ' / ', @n_cale)
  UNION ALL SELECT 16,'Notifications (évaluation, contre-évaluation, calibrage, options)', @n_notif
) x ORDER BY x.o;

SELECT 'CONSERVE' AS etape,
  (SELECT COUNT(*) FROM b_eval_grille) AS grilles, (SELECT COUNT(*) FROM b_eval_erreur) AS erreurs_grilles,
  (SELECT COUNT(*) FROM b_eval_bi_option) AS options_bi, (SELECT COUNT(*) FROM b_eval_coaching_option) AS options_coaching,
  (SELECT COUNT(*) FROM b_utilisateur) AS utilisateurs, (SELECT COUNT(*) FROM b_fiche) AS fiches,
  (SELECT COUNT(*) FROM b_evaluation WHERE id NOT IN (SELECT id FROM t_eval)) AS evaluations_nouvelle_appli,
  (SELECT COUNT(*) FROM b_qz_quiz WHERE id NOT IN (SELECT id FROM t_quiz)) AS quiz_nouvelle_appli;

-- ---------------------------------------------------------------------
-- Garde-fou : sans --init-command="SET @confirmation='SUPPRIMER'" le script
-- s'arrête ici (erreur volontaire), rien n'est supprimé.
-- ---------------------------------------------------------------------
SELECT IF(@confirmation = 'SUPPRIMER', 'SUPPRESSION CONFIRMÉE : exécution',
          'SUPPRESSION NON CONFIRMÉE : arrêt volontaire, rien n''a été supprimé') AS garde_fou;
SELECT IF(@confirmation = 'SUPPRIMER', 1, (SELECT 1 UNION ALL SELECT 2)) AS arret_si_non_confirme;

-- ---------------------------------------------------------------------
-- 2) SUPPRESSION (transaction : tout ou rien)
-- ---------------------------------------------------------------------
START TRANSACTION;

DELETE FROM b_notification WHERE id IN (SELECT id FROM t_notif);

-- Options BI / coaching : propositions en attente supprimées (feuilles d'abord),
-- les autres options gardées avec leur lien d'origine vidé.
DROP TEMPORARY TABLE IF EXISTS t_suppr_opt;
CREATE TEMPORARY TABLE t_suppr_opt (id INT PRIMARY KEY) SELECT o.id FROM b_eval_bi_option o
 WHERE o.etat = 'EN_ATTENTE' AND o.id_evaluation_origine IN (SELECT id FROM t_eval)
   AND NOT EXISTS (SELECT 1 FROM b_eval_bi_option e WHERE e.id_parent = o.id);
DELETE FROM b_eval_bi_option WHERE id IN (SELECT id FROM t_suppr_opt);
DROP TEMPORARY TABLE IF EXISTS t_suppr_opt;
CREATE TEMPORARY TABLE t_suppr_opt (id INT PRIMARY KEY) SELECT o.id FROM b_eval_coaching_option o
 WHERE o.etat = 'EN_ATTENTE' AND o.id_coaching_origine IN (SELECT id FROM t_coaching)
   AND NOT EXISTS (SELECT 1 FROM b_eval_coaching_option e WHERE e.id_parent = o.id);
DELETE FROM b_eval_coaching_option WHERE id IN (SELECT id FROM t_suppr_opt);
DROP TEMPORARY TABLE IF EXISTS t_suppr_opt;
CREATE TEMPORARY TABLE t_suppr_opt (id INT PRIMARY KEY) SELECT o.id FROM b_eval_bi_option o
 WHERE o.etat = 'EN_ATTENTE' AND o.id_evaluation_origine IN (SELECT id FROM t_eval)
   AND NOT EXISTS (SELECT 1 FROM b_eval_bi_option e WHERE e.id_parent = o.id);
DELETE FROM b_eval_bi_option WHERE id IN (SELECT id FROM t_suppr_opt);
DROP TEMPORARY TABLE IF EXISTS t_suppr_opt;
CREATE TEMPORARY TABLE t_suppr_opt (id INT PRIMARY KEY) SELECT o.id FROM b_eval_coaching_option o
 WHERE o.etat = 'EN_ATTENTE' AND o.id_coaching_origine IN (SELECT id FROM t_coaching)
   AND NOT EXISTS (SELECT 1 FROM b_eval_coaching_option e WHERE e.id_parent = o.id);
DELETE FROM b_eval_coaching_option WHERE id IN (SELECT id FROM t_suppr_opt);
DROP TEMPORARY TABLE IF EXISTS t_suppr_opt;
CREATE TEMPORARY TABLE t_suppr_opt (id INT PRIMARY KEY) SELECT o.id FROM b_eval_bi_option o
 WHERE o.etat = 'EN_ATTENTE' AND o.id_evaluation_origine IN (SELECT id FROM t_eval)
   AND NOT EXISTS (SELECT 1 FROM b_eval_bi_option e WHERE e.id_parent = o.id);
DELETE FROM b_eval_bi_option WHERE id IN (SELECT id FROM t_suppr_opt);
DROP TEMPORARY TABLE IF EXISTS t_suppr_opt;
CREATE TEMPORARY TABLE t_suppr_opt (id INT PRIMARY KEY) SELECT o.id FROM b_eval_coaching_option o
 WHERE o.etat = 'EN_ATTENTE' AND o.id_coaching_origine IN (SELECT id FROM t_coaching)
   AND NOT EXISTS (SELECT 1 FROM b_eval_coaching_option e WHERE e.id_parent = o.id);
DELETE FROM b_eval_coaching_option WHERE id IN (SELECT id FROM t_suppr_opt);
DROP TEMPORARY TABLE IF EXISTS t_suppr_opt;
CREATE TEMPORARY TABLE t_suppr_opt (id INT PRIMARY KEY) SELECT o.id FROM b_eval_bi_option o
 WHERE o.etat = 'EN_ATTENTE' AND o.id_evaluation_origine IN (SELECT id FROM t_eval)
   AND NOT EXISTS (SELECT 1 FROM b_eval_bi_option e WHERE e.id_parent = o.id);
DELETE FROM b_eval_bi_option WHERE id IN (SELECT id FROM t_suppr_opt);
DROP TEMPORARY TABLE IF EXISTS t_suppr_opt;
CREATE TEMPORARY TABLE t_suppr_opt (id INT PRIMARY KEY) SELECT o.id FROM b_eval_coaching_option o
 WHERE o.etat = 'EN_ATTENTE' AND o.id_coaching_origine IN (SELECT id FROM t_coaching)
   AND NOT EXISTS (SELECT 1 FROM b_eval_coaching_option e WHERE e.id_parent = o.id);
DELETE FROM b_eval_coaching_option WHERE id IN (SELECT id FROM t_suppr_opt);
DROP TEMPORARY TABLE IF EXISTS t_suppr_opt;
CREATE TEMPORARY TABLE t_suppr_opt (id INT PRIMARY KEY) SELECT o.id FROM b_eval_bi_option o
 WHERE o.etat = 'EN_ATTENTE' AND o.id_evaluation_origine IN (SELECT id FROM t_eval)
   AND NOT EXISTS (SELECT 1 FROM b_eval_bi_option e WHERE e.id_parent = o.id);
DELETE FROM b_eval_bi_option WHERE id IN (SELECT id FROM t_suppr_opt);
DROP TEMPORARY TABLE IF EXISTS t_suppr_opt;
CREATE TEMPORARY TABLE t_suppr_opt (id INT PRIMARY KEY) SELECT o.id FROM b_eval_coaching_option o
 WHERE o.etat = 'EN_ATTENTE' AND o.id_coaching_origine IN (SELECT id FROM t_coaching)
   AND NOT EXISTS (SELECT 1 FROM b_eval_coaching_option e WHERE e.id_parent = o.id);
DELETE FROM b_eval_coaching_option WHERE id IN (SELECT id FROM t_suppr_opt);
DROP TEMPORARY TABLE IF EXISTS t_suppr_opt;
CREATE TEMPORARY TABLE t_suppr_opt (id INT PRIMARY KEY) SELECT o.id FROM b_eval_bi_option o
 WHERE o.etat = 'EN_ATTENTE' AND o.id_evaluation_origine IN (SELECT id FROM t_eval)
   AND NOT EXISTS (SELECT 1 FROM b_eval_bi_option e WHERE e.id_parent = o.id);
DELETE FROM b_eval_bi_option WHERE id IN (SELECT id FROM t_suppr_opt);
DROP TEMPORARY TABLE IF EXISTS t_suppr_opt;
CREATE TEMPORARY TABLE t_suppr_opt (id INT PRIMARY KEY) SELECT o.id FROM b_eval_coaching_option o
 WHERE o.etat = 'EN_ATTENTE' AND o.id_coaching_origine IN (SELECT id FROM t_coaching)
   AND NOT EXISTS (SELECT 1 FROM b_eval_coaching_option e WHERE e.id_parent = o.id);
DELETE FROM b_eval_coaching_option WHERE id IN (SELECT id FROM t_suppr_opt);
UPDATE b_eval_bi_option       SET id_evaluation_origine = NULL WHERE id_evaluation_origine IN (SELECT id FROM t_eval);
UPDATE b_eval_coaching_option SET id_coaching_origine   = NULL WHERE id_coaching_origine   IN (SELECT id FROM t_coaching);

-- Coachings, plans d'action, contre-évaluations
DELETE FROM b_eval_coaching_niveau          WHERE id_coaching IN (SELECT id FROM t_coaching);
DELETE FROM b_eval_coaching                 WHERE id IN (SELECT id FROM t_coaching);
DELETE FROM b_eval_plan_action_contributeur WHERE id_ligne IN (SELECT id FROM t_ligne);
DELETE FROM b_eval_plan_action_ligne        WHERE id IN (SELECT id FROM t_ligne);
DELETE FROM b_eval_contre_erreur            WHERE id_contre_evaluation IN (SELECT id FROM t_contre);
DELETE FROM b_eval_contre_categorie         WHERE id_contre_evaluation IN (SELECT id FROM t_contre);
DELETE FROM b_eval_contre_bi                WHERE id_contre_evaluation IN (SELECT id FROM t_contre);
DELETE FROM b_eval_contre_evaluation        WHERE id IN (SELECT id FROM t_contre);

-- Évaluations
DELETE FROM b_evaluation_erreur      WHERE id_evaluation IN (SELECT id FROM t_eval);
DELETE FROM b_evaluation_categorie   WHERE id_evaluation IN (SELECT id FROM t_eval);
DELETE FROM b_evaluation_bi          WHERE id_evaluation IN (SELECT id FROM t_eval);
DELETE FROM b_evaluation_avis_histo  WHERE id_evaluation IN (SELECT id FROM t_eval);
UPDATE b_evaluation SET id_evaluation_parente = NULL WHERE id_evaluation_parente IN (SELECT id FROM t_eval);
DELETE FROM b_evaluation             WHERE id IN (SELECT id FROM t_eval);

-- Quiz (questions, options, tentatives, réponses, participants, IP, PIN,
-- retests, réinitialisations, notifications : suppression en cascade)
DELETE FROM b_qz_session WHERE id_Quiz IN (SELECT id FROM t_quiz);
DELETE FROM b_qz_quiz    WHERE id IN (SELECT id FROM t_quiz);
DELETE FROM b_qz_badge_utilisateur WHERE dateObtention < @coupure OR dateObtention IS NULL;

-- Sondages (questions, options, conditions, cibles, passations, réponses : cascade)
DELETE FROM b_sd_sondage WHERE id IN (SELECT id FROM t_sondage);

-- Calibrages (transactions, participants, évaluations de calibrage : cascade)
DELETE FROM b_cal_reinitialisation WHERE id_session IN (SELECT id FROM t_cal);
DELETE FROM b_cal_defigement       WHERE id_session IN (SELECT id FROM t_cal);
DELETE FROM b_cal_session          WHERE id IN (SELECT id FROM t_cal);

COMMIT;

-- ---------------------------------------------------------------------
-- 3) CONTRÔLE
-- ---------------------------------------------------------------------
SELECT 'APRES' AS etape,
  (SELECT COUNT(*) FROM b_evaluation  WHERE date_creation < @coupure OR date_creation IS NULL) AS evaluations_anciennes,
  (SELECT COUNT(*) FROM b_qz_quiz     WHERE dateCreation  < @coupure OR dateCreation  IS NULL) AS quiz_anciens,
  (SELECT COUNT(*) FROM b_sd_sondage  WHERE dateCreation  < @coupure OR dateCreation  IS NULL) AS sondages_anciens,
  (SELECT COUNT(*) FROM b_cal_session WHERE dateCreation  < @coupure OR dateCreation  IS NULL) AS calibrages_anciens;

SELECT 'ORPHELINS (tout doit valoir 0)' AS etape,
  (SELECT COUNT(*) FROM b_evaluation_erreur e   LEFT JOIN b_evaluation v ON v.id=e.id_evaluation WHERE v.id IS NULL) AS erreurs_eval,
  (SELECT COUNT(*) FROM b_eval_plan_action_ligne l LEFT JOIN b_evaluation v ON v.id=l.id_evaluation WHERE v.id IS NULL) AS plans_action,
  (SELECT COUNT(*) FROM b_eval_coaching c       LEFT JOIN b_evaluation v ON v.id=c.id_evaluation WHERE v.id IS NULL) AS coachings,
  (SELECT COUNT(*) FROM b_qz_session s          LEFT JOIN b_qz_quiz q ON q.id=s.id_Quiz WHERE q.id IS NULL) AS sessions_quiz,
  (SELECT COUNT(*) FROM b_cal_reinitialisation r LEFT JOIN b_cal_session s ON s.id=r.id_session WHERE s.id IS NULL) AS reinit_calibrage,
  (SELECT COUNT(*) FROM b_cal_defigement d      LEFT JOIN b_cal_session s ON s.id=d.id_session WHERE s.id IS NULL) AS defigement_calibrage,
  (SELECT COUNT(*) FROM b_notification n WHERE n.nature_objet='EVALUATION' AND n.id_objet IS NOT NULL AND NOT EXISTS (SELECT 1 FROM b_evaluation v WHERE v.id=n.id_objet)) AS notifs_eval;

SELECT 'CONSERVE' AS etape,
  (SELECT COUNT(*) FROM b_eval_grille) AS grilles, (SELECT COUNT(*) FROM b_eval_erreur) AS erreurs_grilles,
  (SELECT COUNT(*) FROM b_eval_bi_option) AS options_bi, (SELECT COUNT(*) FROM b_eval_coaching_option) AS options_coaching,
  (SELECT COUNT(*) FROM b_utilisateur) AS utilisateurs, (SELECT COUNT(*) FROM b_fiche) AS fiches,
  (SELECT COUNT(*) FROM b_evaluation) AS evaluations_nouvelle_appli,
  (SELECT COUNT(*) FROM b_qz_quiz) AS quiz_nouvelle_appli;
