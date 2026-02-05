const express = require("express");
const auth = require("./../middlewares/auth");
const multer = require("./../middlewares/multer-config");
const router = express.Router();
const {
  getAllUtilisateur,
  addUtilisateur,
  updateUtilisateur,
  deleteUtilisateur,
  getOneUtilisateur,
  getMe,
  sign_in,
  login,
  getAllSla,
  getSlaById,
  addSla,
  updateSla,
  deleteSla,
  getAllSousCategorie,
  getAllSousCategorieByIdCategorie,
  addSousCategorie,
  deleteSousCategorie,
  getAllCategorie,
  getAllCategorieAndSousCategorie,
  addCategorie,
  updateCategorie,
  deleteCategorie,
  getAllHistoriqueByIdFiche,
  getAllHistoriqueByIdUtilisateur,
  addHistorique,
  addSite,
  deleteSite,
  getAllSite,
  getAllProgramme,
  deleteProgramme,
  addProgramme,
  getAllNotification,
  addNotification,
  getAllCommentaireByIdFiche,
  exportCommentaire,
  addCommentaire,
  exportMaVoixCompte,
  addMaVoixCompte,
  getAllMotifMaVoixCompte,
  addMotifMaVoixCompte,
  deleteMotifMaVoixCompte,
  getAllQuestionnaire,
  addQUestionnaire,
  getAllReponseByFiche,
  addReponseQuestionnaire,
  updateProgramme,
  getAllGrille,
  addGrille,
  updateGrille,
  deleteGrille,
  getAllFiche,
  getAllFicheByGestionnaire,
  getAllFicheByIDFiche,
  addFiche,
  updateFiche,
  deleteFiche,
  exportFiche,
  getAllCommentaireByIdUtilisateur,
  getAllFonction,
  addFonction,
  deleteFonction,
  getAllAgentBySuperviseur,
  affecte_agent_to_superviseur,
  getDetailsUtilisateur,
  getAllArchiveByGestionnaire,
  restore_archive,
  restore_password,
  archive_fiche,
  getAllAgentByRo,
  getAllArchive,
  response_Quiz,
  reponse_utilite,
  reponse_exactitude,
  Quiz_en_echecs,
  Quiz_encours_retest,
  Quiz_Retest,
  export_ma_voix_compte,
  statistic,
  getAllFicheByIdCategorieAndIdSousCategorie,
  change_password,
  update_utilisateur,
  getOneFonction,
  update_Fonction,
  getOneCatgorie,
  getOneGrile,
  getAllAgentByRo_Assignable,
  assignation_agent,
  getAllSuperviseurByRo,
  getOneFiche,
  getAllExport,
  getAllDashboard,
  controle_actif,
  controle_m_1,
  getAllDashboard_admin,
  getExcelFile,
  statistic_TC,
  addControle,
  getReporting,
  getAllFiche_Archive,
  statistic_TC_FOR_SUP,
  updateMotifMaVoixCompte,
  updateSite,
  getDeatilsSite,
  getOneSite,
  getDetailsProgramme,
  getOneProgramme,
  getOneMotifMaVoixCompte,
  getStatistique_par_site,
  redOneNotifcation,
  redAllNotification,
  createNotification,
} = require("../Controllers/baseco.Controllers");

// routes object

// routes pour Authentification
router.get("/user_info", auth, getMe);
router.post("/sign_in", sign_in);
router.post("/login", login);
/*** fin de  routes pour Authentification  */

//Routes pour les utilisateurs**/

router.get("/utilisateur/all", auth, getAllUtilisateur);
router.get("/utilisateur/:id", auth, getOneUtilisateur);
router.get("/utilisateur/details/:id", auth, getDetailsUtilisateur);
router.post("/utilisateur/addUser", auth, addUtilisateur);
router.put("/utilisateur/update/:id", auth, updateUtilisateur);
router.delete("/utilisateur/delete/:id", auth, deleteUtilisateur);
router.put("/update_utilisateur/:id", auth, update_utilisateur);
/** fin de Routes pour les utilisateurs */
//Routes pour les SLA**/

router.get("/sla/all", auth, getAllSla);
router.get("/sla/:id", auth, getSlaById);
router.post("/sla/add", auth, addSla);
router.put("/sla/update/:id", auth, updateSla);
router.delete("/sla/delete/:id", auth, deleteSla);
/** fin de Routes pour les SLA */
//Routes pour les SousCategorie**/

router.get("/sous_categorie/all", auth, getAllSousCategorie);
router.get(
  "/sous_categorie_id_categorie/:id",
  getAllSousCategorieByIdCategorie
);
router.post("/sous_categorie/add", auth, addSousCategorie);
router.delete("/sous_categorie/delete/:id", auth, deleteSousCategorie);
/** fin de Routes pour les SousCategorie */
//Routes pour les Categorie**/

