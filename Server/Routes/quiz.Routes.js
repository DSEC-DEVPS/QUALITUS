const express = require("express");
const auth = require("./../middlewares/auth");
const { permission } = require("./../middlewares/permission");
const router = express.Router();
const {
  getAllQuiz,
  getOneQuiz,
  addQuiz,
  updateQuiz,
  changerStatutQuiz,
  deleteQuiz,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  getFichesRecentes,
  getQuizzesDisponibles,
  getQuizForTaking,
  getQuizByPin,
  soumettreQuiz,
  getMesScores,
  getMesNotificationsQuiz,
  demanderReinitialisation,
  annulerReinitialisation,
  getMesReinitialisations,
  repondreReinitialisation,
  marquerNotifLu,
  getMesBadges,
  getRapportDifficulte,
  getRapportQuestions,
  getRetestEchecs,
  autoriserRetest,
  getQuizIps,
  addQuizIp,
  deleteQuizIp,
  getQuizIpDemandes,
  traiterDemandeIp,
  getQuizPublics,
  getQuizEnCours,
  getSourcesQuestions,
  getQuestionsSource,
  reprendreQuestions,
  repartirPoints,
  getRapportParticipants,
  getTentativeDetail,
  getRapportQuestionsRatees,
  rechercherUtilisateursDiffusion,
  getParticipantsQuiz,
  diffuserParticipants,
  getAutorises,
  candidatsAutorisation,
  addAutorises,
  removeAutorise,
} = require("../Controllers/quiz.Controllers");

/** Quiz (nouveau modele structure) */
router.get("/quiz/all", auth, permission("QUIZ","LIRE"), getAllQuiz);
/** Réinitialisation de la participation (demande : site propriétaire ; réponse : l'agent) */
router.get("/quiz/reinitialisations/mes", auth, permission("QUIZ",["PARTICIPER","LIRE"]), getMesReinitialisations);
router.post("/quiz/reinitialisation/:rid/repondre", auth, permission("QUIZ",["PARTICIPER","LIRE"]), repondreReinitialisation);
router.delete("/quiz/reinitialisation/:rid", auth, permission("QUIZ","MODIFIER"), annulerReinitialisation);
router.post("/quiz/:id/reinitialisation", auth, permission("QUIZ","MODIFIER"), demanderReinitialisation);
router.get("/quiz/fiches/recentes", auth, permission("QUIZ","LIRE"), getFichesRecentes);

/** Diffusion — désignation des participants (Partie II) */
// Diffusion / participants : gestion du quiz -> quiz.modifier (+ contrôle site dans le contrôleur)
router.get("/quiz/diffusion/utilisateurs", auth, permission("QUIZ","MODIFIER"), rechercherUtilisateursDiffusion);
router.get("/quiz/:id/participants", auth, permission("QUIZ","MODIFIER"), getParticipantsQuiz);
router.post("/quiz/:id/diffuser", auth, permission("QUIZ","MODIFIER"), diffuserParticipants);

/** Utilisateurs autorisés (Partie IV) */
// Utilisateurs autorisés : site propriétaire (contrôleur) + quiz.modifier
router.get("/quiz/:id/autorises/candidats", auth, permission("QUIZ","MODIFIER"), candidatsAutorisation);
router.get("/quiz/:id/autorises", auth, permission("QUIZ","MODIFIER"), getAutorises);
router.post("/quiz/:id/autorises", auth, permission("QUIZ","MODIFIER"), addAutorises);
router.delete("/quiz/:id/autorises/:uid", auth, permission("QUIZ","MODIFIER"), removeAutorise);

/** Phase 2 : participation / historique (avant /quiz/:id pour la priorite) */
// Participation : permission dédiée quiz.participer (tout profil), + participant désigné (contrôleur)
router.get("/quiz/participer/disponibles", auth, permission("QUIZ","PARTICIPER"), getQuizzesDisponibles);
router.get("/quiz/participer/publics", auth, permission("QUIZ","PARTICIPER"), getQuizPublics);
// Quiz en cours (privés et publics) : reprise sans code PIN tant qu'il reste du temps
router.get("/quiz/participer/en-cours", auth, permission("QUIZ","PARTICIPER"), getQuizEnCours);
router.get("/quiz/pin/:pin", auth, permission("QUIZ","PARTICIPER"), getQuizByPin);
router.get("/quiz/participer/:id", auth, permission("QUIZ","PARTICIPER"), getQuizForTaking);
router.post("/quiz/participer/:id/soumettre", auth, permission("QUIZ","PARTICIPER"), soumettreQuiz);
router.get("/quiz/historique/mes-scores", auth, permission("QUIZ","PARTICIPER"), getMesScores);

