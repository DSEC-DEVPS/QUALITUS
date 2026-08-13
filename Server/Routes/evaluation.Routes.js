const express = require("express");
const multer = require("multer");
const auth = require("./../middlewares/auth");
const router = express.Router();
// Multer en memoire pour l'import Excel des agents (pas de persistance disque)
const uploadMemory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1024 * 1024 * 25 },
});
const {
  getAllContexte,
  addContexte,
  updateContexte,
  deleteContexte,
  getAllEvaluateur,
  addEvaluateur,
  updateEvaluateur,
  deleteEvaluateur,
  getAllAgent,
  addAgent,
  updateAgent,
  deleteAgent,
  importAgents,
  getAllEvaluation,
  getOneEvaluation,
  addEvaluation,
  addEvaluationMasse,
  updateEvaluation,
  setActifEvaluation,
  deleteEvaluation,
  terminerEvaluation,
  getCoaching,
  saveCoaching,
  getAllActionType,
  addActionType,
  updateActionType,
  deleteActionType,
  getActionsByEvaluation,
  addAction,
  updateAction,
  deleteAction,
  getMesNotificationsEval,
  marquerNotifEvalLu,
  marquerToutNotifEvalLu,
  getRapportAgentsPole,
  getEvaluateursBySite,
  getEvaluationsByEvaluateur,
  creerContre,
  getContre,
  terminerContre,
  getAllContre,
  setActifContre,
} = require("../Controllers/evaluation.Controllers");

/** Contexte (liste de valeurs) */
router.get("/evaluation/contexte/all", auth, getAllContexte);
router.post("/evaluation/contexte/add", auth, addContexte);
router.put("/evaluation/contexte/:id", auth, updateContexte);
router.delete("/evaluation/contexte/:id", auth, deleteContexte);

/** Evaluateurs */
router.get("/evaluation/evaluateur/all", auth, getAllEvaluateur);
router.post("/evaluation/evaluateur/add", auth, addEvaluateur);
router.put("/evaluation/evaluateur/:id", auth, updateEvaluateur);
router.delete("/evaluation/evaluateur/:id", auth, deleteEvaluateur);

/** Agents a evaluer */
router.get("/evaluation/agent/all", auth, getAllAgent);
router.post("/evaluation/agent/import", auth, uploadMemory.single("file"), importAgents);
router.post("/evaluation/agent/add", auth, addAgent);
router.put("/evaluation/agent/:id", auth, updateAgent);
router.delete("/evaluation/agent/:id", auth, deleteAgent);

/** Phase 2 : evaluations (creation + execution) */
router.get("/evaluation/evaluation/all", auth, getAllEvaluation);
router.post("/evaluation/evaluation/add", auth, addEvaluation);
router.post("/evaluation/evaluation/add-masse", auth, addEvaluationMasse);
router.put("/evaluation/evaluation/actif", auth, setActifEvaluation);
router.get("/evaluation/evaluation/:id", auth, getOneEvaluation);
router.put("/evaluation/evaluation/:id", auth, updateEvaluation);
router.post("/evaluation/evaluation/:id/terminer", auth, terminerEvaluation);
router.delete("/evaluation/evaluation/:id", auth, deleteEvaluation);

/** Phase 3 : coaching (cause racine + 5 pourquoi) */
router.get("/evaluation/coaching/:idEvaluation", auth, getCoaching);
router.post("/evaluation/coaching/:idEvaluation", auth, saveCoaching);

/** Phase 3 : types d'action (parametrable) */
router.get("/evaluation/action-type/all", auth, getAllActionType);
router.post("/evaluation/action-type/add", auth, addActionType);
router.put("/evaluation/action-type/:id", auth, updateActionType);
router.delete("/evaluation/action-type/:id", auth, deleteActionType);

/** Phase 3 : plan d'action correctif */
router.get("/evaluation/action/evaluation/:idEvaluation", auth, getActionsByEvaluation);
router.post("/evaluation/action/add", auth, addAction);
router.put("/evaluation/action/:id", auth, updateAction);
router.delete("/evaluation/action/:id", auth, deleteAction);

/** Phase 3 : notifications de resultat (in-app) */
router.get("/evaluation/notification/mes", auth, getMesNotificationsEval);
router.patch("/evaluation/notification/lu-tout", auth, marquerToutNotifEvalLu);
router.patch("/evaluation/notification/:id/lu", auth, marquerNotifEvalLu);

/** Phase 3 : rapport agents en pole */
router.get("/evaluation/rapport/agents-pole", auth, getRapportAgentsPole);

/** Phase 4 : contre-evaluations */
router.get("/evaluation/contre/all", auth, getAllContre);
router.get("/evaluation/contre/evaluateurs/:idSite", auth, getEvaluateursBySite);
router.get("/evaluation/contre/evaluations/:idEvaluateur", auth, getEvaluationsByEvaluateur);
router.post("/evaluation/contre/creer/:idEvaluation", auth, creerContre);
router.get("/evaluation/contre/:id", auth, getContre);
router.post("/evaluation/contre/:id/terminer", auth, terminerContre);
router.put("/evaluation/contre/:id/actif", auth, setActifContre);

module.exports = router;
