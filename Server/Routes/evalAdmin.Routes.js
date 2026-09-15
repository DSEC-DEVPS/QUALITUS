// =====================================================================
// Module ÉVALUATION QUALITÉ (cahier) — Routes Notifications + Référentiels
// =====================================================================
const express = require("express");
const auth = require("../middlewares/auth");
const { permission } = require("../middlewares/permission");
const notif = require("../Controllers/evalNotif.Controllers");
const ref = require("../Controllers/evalRef.Controllers");

const router = express.Router();

// Notifications (destinataire connecté)
router.get("/eval/notifications/mes", auth, permission("NOTIFICATION","LIRE"), notif.getMesNotifications);
router.get("/eval/notifications/count", auth, permission("NOTIFICATION","LIRE"), notif.countNonLues);
router.patch("/eval/notifications/lu-tout", auth, permission("NOTIFICATION","LIRE"), notif.marquerToutLu);
router.patch("/eval/notifications/:id/lu", auth, permission("NOTIFICATION","LIRE"), notif.marquerLu);

// Référentiels paramétrables (admin) — :type ∈ contexte|nature|action|statut|kpi
router.get("/eval/ref/:type/all", auth, permission("REFERENTIEL","LIRE"), ref.getAll);
router.post("/eval/ref/:type/add", auth, permission("REFERENTIEL","CREER"), ref.add);
router.put("/eval/ref/:type/:id", auth, permission("REFERENTIEL","MODIFIER"), ref.update);
router.delete("/eval/ref/:type/:id", auth, permission("REFERENTIEL","SUPPRIMER"), ref.remove);

module.exports = router;
