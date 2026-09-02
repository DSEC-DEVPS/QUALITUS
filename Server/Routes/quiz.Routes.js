const express = require("express");
const auth = require("./../middlewares/auth");
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
router.get("/quiz/all", auth, getAllQuiz);
router.get("/quiz/fiches/recentes", auth, getFichesRecentes);

/** Phase 2 : participation / historique (avant /quiz/:id pour la priorite) */
router.get("/quiz/participer/disponibles", auth, getQuizzesDisponibles);
router.get("/quiz/participer/publics", auth, getQuizPublics);
router.get("/quiz/pin/:pin", auth, getQuizByPin);
router.get("/quiz/participer/:id", auth, getQuizForTaking);
router.post("/quiz/participer/:id/soumettre", auth, soumettreQuiz);
router.get("/quiz/historique/mes-scores", auth, getMesScores);

/** Phase 3 : notifications quiz (section dediee) */
router.get("/quiz/notifications/mes", auth, getMesNotificationsQuiz);
router.patch("/quiz/notifications/lu-tout", auth, marquerToutNotifLu);
router.patch("/quiz/notifications/:id/lu", auth, marquerNotifLu);

/** Phase 3 : badges */
router.get("/quiz/badges/mes", auth, getMesBadges);

/** Retest controle par le superviseur */
router.get("/quiz/retest/echecs", auth, getRetestEchecs);
router.post("/quiz/retest/autoriser", auth, autoriserRetest);

/** Phase 3 : rapports de difficulte */
router.get("/quiz/rapports/difficulte", auth, getRapportDifficulte);
router.get("/quiz/rapports/questions/:id", auth, getRapportQuestions);
router.get("/quiz/:id/rapport/participants", auth, getRapportParticipants);
router.get("/quiz/:id/rapport/questions-ratees", auth, getRapportQuestionsRatees);
router.get("/quiz/tentative/:tid/detail", auth, getTentativeDetail);

/** Phase 3 : notifier les utilisateurs qu'un quiz est disponible */
router.post("/quiz/:id/notifier", auth, notifierQuiz);

/** Autorisations IP (liste blanche par quiz) */
router.post("/quiz/ip/demande/:demandeId/traiter", auth, traiterDemandeIp);
router.delete("/quiz/ip/:ipId", auth, deleteQuizIp);
router.get("/quiz/:id/ip/demandes", auth, getQuizIpDemandes);
router.get("/quiz/:id/ip", auth, getQuizIps);
router.post("/quiz/:id/ip", auth, addQuizIp);

router.get("/quiz/:id", auth, getOneQuiz);
router.post("/quiz/add", auth, addQuiz);
router.put("/quiz/update/:id", auth, updateQuiz);
router.delete("/quiz/:id", auth, deleteQuiz);

/** Questions (+ options) */
router.post("/quiz/question/add", auth, addQuestion);
router.put("/quiz/question/:id", auth, updateQuestion);
router.delete("/quiz/question/:id", auth, deleteQuestion);

module.exports = router;