router.get("/categorie/all", auth, getAllCategorie);
router.get(
  "/categorie_and_sous_categorie/all",
  getAllCategorieAndSousCategorie
);
router.get("/categorie_by_id/:id", auth, getOneCatgorie);
router.post("/categorie/add", auth, addCategorie);
router.put("/categorie/update/:id", auth, updateCategorie);
router.delete("/categorie/delete/:id", auth, deleteCategorie);
/** fin de Routes pour les Categorie */
//Routes pour les HISTORIQUE**/

router.get("/historique_by_fiche/all/:id", auth, getAllHistoriqueByIdFiche);
router.get(
  "/historique_by_utilisateur/:id",
  auth,
  getAllHistoriqueByIdUtilisateur
);
router.post("historique/add", auth, addHistorique);
/** fin de Routes pour les HISTORIQUE */
//Routes pour les SITE**/

router.get("/site/all", auth, getAllSite);
router.get("/details_site/:id", auth, getDeatilsSite);
router.get("/site/:id", auth, getOneSite);
router.delete("/delete_site/:id", auth, deleteSite);
router.put("/site/:id", auth, updateSite);
router.post("/site/add", auth, addSite);
/** fin de Routes pour les SITE */
//Routes pour les Programme**/

router.get("/programme/all", auth, getAllProgramme);
router.get("/details_programme/:id", auth, getDetailsProgramme);
router.get("/programme/:id", auth, getOneProgramme);
router.put("/programme/:id", auth, updateProgramme);
router.delete("/programme/:id", auth, deleteProgramme);
router.post("/programme/add", auth, addProgramme);
/** fin de Routes pour les Programme */
//Routes pour les Notification**/

router.get("/notification/all", auth, getAllNotification);
router.post("/notification/add", addNotification);
/** fin de Routes pour les Notifications */
//Routes pour les Programme**/

router.get("/commentaire_by_fiche/all", auth, getAllCommentaireByIdFiche);
router.get(
  "/commentaire_by_utilisateur/all",
  auth,
  getAllCommentaireByIdUtilisateur
);
router.get("/commentaire_export/all", auth, exportCommentaire);
router.post("/commentaire/add", auth, addCommentaire);
/** fin de routes pour les commentaires */
//Routes pour les Ma voix compte**/

router.get("/ma_voix_compte_export", auth, exportMaVoixCompte);
router.post("/ma_voix_compte/all", auth, getAllExport);
router.post("/ma_voix_compte/add", auth, addMaVoixCompte);
/** fin de Routes pour les Ma voix compte */
//Routes pour les motif_ma voix compte**/

router.get("/motif_ma_voix_compte/all", auth, getAllMotifMaVoixCompte);
router.get("/motif_ma_voix_compte/:id", auth, getOneMotifMaVoixCompte);
router.post("/motif_ma_voix_compte/add", auth, addMotifMaVoixCompte);
router.put("/motif_ma_voix_compte/:id", auth, updateMotifMaVoixCompte);
router.delete("/motif_ma_voix_compte/:id", auth, deleteMotifMaVoixCompte);
/** fin de Routes pour les Programme */
//Routes pour les fonctions**/

router.get("/fonction/all", auth, getAllFonction);
router.get("/fonction_id/:id", auth, getOneFonction);
router.post("/fonction/add", auth, addFonction);
router.delete("/fonction/:id", auth, deleteFonction);
router.put("/fonction_update/:id", auth, update_Fonction);
/** fin de Routes pour les fonction */
//Routes pour les Questionnaire**/
router.get("/questionnaire/all", auth, getAllQuestionnaire);
router.post("/questionnaire/add", auth, addQUestionnaire);
/** fin de Routes pour les Questionnaire */
//Routes pour les Reponse Questionnaire**/
router.get("/reponse_questionnaire/all", auth, getAllReponseByFiche);
router.post("/reponse_questionnaire/add", auth, addReponseQuestionnaire);
/** fin de Routes pour les Reponse Questionnaire */
//Routes pour les Programme**/
router.get("/programme/all", auth, getAllProgramme);
router.post("/programme/add", auth, addProgramme);
router.put("/programme/:id", auth, updateProgramme);
router.delete("/programme/:id", auth, deleteProgramme);
/** fin de routes pour les Programme */
//Routes pour les Grille*/
router.get("/grille/all", auth, getAllGrille);
router.get("/grille_by_grille/:id", auth, getOneGrile);
router.post("/grille/add", auth, addGrille);
router.put("/grille/:id", auth, updateGrille);
router.delete("/grille/:id", auth, deleteGrille);
/** fin de routes pour les Grille */

