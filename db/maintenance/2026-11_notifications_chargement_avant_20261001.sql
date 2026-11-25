-- =====================================================================
-- MÉNAGE NOTIFICATIONS DE CHARGEMENT ANTÉRIEURES AU DÉPLOIEMENT DU 01/10/2026
-- =====================================================================
-- Notifications d'insertion de fiche (type 'chargement') reçues le
-- 01/10/2026 ou avant, encore NON LUES : passées à « lu » avec une date de
-- lecture au 01/10/2026 00:00:00.
--   - les notifications déjà lues gardent leur vraie date de lecture ;
--   - les autres notifications (commentaires, évaluation, quiz) ne sont pas
--     touchées ; B_HISTORIQUE (consultations des fiches) n'est pas touché.
-- Rejouable : une 2e exécution ne modifie plus rien (0 ligne).
--
-- Exécution (prod : qualitus-db-1 ; pré-prod : qualitus-preprod-db-1) :
--   sudo docker exec -i qualitus-db-1 sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysql --default-character-set=utf8mb4 -uroot -t QUALITUS' < db/maintenance/2026-11_notifications_chargement_avant_20261001.sql
-- =====================================================================
USE QUALITUS;
SET NAMES utf8mb4;

SET @coupure      := '2026-10-02 00:00:00';  -- reçues AVANT cette heure = le 01/10/2026 inclus
SET @date_lecture := '2026-10-01 00:00:00';

-- 1) AVANT : volume concerné
SELECT 'AVANT' AS etape,
       COUNT(*)      AS notifications_chargement_jusqu_au_01_10,
       SUM(lu = 0)   AS non_lues_a_traiter,
       SUM(lu = 1)   AS deja_lues_inchangees
  FROM b_notification
 WHERE type = 'chargement' AND dateReception < @coupure;

SELECT 'PAR DESTINATAIRE' AS etape, COALESCE(u.nom_utilisateur, CONCAT('id ', n.id_UTILISATEUR)) AS destinataire,
       COUNT(*) AS non_lues_a_traiter, MIN(n.dateReception) AS de, MAX(n.dateReception) AS a
  FROM b_notification n
  LEFT JOIN b_utilisateur u ON u.id = n.id_UTILISATEUR
 WHERE n.type = 'chargement' AND n.dateReception < @coupure AND n.lu = 0
 GROUP BY n.id_UTILISATEUR, u.nom_utilisateur
 ORDER BY non_lues_a_traiter DESC;

-- 2) MISE À JOUR (transaction)
START TRANSACTION;
UPDATE b_notification
   SET lu = 1, dateLecture = @date_lecture
 WHERE type = 'chargement' AND dateReception < @coupure AND lu = 0;
SELECT 'MISE A JOUR' AS etape, ROW_COUNT() AS notifications_passees_a_lu;
COMMIT;

-- 3) APRÈS : contrôle
SELECT 'APRES' AS etape,
       COUNT(*)                                   AS notifications_chargement_jusqu_au_01_10,
       SUM(lu = 0)                                AS non_lues_restantes,
       SUM(lu = 1 AND dateLecture = @date_lecture) AS lues_au_01_10_2026
  FROM b_notification
 WHERE type = 'chargement' AND dateReception < @coupure;
