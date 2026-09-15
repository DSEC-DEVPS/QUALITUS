// =====================================================================
// Module ÉVALUATION QUALITÉ (cahier) — Routes Business Intelligence (Phase 3b)
// =====================================================================
const express = require("express");
const auth = require("../middlewares/auth");
const { permission } = require("../middlewares/permission");
const bi = require("../Controllers/evalBI.Controllers");

const router = express.Router();

// Arborescence + options (admin)
router.get("/eval/bi/arborescence", auth, permission("EVALUATION","LIRE"), bi.getArborescences);
router.post("/eval/bi/arborescence", auth, permission("EVALUATION","CREER"), bi.addArborescence);
router.get("/eval/bi/arborescence/:id/options", auth, permission("EVALUATION","LIRE"), bi.getArbreOptions);

// Options (cascade + attente) — routes spécifiques avant /option/:id
router.get("/eval/bi/options-enfants", auth, permission("EVALUATION","LIRE"), bi.getOptionsEnfants);
router.get("/eval/bi/options-en-attente", auth, permission("EVALUATION","LIRE"), bi.getOptionsEnAttente);
router.post("/eval/bi/proposer", auth, permission("EVALUATION","CREER"), bi.proposerOption);
router.post("/eval/bi/option/:id/valider", auth, permission("EVALUATION","VALIDER"), bi.validerOption);
router.post("/eval/bi/option/:id/rejeter", auth, permission("EVALUATION","VALIDER"), bi.rejeterOption);
router.post("/eval/bi/option", auth, permission("EVALUATION","CREER"), bi.addOption);
router.put("/eval/bi/option/:id", auth, permission("EVALUATION","MODIFIER"), bi.updateOption);
router.delete("/eval/bi/option/:id", auth, permission("EVALUATION","SUPPRIMER"), bi.deleteOption);

// Usage pendant l'évaluation
router.get("/eval/evaluation/:id/bi", auth, permission("EVALUATION","LIRE"), bi.getEvaluationBI);
router.post("/eval/evaluation/:id/bi", auth, permission("EVALUATION","CREER"), bi.saveEvaluationBI);

module.exports = router;
