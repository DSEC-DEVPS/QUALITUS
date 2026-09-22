// =====================================================================
// Module ÉVALUATION QUALITÉ (cahier) — Routes Contre-évaluation (Phase 6b)
// =====================================================================
const express = require("express");
const auth = require("../middlewares/auth");
const { permission } = require("../middlewares/permission");
const ce = require("../Controllers/evalContre.Controllers");

const router = express.Router();

// Matrice de droits dédiée à la contre-évaluation (module CONTRE_EVALUATION).
router.get("/eval/contre/all", auth, permission("CONTRE_EVALUATION","LIRE"), ce.getAllContre);
router.get("/eval/contre/mes", auth, permission("CONTRE_EVALUATION","LIRE"), ce.getMesContre);
router.get("/eval/contre/evaluateurs/:idSite", auth, permission("CONTRE_EVALUATION","CREER"), ce.getEvaluateursBySite);
router.get("/eval/contre/evaluations/:idEvaluateur", auth, permission("CONTRE_EVALUATION","CREER"), ce.getEvaluationsByEvaluateur);
router.post("/eval/contre/creer/:idEvaluation", auth, permission("CONTRE_EVALUATION","CREER"), ce.creerContre);
router.get("/eval/contre/:id", auth, permission("CONTRE_EVALUATION","LIRE"), ce.getContre);
// Exécution : réservée au responsable (contrôle d'identité dans le contrôleur)
router.put("/eval/contre/:id/erreur/:idErreur", auth, permission("CONTRE_EVALUATION","CREER"), ce.toggleErreur);
router.put("/eval/contre/:id/resolution", auth, permission("CONTRE_EVALUATION","CREER"), ce.setResolution);
router.post("/eval/contre/:id/terminer", auth, permission("CONTRE_EVALUATION","CREER"), ce.terminerContre);
router.put("/eval/contre/:id/actif", auth, permission("CONTRE_EVALUATION","DESACTIVER"), ce.setActifContre);
router.delete("/eval/contre/:id", auth, permission("CONTRE_EVALUATION","SUPPRIMER"), ce.supprimerContre);

module.exports = router;
