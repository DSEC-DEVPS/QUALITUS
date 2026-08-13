const express = require("express");
const multer = require("multer");
const auth = require("./../middlewares/auth");
const router = express.Router();
// Multer en memoire : on parse le buffer Excel sans le persister sur disque
const uploadMemory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1024 * 1024 * 25 },
});
const {
  // Modele
  getAllModeleGrille,
  getOneModeleGrille,
  addModeleGrille,
  updateModeleGrille,
  deleteModeleGrille,
  // Categorie d'erreur
  addCategorieErreur,
  updateCategorieErreur,
  deleteCategorieErreur,
  // Erreur
  addErreur,
  updateErreur,
  deleteErreur,
  // Item
  addItem,
  updateItem,
  deleteItem,
  // Sous-item
  addSousItem,
  updateSousItem,
  deleteSousItem,
  // Categories de ressources
  getAllCategorieRessource,
  setCategoriesRessourcesModele,
  // Phase 2
  importModeleFromExcel,
  getCriteresByModele,
  addCritereRegle,
  updateCritereRegle,
  deleteCritereRegle,
  getPourquoiByModele,
  addPourquoi,
  updatePourquoi,
  deletePourquoi,
} = require("../Controllers/calibrage.Controllers");

/** Modele de grille d'evaluation */
router.get("/calibrage/modele/all", auth, getAllModeleGrille);
router.get("/calibrage/modele/:id", auth, getOneModeleGrille);
router.post("/calibrage/modele/add", auth, addModeleGrille);
router.put("/calibrage/modele/update/:id", auth, updateModeleGrille);
router.delete("/calibrage/modele/:id", auth, deleteModeleGrille);

/** Niveau 1 : Categorie d'erreur */
router.post("/calibrage/categorie-erreur/add", auth, addCategorieErreur);
router.put("/calibrage/categorie-erreur/:id", auth, updateCategorieErreur);
router.delete("/calibrage/categorie-erreur/:id", auth, deleteCategorieErreur);

/** Niveau 2 : Erreur */
router.post("/calibrage/erreur/add", auth, addErreur);
router.put("/calibrage/erreur/:id", auth, updateErreur);
router.delete("/calibrage/erreur/:id", auth, deleteErreur);

/** Niveau 3 : Item */
router.post("/calibrage/item/add", auth, addItem);
router.put("/calibrage/item/:id", auth, updateItem);
router.delete("/calibrage/item/:id", auth, deleteItem);

/** Niveau 4 : Sous-item */
router.post("/calibrage/sous-item/add", auth, addSousItem);
router.put("/calibrage/sous-item/:id", auth, updateSousItem);
router.delete("/calibrage/sous-item/:id", auth, deleteSousItem);

/** Categories de ressources + association */
router.get("/calibrage/categorie-ressource/all", auth, getAllCategorieRessource);
router.put(
  "/calibrage/modele/:id/categories-ressources",
  auth,
  setCategoriesRessourcesModele
);

/** Phase 2 : import Excel (feuilles GRILLE + REGLES) */
router.post(
  "/calibrage/modele/import",
  auth,
  uploadMemory.single("file"),
  importModeleFromExcel
);

/** Phase 2 : criteres de reussite / echec */
router.get("/calibrage/critere-regle/modele/:id", auth, getCriteresByModele);
router.post("/calibrage/critere-regle/add", auth, addCritereRegle);
router.put("/calibrage/critere-regle/:id", auth, updateCritereRegle);
router.delete("/calibrage/critere-regle/:id", auth, deleteCritereRegle);

/** Phase 2 : Business Intelligence - 5 Pourquoi */
router.get("/calibrage/pourquoi/modele/:id", auth, getPourquoiByModele);
router.post("/calibrage/pourquoi/add", auth, addPourquoi);
router.put("/calibrage/pourquoi/:id", auth, updatePourquoi);
router.delete("/calibrage/pourquoi/:id", auth, deletePourquoi);

module.exports = router;
