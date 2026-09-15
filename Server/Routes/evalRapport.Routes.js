// =====================================================================
// Module ÉVALUATION QUALITÉ (cahier) — Routes Reporting (Phase 7, F.40bis)
// =====================================================================
const express = require("express");
const auth = require("../middlewares/auth");
const { permission } = require("../middlewares/permission");
const rap = require("../Controllers/evalRapport.Controllers");

const router = express.Router();

router.get("/eval/rapport/agents-pole", auth, permission("REPORTING","LIRE"), rap.getRapportAgentsPole);
router.get("/eval/rapport/superviseurs", auth, permission("REPORTING","LIRE"), rap.getSuperviseurs);

module.exports = router;