//Routes pour les Grille**/
router.get("/fiche/all", auth, getAllFiche);
router.get("/fiche_Archive/all", auth, getAllFiche_Archive);
router.get("/fiche_by_gestionnaire/all", auth, getAllFicheByGestionnaire);
router.get("/fiche_by_id_Fiche/:id", auth, getAllFicheByIDFiche);
router.get("/excel_fiche_by_id_Fiche/:id", auth, getExcelFile);
router.get("/fiche_export/all", auth, exportFiche);
router.get("/one_fiche/:id", auth, getOneFiche);
router.post("/fiche/add", auth, multer.single("file"), addFiche);
router.put("/fiche/update/:id", auth,multer.single("file"), updateFiche);
router.delete("/fiche/:id", auth, deleteFiche);
router.post(
  "/fiche_id_categorie_and_id_sous_cateogorie",
  auth,
  getAllFicheByIdCategorieAndIdSousCategorie
);
/** fin de routes pour les Grille */
/** Routes pour les R_SUPERVISEUR_AGENT */
router.get("/agent_by_superviseur/:id", auth, getAllAgentBySuperviseur);
router.post("/agent_by_superviseur/add", auth, affecte_agent_to_superviseur);
/** fin de routes pour les R_SUPERVISEUR_AGENT */
/**Routes pour les Archive */
router.get(
  "/archive_by_gestionnaire/all/:id",
  auth,
  getAllArchiveByGestionnaire
);
router.get("/archive_by_gestionnaire/all", auth, getAllArchive);
router.put("/restore_archive/:id", auth, restore_archive);
router.put("/archive_fiche/:id", auth, archive_fiche);
/**fin de routes archives */
/**Routes pour les Archive */
router.get("/agents_by_RO/all", auth, getAllAgentByRo);
router.get("/agents_by_RO_assignable/all", auth, getAllAgentByRo_Assignable);
router.get("/superviseur_by_ro", auth, getAllSuperviseurByRo);
router.put("/renitialize/:id", auth, restore_password);
router.put("/change_password", auth, change_password);
router.put("/assigne_agent", auth, assignation_agent);
/**fin de routes archives */
/**Routes pour les Archive */
router.post("/response_quiz/:id", auth, response_Quiz);
router.get("/quiz_en_echecs", auth, Quiz_en_echecs);
router.get("/quiz_encours_retest", auth, Quiz_encours_retest);
router.put("/quiz_retest", auth, Quiz_Retest);
/**fin de routes archives */
/** Routes pour le sondages */
router.get("/fiche_non_lu_sondage_encours", auth, statistic);
router.post("/fiche_lu_Quiz_sondage", auth, statistic_TC);
router.post("/fiche_lu_Quiz_sondage_for_sup", auth, statistic_TC_FOR_SUP);
/** fin de Routes pour le sondange */
/** Routes pour ma_voix_compte */
router.post("/export_ma_voix_compte", auth, export_ma_voix_compte);
/** */
/**Routes pour utilité et exactitude */
router.post("/reponse_utilite/:id", auth, reponse_utilite);
router.post("/reponse_exactitude/:id", auth, reponse_exactitude);
router.get("/export_dashboard/all", auth, getAllDashboard);
router.get("/export_statistique_par_site", getStatistique_par_site);
router.get("/export_dashboard_amin/all", auth, getAllDashboard_admin);
/** fin d routes pour utilité et exactitude */
router.post("/resultat_controle_actif",auth, controle_actif);
router.post("/resultat_controle_m_1", auth,controle_m_1);
router.get("/hello", async (req, res, next) => {
  return res.status(201).json({ message: "Hello word " });
});
/** Routes pour   Controle et reporting*/
router.post("/add_controle", auth, addControle);
router.post("/get_reporting", auth, getReporting);

/***** les notifications */


/**
 * GET /api/notifications
 * Récupère toutes les notifications de l'utilisateur connecté
 */
router.get('/notifications',auth, getAllNotification);

/**
 * PATCH /api/notifications/:id/read
 * Marque une notification spécifique comme lue
 */
router.patch('/notifications/:id/read',auth,redOneNotifcation);

/**
 * PATCH /api/notifications/read-all
 * Marque plusieurs notifications comme lues
 */
router.patch('/notifications/read-all',auth, redAllNotification);

/**
 * POST /api/notifications
 * Crée une nouvelle notification (appelé quand une fiche est ajoutée)
 */
router.post('/notifications', auth,createNotification);



module.exports = router;
