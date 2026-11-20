// =====================================================================
// Module ÉVALUATION QUALITÉ (cahier) — Routes Coaching (Phase 4b)
// =====================================================================
// Paramétrage (calendrier, politique, modèles de lettre, arbres BI / coaching) :
// permission evaluation.parametrer (33_permissions_evaluation_portee.sql).
const express = require("express");
const auth = require("../middlewares/auth");
const { permission } = require("../middlewares/permission");
const { garderEvaluation, parCorpsEvaluation, parLignePlanAction, parCoaching } = require("../middlewares/accesEvaluation");
const co = require("../Controllers/evalCoaching.Controllers");

const router = express.Router();

// Arbre unique (admin)
// Lecture des options alignée sur leur usage : arbre complet -> evaluation.parametrer ;
// choix pendant le coaching -> evaluation.coacher (comme proposer) ;
// options en attente -> evaluation.valider.
router.get("/eval/coaching/arbre", auth, permission("EVALUATION","PARAMETRER"), co.getArbre);
router.post("/eval/coaching/option", auth, permission("EVALUATION","PARAMETRER"), co.addOption);
router.put("/eval/coaching/option/:id", auth, permission("EVALUATION","PARAMETRER"), co.updateOption);
router.put("/eval/coaching/option/:id/deplacer", auth, permission("EVALUATION","PARAMETRER"), co.deplacerOptionArbre);
router.delete("/eval/coaching/option/:id", auth, permission("EVALUATION","PARAMETRER"), co.deleteOption);

// Cascade + attente (routes spécifiques avant /option/:id)
router.get("/eval/coaching/options-enfants", auth, permission("EVALUATION","COACHER"), co.getOptionsEnfants);
router.get("/eval/coaching/options-en-attente", auth, permission("EVALUATION","VALIDER"), co.getOptionsEnAttente);
// Proposer une option pendant un coaching : evaluation.coacher + périmètre de l'évaluation coachée
router.post("/eval/coaching/proposer", auth, permission("EVALUATION","COACHER"), garderEvaluation("agir", parCoaching), co.proposerOption);
router.post("/eval/coaching/option/:id/valider", auth, permission("EVALUATION","VALIDER"), co.validerOption);
router.post("/eval/coaching/option/:id/rejeter", auth, permission("EVALUATION","VALIDER"), co.rejeterOption);

// Coaching par évaluation
router.get("/eval/evaluation/:id/coaching", auth, permission("EVALUATION","LIRE"), garderEvaluation("voir"), co.getEvaluationCoaching);
// Coaching : permission dédiée evaluation.coacher (32_permission_evaluation_coacher.sql)
router.post("/eval/evaluation/:id/coaching", auth, permission("EVALUATION","COACHER"), garderEvaluation("agir"), co.saveCoaching);
router.post("/eval/evaluation/:id/coaching/terminer", auth, permission("EVALUATION","COACHER"), garderEvaluation("agir"), co.terminerCoaching);

module.exports = router;
