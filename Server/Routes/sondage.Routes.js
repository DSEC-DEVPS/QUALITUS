const express = require("express");
const multer = require("multer");
const auth = require("./../middlewares/auth");
const router = express.Router();
const uploadMemory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1024 * 1024 * 25 },
});
const {
  getAllSondage,
  getOneSondage,
  getSondagePublic,
  soumettreSondagePublic,
  rechercherUtilisateurs,
  getCibles,
  addCibleUtilisateurs,
  importCibles,
  deleteCible,
  diffuser,
  getRapport,
  getObligatoiresMes,
  getSondageObligatoire,
  soumettreSondageObligatoire,
  addSondage,
  updateSondage,
  changerStatut,
  deleteSondage,
  dupliquerSondage,
  addQuestion,
  updateQuestion,
  deleteQuestion,
} = require("../Controllers/sondage.Controllers");

/** Passation par lien PUBLIC (sans auth) - a declarer avant /sondage/:id */
router.get("/sondage/public/:token", getSondagePublic);
router.post("/sondage/public/:token/soumettre", soumettreSondagePublic);

/** Phase 3 : cible & diffusion (avant /sondage/:id pour la priorite) */
router.get("/sondage/utilisateurs/rechercher", auth, rechercherUtilisateurs);
router.delete("/sondage/cible/:cibleId", auth, deleteCible);
router.get("/sondage/:id/cible", auth, getCibles);
router.post("/sondage/:id/cible/utilisateurs", auth, addCibleUtilisateurs);
router.post("/sondage/:id/cible/import", auth, uploadMemory.single("fichier"), importCibles);
router.post("/sondage/:id/diffuser", auth, diffuser);
router.get("/sondage/:id/rapport", auth, getRapport);

/** Sondages OBLIGATOIRES (cible interne connectee) - avant /sondage/:id */
router.get("/sondage/obligatoires/mes", auth, getObligatoiresMes);
router.get("/sondage/obligatoire/:id", auth, getSondageObligatoire);
router.post("/sondage/obligatoire/:id/soumettre", auth, soumettreSondageObligatoire);

/** Sondage (module Phase 1) */
router.get("/sondage/all", auth, getAllSondage);
router.post("/sondage/add", auth, addSondage);
router.post("/sondage/:id/dupliquer", auth, dupliquerSondage);
router.patch("/sondage/:id/statut", auth, changerStatut);
router.put("/sondage/update/:id", auth, updateSondage);
router.get("/sondage/:id", auth, getOneSondage);
router.delete("/sondage/:id", auth, deleteSondage);

/** Questions (+ options) */
router.post("/sondage/question/add", auth, addQuestion);
router.put("/sondage/question/:id", auth, updateQuestion);
router.delete("/sondage/question/:id", auth, deleteQuestion);

module.exports = router;
