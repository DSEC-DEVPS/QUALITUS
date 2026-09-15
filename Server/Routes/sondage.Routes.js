const express = require("express");
const multer = require("multer");
const auth = require("./../middlewares/auth");
const { permission } = require("./../middlewares/permission");
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
router.get("/sondage/utilisateurs/rechercher", auth, permission("SONDAGE","LIRE"), rechercherUtilisateurs);
router.delete("/sondage/cible/:cibleId", auth, permission("SONDAGE","SUPPRIMER"), deleteCible);
router.get("/sondage/:id/cible", auth, permission("SONDAGE","LIRE"), getCibles);
router.post("/sondage/:id/cible/utilisateurs", auth, permission("SONDAGE","CREER"), addCibleUtilisateurs);
router.post("/sondage/:id/cible/import", auth, permission("SONDAGE","CREER"), uploadMemory.single("fichier"), importCibles);
router.post("/sondage/:id/diffuser", auth, permission("SONDAGE","CREER"), diffuser);
router.get("/sondage/:id/rapport", auth, permission("SONDAGE","LIRE"), getRapport);

/** Sondages OBLIGATOIRES (cible interne connectee) - avant /sondage/:id */
router.get("/sondage/obligatoires/mes", auth, permission("SONDAGE","LIRE"), getObligatoiresMes);
router.get("/sondage/obligatoire/:id", auth, permission("SONDAGE","LIRE"), getSondageObligatoire);
router.post("/sondage/obligatoire/:id/soumettre", auth, permission("SONDAGE","CREER"), soumettreSondageObligatoire);

/** Sondage (module Phase 1) */
router.get("/sondage/all", auth, permission("SONDAGE","LIRE"), getAllSondage);
router.post("/sondage/add", auth, permission("SONDAGE","CREER"), addSondage);
router.post("/sondage/:id/dupliquer", auth, permission("SONDAGE","CREER"), dupliquerSondage);
router.patch("/sondage/:id/statut", auth, permission("SONDAGE","MODIFIER"), changerStatut);
router.put("/sondage/update/:id", auth, permission("SONDAGE","MODIFIER"), updateSondage);
router.get("/sondage/:id", auth, permission("SONDAGE","LIRE"), getOneSondage);
router.delete("/sondage/:id", auth, permission("SONDAGE","SUPPRIMER"), deleteSondage);

/** Questions (+ options) */
router.post("/sondage/question/add", auth, permission("SONDAGE","CREER"), addQuestion);
router.put("/sondage/question/:id", auth, permission("SONDAGE","MODIFIER"), updateQuestion);
router.delete("/sondage/question/:id", auth, permission("SONDAGE","SUPPRIMER"), deleteQuestion);

module.exports = router;
