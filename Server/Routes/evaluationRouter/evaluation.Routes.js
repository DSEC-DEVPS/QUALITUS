const express = require("express");
const auth = require("../../middlewares/auth");
const router = express.Router();

const {
  createEvaluation,
  getAgentByUsername,
  createCategoriesErreurs,
  createSousCategoriesErreurs,
  createErreurs,
  updateEvaluationsResultats,
  createCalendars,
  createCalendarsPolicies,
  updateCalendars,
  afficherCalendarsBySite,
  afficherCalendars,
  afficherCalendarsPolicies,
  actualiserCalendars,
  updateCalendarsPolicies,
  deleteCalendarsBySite,
  deleteCalendarsPolicies,
  deleteEvaluations,
  updateCategoriesErreurs,
  updateSousCategoriesErreurs,
  deleteSousCategoriesErreurs,
  deleteCategoriesErreurs,
  deleteErreurs,
  updateErreurs,
  getAllCategoriesErreurs,
  getCategoriesErreursByGrilleId,
  getCategoriesErreursById,
  getAllSousCategoriesErreurs,
  getSousCategoriesErreursByCategorieId,
  getSousCategoriesErreursById,
  getAllErreurs,
  getErreursByCategorie,
  getErreursByGrille,
  getErreursById,
  getAllEvaluationsResultatsByEvaluationsAndCategorie,
  getAllEvaluations,
  getAllEvaluationsTerminer,
  getEvaluationsById,
  getSupplementaireCountByEvaluation,
  getAllSupplementairesByEvaluations,
  updateEvaluations,
  terminerEvaluations,
  getAllScoresByIdEvaluations,
  createBusinessIntelligence,
  updateBusinessIntelligence,
  deleteBusinessIntelligence,
  getAllBusinessIntelligence,
  getBusinessIntelligenceByGrille,
  getBusinessIntelligenceById,
  getBusinessIntelligenceBySite,
  createBI1,
  updateBI1,
  deleteBI1,
  getBI1ByBusinessIntelligence,
  getBI1ById,
  createBI2,
  updateBI2,
  deleteBI2,
  getBI2ByBI_1,
  getBI2ById,
  createBI3,
  updateBI3,
  deleteBI3,
  getBI3ByBI_2,
  getBI3ById,
  createBI4,
  updateBI4,
  deleteBI4,
  getBI4ByBI_3,
  getBI4ById,
  getAllBI,
  getAllBIByGrille,
} = require("../../Controllers/evaluationControllers/evaluation.Controllers");

const {
  createContexte,
  getAllContextes,
  getAllContextesActifs,
  getContexteById,
  updateContexte,
  deleteContexte,
} = require("../../Controllers/evaluationControllers/contexte.Controllers");

// Routes pour les contextes d'évaluation
router.get("/contextes", auth, getAllContextes);
router.get("/contextesActifs", auth, getAllContextesActifs);
router.get("/contextes/:id", auth, getContexteById);
router.post("/contextes/add", auth, createContexte);
router.put("/contextes/:id", auth, updateContexte);
router.delete("/contextes/:id", auth, deleteContexte);

router.post("/calendars/add", auth, createCalendars);
router.delete("/deleteCalendarsBySite/:id", auth, deleteCalendarsBySite);
router.get("/actualiserCalendars", auth, actualiserCalendars);
router.put("/calendars/:id", auth, updateCalendars);
router.get("/calendarsBySite/:id_Site", auth, afficherCalendarsBySite);
router.get("/calendars", auth, afficherCalendars);
router.get("/calendarsPolicies", auth, afficherCalendarsPolicies);
router.post("/calendarsPolicies/add", auth, createCalendarsPolicies);
router.delete("/deleteCalendarsPolicies/:id", auth, deleteCalendarsPolicies);
router.put("/calendarsPolicies/:id", auth, updateCalendarsPolicies);
// router.get("/supplementaires/:id", auth, getSupplementairesById);
// router.get("/supplementairesAll/:id/:debut/:fin", auth, getAllSupplementaires);

// router.get("/supplementairesEnCours", auth, getAllSupplementairesEnCours);
// router.get("/supplementairesTerminer", auth, getAllSupplementairesTerminer);
router.get(
  "/supplementairesCountByEvaluation/:id",
  auth,
  getSupplementaireCountByEvaluation,
);
router.get(
  "/supplementairesByEvaluations/:id/:id_Evaluations",
  auth,
  getAllSupplementairesByEvaluations,
);
// router.get(
//   "/supplementairesByEvaluations/:id",
//   auth,
//   getAllSupplementairesByEvaluations,
// );

