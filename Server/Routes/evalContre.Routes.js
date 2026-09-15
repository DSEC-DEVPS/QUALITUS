// =====================================================================
// Module ÉVALUATION QUALITÉ (cahier) — Routes Contre-évaluation (Phase 6b)
// =====================================================================
const express = require("express");
const auth = require("../middlewares/auth");
const { permission } = require("../middlewares/permission");
const ce = require("../Controllers/evalContre.Controllers");

const router = express.Router();

router.get("/eval/contre/all", auth, permission("EVALUATION","LIRE"), ce.getAllContre);
router.get("/eval/contre/evaluateurs/:idSite", auth, permission("EVALUATION","LIRE"), ce.getEvaluateursBySite);
router.get("/eval/contre/evaluations/:idEvaluateur", auth, permission("EVALUATION","LIRE"), ce.getEvaluationsByEvaluateur);
router.post("/eval/contre/creer/:idEvaluation", auth, permission("EVALUATION","CONTRE_EVALUER"), ce.creerContre);
router.get("/eval/contre/:id", auth, permission("EVALUATION","LIRE"), ce.getContre);
router.put("/eval/contre/:id/erreur/:idErreur", auth, permission("EVALUATION","CONTRE_EVALUER"), ce.toggleErreur);
router.put("/eval/contre/:id/resolution", auth, permission("EVALUATION","CONTRE_EVALUER"), ce.setResolution);
router.post("/eval/contre/:id/terminer", auth, permission("EVALUATION","CONTRE_EVALUER"), ce.terminerContre);
router.put("/eval/contre/:id/actif", auth, permission("EVALUATION","CONTRE_EVALUER"), ce.setActifContre);

module.exports = router;
