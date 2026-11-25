// Retests de quiz : règles communes (page « Retests à autoriser », tableau de bord).
//
// Un échec (dernière tentative d'un agent sur un quiz) attend une décision de retest si :
//  - le quiz autorise les retests (retest_auto = 1, opt-in depuis la migration 52) ;
//  - le quiz est toujours passable (ACTIF, OUVERT, date de fermeture non dépassée) ;
//  - l'agent est toujours participant désigné ;
//  - le nombre maximum de retests n'est pas atteint (num_essai 1 = premier essai) ;
//  - l'échec n'a pas été classé « retest non autorisé » (B_QZ_RETEST_REFUS).
// t = alias de la tentative, q = alias du quiz.
const sqlRetestADecider = (t = "t", q = "q") => `${q}.retest_auto = 1
  AND ${q}.statut = 'ACTIF' AND ${q}.Etat = 'OUVERT'
  AND (${q}.date_fermeture IS NULL OR ${q}.date_fermeture > NOW())
  AND EXISTS (SELECT 1 FROM B_QZ_PARTICIPANT rp WHERE rp.id_Quiz = ${t}.id_Quiz AND rp.id_UTILISATEUR = ${t}.id_UTILISATEUR)
  AND (COALESCE(${t}.num_essai, 1) - 1) < GREATEST(COALESCE(${q}.nb_retest_max, 1), 1)
  AND NOT EXISTS (SELECT 1 FROM B_QZ_RETEST_REFUS rf WHERE rf.id_Tentative = ${t}.id)`;

// Bornes du nombre maximum de retests (éditeur de quiz).
const RETEST_MAX_MIN = 1;
const RETEST_MAX_MAX = 10;

module.exports = { sqlRetestADecider, RETEST_MAX_MIN, RETEST_MAX_MAX };
