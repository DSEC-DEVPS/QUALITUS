// =====================================================================
// Module ÉVALUATION QUALITÉ (cahier) — Routes Grilles (Phase 1)
// Montées sous /api/v1. Préfixe /eval/... (schéma b_eval_*).
// =====================================================================
const express = require("express");
const auth = require("../middlewares/auth");
const { permission } = require("../middlewares/permission");
const g = require("../Controllers/evalGrille.Controllers");

const router = express.Router();

// Grilles
router.get("/eval/grille/all", auth, permission("GRILLE","LIRE"), g.getAllGrilles);
router.get("/eval/grille/:id", auth, permission("GRILLE","LIRE"), g.getGrilleDetail);
router.post("/eval/grille/add", auth, permission("GRILLE","CREER"), g.addGrille);
router.put("/eval/grille/:id/mode", auth, permission("GRILLE","MODIFIER"), g.changeMode);
router.put("/eval/grille/:id/activer", auth, permission("GRILLE","MODIFIER"), g.activerGrille);
router.put("/eval/grille/:id/desactiver", auth, permission("GRILLE","MODIFIER"), g.desactiverGrille);
router.put("/eval/grille/:id", auth, permission("GRILLE","MODIFIER"), g.updateGrille);
router.delete("/eval/grille/:id", auth, permission("GRILLE","SUPPRIMER"), g.deleteGrille);

// Catégories d'erreur
router.post("/eval/categorie-erreur/add", auth, permission("GRILLE","CREER"), g.addCategorie);
router.put("/eval/categorie-erreur/:id/archiver", auth, permission("GRILLE","MODIFIER"), g.archiverCategorie);
router.put("/eval/categorie-erreur/:id/reactiver", auth, permission("GRILLE","MODIFIER"), g.reactiverCategorie);
router.put("/eval/categorie-erreur/:id", auth, permission("GRILLE","MODIFIER"), g.updateCategorie);
router.delete("/eval/categorie-erreur/:id", auth, permission("GRILLE","SUPPRIMER"), g.deleteCategorie);

// Sous-catégories d'erreur
router.post("/eval/sous-categorie-erreur/add", auth, permission("GRILLE","CREER"), g.addSousCategorie);
router.put("/eval/sous-categorie-erreur/:id/archiver", auth, permission("GRILLE","MODIFIER"), g.archiverSousCategorie);
router.put("/eval/sous-categorie-erreur/:id/reactiver", auth, permission("GRILLE","MODIFIER"), g.reactiverSousCategorie);
router.put("/eval/sous-categorie-erreur/:id", auth, permission("GRILLE","MODIFIER"), g.updateSousCategorie);
router.delete("/eval/sous-categorie-erreur/:id", auth, permission("GRILLE","SUPPRIMER"), g.deleteSousCategorie);

// Erreurs
router.post("/eval/erreur/add", auth, permission("GRILLE","CREER"), g.addErreur);
router.put("/eval/erreur/:id/archiver", auth, permission("GRILLE","MODIFIER"), g.archiverErreur);
router.put("/eval/erreur/:id/reactiver", auth, permission("GRILLE","MODIFIER"), g.reactiverErreur);
router.put("/eval/erreur/:id", auth, permission("GRILLE","MODIFIER"), g.updateErreur);
router.delete("/eval/erreur/:id", auth, permission("GRILLE","SUPPRIMER"), g.deleteErreur);

module.exports = router;
