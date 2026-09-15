const express = require("express");
const auth = require("./../middlewares/auth");
const { permission } = require("./../middlewares/permission");
const router = express.Router();
const {
  getAllQuiz,
  getOneQuiz,
  addQuiz,
  updateQuiz,
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
  notifierQuiz,
  getMesNotificationsQuiz,
  marquerNotifLu,
  marquerToutNotifLu,
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
  getRapportParticipants,
  getTentativeDetail,
  getRapportQuestionsRatees,
} = require("../Controllers/quiz.Controllers");

/** Quiz (nouveau modele structure) */
router.get("/quiz/all", auth, permission("QUIZ","LIRE"), getAllQuiz);
router.get("/quiz/fiches/recentes", auth, permission("QUIZ","LIRE"), getFichesRecentes);

/** Phase 2 : participation / historique (avant /quiz/:id pour la priorite) */
router.get("/quiz/participer/disponibles", auth, permission("QUIZ","LIRE"), getQuizzesDisponibles);
router.get("/quiz/participer/publics", auth, permission("QUIZ","LIRE"), getQuizPublics);
router.get("/quiz/pin/:pin", auth, permission("QUIZ","LIRE"), getQuizByPin);
router.get("/quiz/participer/:id", auth, permission("QUIZ","LIRE"), getQuizForTaking);
router.post("/quiz/participer/:id/soumettre", auth, permission("QUIZ","CREER"), soumettreQuiz);
router.get("/quiz/historique/mes-scores", auth, permission("QUIZ","LIRE"), getMesScores);

/** Phase 3 : notifications quiz (section dediee) */
router.get("/quiz/notifications/mes", auth, permission("QUIZ","LIRE"), getMesNotificationsQuiz);
router.patch("/quiz/notifications/lu-tout", auth, permission("QUIZ","LIRE"), marquerToutNotifLu);
router.patch("/quiz/notifications/:id/lu", auth, permission("QUIZ","LIRE"), marquerNotifLu);

/** Phase 3 : badges */
router.get("/quiz/badges/mes", auth, permission("QUIZ","LIRE"), getMesBadges);

/** Retest controle par le superviseur */
router.get("/quiz/retest/echecs", auth, permission("QUIZ","LIRE"), getRetestEchecs);
router.post("/quiz/retest/autoriser", auth, permission("QUIZ","CREER"), autoriserRetest);

/** Phase 3 : rapports de difficulte */
router.get("/quiz/rapports/difficulte", auth, permission("QUIZ","LIRE"), getRapportDifficulte);
router.get("/quiz/rapports/questions/:id", auth, permission("QUIZ","LIRE"), getRapportQuestions);
router.get("/quiz/:id/rapport/participants", auth, permission("QUIZ","LIRE"), getRapportParticipants);
router.get("/quiz/:id/rapport/questions-ratees", auth, permission("QUIZ","LIRE"), getRapportQuestionsRatees);
router.get("/quiz/tentative/:tid/detail", auth, permission("QUIZ","LIRE"), getTentativeDetail);

/** Phase 3 : notifier les utilisateurs qu'un quiz est disponible */
router.post("/quiz/:id/notifier", auth, permission("QUIZ","CREER"), notifierQuiz);

/** Autorisations IP (liste blanche par quiz) */
router.post("/quiz/ip/demande/:demandeId/traiter", auth, permission("QUIZ","CREER"), traiterDemandeIp);
router.delete("/quiz/ip/:ipId", auth, permission("QUIZ","SUPPRIMER"), deleteQuizIp);
router.get("/quiz/:id/ip/demandes", auth, permission("QUIZ","LIRE"), getQuizIpDemandes);
router.get("/quiz/:id/ip", auth, permission("QUIZ","LIRE"), getQuizIps);
router.post("/quiz/:id/ip", auth, permission("QUIZ","CREER"), addQuizIp);

router.get("/quiz/:id", auth, permission("QUIZ","LIRE"), getOneQuiz);
router.post("/quiz/add", auth, permission("QUIZ","CREER"), addQuiz);
router.put("/quiz/update/:id", auth, permission("QUIZ","MODIFIER"), updateQuiz);
router.delete("/quiz/:id", auth, permission("QUIZ","SUPPRIMER"), deleteQuiz);

/** Questions (+ options) */
router.post("/quiz/question/add", auth, permission("QUIZ","CREER"), addQuestion);
router.put("/quiz/question/:id", auth, permission("QUIZ","MODIFIER"), updateQuestion);
router.delete("/quiz/question/:id", auth, permission("QUIZ","SUPPRIMER"), deleteQuestion);

module.exports = router;
