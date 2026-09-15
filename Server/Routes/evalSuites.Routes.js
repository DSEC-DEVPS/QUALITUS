// =====================================================================
// Module ÉVALUATION QUALITÉ (cahier) — Routes Suites d'échec (Phase 4a)
// =====================================================================
const express = require("express");
const auth = require("../middlewares/auth");
const { permission } = require("../middlewares/permission");
const s = require("../Controllers/evalSuites.Controllers");

const router = express.Router();

// Évaluations supplémentaires (F.39quater)
router.post("/eval/evaluation/:id/supplementaire", auth, permission("EVALUATION","CREER"), s.creerSupplementaire);
router.get("/eval/evaluation/:id/supplementaires", auth, permission("EVALUATION","LIRE"), s.getSupplementaires);

// Plan d'action (F.39quinquies B)
router.get("/eval/evaluation/:id/plan-action", auth, permission("EVALUATION","LIRE"), s.getPlanAction);
router.post("/eval/plan-action/ligne", auth, permission("EVALUATION","CREER"), s.addLignePlanAction);
router.put("/eval/plan-action/ligne/:id", auth, permission("EVALUATION","MODIFIER"), s.updateLignePlanAction);
router.delete("/eval/plan-action/ligne/:id", auth, permission("EVALUATION","SUPPRIMER"), s.deleteLignePlanAction);

// Lettres (F.39sexies)
router.get("/eval/evaluation/:id/lettre", auth, permission("EVALUATION","LIRE"), s.getLettreEvaluation);
router.get("/eval/lettre-modele/:type", auth, permission("EVALUATION","LIRE"), s.getLettreModele);
router.put("/eval/lettre-modele/:type", auth, permission("EVALUATION","MODIFIER"), s.updateLettreModele);

module.exports = router;
