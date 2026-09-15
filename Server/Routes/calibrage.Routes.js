// Module Calibrage — routes Phase 1 (préparation, F.44/45)
const express = require("express");
const auth = require("../middlewares/auth");
const { permission } = require("../middlewares/permission");
const c = require("../Controllers/calibrage.Controllers");
const router = express.Router();

// Sessions
router.get("/calibrage/session/all", auth, permission("CALIBRAGE", "LIRE"), c.getSessions);
router.post("/calibrage/session", auth, permission("CALIBRAGE", "ORGANISER"), c.createSession);
router.get("/calibrage/session/:id", auth, permission("CALIBRAGE", "LIRE"), c.getSessionDetail);
router.put("/calibrage/session/:id", auth, permission("CALIBRAGE", "ORGANISER"), c.updateSession);
router.delete("/calibrage/session/:id", auth, permission("CALIBRAGE", "ORGANISER"), c.deleteSession);
router.put("/calibrage/session/:id/ouvrir", auth, permission("CALIBRAGE", "ORGANISER"), c.ouvrirSession);

// Participants
router.get("/calibrage/session/:id/evaluateurs-disponibles", auth, permission("CALIBRAGE", "ORGANISER"), c.getEvaluateursDisponibles);
router.post("/calibrage/session/:id/participants", auth, permission("CALIBRAGE", "ORGANISER"), c.setParticipants);
router.delete("/calibrage/session/:id/participant/:pid", auth, permission("CALIBRAGE", "ORGANISER"), c.removeParticipant);
router.post("/calibrage/session/:id/inviter", auth, permission("CALIBRAGE", "ORGANISER"), c.inviterParticipants);

// Transactions
router.get("/calibrage/session/:id/transactions", auth, permission("CALIBRAGE", "LIRE"), c.getTransactions);
router.post("/calibrage/session/:id/transaction", auth, permission("CALIBRAGE", "ORGANISER"), c.addTransaction);
router.post("/calibrage/session/:id/dupliquer-transactions", auth, permission("CALIBRAGE", "ORGANISER"), c.dupliquerTransactions);
router.put("/calibrage/transaction/:tid", auth, permission("CALIBRAGE", "ORGANISER"), c.updateTransaction);
router.delete("/calibrage/transaction/:tid", auth, permission("CALIBRAGE", "ORGANISER"), c.deleteTransaction);

module.exports = router;
