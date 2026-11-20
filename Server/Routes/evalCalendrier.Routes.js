// =====================================================================
// Module ÉVALUATION QUALITÉ (cahier) — Routes Calendrier (Phase 6a)
// =====================================================================
// Paramétrage (calendrier, politique, modèles de lettre, arbres BI / coaching) :
// permission evaluation.parametrer (33_permissions_evaluation_portee.sql).
const express = require("express");
const auth = require("../middlewares/auth");
const { permission } = require("../middlewares/permission");
const cal = require("../Controllers/evalCalendrier.Controllers");

const router = express.Router();

router.get("/eval/calendrier/:idSite", auth, permission("EVALUATION","LIRE"), cal.getCalendrier);
router.post("/eval/calendrier/generer", auth, permission("EVALUATION","PARAMETRER"), cal.genererCalendrier);
router.put("/eval/calendrier/mois/:id", auth, permission("EVALUATION","PARAMETRER"), cal.setEtatMois);
router.get("/eval/politique/:idSite", auth, permission("EVALUATION","LIRE"), cal.getPolitique);
router.put("/eval/politique/:idSite", auth, permission("EVALUATION","PARAMETRER"), cal.setPolitique);

module.exports = router;
