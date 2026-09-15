// =====================================================================
// Module ÉVALUATION QUALITÉ (cahier) — Routes Évaluations (Phase 2)
// Montées sous /api/v1. Préfixe /eval/... (schéma b_evaluation).
// =====================================================================
const express = require("express");
const auth = require("../middlewares/auth");
const { permission } = require("../middlewares/permission");
const e = require("../Controllers/evalInstance.Controllers");

const router = express.Router();

router.get("/eval/evaluation/all", auth, permission("EVALUATION","LIRE"), e.getAllEvaluations);
router.get("/eval/ref/contexte", auth, permission("REFERENTIEL","LIRE"), e.getContextes);
router.get("/eval/ref/nature", auth, permission("REFERENTIEL","LIRE"), e.getNatures);
router.get("/eval/agents-evaluables", auth, permission("EVALUATION","LIRE"), e.getAgentsEvaluables);
router.get("/eval/agent-grille/:id", auth, permission("EVALUATION","LIRE"), e.getGrilleForAgent);
router.post("/eval/evaluation/add", auth, permission("EVALUATION","CREER"), e.createEvaluation);
router.post("/eval/evaluation/add-masse", auth, permission("EVALUATION","CREER"), e.createEvaluationMasse);

// Cycle de vie (F.39septies D)
router.post("/eval/evaluation/desactiver-masse", auth, permission("EVALUATION","CREER"), e.desactiverMasse);
router.put("/eval/evaluation/:id/actif", auth, permission("EVALUATION","MODIFIER"), e.setActifEvaluation);
router.delete("/eval/evaluation/:id", auth, permission("EVALUATION","SUPPRIMER"), e.deleteEvaluation);

module.exports = router;
