// Tableau de bord : indicateurs par périmètre (site / tous les sites / équipe) et période.
const express = require("express");
const auth = require("../middlewares/auth");
const { permission } = require("../middlewares/permission");
const { getTableauDeBord } = require("../Controllers/tableauDeBord.Controllers");
const router = express.Router();

router.get("/tableau-de-bord", auth, permission("TABLEAU_DE_BORD", "VOIR"), getTableauDeBord);

module.exports = router;
