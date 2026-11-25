-- =====================================================================
-- FUSION DES DOUBLONS DE L'ARBORESCENCE COACHING (b_eval_coaching_option)
-- =====================================================================
-- Deux options ACTIVES sont des doublons quand elles ont le même chemin
-- depuis la racine (ex. « SCRIPT D'ENTRETIEN > NON RESPECT DE LA RCE »),
-- sans tenir compte de la casse, des accents ni des espaces en début / fin.
-- Pour chaque chemin on GARDE la plus ancienne option (plus petit id) :
--   - les coachings (b_eval_coaching_niveau.id_option) qui pointaient vers
--     un doublon pointent vers l'option gardée ;
--   - les sous-niveaux d'un doublon (y compris les propositions en attente
--     ou rejetées) sont rattachés à l'option gardée ;
--   - les doublons sont ensuite supprimés.
-- Les options non actives ne sont jamais supprimées.
-- Aucune autre table n'est modifiée.
--
-- À LANCER APRÈS une sauvegarde.
--
-- 1) APERÇU (ne modifie rien) :
--   sudo docker exec -i qualitus-db-1 sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysql --default-character-set=utf8mb4 -uroot -t QUALITUS' < db/maintenance/2026-11_fusion_doublons_options_coaching.sql
--   -> affiche les doublons puis s'arrête sur « FUSION NON CONFIRMÉE ».
-- 2) FUSION (confirmation explicite) :
--   sudo docker exec -i qualitus-db-1 sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysql --default-character-set=utf8mb4 -uroot -t --init-command="SET @confirmation=\"FUSIONNER\"" QUALITUS' < db/maintenance/2026-11_fusion_doublons_options_coaching.sql
-- En cas d'erreur pendant la fusion, rien n'est enregistré (transaction).
-- Rejouable : un 2e passage ne trouve plus aucun doublon.
-- =====================================================================

SET NAMES utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- 1) CALCUL DES DOUBLONS
-- ---------------------------------------------------------------------
DROP TEMPORARY TABLE IF EXISTS t_fusion_option;
CREATE TEMPORARY TABLE t_fusion_option (
  id     INT PRIMARY KEY,
  garde  INT NOT NULL,
  niveau INT NOT NULL,
  chemin VARCHAR(2000) COLLATE utf8mb4_0900_ai_ci NOT NULL,
  KEY (garde)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO t_fusion_option (id, garde, niveau, chemin)
WITH RECURSIVE arbre AS (
  SELECT o.id, o.niveau,
         CAST(TRIM(o.libelle) AS CHAR(2000)) COLLATE utf8mb4_0900_ai_ci AS chemin
    FROM b_eval_coaching_option o
   WHERE o.id_parent IS NULL AND o.etat = 'ACTIF'
  UNION ALL
  SELECT o.id, o.niveau,
         CAST(CONCAT(a.chemin, ' > ', TRIM(o.libelle)) AS CHAR(2000)) COLLATE utf8mb4_0900_ai_ci
    FROM b_eval_coaching_option o
    JOIN arbre a ON a.id = o.id_parent
   WHERE o.etat = 'ACTIF'
)
SELECT id, MIN(id) OVER (PARTITION BY chemin), niveau, chemin FROM arbre;

-- (MySQL ne peut pas ouvrir deux fois une table temporaire dans une même
--  requête : les compteurs passent par des variables.)
SELECT COUNT(*) INTO @nb_doublons FROM t_fusion_option WHERE id <> garde;
SELECT COUNT(*) INTO @nb_coachings FROM b_eval_coaching_niveau n JOIN t_fusion_option f ON f.id = n.id_option WHERE f.id <> f.garde;
SELECT 'APERÇU' AS etape,
  (SELECT COUNT(*) FROM b_eval_coaching_option) AS options_avant,
  @nb_doublons AS doublons_a_supprimer,
  (SELECT COUNT(*) FROM b_eval_coaching_option) - @nb_doublons AS options_apres,
  @nb_coachings AS coachings_rediriges;

SELECT f.niveau, f.chemin, COUNT(DISTINCT f.id) AS copies, MIN(f.garde) AS id_garde,
       COUNT(n.id) AS coachings_rediriges
  FROM t_fusion_option f
  LEFT JOIN b_eval_coaching_niveau n ON n.id_option = f.id AND f.id <> f.garde
 GROUP BY f.chemin, f.niveau
HAVING COUNT(DISTINCT f.id) > 1
 ORDER BY f.chemin;

-- ---------------------------------------------------------------------
-- Garde-fou : sans --init-command="SET @confirmation='FUSIONNER'" le script
-- s'arrête ici (erreur volontaire), rien n'est modifié.
-- ---------------------------------------------------------------------
SELECT IF(@confirmation = 'FUSIONNER', 'FUSION CONFIRMÉE : exécution',
          'FUSION NON CONFIRMÉE : arrêt volontaire, rien n''a été modifié') AS garde_fou;
SELECT IF(@confirmation = 'FUSIONNER', 1, (SELECT 1 UNION ALL SELECT 2)) AS arret_si_non_confirme;

-- ---------------------------------------------------------------------
-- 2) FUSION (transaction : tout ou rien)
-- ---------------------------------------------------------------------
START TRANSACTION;

-- Coachings : redirigés vers l'option gardée.
UPDATE b_eval_coaching_niveau n
  JOIN t_fusion_option f ON f.id = n.id_option AND f.id <> f.garde
   SET n.id_option = f.garde;

-- Sous-niveaux d'un doublon : rattachés à l'option gardée.
UPDATE b_eval_coaching_option o
  JOIN t_fusion_option f ON f.id = o.id_parent AND f.id <> f.garde
   SET o.id_parent = f.garde;

-- Doublons : plus rien ne pointe vers eux, on les supprime.
DELETE o FROM b_eval_coaching_option o
  JOIN t_fusion_option f ON f.id = o.id AND f.id <> f.garde;

COMMIT;

-- ---------------------------------------------------------------------
-- 3) CONTRÔLES
-- ---------------------------------------------------------------------
SELECT 'APRÈS' AS etape,
  (SELECT COUNT(*) FROM b_eval_coaching_option) AS options,
  (SELECT COUNT(*) FROM b_eval_coaching_option o LEFT JOIN b_eval_coaching_option p ON p.id = o.id_parent
    WHERE o.id_parent IS NOT NULL AND p.id IS NULL) AS orphelins_doit_valoir_0,
  (SELECT COUNT(*) FROM b_eval_coaching_niveau n LEFT JOIN b_eval_coaching_option o ON o.id = n.id_option
    WHERE n.id_option IS NOT NULL AND o.id IS NULL) AS coachings_sans_option_doit_valoir_0;

DROP TEMPORARY TABLE IF EXISTS t_fusion_option;
