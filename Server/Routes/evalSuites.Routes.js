// =====================================================================
// Module ÉVALUATION QUALITÉ (cahier) — Routes Suites d'échec (Phase 4a)
// =====================================================================
// Paramétrage (calendrier, politique, modèles de lettre, arbres BI / coaching) :
// permission evaluation.parametrer (33_permissions_evaluation_portee.sql).
const express = require("express");
const auth = require("../middlewares/auth");
const { permission } = require("../middlewares/permission");
const { garderEvaluation, exigerEchecTermine, garderLignePlanAction, parCorpsEvaluation, parLignePlanAction } = require("../middlewares/accesEvaluation");
const s = require("../Controllers/evalSuites.Controllers");

const router = express.Router();

// Évaluations supplémentaires (F.39quater)
router.post("/eval/evaluation/:id/supplementaire", auth, permission("EVALUATION","CREER"), garderEvaluation("agir"), s.creerSupplementaire);
router.get("/eval/evaluation/:id/supplementaires", auth, permission("EVALUATION","LIRE"), garderEvaluation("voir"), s.getSupplementaires);

// Plan d'action (F.39quinquies B)
router.get("/eval/evaluation/:id/plan-action", auth, permission("EVALUATION","LIRE"), garderEvaluation("voir"), s.getPlanAction);
// Plan d'actions : permission dédiée evaluation.coacher (32_permission_evaluation_coacher.sql)
router.post("/eval/plan-action/ligne", auth, permission("EVALUATION","COACHER"), garderEvaluation("agir", parCorpsEvaluation), exigerEchecTermine(parCorpsEvaluation), s.addLignePlanAction);
// Modification (out107) : statut et synthèse seulement, par le porteur ou qui coache l'évaluation ; action close = figée.
router.put("/eval/plan-action/ligne/:id", auth, garderLignePlanAction, exigerEchecTermine(parLignePlanAction), s.updateLignePlanAction);
router.delete("/eval/plan-action/ligne/:id", auth, permission("EVALUATION","COACHER"), garderEvaluation("agir", parLignePlanAction), exigerEchecTermine(parLignePlanAction), s.deleteLignePlanAction);
// Suivi transverse (lecture seule, visibilité calculée dans le contrôleur) et
// utilisateurs proposables comme porteur / contributeur (out102).
router.get("/eval/plan-action/suivi", auth, permission("EVALUATION","LIRE"), s.getSuiviPlansActions);
// Statuts d'action (lecture) : sans REFERENTIEL.LIRE, pour la section plan d'action et le suivi.
router.get("/eval/plan-action/statuts", auth, permission("EVALUATION","LIRE"), s.getStatutsPlanAction);
router.get("/eval/plan-action/utilisateurs", auth, permission("EVALUATION","COACHER"), s.getUtilisateursAssignables);

// Lettres (F.39sexies)
router.get("/eval/evaluation/:id/lettre", auth, permission("EVALUATION","LIRE"), garderEvaluation("voir"), s.getLettreEvaluation);
router.get("/eval/lettre-modele/:type", auth, permission("EVALUATION","LIRE"), s.getLettreModele);
router.put("/eval/lettre-modele/:type", auth, permission("EVALUATION","PARAMETRER"), s.updateLettreModele);

module.exports = router;
