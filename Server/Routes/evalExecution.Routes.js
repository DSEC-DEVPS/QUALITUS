// =====================================================================
// Module ÉVALUATION QUALITÉ (cahier) — Routes Exécution (Phase 3a, F.39bis)
// Montées sous /api/v1. /eval/evaluation/:id doit être déclaré APRÈS
// /eval/evaluation/all (routes instance) dans server.js.
// =====================================================================
const express = require("express");
const auth = require("../middlewares/auth");
const { permission } = require("../middlewares/permission");
const x = require("../Controllers/evalExecution.Controllers");

const router = express.Router();

router.get("/eval/evaluation/:id", auth, permission("EVALUATION","LIRE"), x.getEvaluationDetail);
router.put("/eval/evaluation/:id/erreur/:idErreur", auth, permission("EVALUATION","EXECUTER"), x.toggleErreur);
router.put("/eval/evaluation/:id/resolution", auth, permission("EVALUATION","EXECUTER"), x.setResolution);
router.post("/eval/evaluation/:id/terminer", auth, permission("EVALUATION","EXECUTER"), x.terminerEvaluation);
router.put("/eval/evaluation/:id/avis", auth, permission("EVALUATION","EXECUTER"), x.setAvisAgent);

module.exports = router;
