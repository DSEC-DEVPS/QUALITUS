-- =====================================================================
-- RATTRAPAGE : notifications des fiches pour les comptes créés depuis la
-- nouvelle application (dateCreation >= 2026-10-02)
-- =====================================================================
-- Avant out126, un compte créé dans l'application ne recevait aucune
-- notification pour les fiches déjà publiées qui le ciblaient. Ce script
-- les lui envoie, avec les mêmes règles qu'à la création d'un compte :
--   - compte ACTIF créé le 02/10/2026 ou après (les comptes importés lors de la
--     migration, sans date ou plus anciens, ne sont PAS concernés) ;
--   - fiche ACTIVE, date de fin vide ou future, ciblant le site ET la fonction
--     du compte (ALL compris), dont il n'est pas l'auteur ;
--   - jamais deux notifications « nouveau document » pour la même fiche et la
--     même personne.
-- Notification : type « chargement », titre « nouveau document »,
-- message « La fiche « X » vous concerne », lien /lecture-fiche/<id>, non lue,
-- datée du moment du rattrapage.
--
-- À LANCER APRÈS le déploiement d'out127 et une sauvegarde.
--
-- 1) APERÇU (ne modifie rien) :
--   sudo docker exec -i qualitus-db-1 sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysql --default-character-set=utf8mb4 -uroot -t QUALITUS' < db/maintenance/2026-11_rattrapage_notifications_fiches_nouveaux_comptes.sql
--   -> affiche l'aperçu puis s'arrête sur « RATTRAPAGE NON CONFIRMÉ ».
-- 2) RATTRAPAGE (confirmation explicite) :
--   sudo docker exec -i qualitus-db-1 sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysql --default-character-set=utf8mb4 -uroot -t --init-command="SET @confirmation=\"RATTRAPER\"" QUALITUS' < db/maintenance/2026-11_rattrapage_notifications_fiches_nouveaux_comptes.sql
-- Transaction : en cas d'erreur, rien n'est enregistré.
-- Rejouable : un 2e passage ne crée plus rien.
-- =====================================================================

SET NAMES utf8mb4;
SET @debut = '2026-10-02';

DROP TEMPORARY TABLE IF EXISTS t_rattrapage;
CREATE TEMPORARY TABLE t_rattrapage (
  id_UTILISATEUR INT NOT NULL,
  id_FICHE       INT NOT NULL,
  titre          VARCHAR(500),
  PRIMARY KEY (id_UTILISATEUR, id_FICHE)
) DEFAULT CHARSET=utf8mb4;

INSERT INTO t_rattrapage (id_UTILISATEUR, id_FICHE, titre)
SELECT u.id, f.id, f.titre
  FROM B_UTILISATEUR u
  JOIN B_FICHE f
    ON f.ETAT = 'ACTIF'
   AND (f.dateFin IS NULL OR f.dateFin > NOW())
   AND IFNULL(f.id_gestionnaire, 0) <> u.id
   AND (UPPER(TRIM(IFNULL(f.AccesSite, ''))) = 'ALL' OR FIND_IN_SET(u.id_Site, REPLACE(IFNULL(f.AccesSite, ''), ' ', '')) > 0)
   AND (UPPER(TRIM(IFNULL(f.AccesProfil, ''))) = 'ALL' OR FIND_IN_SET(u.id_Fonction, REPLACE(IFNULL(f.AccesProfil, ''), ' ', '')) > 0)
 WHERE IFNULL(u.status, 'ACTIF') = 'ACTIF'
   AND u.dateCreation >= @debut
   AND NOT EXISTS (SELECT 1 FROM B_NOTIFICATION n
                    WHERE n.id_UTILISATEUR = u.id AND n.id_FICHE = f.id AND n.type = 'chargement');

-- ---------------------------------------------------------------------
-- APERÇU
-- ---------------------------------------------------------------------
SELECT COUNT(*), COUNT(DISTINCT id_UTILISATEUR) INTO @nb_notif, @nb_comptes FROM t_rattrapage;
SELECT COUNT(DISTINCT id_FICHE) INTO @nb_fiches FROM t_rattrapage;
SELECT 'APERÇU' AS etape,
  (SELECT COUNT(*) FROM B_UTILISATEUR WHERE IFNULL(status, 'ACTIF') = 'ACTIF' AND dateCreation >= @debut) AS comptes_actifs_depuis_02_10,
  @nb_comptes AS comptes_a_notifier, @nb_fiches AS fiches_concernees, @nb_notif AS notifications_a_creer;

-- Les 20 comptes qui recevront le plus de notifications
SELECT r.id_UTILISATEUR, u.nom_utilisateur, DATE(u.dateCreation) AS cree_le, COUNT(*) AS notifications
  FROM t_rattrapage r JOIN B_UTILISATEUR u ON u.id = r.id_UTILISATEUR
 GROUP BY r.id_UTILISATEUR, u.nom_utilisateur, u.dateCreation
 ORDER BY notifications DESC, u.nom_utilisateur
 LIMIT 20;

-- ---------------------------------------------------------------------
-- Garde-fou : sans --init-command="SET @confirmation='RATTRAPER'" le script
-- s'arrête ici (erreur volontaire), rien n'est modifié.
-- ---------------------------------------------------------------------
SELECT IF(@confirmation = 'RATTRAPER', 'RATTRAPAGE CONFIRMÉ : exécution',
          'RATTRAPAGE NON CONFIRMÉ : arrêt volontaire, rien n''a été modifié') AS garde_fou;
SELECT IF(@confirmation = 'RATTRAPER', 1, (SELECT 1 UNION ALL SELECT 2)) AS arret_si_non_confirme;

START TRANSACTION;
INSERT INTO B_NOTIFICATION (titre, message, type, dateReception, id_UTILISATEUR, id_FICHE, url, lu)
SELECT 'nouveau document', CONCAT('La fiche « ', r.titre, ' » vous concerne'), 'chargement', NOW(),
       r.id_UTILISATEUR, r.id_FICHE, CONCAT('/lecture-fiche/', r.id_FICHE), 0
  FROM t_rattrapage r;
SELECT ROW_COUNT() INTO @crees;
COMMIT;

SELECT 'APRÈS' AS etape, @crees AS notifications_creees;
DROP TEMPORARY TABLE IF EXISTS t_rattrapage;
