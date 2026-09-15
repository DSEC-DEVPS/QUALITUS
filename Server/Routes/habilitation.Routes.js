// Socle commun S5 — Routes d'administration des habilitations.
const express = require("express");
const auth = require("../middlewares/auth");
const { permission } = require("../middlewares/permission");
const h = require("../Controllers/habilitation.Controllers");
const router = express.Router();

// Consultation (réservée à la gestion des habilitations)
router.get("/habilitations/permissions", auth, permission("HABILITATION", "LIRE"), h.getPermissions);
router.get("/habilitations/roles", auth, permission("HABILITATION", "LIRE"), h.getRoles);
router.get("/habilitations/matrice", auth, permission("HABILITATION", "LIRE"), h.getMatrice);
router.get("/habilitations/mode", auth, permission("HABILITATION", "LIRE"), h.getMode);
router.get("/habilitations/observations", auth, permission("HABILITATION", "LIRE"), h.getObservations);

// Administration (GERER)
router.put("/habilitations/role/:idRole/permission/:idPermission", auth, permission("HABILITATION", "GERER"), h.toggleRolePermission);
router.put("/habilitations/mode", auth, permission("HABILITATION", "GERER"), h.setMode);

// Permissions effectives de l'utilisateur courant (alimentation du client)

// Droits complémentaires par utilisateur (GERER)
router.get("/habilitations/utilisateurs", auth, permission("HABILITATION", "LIRE"), h.rechercherUtilisateurs);
router.get("/habilitations/utilisateur/:id/droits", auth, permission("HABILITATION", "LIRE"), h.getDroitsUtilisateur);
router.put("/habilitations/utilisateur/:id/permission/:idPermission", auth, permission("HABILITATION", "GERER"), h.setDroitUtilisateur);

router.get("/me/permissions", auth, h.getMesPermissions);

module.exports = router;
