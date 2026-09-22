// Module Calibrage — routes Phase 3 (résultats, F.47)
const express = require("express");
const auth = require("../middlewares/auth");
const { permission } = require("../middlewares/permission");
const c = require("../Controllers/calibrageResultats.Controllers");
const router = express.Router();

router.get("/calibrage/session/:id/resultats", auth, permission("CALIBRAGE", "LIRE"), c.getResultats);
router.get("/calibrage/session/:id/confrontation/:pid", auth, permission("CALIBRAGE", "LIRE"), c.getConfrontation);

// Révision (jauge)
router.put("/calibrage/session/:id/cote", auth, permission("CALIBRAGE", "ORGANISER"), c.modifierCote);
router.put("/calibrage/session/:id/appreciation", auth, permission("CALIBRAGE", "ORGANISER"), c.setAppreciation);
router.put("/calibrage/session/:id/commentaire-jauge", auth, permission("CALIBRAGE", "ORGANISER"), c.setCommentaireJauge);
router.put("/calibrage/session/:id/conclusions", auth, permission("CALIBRAGE", "ORGANISER"), c.setConclusions);
router.post("/calibrage/session/:id/valider", auth, permission("CALIBRAGE", "ORGANISER"), c.validerSession);

module.exports = router;
