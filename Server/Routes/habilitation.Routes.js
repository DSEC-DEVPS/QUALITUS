// Socle commun S5 — Routes d'administration des habilitations.
const express = require("express");
const auth = require("../middlewares/auth");
const { exigerHabilitationGestion } = require("../middlewares/permission");
const h = require("../Controllers/habilitation.Controllers");
const router = express.Router();

// HABILITATIONS 7 : voir OU agir dans le module Habilitation exige lire + gerer
// (ou R_ADMI). Blocage strict (403), quel que soit le mode OBSERVATION/ACTIF —
// la seule permission habilitation.lire ne donne ni vue ni action.

// Consultation
router.get("/habilitations/permissions", auth, exigerHabilitationGestion, h.getPermissions);
router.get("/habilitations/roles", auth, exigerHabilitationGestion, h.getRoles);
router.get("/habilitations/matrice", auth, exigerHabilitationGestion, h.getMatrice);
router.get("/habilitations/mode", auth, exigerHabilitationGestion, h.getMode);
router.get("/habilitations/observations", auth, exigerHabilitationGestion, h.getObservations);

// Administration
router.put("/habilitations/role/:idRole/permission/:idPermission", auth, exigerHabilitationGestion, h.toggleRolePermission);
router.put("/habilitations/mode", auth, exigerHabilitationGestion, h.setMode);

// Permissions effectives de l'utilisateur courant (alimentation du client)

// Droits complémentaires par utilisateur
router.get("/habilitations/utilisateurs", auth, exigerHabilitationGestion, h.rechercherUtilisateurs);
router.get("/habilitations/utilisateurs-speciaux", auth, exigerHabilitationGestion, h.getUtilisateursSpeciaux);
router.get("/habilitations/utilisateur/:id/droits", auth, exigerHabilitationGestion, h.getDroitsUtilisateur);
router.put("/habilitations/utilisateur/:id/permission/:idPermission", auth, exigerHabilitationGestion, h.setDroitUtilisateur);

router.get("/me/permissions", auth, h.getMesPermissions);

module.exports = router;
