/**
 * Notifications « nouveau document » des fiches pour les destinataires arrivés
 * APRÈS la publication.
 *
 * À la publication, une fiche notifie les utilisateurs actifs dont le site ET la
 * fonction font partie de ses accès. Ce module complète ce mécanisme :
 *   - notifierFichesPourUtilisateur : un compte est créé, réactivé ou change de
 *     site / fonction -> il reçoit les fiches actives qui le ciblent désormais ;
 *   - notifierNouveauxCiblesFiche : une fiche est modifiée -> les ciblés qui ne
 *     l'ont jamais reçue la reçoivent (hors comptes de la migration déjà ciblés).
 * Règles communes : fiche ACTIVE, date de fin non dépassée, utilisateur actif,
 * pas l'auteur, et jamais deux notifications « chargement » pour la même fiche
 * et le même utilisateur. Une seule requête INSERT … SELECT (pas de boucle).
 */

const TYPE = "chargement";
const TITRE = "nouveau document";

/**
 * Condition « la fiche cible ce (site, fonction) ».
 * acces : expressions SQL donnant les listes d'accès site / profil de la fiche.
 */
const cible = (accesSite, accesProfil, site, fonction) =>
  `((UPPER(TRIM(IFNULL(${accesSite}, ''))) = 'ALL' OR FIND_IN_SET(${site}, REPLACE(IFNULL(${accesSite}, ''), ' ', '')) > 0)
    AND (UPPER(TRIM(IFNULL(${accesProfil}, ''))) = 'ALL' OR FIND_IN_SET(${fonction}, REPLACE(IFNULL(${accesProfil}, ''), ' ', '')) > 0))`;

const CIBLE_FICHE = cible("f.AccesSite", "f.AccesProfil", "u.id_Site", "u.id_Fonction");

const insertion = (suite, where) =>
  `INSERT INTO B_NOTIFICATION (titre, message, type, dateReception, id_UTILISATEUR, id_FICHE, url, lu)
   SELECT '${TITRE}', CONCAT('La fiche « ', f.titre, ' » ${suite}'), '${TYPE}', NOW(), u.id, f.id, CONCAT('/lecture-fiche/', f.id), 0
     FROM B_UTILISATEUR u
     JOIN B_FICHE f ON f.ETAT = 'ACTIF'
                   AND (f.dateFin IS NULL OR f.dateFin > NOW())
                   AND IFNULL(f.id_gestionnaire, 0) <> u.id
                   AND ${CIBLE_FICHE}
    WHERE IFNULL(u.status, 'ACTIF') = 'ACTIF'
      AND ${where}
      AND NOT EXISTS (SELECT 1 FROM B_NOTIFICATION n
                       WHERE n.id_UTILISATEUR = u.id AND n.id_FICHE = f.id AND n.type = '${TYPE}')`;

/**
 * @param cnx      pool ou connexion (transaction en cours éventuelle)
 * @param idUtil   utilisateur concerné
 * @param ancien   { id_Site, id_Fonction } du profil précédent, si le compte était
 *                 déjà actif : les fiches qui ciblaient déjà ce profil sont ignorées.
 *                 null pour une création ou une réactivation.
 * @returns nombre de notifications créées
 */
const notifierFichesPourUtilisateur = async (cnx, idUtil, ancien = null) => {
  let where = "u.id = ?";
  const params = [idUtil];
  if (ancien && ancien.id_Site != null && ancien.id_Fonction != null) {
    where += ` AND NOT ${cible("f.AccesSite", "f.AccesProfil", "?", "?")}`;
    params.push(ancien.id_Site, ancien.id_Fonction);
  }
  const [r] = await cnx.query(insertion("vous concerne", where), params);
  return (r && r.affectedRows) || 0;
};

/**
 * Comptes créés avant cette date (ou sans date) : comptes importés lors de la
 * migration depuis l'ancienne application (déploiement du 01/10/2026).
 */
const DEBUT_NOUVELLE_APPLICATION = "2026-10-02";

/**
 * @param ancien { AccesSite, AccesProfil } avant modification.
 * Notifiés : les ciblés qui n'ont jamais reçu la fiche, SAUF les comptes issus de
 * la migration qui étaient déjà ciblés avant la modification (pas de rattrapage
 * pour eux). Un compte issu de la migration ciblé uniquement grâce au nouvel
 * accès est notifié.
 */
const notifierNouveauxCiblesFiche = async (cnx, idFiche, ancien) => {
  const where = `f.id = ? AND (NOT ${cible("?", "?", "u.id_Site", "u.id_Fonction")} OR u.dateCreation >= '${DEBUT_NOUVELLE_APPLICATION}')`;
  const params = [idFiche, ancien.AccesSite, ancien.AccesSite, ancien.AccesProfil, ancien.AccesProfil];
  const [r] = await cnx.query(insertion("vous concerne", where), params);
  return (r && r.affectedRows) || 0;
};

/** Variante qui ne fait jamais échouer l'action principale (création de compte…). */
const sansEchec = async (libelle, fn) => {
  try {
    return await fn();
  } catch (e) {
    console.error(`notifFichesCiblees (${libelle}) :`, e && (e.sqlMessage || e.message));
    return 0;
  }
};

module.exports = { notifierFichesPourUtilisateur, notifierNouveauxCiblesFiche, sansEchec, DEBUT_NOUVELLE_APPLICATION };
