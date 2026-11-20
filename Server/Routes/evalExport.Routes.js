// =====================================================================
// Exportations — exports du module Évaluation (Écoutes, Pôle, Coaching…)
// Le menu Exportations exige reporting.lire ; le contrôleur vérifie en plus
// la permission propre à chaque export et le périmètre de site.
// =====================================================================
const express = require("express");
const auth = require("../middlewares/auth");
const { permission } = require("../middlewares/permission");
const exp = require("../Controllers/evalExport.Controllers");

const router = express.Router();

router.get("/export/eval/contexte", auth, permission("REPORTING", "LIRE"), exp.getContexteExport);
router.post("/export/eval", auth, permission("REPORTING", "LIRE"), exp.exporterEval);

module.exports = router;