/** Phase 3 : notifications quiz (sous-menu Nouveautés) : quiz.participer OU quiz.lire */
router.get("/quiz/notifications/mes", auth, permission("QUIZ",["PARTICIPER","LIRE"]), getMesNotificationsQuiz);
router.patch("/quiz/notifications/:id/lu", auth, permission("QUIZ",["PARTICIPER","LIRE"]), marquerNotifLu);

/** Phase 3 : badges */
router.get("/quiz/badges/mes", auth, permission("QUIZ","PARTICIPER"), getMesBadges);

/** Retest : site propriétaire (tous les participants) ou utilisateur autorisé (participants de son site) */
router.get("/quiz/retest/echecs", auth, permission("QUIZ","LIRE"), getRetestEchecs);
router.post("/quiz/retest/autoriser", auth, permission("QUIZ","MODIFIER"), autoriserRetest);

/** Phase 3 : rapports de difficulte */
router.get("/quiz/rapports/difficulte", auth, permission("QUIZ","LIRE"), getRapportDifficulte);
router.get("/quiz/rapports/questions/:id", auth, permission("QUIZ","LIRE"), getRapportQuestions);
router.get("/quiz/:id/rapport/participants", auth, permission("QUIZ","LIRE"), getRapportParticipants);
router.get("/quiz/:id/rapport/questions-ratees", auth, permission("QUIZ","LIRE"), getRapportQuestionsRatees);
router.get("/quiz/tentative/:tid/detail", auth, permission("QUIZ","LIRE"), getTentativeDetail);

/** Autorisations IP (liste blanche par quiz) */
// Gestion des accès machine : configuration du quiz -> quiz.modifier
router.post("/quiz/ip/demande/:demandeId/traiter", auth, permission("QUIZ","MODIFIER"), traiterDemandeIp);
router.delete("/quiz/ip/:ipId", auth, permission("QUIZ","MODIFIER"), deleteQuizIp);
router.get("/quiz/:id/ip/demandes", auth, permission("QUIZ","LIRE"), getQuizIpDemandes);
router.get("/quiz/:id/ip", auth, permission("QUIZ","LIRE"), getQuizIps);
router.post("/quiz/:id/ip", auth, permission("QUIZ","MODIFIER"), addQuizIp);

router.get("/quiz/:id", auth, permission("QUIZ","LIRE"), getOneQuiz);
router.post("/quiz/add", auth, permission("QUIZ","CREER"), addQuiz);
router.put("/quiz/update/:id", auth, permission("QUIZ","MODIFIER"), updateQuiz);
// Activer / désactiver un quiz (STATUT) : côté propriétaire (contrôleur) + quiz.modifier
router.patch("/quiz/:id/statut", auth, permission("QUIZ","MODIFIER"), changerStatutQuiz);
router.delete("/quiz/:id", auth, permission("QUIZ","SUPPRIMER"), deleteQuiz);

/** Questions (+ options) */
router.post("/quiz/question/add", auth, permission("QUIZ","CREER"), addQuestion);
// Reprise des questions d'un ancien quiz (mon site) : côté propriétaire du quiz cible
router.get("/quiz/:id/sources-questions", auth, permission("QUIZ","CREER"), getSourcesQuestions);
router.get("/quiz/:id/sources-questions/:source", auth, permission("QUIZ","CREER"), getQuestionsSource);
router.post("/quiz/:id/reprendre-questions", auth, permission("QUIZ","CREER"), reprendreQuestions);
// Barème : répartit équitablement les 100 points entre les questions.
router.post("/quiz/:id/repartir-points", auth, permission("QUIZ","MODIFIER"), repartirPoints);
router.put("/quiz/question/:id", auth, permission("QUIZ","MODIFIER"), updateQuestion);
router.delete("/quiz/question/:id", auth, permission("QUIZ","SUPPRIMER"), deleteQuestion);

module.exports = router;