// router.post("/supplementaires/add", auth, createSupplementaire);
// router.put("/supplementaires/:id", auth, updateSupplementaires);
// router.delete("/deleteSupplementaires/:id", auth, deleteSupplementaires);
// router.get(
//   "/supplementairesResultats/:id",
//   auth,
//   getAllSupplementairesResultatsByEvaluationsAndCategorie,
// );
// router.put("/supplementairesResultats", auth, updateSupplementairesResultats);
router.get("/evaluations/:id", auth, getEvaluationsById);
router.get("/evaluationsAll/:id/:debut/:fin", auth, getAllEvaluations);
router.get("/evaluationsTerminer", auth, getAllEvaluationsTerminer);
router.get("/evaluations/agent/:username", auth, getAgentByUsername);
router.post("/evaluations/add", auth, createEvaluation);
router.put("/evaluations/:id", auth, updateEvaluations);
router.put("/terminerEvaluations/:id", auth, terminerEvaluations);

router.delete("/deleteEvaluations/:id", auth, deleteEvaluations);
router.get(
  "/evaluationsResultats/:id",
  auth,
  getAllEvaluationsResultatsByEvaluationsAndCategorie,
);
router.put("/evaluationsResultats", auth, updateEvaluationsResultats);
router.get("/categoriesErreurs", auth, getAllCategoriesErreurs);
router.get("/categoriesErreurs/:id", auth, getCategoriesErreursById);
router.get(
  "/categoriesErreursByGrille/:id",
  auth,
  getCategoriesErreursByGrilleId,
);
router.post("/categoriesErreurs/add", auth, createCategoriesErreurs);
router.put("/categoriesErreurs/:id", auth, updateCategoriesErreurs);
router.delete("/categoriesErreurs/:id", auth, deleteCategoriesErreurs);
router.get("/sousCategoriesErreurs", auth, getAllSousCategoriesErreurs);
router.get("/sousCategoriesErreurs/:id", auth, getSousCategoriesErreursById);
router.get(
  "/sousCategoriesErreursByCategorie/:id",
  auth,
  getSousCategoriesErreursByCategorieId,
);
router.post("/sousCategoriesErreurs/:id", auth, createSousCategoriesErreurs);
router.put("/sousCategoriesErreurs/:id", auth, updateSousCategoriesErreurs);
router.delete("/sousCategoriesErreurs/:id", auth, deleteSousCategoriesErreurs);
router.get("/erreurs", auth, getAllErreurs);
router.get("/erreursByCategorie/:id", auth, getErreursByCategorie);
router.get("/erreursByGrille/:id", auth, getErreursByGrille);
router.get("/erreurs/:id", auth, getErreursById);
router.post("/erreurs/add", auth, createErreurs);
router.put("/erreurs/:id", auth, updateErreurs);
router.delete("/erreurs/:id", auth, deleteErreurs);
router.get("/scoresByIdEvaluations/:id", auth, getAllScoresByIdEvaluations);
// router.get(
//   "/scoresByIdSupplementaires/:id",
//   auth,
//   getAllScoresByIdSupplementaires,
// );

router.get("/bIAll", auth, getAllBI);
router.get("/bIAll/:id_Grille/:id_Agent", auth, getAllBIByGrille);
router.post("/businessIntelligence", auth, createBusinessIntelligence);
router.put("/businessIntelligence/:id", auth, updateBusinessIntelligence);
router.delete("/businessIntelligence/:id", auth, deleteBusinessIntelligence);
router.get("/businessIntelligence", auth, getAllBusinessIntelligence);
router.get("/businessIntelligence/:id", auth, getBusinessIntelligenceById);
router.get(
  "/businessIntelligenceBySite/:id",
  auth,
  getBusinessIntelligenceBySite,
);
router.get(
  "/businessIntelligenceByGrille/:id",
  auth,
  getBusinessIntelligenceByGrille,
);
router.post("/bI1", auth, createBI1);
router.put("/bI1/:id", auth, updateBI1);
router.delete("/bI1/:id", auth, deleteBI1);
router.get("/bI1/:id", auth, getBI1ById);
router.get(
  "/bI1ByBusinessIntelligence/:id",
  auth,
  getBI1ByBusinessIntelligence,
);

router.post("/bI2", auth, createBI2);
router.put("/bI2/:id", auth, updateBI2);
router.delete("/bI2/:id", auth, deleteBI2);
router.get("/bI2/:id", auth, getBI2ById);
router.get("/bI2ByBI_1/:id", auth, getBI2ByBI_1);

router.post("/bI3", auth, createBI3);
router.put("/bI3/:id", auth, updateBI3);
router.delete("/bI3/:id", auth, deleteBI3);
router.get("/bI3/:id", auth, getBI3ById);
router.get("/bI3ByBI_2/:id", auth, getBI3ByBI_2);

router.post("/bI4", auth, createBI4);
router.put("/bI4/:id", auth, updateBI4);
router.delete("/bI4/:id", auth, deleteBI4);
router.get("/bI4/:id", auth, getBI4ById);
router.get("/bI4ByBI_3/:id", auth, getBI4ByBI_3);
module.exports = router;
