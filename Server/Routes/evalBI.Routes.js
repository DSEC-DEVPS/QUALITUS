// =====================================================================
// Module ÉVALUATION QUALITÉ (cahier) — Routes Business Intelligence (Phase 3b)
// =====================================================================
// Paramétrage (calendrier, politique, modèles de lettre, arbres BI / coaching) :
// permission evaluation.parametrer (33_permissions_evaluation_portee.sql).
const express = require("express");
const auth = require("../middlewares/auth");
const { permission } = require("../middlewares/permission");
const { garderEvaluation, parCorpsEvaluation, parLignePlanAction } = require("../middlewares/accesEvaluation");
const bi = require("../Controllers/evalBI.Controllers");

const router = express.Router();

// Arborescence + options (admin)
// Lecture des arbres alignée sur leur usage : administration -> evaluation.parametrer ;
// choix pendant l'évaluation -> evaluation.creer (comme proposer une option BI) ;
// options en attente -> evaluation.valider.
router.get("/eval/bi/arborescence", auth, permission("EVALUATION","PARAMETRER"), bi.getArborescences);
router.post("/eval/bi/arborescence", auth, permission("EVALUATION","PARAMETRER"), bi.addArborescence);
// Modifier / supprimer (archivage si utilisée) / restaurer une arborescence (out104)
router.put("/eval/bi/arborescence/:id", auth, permission("EVALUATION","PARAMETRER"), bi.updateArborescence);
router.delete("/eval/bi/arborescence/:id", auth, permission("EVALUATION","PARAMETRER"), bi.deleteArborescence);
router.put("/eval/bi/arborescence/:id/restaurer", auth, permission("EVALUATION","PARAMETRER"), bi.restaurerArborescence);
router.get("/eval/bi/arborescence/:id/options", auth, permission("EVALUATION","PARAMETRER"), bi.getArbreOptions);

// Options (cascade + attente) — routes spécifiques avant /option/:id
router.get("/eval/bi/options-enfants", auth, permission("EVALUATION","CREER"), bi.getOptionsEnfants);
router.get("/eval/bi/options-en-attente", auth, permission("EVALUATION","VALIDER"), bi.getOptionsEnAttente);
router.post("/eval/bi/proposer", auth, permission("EVALUATION","CREER"), bi.proposerOption);
router.post("/eval/bi/option/:id/valider", auth, permission("EVALUATION","VALIDER"), bi.validerOption);
router.post("/eval/bi/option/:id/rejeter", auth, permission("EVALUATION","VALIDER"), bi.rejeterOption);
router.post("/eval/bi/option", auth, permission("EVALUATION","PARAMETRER"), bi.addOption);
router.put("/eval/bi/option/:id", auth, permission("EVALUATION","PARAMETRER"), bi.updateOption);
router.put("/eval/bi/option/:id/deplacer", auth, permission("EVALUATION","PARAMETRER"), bi.deplacerOptionArbre);
router.delete("/eval/bi/option/:id", auth, permission("EVALUATION","PARAMETRER"), bi.deleteOption);

// Usage pendant l'évaluation
router.get("/eval/evaluation/:id/bi", auth, permission("EVALUATION","LIRE"), garderEvaluation("voir"), bi.getEvaluationBI);
router.post("/eval/evaluation/:id/bi", auth, permission("EVALUATION","CREER"), garderEvaluation("agir"), bi.saveEvaluationBI);

module.exports = router;
