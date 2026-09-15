// =====================================================================
// Module ÉVALUATION QUALITÉ (cahier) — Routes Coaching (Phase 4b)
// =====================================================================
const express = require("express");
const auth = require("../middlewares/auth");
const { permission } = require("../middlewares/permission");
const co = require("../Controllers/evalCoaching.Controllers");

const router = express.Router();

// Arbre unique (admin)
router.get("/eval/coaching/arbre", auth, permission("EVALUATION","LIRE"), co.getArbre);
router.post("/eval/coaching/option", auth, permission("EVALUATION","CREER"), co.addOption);
router.put("/eval/coaching/option/:id", auth, permission("EVALUATION","MODIFIER"), co.updateOption);
router.delete("/eval/coaching/option/:id", auth, permission("EVALUATION","SUPPRIMER"), co.deleteOption);

// Cascade + attente (routes spécifiques avant /option/:id)
router.get("/eval/coaching/options-enfants", auth, permission("EVALUATION","LIRE"), co.getOptionsEnfants);
router.get("/eval/coaching/options-en-attente", auth, permission("EVALUATION","LIRE"), co.getOptionsEnAttente);
router.post("/eval/coaching/proposer", auth, permission("EVALUATION","CREER"), co.proposerOption);
router.post("/eval/coaching/option/:id/valider", auth, permission("EVALUATION","VALIDER"), co.validerOption);
router.post("/eval/coaching/option/:id/rejeter", auth, permission("EVALUATION","VALIDER"), co.rejeterOption);

// Coaching par évaluation
router.get("/eval/evaluation/:id/coaching", auth, permission("EVALUATION","LIRE"), co.getEvaluationCoaching);
router.post("/eval/evaluation/:id/coaching", auth, permission("EVALUATION","CREER"), co.saveCoaching);
router.post("/eval/evaluation/:id/coaching/terminer", auth, permission("EVALUATION","CREER"), co.terminerCoaching);

module.exports = router;
