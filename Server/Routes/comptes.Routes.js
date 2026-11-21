// Modification complète d'un compte : « Gérer les comptes » (compte.jauge) ou « Utilisateurs » (utilisateur.modifier)
const express = require("express");
const auth = require("../middlewares/auth");
const { permission } = require("../middlewares/permission");
const c = require("../Controllers/comptes.Controllers");
const router = express.Router();

router.get("/comptes/referentiels", auth, permission(["compte.jauge", "utilisateur.modifier"]), c.getReferentielsCompte);
router.get("/comptes/:id/edition", auth, permission(["compte.jauge", "utilisateur.modifier"]), c.getCompteEdition);
router.put("/comptes/:id", auth, permission(["compte.jauge", "utilisateur.modifier"]), c.modifierCompte);

module.exports = router;
