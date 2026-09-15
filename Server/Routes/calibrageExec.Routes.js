// Module Calibrage — routes Phase 2 (déroulement, F.46)
const express = require("express");
const auth = require("../middlewares/auth");
const { permission } = require("../middlewares/permission");
const c = require("../Controllers/calibrageExec.Controllers");
const router = express.Router();

// Écran de session (participant ou jauge)
router.get("/calibrage/session/:id/travail", auth, permission("CALIBRAGE", "LIRE"), c.getTravail);
router.get("/calibrage/transaction/:tid/grille", auth, permission("CALIBRAGE", "LIRE"), c.getGrilleTransaction);

// Constats
router.put("/calibrage/evaluation-tx/:evalId/erreur/:erreurId", auth, permission("CALIBRAGE", "LIRE"), c.toggleErreur);
router.put("/calibrage/transaction/:tid/terminer", auth, permission("CALIBRAGE", "LIRE"), c.terminerTransaction);

// Clôtures
router.post("/calibrage/session/:id/cloturer-participation", auth, permission("CALIBRAGE", "LIRE"), c.cloturerParticipation);
router.post("/calibrage/session/:id/cloturer-reference", auth, permission("CALIBRAGE", "ORGANISER"), c.cloturerReference);

// Pilotage jauge
router.put("/calibrage/session/:id/visibilite", auth, permission("CALIBRAGE", "ORGANISER"), c.setVisibilite);
router.put("/calibrage/participant/:pid/reinitialiser", auth, permission("CALIBRAGE", "ORGANISER"), c.reinitialiserParticipant);

module.exports = router;
