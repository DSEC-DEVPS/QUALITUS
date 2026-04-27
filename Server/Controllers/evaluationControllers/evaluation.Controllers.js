const db = require("../../config/db");
const isNullOrEmpty = require("../../utils/isNullOrEmpty");

/** Fonctions liées au calendars */

const createCalendars = async (req, res, next) => {
  const { date_debut, date_fin, id_Site } = req.body;
  try {
    if (
      isNullOrEmpty(id_Site) ||
      isNullOrEmpty(date_debut) ||
      isNullOrEmpty(date_fin)
    ) {
      res.status(400).send({
        message:
          "La valeur de l'un des attributs suivant est vide: date, etat, id_Site !",
        date: date,
        etat: etat,
        id: id,
      });
    }
    const values = genererCalendrier(date_debut, date_fin, id_Site);
    const rows = values.map((v) => [v.id_Site, v.numero, v.mois, v.annee, 1]);
    console.log("Value");
    console.log(values);
    await db.query(
      `INSERT INTO CALENDARS(id_Site, numero, mois, annee, etat)
          VALUES ?
        `,
      [rows],
    );

    res.status(201).send({ message: "Calendrier créé !" });
  } catch (error) {
    console.log(error);

    if (error.code === "ER_DUP_ENTRY") {
      res.status(409).send({ message: "Ce calendrier existe déjà." });
    } else {
      return res.status(500).send({
        message: error.message,
        code: error.code,
        requette: error.sql,
      });
    }
  }
};

const updateCalendars = async (req, res, next) => {
  const { etat } = req.body;
  const { id } = req.params;

  try {
    const Query = `UPDATE CALENDARS 
    SET etat=? 
    WHERE id=?`;

    if (!isNullOrEmpty(id) && !isNullOrEmpty(etat)) {
      await db.query(`SET lc_time_names = 'fr_FR'`);

      const [resultat] = await db.query(Query, [etat, id]);
      console.log(resultat);
      if (resultat.affectedRows > 0) {
        return res.status(201).send({
          message: "Mise a jour ok!",
        });
      }
    } else {
      return res.status(400).send({
        message: "La valeur de l'un des attributs suivant est vide: etat, id !",
        etat: etat,
        id: id,
      });
    }
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .send({ message: error.message, code: error.code, requette: error.sql });
  }
};
const deleteCalendarsBySite = async (req, res, next) => {
  const { id } = req.params;
  try {
    const Query = `DELETE FROM CALENDARS WHERE id_Site=?`;
    if (isNullOrEmpty(id)) {
      return res
        .status(401)
        .send({ message: "L'identifiant du site est vide" });
    }
    const [resultat] = await db.query(Query, [id]);
    console.log("Resultat");
    console.log(resultat);
    if (resultat.affectedRows > 0) {
      return res.status(200).send({ message: "Suppression ok !" });
    } else {
      return res.status(410).send({
        message: "La ressource que vous essayer de supprimer, n'existe plus!",
      });
    }
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .send({ message: error.message, code: error.code, requette: error.sql });
  }
};
const actualiserCalendars = async (req, res, next) => {
  try {
    const Query = `SELECT * FROM CALENDARS_POLICIES`;

    const [resultat] = await db.query(Query);
    console.log("Resultat");
    console.log(resultat);

    if (resultat.length > 0) {
      for (calendar_policie of resultat) {
        await updateCalendrierPerPolicie(calendar_policie);
      }
      await updateAnneeCalendrier();
      return res.status(201).send({
        message: "Operation ok!",
      });
    } else {
      res.status(500).send({
        message:
          "Erreur lors du chargement de la politique d'actualisation du calendrier!",
      });
    }
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .send({ message: error.message, code: error.code, requette: error.sql });
  }
};

const afficherCalendarsBySite = async (req, res, next) => {
  const { id_Site } = req.params;
  console.log(req.params.id_Site);
  console.log(id_Site);

  try {
    if (isNullOrEmpty(id_Site)) {
      return res
        .status(400)
        .send({ message: "id_Site manquant", id_Site: id_Site });
    }

    try {
      const [calendars] = await db.query(
        `
      SELECT *
      FROM CALENDARS
      WHERE id_Site = ?
        AND annee = YEAR(CURDATE())
        AND (
              (MONTH(CURDATE()) <= 6 AND numero BETWEEN 1 AND 6)
           OR (MONTH(CURDATE()) > 6  AND numero BETWEEN 7 AND 12)
        );
      `,
        [id_Site],
      );

      if (calendars.length === 0) {
        return res.status(404).send({ message: "Aucun calendrier trouvé" });
      }

      return res.status(200).send({
        message: "Calendrier du semestre courant",
        calendars,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).send({ message: err.message });
    }
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .send({ message: error.message, code: error.code, requette: error.sql });
  }
};

const afficherCalendars = async (req, res, next) => {
  try {
    try {
      const [calendars] = await db.query(
        `
      SELECT *
      FROM CALENDARS
      WHERE annee = YEAR(CURDATE())
        AND (
              (MONTH(CURDATE()) <= 6 AND numero BETWEEN 1 AND 6)
           OR (MONTH(CURDATE()) > 6  AND numero BETWEEN 7 AND 12)
        );
      `,
      );
      const [sites] = await db.query(`SELECT id, nom FROM B_SITE`);
      console.log(sites);
      if (calendars.length === 0) {
        return res
          .status(201)
          .send({ objet: [], message: "Aucun calendrier trouvé" });
      }
      console.log(calendars);
      const resultat = sites.map((site) => ({
        id: site.id,
        nom: site.nom,
        calendars: calendars.filter((cal) => cal.id_Site === site.id),
      }));
      console.log("resultat");
      console.log(resultat);

      return res.status(200).send({ objet: resultat, message: "ok" });
    } catch (err) {
      console.error(err);
      return res.status(500).send({ message: err.message });
    }
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .send({ message: error.message, code: error.code, requette: error.sql });
  }
};
/** Fin */

/** Fonctions liées au calendars policies */

const createCalendarsPolicies = async (req, res, next) => {
  const { mois_courant_et_posterieurs, mois_courant, tous_les_mois, id_Site } =
    req.body;
  try {
    const date_creation = new Date();
    const Query = `INSERT INTO CALENDARS_POLICIES(
    mois_courant_et_posterieurs, 
    mois_courant, 
    tous_les_mois, 
    date_creation,
    id_Site) VALUES(?,?,?,?,?)`;

    if (!isNullOrEmpty(id_Site)) {
      const [resultat] = await db.query(Query, [
        mois_courant_et_posterieurs,
        mois_courant,
        tous_les_mois,
        date_creation,
        id_Site,
      ]);
      console.log(resultat);
      if (resultat.insertId > 0) {
        [[calendar_policie]] = await db.query(
          `SELECT * FROM CALENDARS_POLICIES WHERE id=?`,
          [resultat.insertId],
        );
        await updateCalendrierPerPolicie(calendar_policie);
        res.status(201).send({
          message:
            "La politique de fermeture du calendrier a été bien enregistrer!",
        });
      }
    } else {
      res.status(400).send({
        message: "La valeur de id_site est vide!",
        id_Site: id_Site,
      });
    }
  } catch (error) {
    console.log(error);
    if (error.code === "ER_DUP_ENTRY") {
      console.log("testtttttttttttttttttttttttt");
      res.status(409).send({
        message: "L’ID du site ne peut pas être dupliqué",
        code: error.code,
        requette: error.sql,
      });
    }
    res
      .status(500)
      .send({ message: error.message, code: error.code, requette: error.sql });
  }
};
const updateCalendarsPolicies = async (req, res, next) => {
  const { id } = req.params;
  const { mois_courant_et_posterieurs, mois_courant, tous_les_mois, id_Site } =
    req.body;
  console.log(
    id,
    "",
    mois_courant_et_posterieurs,
    "",
    mois_courant,
    "",
    tous_les_mois,
    "",
    id_Site,
  );
  try {
    const Query = `UPDATE CALENDARS_POLICIES
    SET mois_courant_et_posterieurs=?, 
     mois_courant=?, 
     tous_les_mois=?,
     id_Site=?
    WHERE id=?`;

    [row] = await db.query(`SELECT * FROM CALENDARS_POLICIES WHERE id=?`, [id]);
    const calendar_policie = row[0];
    if (!isNullOrEmpty(calendar_policie)) {
      const [resultat] = await db.query(Query, [
        isNullOrEmpty(mois_courant_et_posterieurs)
          ? calendar_policie.mois_courant_et_posterieurs_query
          : mois_courant_et_posterieurs,
        isNullOrEmpty(mois_courant)
          ? calendar_policie.mois_courant
          : mois_courant,
        isNullOrEmpty(tous_les_mois)
          ? calendar_policie.tous_les_mois
          : tous_les_mois,
        isNullOrEmpty(id_Site) ? calendar_policie.id_Site : id_Site,
        calendar_policie.id,
      ]);

      console.log(resultat);
      if (resultat.affectedRows > 0) {
        [row] = await db.query(`SELECT * FROM CALENDARS_POLICIES WHERE id=?`, [
          id,
        ]);
        const calendar_policie1 = row[0];
        console.log("calendar_policie1");
        console.log(calendar_policie1);

        await updateCalendrierPerPolicie(calendar_policie1);
        res.status(201).send({
          message: "Mise a jour ok!",
        });
      }
    } else {
      res.status(400).send({
        message: "Aucune entrée ne correspond a l'id fournit!",
      });
    }
  } catch (error) {
    console.log(error);
    if (error.code === "ER_DUP_ENTRY") {
      console.log("testtttttttttttttttttttttttt");
      res.status(409).send({
        message: "L’ID du site ne peut pas être dupliqué",
        code: error.code,
        requette: error.sql,
      });
    }
    res
      .status(500)
      .send({ message: error.message, code: error.code, requette: error.sql });
  }
};

const deleteCalendarsPolicies = async (req, res, next) => {
  const { id } = req.params;
  try {
    const Query = `DELETE FROM CALENDARS_POLICIES WHERE id=?`;
    if (isNullOrEmpty(id)) {
      return res
        .status(401)
        .send({ message: "L'identifiant est vide", id: id });
    }
    const [resultat] = await db.query(Query, [id]);
    console.log("Resultat");
    console.log(resultat);
    if (resultat.affectedRows > 0) {
      return res.status(200).send({ message: "Suppression ok !" });
    } else {
      return res.status(410).send({
        message: "La ressource que vous essayer de supprimer, n'existe plus!",
      });
    }
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .send({ message: error.message, code: error.code, requette: error.sql });
  }
};

const afficherCalendarsPolicies = async (req, res, next) => {
  try {
    try {
      const [calendars] = await db.query(
        `
      SELECT *
      FROM CALENDARS_POLICIES
      `,
      );
      const [sites] = await db.query(`SELECT id, nom FROM B_SITE`);
      console.log(sites);
      if (calendars.length === 0) {
        return res
          .status(201)
          .send({ objet: [], message: "Aucun calendrier trouvé" });
      }
      console.log(calendars);
      const resultat = sites.map((site) => ({
        id: site.id,
        nom: site.nom,
        calendars: calendars.filter((cal) => cal.id_Site === site.id),
      }));
      const data = resultat.filter((obj) => obj.calendars.length > 0);
      console.log("data");
      console.log(data);

      return res.status(200).send({ objet: data, message: "ok" });
    } catch (err) {
      console.error(err);
      return res.status(500).send({ message: err.message });
    }
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .send({ message: error.message, code: error.code, requette: error.sql });
  }
};
/**Fin*/

/** Fonctions liées au supplementaire */
const createSupplementaire = async (req, res, next) => {
  const {
    contexte,
    identifiant_appel,
    numero_case,
    numero_appel,
    date_appel,
    dmt,
    motif_appel,
    id_Evaluateur,
    id_Evaluations,
    id_Agent,
  } = req.body;
  await db.query("START TRANSACTION");
  try {
    const [[rowCalendars]] = await db.query(
      `
      SELECT EXISTS 
      (SELECT 1 
      FROM CALENDARS c
      JOIN B_UTILISATEUR u ON u.id=?
      WHERE c.id_Site=u.id_Site
      AND c.etat=1 
      AND c.annee=YEAR(?) 
      AND c.numero=MONTH(?)
      ) as autorise`,
      [id_Evaluateur, date_appel, date_appel],
    );
    console.log(rowCalendars);

    if (rowCalendars.autorise === 0) {
      return res
        .status(403)
        .send({ message: "Période d’évaluation non autorisée pour ce site" });
    }
    let programme = "";
    let site = "";
    let id_Grille = 0;
    const date_creation = new Date();

    const Query = `
    INSERT INTO SUPPLEMENTAIRES 
    (
      contexte
    , identifiant_appel
    , numero_case
    , numero_appel
    , date_appel
    , date_creation
    , dmt
    , motif_appel
    , statut
    , id_Evaluateur
    , id_Evaluations
    , id_Agent
    , id_Grille
    , site
    , programme
    , resolution
    , conclusion
    , type
    ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
    const statut = "En cours";
    if (
      isNullOrEmpty(id_Agent) ||
      isNullOrEmpty(id_Evaluations) ||
      isNullOrEmpty(id_Evaluateur)
    ) {
      return res.status(400).send({
        message:
          "L'un des identifiants suivants est nulle: Agent, Evaluateur, Evaluation ",
      });
    }

    const [rows] = await db.query(
      `SELECT 
            u.id, 
            p.nom AS programme, 
            s.nom AS site, 
            g.id AS id_Grille
        FROM B_UTILISATEUR u
        LEFT JOIN B_PROGRAMME p ON p.id = u.id_Programme
        LEFT JOIN B_SITE s ON s.id = u.id_Site
        LEFT JOIN B_GRILLE g ON g.id = u.id_Grille
        WHERE u.id = ?`,
      [id_Agent],
    );
    console.log("agentttttttttttttttttttttttttt");
    console.log(rows);
    if (rows.length == 0) {
      return res.status(400).send({
        message: "Aucun agent ne correspond à l'identifiant fourni",
      });
    }

    programme = rows[0].programme || null;
    site = rows[0].site || null;
    id_Grille = rows[0].id_Grille || null;

    const resultat = await db.query(Query, [
      contexte,
      identifiant_appel,
      numero_case,
      numero_appel,
      new Date(date_appel),
      date_creation,
      dmt,
      motif_appel,
      statut,
      id_Evaluateur,
      id_Evaluations,
      id_Agent,
      id_Grille,
      site,
      programme,
      "Oui",
      "SUCCES",
      "Supplementaire",
    ]);
    console.log(resultat);
    if (resultat[0].affectedRows > 0) {
      if (!isNullOrEmpty(id_Grille)) {
        const id_Supplementaires = resultat[0].insertId;
        const [listeErreurs] = await db.query(
          `SELECT * FROM ERREURS WHERE id_Grille=?`,
          [id_Grille],
        );
        // const listeErreurs = erreurs_row[0];
        if (listeErreurs.length === 0) {
          return res.status(400).send({
            message: `La grille d'evaluation de l'agent n'a pas d'erreur associé`,
          });
        }
        console.log("ListeErreurs");
        console.log(listeErreurs);

        const values = listeErreurs.map((erreur) => [
          erreur.id_Categories_Erreurs,
          erreur.id_Sous_Categories_Erreurs,
          erreur.items,
          erreur.sous_items,
          erreur.referentiels,
          erreur.poids_items,
          erreur.score_en_pourcent,
          erreur.score_sur_vingt,
          1,
          id_Supplementaires,
        ]);

        await db.query(
          `INSERT INTO SUPPLEMENTAIRES_RESULTATS(
          id_Categories_Erreurs,
          id_Sous_Categories_Erreurs,
          items,
          sous_items,
          referentiels,
          poids_items,
          score_en_pourcent,
          score_sur_vingt,
          etat,
          id_Supplementaires) VALUES ?`,
          [values],
        );
        const [scores] = await db.query(
          `SELECT 
              c.id AS id_Categories_Erreurs,
              c.titre AS categorie_erreur,
              SUM(er.score_sur_vingt) AS score,
              SUM(er.etat = 0) AS nombre
          FROM SUPPLEMENTAIRES_RESULTATS er
          JOIN CATEGORIES_ERREURS c ON c.id = er.id_Categories_Erreurs
          WHERE er.id_Supplementaires = ?
          GROUP BY c.id, c.titre;`,
          [id_Supplementaires],
        );
        console.log("scores");
        console.log(scores);
        const valuesScores = scores.map((s) => [
          s.score,
          s.nombre,
          s.id_Categories_Erreurs,
          s.categorie_erreur,
          id_Supplementaires,
        ]);

        await db.query(
          `INSERT INTO SCORES_SUPPLEMENTAIRES(score, nombre, id_Categories_Erreurs, categorie_erreur, id_Supplementaires)
            VALUES ?`,
          [valuesScores],
        );
      }
    }
    await db.query("COMMIT");
    return res.status(201).send({
      message: "L'évaluation supplementaire a été bien enregistrer",
      id: resultat[0].insertId,
    });
  } catch (error) {
    await db.query("ROLLBACK");
    console.log(error);
    res.status(500).send({
      message:
        "La création de l'évaluation supplementaire a été annulée dû a une erreur",
      errorMessage: error.message,
      code: error.code,
      requette: error.sql,
    });
  }
};
const updateSupplementaires = async (req, res, next) => {
  const { id } = req.params;
  try {
    const Query_Supplementaires = `UPDATE SUPPLEMENTAIRES SET statut='Terminer' WHERE id=?`;

    if (isNullOrEmpty(id)) {
      return res
        .status(401)
        .send({ message: "L'identifiant est vide", id: id });
    }
    const [resultat] = await db.query(Query_Supplementaires, [id]);
    console.log("Resultat");
    console.log(resultat);
    if (resultat.affectedRows > 0) {
      return res.status(200).send({ message: "Mise a jour ok !" });
    } else {
      return res.status(410).send({
        message: "La ressource que vous essayez de modifier, n'existe plus!",
      });
    }
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .send({ message: error.message, code: error.code, requette: error.sql });
  }
};
const deleteSupplementaires = async (req, res, next) => {
  const { id } = req.params;
  try {
    const Query_Supplementaires = `DELETE FROM SUPPLEMENTAIRES WHERE id=?`;
    const Query_Scores = `DELETE FROM SCORES_SUPPLEMENTAIRES WHERE id_Supplementaires=?`;
    const Query_Resultats_Supplementaires = `DELETE FROM SUPPLEMENTAIRES_RESULTATS WHERE id_Supplementaires=?`;

    if (isNullOrEmpty(id)) {
      return res
        .status(401)
        .send({ message: "L'identifiant est vide", id: id });
    }
    await db.query(Query_Resultats_Supplementaires, [id]);
    await db.query(Query_Scores, [id]);
    const [resultat] = await db.query(Query_Supplementaires, [id]);
    console.log("Resultat");
    console.log(resultat);
    if (resultat.affectedRows > 0) {
      return res.status(200).send({ message: "Suppression ok !" });
    } else {
      return res.status(410).send({
        message: "La ressource que vous essayer de supprimer, n'existe plus!",
      });
    }
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .send({ message: error.message, code: error.code, requette: error.sql });
  }
};
const getAllSupplementaires = async (req, res, next) => {
  const { id, debut, fin } = req.params;
  console.log(req.params);
  try {
    const [supplementaires] = await db.query(
      `SELECT * FROM SUPPLEMENTAIRES WHERE id_Evaluateur= ? AND DATE_FORMAT(date_creation,'%Y-%m-%d')  BETWEEN DATE_FORMAT(?,'%Y-%m-%d') AND DATE_FORMAT(?,'%Y-%m-%d')`,
      [id, debut, fin],
    );

    // console.log(listeEvaluationsResultats);
    if (supplementaires.length === 0) {
      res
        .status(200)
        .send({ data: supplementaires, message: "Aucune entrée trouvée" });
    }

    res.status(200).send({ data: supplementaires });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .send({ message: error.message, code: error.code, requette: error.sql });
  }
};
const getAllSupplementairesEnCours = async (req, res, next) => {
  const { debut, fin } = req.body;
  console.log(req.params);
  try {
    const [supplementaires] = await db.query(
      `SELECT * FROM SUPPLEMENTAIRES WHERE statut='En cours' AND date_creation BETWEEN ? AND ?`,
      [debut, fin],
    );

    // console.log(listeEvaluationsResultats);
    if (supplementaires.length === 0) {
      res.status(400).send({ message: "Aucune entrée trouvée" });
    }

    res.status(200).send(supplementaires);
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .send({ message: error.message, code: error.code, requette: error.sql });
  }
};
const getAllSupplementairesTerminer = async (req, res, next) => {
  const { debut, fin } = req.body;
  console.log(req.params);
  try {
    const [supplementaires] = await db.query(
      `SELECT * FROM SUPPLEMENTAIRES WHERE statut='Terminer' AND date_creation BETWEEN ? AND ?`,
      [debut, fin],
    );

    console.log(supplementaires);
    if (supplementaires.length === 0) {
      res.status(400).send({ message: "Aucune entrée trouvée" });
    }

    res.status(200).send(supplementaires);
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .send({ message: error.message, code: error.code, requette: error.sql });
  }
};
const getSupplementairesById = async (req, res, next) => {
  const { id } = req.params;
  console.log(req.params);
  try {
    if (isNullOrEmpty(id)) {
      res.status(400).send({ message: "La valeur de idEvaluations est nulle" });
    }
    const [[supplementaire]] = await db.query(
      `SELECT * FROM SUPPLEMENTAIRES WHERE id=?`,
      [id],
    );

    console.log(supplementaire);
    if (supplementaire.length === 0) {
      res.status(400).send({ message: "Aucune entrée trouvée" });
    }

    res.status(200).send(supplementaire);
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .send({ message: error.message, code: error.code, requette: error.sql });
  }
};

const getAllSupplementairesResultatsByEvaluationsAndCategorie = async (
  req,
  res,
  next,
) => {
  const { id } = req.params;
  console.log(req.params);
  try {
    if (isNullOrEmpty(id)) {
      res.status(400).send({ message: "La valeur de idEvaluations est nulle" });
    }
    const [categroiesErreurs] = await db.query(
      `SELECT c.id AS id, c.titre AS titre FROM CATEGORIES_ERREURS c
      JOIN SUPPLEMENTAIRES s ON s.id=? AND s.id_Grille=c.id_Grille`,
      [id],
    );
    console.log("categroiesErreurs");
    console.log(categroiesErreurs);

    const [listeSupplementairesResultats] = await db.query(
      `SELECT * FROM SUPPLEMENTAIRES_RESULTATS WHERE id_Supplementaires=?`,
      [id],
    );

    if (listeSupplementairesResultats.length === 0) {
      res.status(400).send({ message: "Aucune entrée trrouvée" });
    }
    const supplementairesResultats = categroiesErreurs.map((cat) => ({
      id: cat.id,
      titre: cat.titre,
      resultats: listeSupplementairesResultats.filter(
        (r) => r.id_Categories_Erreurs === cat.id,
      ),
    }));
    res.status(200).send(supplementairesResultats);
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .send({ message: error.message, code: error.code, requette: error.sql });
  }
};
const updateSupplementairesResultats = async (req, res) => {
  const { id, etat, commentaire, id_Supplementaires } = req.body;
  let conclusions = [];
  if (isNullOrEmpty(id) || isNullOrEmpty(id_Supplementaires)) {
    return res.status(400).json({
      message: "Identifiant résultat ou évaluation supplementaire manquant",
      id: id,
      id_Supplementaires: id_Supplementaires,
    });
  }

  await db.query("START TRANSACTION");

  try {
    [result] = await db.query(
      `SELECT id FROM SUPPLEMENTAIRES_RESULTATS WHERE id=?`,
      [id],
    );
    if (result.length === 0) {
      return res.status(400).json({
        message:
          "Identifiant fournit ne correspond a aucun supplementaire résultat",
        id: id,
      });
    }
    [result1] = await db.query(`SELECT id FROM SUPPLEMENTAIRES WHERE id=?`, [
      id_Supplementaires,
    ]);
    if (result1.length === 0) {
      return res.status(400).json({
        message: "Identifiant fournit ne correspond a aucun supplementaire",
        id_Supplementaires: id_Supplementaires,
      });
    }
    //Update résultat
    await db.query(
      `
      UPDATE SUPPLEMENTAIRES_RESULTATS
      SET etat = ?, commentaire = ?
      WHERE id = ? AND id_Supplementaires = ?
    `,
      [etat, commentaire, id, id_Supplementaires],
    );

    //Récupération catégories
    const [categories] = await db.query(
      `
      SELECT DISTINCT ev.id_Categories_Erreurs, cat.seuil 
      FROM SUPPLEMENTAIRES_RESULTATS ev  
      JOIN CATEGORIES_ERREURS cat ON cat.id = ev.id_Categories_Erreurs
      WHERE ev.id_Supplementaires = ?
    `,
      [id_Supplementaires],
    );
    //Update Scores
    await db.query(
      `
        UPDATE SCORES_SUPPLEMENTAIRES
        JOIN(
           SELECT
              ev.id_Supplementaires AS id_ev,
              ev.id_Categories_Erreurs AS id_cat,
              SUM(ev.etat=0) AS nombreEv,
              SUM(CASE WHEN ev.etat=1 THEN ev.score_sur_vingt ELSE 0 END) AS scoreEv
            FROM SUPPLEMENTAIRES_RESULTATS ev
            GROUP BY ev.id_Supplementaires,ev.id_Categories_Erreurs 
        ) x ON x.id_ev = id_Supplementaires AND x.id_cat = id_Categories_Erreurs
        SET score = x.scoreEv, nombre = x.nombreEv
      `,
    );
    //Boucle catégories
    for (let i = 0; i < categories.length; i++) {
      cat = categories[i];
      const [[rowPoids]] = await db.query(
        `
        SELECT SUM(poids_items) AS poids 
        FROM SUPPLEMENTAIRES_RESULTATS
        WHERE etat = 1 AND id_Supplementaires = ? AND id_Categories_Erreurs = ?
      `,
        [id_Supplementaires, cat.id_Categories_Erreurs],
      );
      console.log("rowPoids");
      console.log(rowPoids);

      const poids = Number(rowPoids.poids || 0);
      const seuil = Number(cat.seuil || 0);

      console.log("rowPoids");
      console.log(poids);
      console.log("seuil");
      console.log(seuil);

      const conclusion = poids > seuil ? "SUCCES" : "ECHEC";
      conclusions.push({ conclusion });
      console.log("conclusion pending");
      console.log(conclusions);
      if (i == categories.length - 1) {
        const hasEchec = conclusions.some((c) => c.conclusion === "ECHEC");
        const conclusionGlobale = hasEchec ? "ECHEC" : "SUCCES";
        console.log("hasEchec");
        console.log(hasEchec);
        console.log("conclusionGlobale");
        console.log(conclusionGlobale);
        conclusions = [];
        //Update evaluation
        await db.query(
          `
        UPDATE SUPPLEMENTAIRES
        SET conclusion = ?
        WHERE id = ?
      `,
          [conclusionGlobale, id_Supplementaires],
        );
        await db.query("COMMIT");
      }
    }
    return res.status(201).json({ message: "Mise à jour OK" });
  } catch (error) {
    await db.query("ROLLBACK");
    return res.status(500).json({
      message:
        "La mise a jour de evaluation supplementaire resultat a été annulée dû a une erreur",
      message: error.message,
      code: error.code,
      requette: error.sql,
    });
  }
};

const getSupplementaireCountByEvaluation = async (req, res) => {
  const { id } = req.params;
  if (isNullOrEmpty(id)) {
    return res.status(400).send({
      message: "L'id de l'evaluation est manquante",
    });
  }
  try {
    const Query = `SELECT COUNT(*) as nombre FROM SUPPLEMENTAIRES WHERE id_Evaluations=?`;
    const [[nombre]] = await db.query(Query, [id]);

    if (!isNullOrEmpty(nombre)) {
      res.status(200).json({ data: nombre, message: "Ok" });
    }
  } catch (error) {
    return res.status(500).json({
      message: "Une erreur est survenue",
      message: error.message,
      code: error.code,
      requette: error.sql,
    });
  }
};

const getAllSupplementairesByEvaluations = async (req, res, next) => {
  const { id } = req.params;
  console.log(req.params);
  try {
    const [supplementaires] = await db.query(
      `SELECT * FROM SUPPLEMENTAIRES WHERE id_Evaluations= ?`,
      [id],
    );

    // console.log(listeEvaluationsResultats);
    if (supplementaires.length === 0) {
      res
        .status(200)
        .send({ data: supplementaires, message: "Aucune entrée trouvée" });
    }

    res.status(200).send({ data: supplementaires });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .send({ message: error.message, code: error.code, requette: error.sql });
  }
};
/** Fin */

/** Fonctions liées a l'évaluation */

const createEvaluation = async (req, res, next) => {
  const {
    contexte,
    identifiant_appel,
    numero_case,
    numero_appel,
    date_appel,
    dmt,
    motif_appel,
    id_Evaluateur,
    id_Agent,
  } = req.body;
  await db.query("START TRANSACTION");
  try {
    const [[rowCalendars]] = await db.query(
      `
      SELECT EXISTS 
      (SELECT 1 
      FROM CALENDARS c
      JOIN B_UTILISATEUR u ON u.id=?
      WHERE c.id_Site=u.id_Site
      AND c.etat=1 
      AND c.annee=YEAR(?) 
      AND c.numero=MONTH(?)
      ) as autorise`,
      [id_Evaluateur, date_appel, date_appel],
    );
    console.log(rowCalendars);

    if (rowCalendars.autorise === 0) {
      return res
        .status(403)
        .send({ message: "Période d’évaluation non autorisée pour ce site" });
    }
    let programme = "";
    let site = "";
    let id_Grille = 0;
    const date_creation = new Date();
    const Query = `
    INSERT INTO EVALUATIONS 
    (
      contexte
    , identifiant_appel
    , numero_case
    , numero_appel
    , date_appel
    , date_creation
    , dmt
    , motif_appel
    , statut
    , id_Evaluateur
    , id_Agent
    , id_Grille
    , site
    , programme
    , resolution
    , conclusion
    , type
    ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
    const statut = "En cours";
    if (isNullOrEmpty(id_Agent)) {
      return res
        .status(400)
        .send({ message: "L'identifiant de l'agent est incorrect" });
    }

    const [rows] = await db.query(
      `SELECT 
            u.id, 
            p.nom AS programme, 
            s.nom AS site, 
            g.id AS id_Grille
        FROM B_UTILISATEUR u
        LEFT JOIN B_PROGRAMME p ON p.id = u.id_Programme
        LEFT JOIN B_SITE s ON s.id = u.id_Site
        LEFT JOIN B_GRILLE g ON g.id = u.id_Grille
        WHERE u.id = ?`,
      [id_Agent],
    );
    console.log("agentttttttttttttttttttttttttt");
    console.log(rows);
    if (rows.length == 0) {
      return res.status(400).send({
        message: "Aucun agent ne correspond à l'identifiant fourni",
      });
    }

    programme = rows[0].programme || null;
    site = rows[0].site || null;
    id_Grille = rows[0].id_Grille || null;

    const resultat = await db.query(Query, [
      contexte,
      identifiant_appel,
      numero_case,
      numero_appel,
      new Date(date_appel),
      date_creation,
      dmt,
      motif_appel,
      statut,
      id_Evaluateur,
      id_Agent,
      id_Grille,
      site,
      programme,
      "Oui",
      "SUCCES",
      "Evaluation",
    ]);
    console.log(resultat);
    if (resultat[0].affectedRows > 0) {
      if (!isNullOrEmpty(id_Grille)) {
        const id_Evaluations = resultat[0].insertId;
        const [listeErreurs] = await db.query(
          `SELECT * FROM ERREURS WHERE id_Grille=?`,
          [id_Grille],
        );
        // const listeErreurs = erreurs_row[0];
        if (listeErreurs.length === 0) {
          return res.status(400).send({
            message: `La grille d'evaluation de l'agent n'a pas d'erreur associé`,
          });
        }
        console.log("ListeErreurs");
        console.log(listeErreurs);

        const values = listeErreurs.map((erreur) => [
          erreur.id_Categories_Erreurs,
          erreur.id_Sous_Categories_Erreurs,
          erreur.items,
          erreur.sous_items,
          erreur.referentiels,
          erreur.poids_items,
          erreur.score_en_pourcent,
          erreur.score_sur_vingt,
          1,
          id_Evaluations,
        ]);

        await db.query(
          `INSERT INTO EVALUATIONS_RESULTATS(
          id_Categories_Erreurs,
          id_Sous_Categories_Erreurs,
          items,
          sous_items,
          referentiels,
          poids_items,
          score_en_pourcent,
          score_sur_vingt,
          etat,
          id_Evaluations) VALUES ?`,
          [values],
        );
        const [scores] = await db.query(
          `SELECT 
              c.id AS id_Categories_Erreurs,
              c.titre AS categorie_erreur,
              SUM(er.score_sur_vingt) AS score,
              SUM(er.etat = 0) AS nombre
          FROM EVALUATIONS_RESULTATS er
          JOIN CATEGORIES_ERREURS c ON c.id = er.id_Categories_Erreurs
          WHERE er.id_Evaluations = ?
          GROUP BY c.id, c.titre;`,
          [id_Evaluations],
        );
        console.log("scores");
        console.log(scores);
        const valuesScores = scores.map((s) => [
          s.score,
          s.nombre,
          s.id_Categories_Erreurs,
          s.categorie_erreur,
          id_Evaluations,
        ]);

        await db.query(
          `INSERT INTO SCORES(score, nombre, id_Categories_Erreurs, categorie_erreur, id_Evaluations)
            VALUES ?`,
          [valuesScores],
        );
      }
    }
    await db.query("COMMIT");
    return res.status(201).send({
      message: "L'évaluation a été bien enregistrer",
      id: resultat[0].insertId,
    });
  } catch (error) {
    await db.query("ROLLBACK");
    console.log(error);
    res.status(500).send({
      message: "La création de l'évaluation a été annulée dû a une erreur",
      errorMessage: error.message,
      code: error.code,
      requette: error.sql,
    });
  }
};

const terminerEvaluations = async (req, res, next) => {
  const { id } = req.params;

  try {
    const Query_Evaluations = `UPDATE EVALUATIONS SET statut='Terminer' WHERE id=?`;

    if (isNullOrEmpty(id)) {
      return res
        .status(401)
        .send({ message: "L'identifiant est vide", id: id });
    }
    const [resultat] = await db.query(Query_Evaluations, [id]);
    console.log("Resultat");
    console.log(resultat);
    if (resultat.affectedRows > 0) {
      return res.status(200).send({ message: "Evaluation terminer!" });
    } else {
      return res.status(410).send({
        message: "La ressource que vous essayez de modifier, n'existe plus!",
      });
    }
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .send({ message: error.message, code: error.code, requette: error.sql });
  }
};
const updateEvaluations = async (req, res, next) => {
  const { id } = req.params;
  const { resolution, pourquoi1, pourquoi2, pourquoi3, pourquoi4 } = req.body;
  console.log("resolution");
  console.log(resolution);
  console.log("pourquoi1");
  console.log(pourquoi1);
  console.log("pourquoi2");
  console.log(pourquoi2);
  console.log("pourquoi3");
  console.log(pourquoi3);
  console.log("pourquoi4");
  console.log(pourquoi4);

  try {
    const Query_Evaluations = `UPDATE EVALUATIONS SET resolution=?, pourquoi1=?, pourquoi2=?, pourquoi3=?, pourquoi4=? WHERE id=?`;

    if (isNullOrEmpty(id)) {
      return res
        .status(401)
        .send({ message: "L'identifiant est vide", id: id });
    }
    const [resultat] = await db.query(Query_Evaluations, [
      resolution,
      pourquoi1?.options,
      pourquoi2?.options,
      pourquoi3?.options,
      pourquoi4?.options,
      id,
    ]);
    console.log("Resultat");
    console.log(resultat);
    if (resultat.affectedRows > 0) {
      return res.status(200).send({ message: "Mise a jour ok !" });
    } else {
      return res.status(410).send({
        message: "La ressource que vous essayez de modifier, n'existe plus!",
      });
    }
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .send({ message: error.message, code: error.code, requette: error.sql });
  }
};
const getAgentByUsername = async (req, res, next) => {
  const { username } = req.params;
  try {
    const Query_Agent = `SELECT * FROM B_UTILISATEUR WHERE nom_utilisateur=?`;

    if (isNullOrEmpty(username)) {
      return res
        .status(401)
        .send({ message: "L'identifiant est vide", username: username });
    }
    const [[resultat]] = await db.query(Query_Agent, [username]);
    console.log("Resultat");
    console.log(resultat);
    return res.status(200).send(resultat);
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .send({ message: error.message, code: error.code, requette: error.sql });
  }
};
const deleteEvaluations = async (req, res, next) => {
  const { id } = req.params;
  try {
    const Query_Supplementaires = `DELETE FROM EVALUATIONS WHERE id=?`;
    const Query_Scores = `DELETE FROM SCORES WHERE id_Evaluations=?`;
    const Query_Resultats_Supplementaires = `DELETE FROM EVALUATIONS_RESULTATS WHERE id_Evaluations=?`;

    if (isNullOrEmpty(id)) {
      return res
        .status(401)
        .send({ message: "L'identifiant est vide", id: id });
    }
    await db.query(Query_Resultats_Supplementaires, [id]);
    await db.query(Query_Scores, [id]);
    const [resultat] = await db.query(Query_Supplementaires, [id]);
    console.log("Resultat");
    console.log(resultat);
    if (resultat.affectedRows > 0) {
      return res.status(200).send({ message: "Suppression ok !" });
    } else {
      return res.status(410).send({
        message: "La ressource que vous essayer de supprimer, n'existe plus!",
      });
    }
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .send({ message: error.message, code: error.code, requette: error.sql });
  }
};
const getAllEvaluations = async (req, res, next) => {
  const { id, debut, fin } = req.params;
  console.log(req.params);
  try {
    const [evaluations] = await db.query(
      `SELECT * FROM EVALUATIONS WHERE id_Evaluateur= ? AND DATE_FORMAT(date_creation,'%Y-%m-%d')  BETWEEN DATE_FORMAT(?,'%Y-%m-%d') AND DATE_FORMAT(?,'%Y-%m-%d')`,
      [id, debut, fin],
    );

    // console.log(listeEvaluationsResultats);
    if (evaluations.length === 0) {
      res
        .status(200)
        .send({ data: evaluations, message: "Aucune entrée trouvée" });
    }

    res.status(200).send({ data: evaluations });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .send({ message: error.message, code: error.code, requette: error.sql });
  }
};
const getAllEvaluationsTerminer = async (req, res, next) => {
  console.log(req.params);
  const { debut, fin } = req.body;
  try {
    const [evaluations] = await db.query(
      `SELECT * FROM EVALUATIONS WHERE statut='Terminer' AND DATE_FORMAT(date_creation,'%Y-%m-%d')  BETWEEN DATE_FORMAT(?,'%Y-%m-%d') AND DATE_FORMAT(?,'%Y-%m-%d')`,
      [debut, fin],
    );

    console.log(evaluations);
    if (evaluations.length === 0) {
      res.status(400).send({ message: "Aucune entrée trouvée" });
    }

    res.status(200).send(evaluations);
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .send({ message: error.message, code: error.code, requette: error.sql });
  }
};
const getEvaluationsById = async (req, res, next) => {
  const { id } = req.params;
  console.log(req.params);
  try {
    if (isNullOrEmpty(id)) {
      res.status(400).send({ message: "La valeur de idEvaluations est nulle" });
    }
    const [[evaluation]] = await db.query(
      `SELECT
        eval.*,
        u1.nom    AS evaluateur_nom,
        u1.prenom AS evaluateur_prenom,
        u2.nom    AS agent_nom,
        u2.prenom AS agent_prenom
      FROM EVALUATIONS eval
      JOIN B_UTILISATEUR u1 ON u1.id = eval.id_Evaluateur
      JOIN B_UTILISATEUR u2 ON u2.id = eval.id_Agent
      WHERE eval.id = ?`,
      [id],
    );

    console.log(evaluation);
    if (evaluation.length === 0) {
      res.status(400).send({ message: "Aucune entrée trouvée" });
    }

    res.status(200).send(evaluation);
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .send({ message: error.message, code: error.code, requette: error.sql });
  }
};
const getAllEvaluationsResultatsByEvaluationsAndCategorie = async (
  req,
  res,
  next,
) => {
  const { id } = req.params;
  console.log(req.params);
  try {
    if (isNullOrEmpty(id)) {
      res.status(400).send({ message: "La valeur de idEvaluations est nulle" });
    }
    const [categroiesErreurs] = await db.query(
      `SELECT c.id AS id, c.titre AS titre FROM CATEGORIES_ERREURS c
      JOIN EVALUATIONS e ON e.id=? AND e.id_Grille=c.id_Grille`,
      [id],
    );
    console.log("categroiesErreurs");
    console.log(categroiesErreurs);

    const [listeEvaluationsResultats] = await db.query(
      `SELECT * FROM EVALUATIONS_RESULTATS WHERE id_Evaluations=? ORDER BY id ASC;`,
      [id],
    );

    // console.log(listeEvaluationsResultats);
    if (listeEvaluationsResultats.length === 0) {
      res.status(400).send({ message: "Aucune entrée trrouvée" });
    }
    const evaluationsResultats = categroiesErreurs.map((cat) => ({
      id: cat.id,
      titre: cat.titre,
      resultats: listeEvaluationsResultats.filter(
        (r) => r.id_Categories_Erreurs === cat.id,
      ),
    }));
    res.status(200).send(evaluationsResultats);
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .send({ message: error.message, code: error.code, requette: error.sql });
  }
};

const updateEvaluationsResultats = async (req, res) => {
  const { id, etat, commentaire, id_Evaluations } = req.body;
  let conclusions = [];
  if (isNullOrEmpty(id) || isNullOrEmpty(id_Evaluations)) {
    return res.status(400).json({
      message: "Identifiant résultat ou évaluation manquant",
    });
  }

  await db.query("START TRANSACTION");

  try {
    [result] = await db.query(
      `SELECT id FROM EVALUATIONS_RESULTATS WHERE id=?`,
      [id],
    );
    if (result.length === 0) {
      return res.status(400).json({
        message:
          "Identifiant fournit ne correspond a aucune evaluation résultat",
        id: id,
      });
    }
    [result1] = await db.query(`SELECT id FROM EVALUATIONS WHERE id=?`, [
      id_Evaluations,
    ]);
    if (result1.length === 0) {
      return res.status(400).json({
        message: "Identifiant fournit ne correspond a aucune evaluation",
        id_Evaluations: id_Evaluations,
      });
    }
    //Update evaluations résultats
    await db.query(
      `
      UPDATE EVALUATIONS_RESULTATS
      SET etat = ?, commentaire = ?
      WHERE id = ? AND id_Evaluations = ?
    `,
      [etat, commentaire, id, id_Evaluations],
    );

    //Récupération catégories
    const [categories] = await db.query(
      `
      SELECT DISTINCT ev.id_Categories_Erreurs, cat.seuil 
      FROM EVALUATIONS_RESULTATS ev  
      JOIN CATEGORIES_ERREURS cat ON cat.id = ev.id_Categories_Erreurs
      WHERE ev.id_Evaluations = ?
    `,
      [id_Evaluations],
    );

    //Update Scores
    await db.query(
      `
        UPDATE SCORES
        JOIN(
           SELECT
              ev.id_Evaluations AS id_ev,
              ev.id_Categories_Erreurs AS id_cat,
              SUM(ev.etat=0) AS nombreEv,
              SUM(CASE WHEN ev.etat=1 THEN ev.score_sur_vingt ELSE 0 END) AS scoreEv
            FROM EVALUATIONS_RESULTATS ev
            GROUP BY ev.id_Evaluations,ev.id_Categories_Erreurs 
        ) x ON x.id_ev = id_Evaluations AND x.id_cat = id_Categories_Erreurs
        SET score = x.scoreEv, nombre = x.nombreEv
      `,
    );

    //Boucle catégories
    for (let i = 0; i < categories.length; i++) {
      cat = categories[i];
      const [[rowPoids]] = await db.query(
        `
        SELECT SUM(poids_items) AS poids 
        FROM EVALUATIONS_RESULTATS
        WHERE etat = 1 AND id_Evaluations = ? AND id_Categories_Erreurs = ?
      `,
        [id_Evaluations, cat.id_Categories_Erreurs],
      );
      console.log("rowPoids");
      console.log(rowPoids);

      const poids = Number(rowPoids.poids || 0);
      const seuil = Number(cat.seuil || 0);

      console.log("rowPoids");
      console.log(poids);
      console.log("seuil");
      console.log(seuil);

      const conclusion = poids > seuil ? "SUCCES" : "ECHEC";
      conclusions.push({ conclusion });
      console.log("conclusion pending");
      console.log(conclusions);
      if (i == categories.length - 1) {
        const hasEchec = conclusions.some((c) => c.conclusion === "ECHEC");
        const conclusionGlobale = hasEchec ? "ECHEC" : "SUCCES";
        console.log("hasEchec");
        console.log(hasEchec);
        console.log("conclusionGlobale");
        console.log(conclusionGlobale);
        conclusions = [];

        //Update evaluations
        await db.query(
          `
        UPDATE EVALUATIONS
        SET conclusion = ?
        WHERE id = ?
      `,
          [conclusionGlobale, id_Evaluations],
        );
        await db.query("COMMIT");
      }
    }
    return res.status(201).json({ message: "Mise à jour OK" });
  } catch (error) {
    await db.query("ROLLBACK");
    console.log(error);
    return res.status(500).json({
      message:
        "La mise a jour de evaluations resultats a été annulée dû a une erreur",
      message: error.message,
      code: error.code,
      requette: error.sql,
    });
  }
};
/** Fin */

/** Fonctions liées a la categorie d'erreur évaluation*/

const createCategoriesErreurs = async (req, res, next) => {
  const { titre, poids, seuil, id_Grille } = req.body;
  let nom_Grille = "";
  try {
    const Query = `INSERT INTO CATEGORIES_ERREURS(
    titre,
    poids,
    nom_Grille,
    seuil,
    id_Grille) VALUES(?,?,?,?,?)`;

    if (!isNullOrEmpty(id_Grille)) {
      const [row] = await db.query(
        `SELECT g.nom as nom FROM B_GRILLE g WHERE g.id=?`,
        [id_Grille],
      );
      console.log(row);
      if (row.length > 0) {
        nom_Grille = row[0].nom;
        const resultat = db.query(Query, [
          titre,
          poids,
          nom_Grille,
          seuil,
          id_Grille,
        ]);
        res.status(201).send({
          message: "La categorie a été bien enregistrer!",
        });
      } else {
        res
          .status(400)
          .send({ message: "La grille selectionnée n'existe pas !" });
      }
    } else {
      res
        .status(400)
        .send({ message: "La valeur de la grille envoyée est vide !" });
    }
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .send({ message: error.message, code: error.code, requette: error.sql });
  }
};

const getAllCategoriesErreurs = async (req, res, next) => {
  const [categoriesErreurs] = await db.query(
    `SELECT * FROM CATEGORIES_ERREURS`,
  );
  console.log(categoriesErreurs);
  if (!isNullOrEmpty(categoriesErreurs)) {
    res.status(201).send(categoriesErreurs);
  } else {
    res
      .status(500)
      .send({ message: "La liste de la categorie d'erreur est vide !" });
  }
};

const getCategoriesErreursById = async (req, res, next) => {
  const { id } = req.params;
  const [[categoriesErreurs]] = await db.query(
    `SELECT * FROM CATEGORIES_ERREURS WHERE id=?`,
    [id],
  );
  if (!isNullOrEmpty(categoriesErreurs)) {
    res.status(201).send(categoriesErreurs);
  } else {
    res.status(500).send({ message: "Aucune categories d'erreurs trouvée !" });
  }
};

const getCategoriesErreursByGrilleId = async (req, res, next) => {
  const { id } = req.params;
  const [categoriesErreurs] = await db.query(
    `SELECT * FROM CATEGORIES_ERREURS WHERE id_Grille=?`,
    [id],
  );
  if (!isNullOrEmpty(categoriesErreurs)) {
    res.status(201).send(categoriesErreurs);
  } else {
    res.status(500).send({
      message: "Aucune categories d'erreurs trouvée pour cette grille!",
    });
  }
};

const updateCategoriesErreurs = async (req, res, next) => {
  const { titre, poids, seuil, id_Grille } = req.body;
  const id = req.params.id;
  let new_nom_Grille = null;
  let new_id_Grille = null;

  await db.query("START TRANSACTION");

  try {
    const Query = `UPDATE CATEGORIES_ERREURS
    SET titre=?,
    poids=?,
    nom_Grille=?,
    seuil=?,
    id_Grille=? WHERE id=?`;

    if (isNullOrEmpty(id)) {
      res
        .status(400)
        .send({ message: "La valeur de la grille envoyée est vide !" });
    }
    const [row] = await db.query(
      `SELECT * FROM CATEGORIES_ERREURS WHERE id=?`,
      [id],
    );

    const categorie_erreur = row[0];
    if (!isNullOrEmpty(categorie_erreur)) {
      const current_nom_Grille = categorie_erreur.nom_Grille;
      const current_id_Grille = categorie_erreur.id_Grille;

      if (
        !isNullOrEmpty(id_Grille) &&
        Number(id_Grille) !== Number(current_id_Grille)
      ) {
        const [row1] = await db.query(`SELECT * FROM B_GRILLE WHERE id=?`, [
          id_Grille,
        ]);
        grille = row1[0];
        if (isNullOrEmpty(grille)) {
          res
            .status(400)
            .send({ message: "La grille selectionnée n'existe pas !" });
        }
        new_nom_Grille = grille.nom;
        new_id_Grille = grille.id;

        await db.query(
          `UPDATE ERREURS SET id_Grille=? WHERE id_Categories_Erreurs=?`,
          [new_id_Grille, id],
        );
      }

      const [resultat] = await db.query(Query, [
        isNullOrEmpty(titre) ? categorie_erreur.titre : titre,
        isNullOrEmpty(poids) ? categorie_erreur.poids : poids,
        isNullOrEmpty(new_nom_Grille) ? current_nom_Grille : new_nom_Grille,
        isNullOrEmpty(seuil) ? categorie_erreur.seuil : seuil,
        isNullOrEmpty(new_id_Grille) ? current_id_Grille : new_id_Grille,
        id,
      ]);
      console.log(resultat);

      if (resultat.affectedRows > 0) {
        await calculPoidsScore();
        await db.query("COMMIT");
        res.status(201).send({
          message: "Mise a jour ok2 !",
        });
      }
    } else {
      await db.query("ROLLBACK");
      res.status(400).send({
        message: "Aucune categorie ne correspond a l'identifiant fournit !",
      });
    }
  } catch (error) {
    console.log(error);
    await db.query("ROLLBACK");
    res
      .status(500)
      .send({ message: error.message, code: error.code, requette: error.sql });
  }
};

const deleteCategoriesErreurs = async (req, res, next) => {
  const id = req.params.id;
  try {
    const Query_categorie_erreur = `DELETE 
    FROM CATEGORIES_ERREURS
    WHERE id=?`;
    const Query_sous_categorie_erreur = `DELETE 
    FROM SOUS_CATEGORIES_ERREURS
    WHERE id_Categories_Erreurs=?`;
    const Query_erreur = `DELETE 
    FROM ERREURS
    WHERE id_Sous_Categories_Erreurs IN (?)`;
    if (isNullOrEmpty(id)) {
      res.status(400).send({
        message:
          "L'identifiant de la valeur de la sous categorie d'erreur envoyée est vide !",
      });
    }
    const [sous_categorie_erreur] = await db.query(
      `SELECT id FROM SOUS_CATEGORIES_ERREURS WHERE id_Categories_Erreurs=?`,
      [id],
    );

    const rows = sous_categorie_erreur.map((m) => m.id);

    if (rows.length < 0) {
      console.log("resultat_erreur");
      await db.query(Query_erreur, [rows]);
      console.log(resultat_erreur);
    }
    await db.query(Query_sous_categorie_erreur, [id]);

    const resultat = await db.query(Query_categorie_erreur, [id]);
    console.log(resultat);
    if (resultat.affectedRows > 0) {
      await calculPoidsScore();
      res.status(201).send({
        message: "Suppression ok !",
      });
    } else {
      res.status(400).send({
        message: "La ressource que vous essayer de supprimer, n'existe plus!",
      });
    }
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .send({ message: error.message, code: error.code, requette: error.sql });
  }
};
/** Fin */

/** Fonctions liées a la sous categorie d'erreur */

const createSousCategoriesErreurs = async (req, res, next) => {
  const { titre, poids, id_Categories_Erreurs } = req.body;
  try {
    const Query = `INSERT INTO SOUS_CATEGORIES_ERREURS(
    titre,
    poids,
    id_Categories_Erreurs) VALUES(?,?,?)`;

    if (!isNullOrEmpty(id_Categories_Erreurs)) {
      const resultat = db.query(Query, [titre, poids, id_Categories_Erreurs]);
      if ((await resultat).length > 0) {
        res.status(201).send({
          message: "La sous categorie a été bien enregistrer!",
        });
      } else {
        res
          .status(400)
          .send({ message: "La categorie selectionnée n'existe pas !" });
      }
    } else {
      res
        .status(400)
        .send({ message: "La valeur de la categorie envoyée est vide !" });
    }
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .send({ message: error.message, code: error.code, requette: error.sql });
  }
};
const getAllSousCategoriesErreurs = async (req, res, next) => {
  const [sousCategoriesErreurs] = await db.query(
    `SELECT * FROM SOUS_CATEGORIES_ERREURS`,
  );
  console.log(sousCategoriesErreurs);
  if (!isNullOrEmpty(sousCategoriesErreurs)) {
    res.status(201).send(sousCategoriesErreurs);
  } else {
    res
      .status(500)
      .send({ message: "La liste de la sous categorie d'erreur est vide !" });
  }
};

const getSousCategoriesErreursById = async (req, res, next) => {
  const { id } = req.params;
  const [[sousCategoriesErreurs]] = await db.query(
    `SELECT * FROM SOUS_CATEGORIES_ERREURS WHERE id=?`,
    [id],
  );
  if (!isNullOrEmpty(sousCategoriesErreurs)) {
    res.status(201).send(sousCategoriesErreurs);
  } else {
    res
      .status(500)
      .send({ message: "Aucune sous categorie d'erreur trouvée !" });
  }
};

const getSousCategoriesErreursByCategorieId = async (req, res, next) => {
  const { id } = req.params;
  const [sousCategoriesErreurs] = await db.query(
    `SELECT * FROM SOUS_CATEGORIES_ERREURS WHERE id_Categories_Erreurs=?`,
    [id],
  );
  if (!isNullOrEmpty(sousCategoriesErreurs)) {
    res.status(201).send(sousCategoriesErreurs);
  } else {
    res.status(500).send({
      message: "Aucune sous categorie d'erreur trouvée pour cette categorie!",
    });
  }
};
const updateSousCategoriesErreurs = async (req, res, next) => {
  const { titre, id_Categories_Erreurs } = req.body;
  const id = req.params.id;
  await db.query("START TRANSACTION");
  try {
    const Query = `UPDATE SOUS_CATEGORIES_ERREURS
    SET titre=?,
    poids=?,
    id_Categories_Erreurs=? WHERE id=?`;

    if (isNullOrEmpty(id)) {
      res.status(400).send({
        message:
          "L'identifiant de la valeur de la sous categorie d'erreur envoyée est vide !",
      });
    }
    const [row] = await db.query(
      `SELECT * FROM SOUS_CATEGORIES_ERREURS WHERE id=?`,
      [id],
    );

    const sous_categorie_erreur = row[0];
    console.log("sous_categorie_erreur");
    console.log(sous_categorie_erreur);
    if (!isNullOrEmpty(sous_categorie_erreur)) {
      const [resultat] = await db.query(Query, [
        isNullOrEmpty(titre) ? sous_categorie_erreur.titre : titre,
        sous_categorie_erreur.poids,
        isNullOrEmpty(id_Categories_Erreurs)
          ? sous_categorie_erreur.id_Categories_Erreurs
          : id_Categories_Erreurs,
        id,
      ]);
      console.log(resultat);
      if (resultat.affectedRows > 0) {
        if (
          !isNullOrEmpty(id_Categories_Erreurs) &&
          Number(id_Categories_Erreurs) !==
            Number(sous_categorie_erreur.id_Categories_Erreurs)
        ) {
          const [rows] = await db.query(
            `SELECT * 
            FROM CATEGORIES_ERREURS
            WHERE id=?`,
            [id_Categories_Erreurs],
          );
          const categorie_erreur = rows[0];
          console.log("categorie_erreur");
          console.log(categorie_erreur);
          const resultat1 = await db.query(
            `UPDATE ERREURS 
            SET id_Categories_Erreurs=?,
            id_Sous_Categories_Erreurs=?,
            id_Grille=?
            WHERE id_Sous_Categories_Erreurs=?`,
            [categorie_erreur.id, id, categorie_erreur.id_Grille, id],
          );
          console.log("resultat1");
          console.log(resultat1);
        }
        await calculPoidsScore();
        await db.query("COMMIT");
        res.status(201).send({
          message: "Mise a jour ok !",
        });
      }
    } else {
      await db.query("ROLLBACK");

      res.status(400).send({
        message:
          "Aucune sous categorie ne correspond a l'identifiant fournit !",
      });
    }
  } catch (error) {
    console.log(error);
    await db.query("ROLLBACK");
    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      res.status(409).send({
        message: "La categorie que vous essayer d'associer n'existe pas.",
      });
    } else {
      return res.status(500).send({
        message: error.message,
        code: error.code,
        requette: error.sql,
      });
    }
    res
      .status(500)
      .send({ message: error.message, code: error.code, requette: error.sql });
  }
};

const deleteSousCategoriesErreurs = async (req, res, next) => {
  const id = req.params.id;
  await db.query("START TRANSACTION");
  try {
    const Query = `DELETE 
    FROM SOUS_CATEGORIES_ERREURS
    WHERE id=?`;
    const Query_erreur = `DELETE 
    FROM ERREURS
    WHERE id_Sous_Categories_Erreurs=?`;
    if (isNullOrEmpty(id)) {
      res.status(400).send({
        message:
          "L'identifiant de la valeur de la sous categorie d'erreur envoyée est vide !",
      });
    }
    await db.query(Query_erreur, [id]);
    const [resultat] = await db.query(Query, [id]);
    console.log(resultat);

    if (resultat.affectedRows > 0) {
      await calculPoidsScore();
      await db.query("COMMIT");
      res.status(201).send({
        message: "Suppression ok !",
      });
    } else {
      await db.query("ROLLBACK");
      res.status(400).send({
        message: "La ressource que vous essayer de supprimer, n'existe plus!",
      });
    }
  } catch (error) {
    console.log(error);
    await db.query("ROLLBACK");
    res
      .status(500)
      .send({ message: error.message, code: error.code, requette: error.sql });
  }
};
/** Fin */

/** Fonctions liées a l'erreur */

const createErreurs = async (req, res, next) => {
  const {
    items,
    sous_items,
    referentiels,
    poids,
    score_en_pourcent,
    score_sur_vingt,
    id_Sous_Categories_Erreurs,
  } = req.body;
  let id_Categories_Erreurs = null;
  let id_Grille = null;
  await db.query("START TRANSACTION");
  try {
    const Query = `INSERT INTO ERREURS(
    items,
    sous_items,
    referentiels,
    poids_items,
    score_en_pourcent,
    score_sur_vingt,
    id_Sous_Categories_Erreurs,
    id_Categories_Erreurs,
    id_Grille) VALUES(?,?,?,?,?,?,?,?,?)`;

    if (!isNullOrEmpty(id_Sous_Categories_Erreurs)) {
      const [sous_categories_erreurs] = await db.query(
        `SELECT s.*, c.id_Grille as id_Grille 
        FROM SOUS_CATEGORIES_ERREURS s 
        JOIN CATEGORIES_ERREURS c ON c.id=s.id_Categories_Erreurs 
        WHERE s.id=?`,
        [id_Sous_Categories_Erreurs],
      );
      if (sous_categories_erreurs.length > 0) {
        console.log(sous_categories_erreurs);
        id_Categories_Erreurs =
          sous_categories_erreurs[0].id_Categories_Erreurs;
        id_Grille = sous_categories_erreurs[0].id_Grille;
        const resultat = await db.query(Query, [
          items,
          sous_items,
          referentiels,
          poids,
          score_en_pourcent,
          score_sur_vingt,
          id_Sous_Categories_Erreurs,
          id_Categories_Erreurs,
          id_Grille,
        ]);

        if (resultat.length > 0) {
          console.log(resultat);
          //Appel de la fonction de calcul des poids et scores
          await calculPoidsScore();
          res.status(201).send({
            message: "L'erreur a été bien enregistrer!",
          });
        } else {
          await db.query("ROLLBACK");
          res
            .status(400)
            .send({ message: "La sous categorie selectionnée n'existe pas !" });
        }
      }
    } else {
      await db.query("ROLLBACK");
      res
        .status(400)
        .send({ message: "La valeur de la sous categorie envoyé est vide !" });
    }
  } catch (error) {
    await db.query("ROLLBACK");
    console.log(error);
    res.status(500).send({
      message: error.message,
      code: error.code,
      requette: error.sql,
    });
  }
};

const getAllErreurs = async (req, res, next) => {
  const [erreurs] = await db.query(`SELECT * FROM ERREURS`);
  if (erreurs.length > 0) {
    res.status(200).send(erreurs);
  } else {
    res.status(500).send({ message: "Aucune erreur trouvée !" });
  }
};

const getErreursById = async (req, res, next) => {
  const { id } = req.params;
  const [[erreurs]] = await db.query(`SELECT * FROM ERREURS WHERE id=?`, [id]);
  if (!isNullOrEmpty(erreurs)) {
    res.status(200).send(erreurs);
  } else {
    res.status(500).send({ message: "Aucune erreur trouvée !" });
  }
};

const getErreursByGrille = async (req, res, next) => {
  const { id } = req.params;
  const [erreurs] = await db.query(`SELECT * FROM ERREURS WHERE id_Grille=?`, [
    id,
  ]);
  if (erreurs.length > 0) {
    res.status(200).send(erreurs);
  } else {
    res
      .status(500)
      .send({ message: "Aucune erreur trouvée pour cette grille !" });
  }
};
const getErreursByCategorie = async (req, res, next) => {
  const { id } = req.params;
  const [erreurs] = await db.query(
    `SELECT * FROM ERREURS WHERE id_Categories_Erreurs=?`,
    [id],
  );
  if (erreurs.length > 0) {
    res.status(200).send(erreurs);
  } else {
    res
      .status(500)
      .send({ message: "Aucune erreur trouvée pour cette categorie !" });
  }
};
const updateErreurs = async (req, res, next) => {
  const { items, sous_items, referentiels, id_Sous_Categories_Erreurs } =
    req.body;
  const { id } = req.params;
  let new_id_Sous_Categories_Erreurs = null;
  let new_id_Categories_Erreurs = null;
  let new_id_Grille = null;
  await db.query("START TRANSACTION");
  try {
    const Query = `UPDATE ERREURS
    SET items=?,
    sous_items=?,
    referentiels=?,
    id_Sous_Categories_Erreurs=?,
    id_Categories_Erreurs=?,
    id_Grille=?
    WHERE id=?`;

    if (!isNullOrEmpty(id)) {
      const [rows] = await db.query(
        `SELECT 
        e.items as items, 
        e.sous_items as sous_items, 
        e.referentiels as referentiels,
        s.id as id_Sous_Categories_Erreurs, 
        c.id as id_Categories_Erreurs, 
        c.id_Grille as id_Grille
        FROM ERREURS e
        JOIN SOUS_CATEGORIES_ERREURS s ON e.id_Sous_Categories_Erreurs=s.id 
        JOIN CATEGORIES_ERREURS c ON c.id=s.id_Categories_Erreurs 
        WHERE e.id=?`,
        [id],
      );
      const categories_sous_categories = rows[0];
      console.log(categories_sous_categories);
      if (!isNullOrEmpty(categories_sous_categories)) {
        const current_id_Sous_Categories_Erreurs =
          categories_sous_categories.id_Sous_Categories_Erreurs;
        const current_id_Categories_Erreurs =
          categories_sous_categories.id_Categories_Erreurs;
        const current_id_Grille = categories_sous_categories.id_Grille;
        if (
          Number(id_Sous_Categories_Erreurs) !==
          Number(current_id_Sous_Categories_Erreurs)
        ) {
          const [rows1] = await db.query(
            `SELECT 
            s.id as id_Sous_Categories_Erreurs, 
            c.id as id_Categories_Erreurs, 
            c.id_Grille as id_Grille
            FROM SOUS_CATEGORIES_ERREURS s
            JOIN CATEGORIES_ERREURS c ON c.id=s.id_Categories_Erreurs 
            WHERE s.id=?`,
            [id_Sous_Categories_Erreurs],
          );
          const new_categories_sous_categories = rows1[0];
          new_id_Sous_Categories_Erreurs =
            new_categories_sous_categories.id_Sous_Categories_Erreurs;
          new_id_Categories_Erreurs =
            new_categories_sous_categories.id_Categories_Erreurs;
          new_id_Grille = new_categories_sous_categories.id_Grille;
        }
        const [resultat] = await db.query(Query, [
          isNullOrEmpty(items) ? categories_sous_categories.items : items,
          isNullOrEmpty(sous_items)
            ? categories_sous_categories.sous_items
            : sous_items,
          isNullOrEmpty(referentiels)
            ? categories_sous_categories.referentiels
            : referentiels,
          isNullOrEmpty(new_id_Sous_Categories_Erreurs)
            ? current_id_Sous_Categories_Erreurs
            : new_id_Sous_Categories_Erreurs,
          isNullOrEmpty(new_id_Categories_Erreurs)
            ? current_id_Categories_Erreurs
            : new_id_Categories_Erreurs,
          isNullOrEmpty(new_id_Grille) ? current_id_Grille : new_id_Grille,
          id,
        ]);

        if (resultat.affectedRows > 0) {
          console.log(resultat);
          //Appel de la fonction de calcul des poids et scores
          await calculPoidsScore();
          await db.query("COMMIT");
          res.status(201).send({
            message: "Mise a jour ok!",
          });
        } else {
          await db.query("ROLLBACK");
          res.status(400).send({
            message:
              "La ressource que vous essayer de supprimer, n'existe plus!",
          });
        }
      }
    } else {
      await db.query("ROLLBACK");
      res
        .status(400)
        .send({ message: "La valeur de la sous categorie envoyé est vide !" });
    }
  } catch (error) {
    await db.query("ROLLBACK");
    console.log(error);
    res.status(500).send({
      message: error.message,
      code: error.code,
      requette: error.sql,
    });
  }
};
const deleteErreurs = async (req, res, next) => {
  const id = req.params.id;
  try {
    const Query_erreur = `DELETE 
    FROM ERREURS
    WHERE id=?`;
    if (isNullOrEmpty(id)) {
      res.status(400).send({
        message:
          "L'identifiant de la valeur de la sous categorie d'erreur envoyée est vide !",
      });
    }
    const [resultat] = await db.query(Query_erreur, [id]);
    console.log(resultat);

    if (resultat.affectedRows > 0) {
      await calculPoidsScore();
      res.status(201).send({
        message: "Suppression ok !",
      });
    } else {
      res.status(400).send({
        message: "La ressource que vous essayer de supprimer, n'existe plus!",
      });
    }
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .send({ message: error.message, code: error.code, requette: error.sql });
  }
};
/** Fin */

/** Fonctions liées aux scores */

const getAllScoresByIdEvaluations = async (req, res, next) => {
  const { id } = req.params;
  try {
    if (isNullOrEmpty(id)) {
      res
        .status(400)
        .send({ message: "La valeur de l'id de l'evaluation est nulle !" });
    }

    const [scores] = await db.query(
      `SELECT * FROM SCORES WHERE id_Evaluations=?`,
      [id],
    );
    console.log("scores");
    console.log(scores);
    if (scores.length === 0) {
      res.status(400).send({ message: "Aucune entrée ne correspond !" });
    }
    res.status(200).send(scores);
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .send({ message: error.message, code: error.code, requette: error.sql });
  }
};

const getAllScoresByIdSupplementaires = async (req, res, next) => {
  const { id } = req.params;
  try {
    if (isNullOrEmpty(id)) {
      res
        .status(400)
        .send({ message: "La valeur de l'id de l'evaluation est nulle !" });
    }

    const [scores] = await db.query(
      `SELECT * FROM SCORES_SUPPLEMENTAIRES WHERE id_Supplementaires=?`,
      [id],
    );
    console.log("scores");
    console.log(scores);
    if (scores.length === 0) {
      res.status(400).send({ message: "Aucune entrée ne correspond !" });
    }
    res.status(200).send(scores);
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .send({ message: error.message, code: error.code, requette: error.sql });
  }
};
/** Fin */

/** Fonctions liées au business intelligence */
const createBusinessIntelligence = async (req, res, next) => {
  const { nom, id_Site, id_Grille } = req.body;
  try {
    const Query = `INSERT INTO BUSINESS_INTELLIGENCE(nom,nom_Site,id_Site,id_Grille) VALUES(?,?,?,?)`;
    if (isNullOrEmpty(id_Site) || isNullOrEmpty(id_Grille)) {
      res.status(400).send({
        message: "L'une des deux valeurs est nulle: id_Site, id_Grille",
        id_Site: id_Site,
        id_Grille: id_Grille,
      });
    }
    const [[site]] = await db.query(`SELECT nom FROM B_SITE WHERE id=?`, [
      id_Site,
    ]);

    if (isNullOrEmpty(site)) {
      res.status(400).send({ message: "Aucun site trouvé avec cet id" });
    }
    const [resultat] = await db.query(Query, [
      nom,
      site.nom,
      id_Site,
      id_Grille,
    ]);
    if (resultat.affectedRows > 0) {
      res
        .status(201)
        .send({ message: "Business intelligence ajouter avec succès !" });
    }
  } catch (error) {
    console.log(error);
    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      res.status(400).send({
        message:
          "Violation de la contrainte de clé étrangère pour l'id de la grille",
      });
    }
    res.status(500).send({
      message: error.message,
      code: error.code,
      requette: error.sql,
    });
  }
};

const updateBusinessIntelligence = async (req, res, next) => {
  const { nom, id_Site, id_Grille } = req.body;
  const { id } = req.params;
  let current_nom_Site = null;
  try {
    const Query = `UPDATE BUSINESS_INTELLIGENCE SET nom=?,nom_Site=?,id_Site=?,id_Grille=? WHERE id=?`;
    if (isNullOrEmpty(id)) {
      res.status(400).send({ message: "La valeur de l'id est nulle !" });
    }

    const [[bi]] = await db.query(
      `SELECT * FROM BUSINESS_INTELLIGENCE WHERE id=?`,
      [id],
    );

    if (!isNullOrEmpty(id_Site) && bi.id_Site !== id_Site) {
      const [[new_site]] = await db.query(`SELECT * FROM B_SITE WHERE id=?`, [
        id_Site,
      ]);
      if (isNullOrEmpty(new_site)) {
        res.status(400).send({ message: "Aucun site trouvé avec cet id" });
      }
      current_nom_Site = new_site?.nom_Site;
    }
    const [resultat] = await db.query(Query, [
      isNullOrEmpty(nom) ? bi.nom : nom,
      isNullOrEmpty(current_nom_Site) ? bi.nom_Site : current_nom_Site,
      isNullOrEmpty(id_Site) ? bi.id_Site : id_Site,
      isNullOrEmpty(id_Grille) ? bi.id_Grille : id_Grille,
      id,
    ]);
    if (resultat.affectedRows > 0) {
      res.status(201).send({ message: "Mise a jour ok" });
    }
  } catch (error) {
    console.log(error);
    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      res.status(400).send({
        message:
          "Violation de la contrainte de clé étrangère pour l'id de la grille",
      });
    }
    res.status(500).send({
      message: error.message,
      code: error.code,
      requette: error.sql,
    });
  }
};

const deleteBusinessIntelligence = async (req, res, next) => {
  const { id } = req.params;
  await db.query("START TRANSACTION");
  try {
    if (isNullOrEmpty(id)) {
      res.status(400).send({ message: "La valeur de l'id est nulle !" });
    }
    await db.query(
      `
      DELETE BI_4 FROM BI_4
      JOIN BI_3 ON BI_4.id_BI_3 = BI_3.id
      JOIN BI_2 ON BI_3.id_BI_2 = BI_2.id
      JOIN BI_1 ON BI_2.id_BI_1 = BI_1.id
      WHERE BI_1.id_Business_Intelligence = ?;
    `,
      [id],
    );

    await db.query(
      `
      DELETE BI_3 FROM BI_3
      JOIN BI_2 ON BI_3.id_BI_2 = BI_2.id
      JOIN BI_1 ON BI_2.id_BI_1 = BI_1.id
      WHERE BI_1.id_Business_Intelligence = ?;
    `,
      [id],
    );

    await db.query(
      `
      DELETE BI_2 FROM BI_2
      JOIN BI_1 ON BI_2.id_BI_1 = BI_1.id
      WHERE BI_1.id_Business_Intelligence = ?;
    `,
      [id],
    );

    await db.query(
      `
      DELETE FROM BI_1 WHERE id_Business_Intelligence = ?;
    `,
      [id],
    );

    const [resultat] = await db.query(
      `
      DELETE FROM BUSINESS_INTELLIGENCE WHERE id = ?;
    `,
      [id],
    );
    if (resultat.affectedRows === 0) {
      res
        .status(400)
        .send({ message: "Aucune ressource ne corresponds a l'id fournit !" });
    } else {
      await db.query("COMMIT");
      res.status(200).send({ message: "Suppression ok !" });
    }
  } catch (error) {
    console.log(error);
    await db.query("ROLLBACK");
    res.status(500).send({
      message: error.message,
      code: error.code,
      requette: error.sql,
    });
  }
};

const getAllBusinessIntelligence = async (req, res, next) => {
  try {
    const [bi] = await db.query(`SELECT * FROM BUSINESS_INTELLIGENCE`);
    if (bi.length === 0) {
      res
        .status(400)
        .send({ message: "Aucune ressource ne corresponds a l'id fournit !" });
    }
    res.status(200).send(bi);
  } catch (error) {
    console.log(error);
    res.status(500).send({
      message: error.message,
      code: error.code,
      requette: error.sql,
    });
  }
};
const getAllBIByGrille = async (req, res, next) => {
  const { id_Grille, id_Agent } = req.params;
  try {
    if (isNullOrEmpty(id_Grille) || isNullOrEmpty(id_Agent)) {
      res.status(400).send({
        message: "L'identifiant de la grille ou celui de l'agent est vide",
      });
    }
    const [[site_row]] = await db.query(
      `SELECT id_Site FROM B_UTILISATEUR WHERE id=?`,
      id_Agent,
    );
    console.log("id_Siteid_Siteid_Siteid_Siteid_Siteid_Siteid_Siteid_Site");
    console.log(site_row);
    console.log(
      "id_Grilleid_Grilleid_Grilleid_Grilleid_Grilleid_Grilleid_Grilleid_Grille",
    );
    console.log(id_Grille);
    const [rows] = await db.query(
      `
    SELECT 
      bi.id AS bi_id,
      bi.nom AS bi_nom,      
      bi.nom_Site AS bi_nom_Site,
      bi.id_Site AS bi_id_Site,
      bi.id_Grille AS bi_id_Grille,
      b1.id AS bi1_id,
      b1.options AS bi1_opt,
      b2.id AS bi2_id,
      b2.options AS bi2_opt,
      b3.id AS bi3_id,
      b3.options AS bi3_opt,
      b4.id AS bi4_id,
      b4.options AS bi4_opt
    FROM BUSINESS_INTELLIGENCE bi
    LEFT JOIN BI_1 b1 ON b1.id_Business_Intelligence = bi.id
    LEFT JOIN BI_2 b2 ON b2.id_BI_1 = b1.id
    LEFT JOIN BI_3 b3 ON b3.id_BI_2 = b2.id
    LEFT JOIN BI_4 b4 ON b4.id_BI_3 = b3.id
    WHERE bi.id_Site=? AND bi.id_Grille=?
    ORDER BY bi.id, b1.id, b2.id, b3.id, b4.id
  `,
      [site_row.id_Site, id_Grille],
    );

    const map = {};
    const result = [];
    console.log("rowsrowsrowsrowsrowsrowsrows");
    console.log(rows);

    for (const row of rows) {
      // BI
      if (!map[row.bi_id]) {
        map[row.bi_id] = {
          id: row.bi_id,
          nom: row.bi_nom,
          nom_Site: row.bi_nom_Site,
          id_Site: row.bi_id_Site,
          id_Grille: row.bi_id_Grille,
          bi1: [],
        };
        result.push(map[row.bi_id]);
      }

      const bi = map[row.bi_id];

      // BI_1
      let bi1;
      if (row.bi1_id) {
        bi1 = bi.bi1.find((x) => x.id === row.bi1_id);
        if (!bi1) {
          bi1 = {
            id: row.bi1_id,
            id_Business_Intelligence: bi.id,
            options: row.bi1_opt,
            bi2: [],
          };
          bi.bi1.push(bi1);
        }
      }

      // BI_2
      let bi2;
      if (row.bi2_id && bi1) {
        bi2 = bi1.bi2.find((x) => x.id === row.bi2_id);
        if (!bi2) {
          bi2 = {
            id: row.bi2_id,
            id_BI_1: bi1.id,
            options: row.bi2_opt,
            bi3: [],
          };
          bi1.bi2.push(bi2);
        }
      }

      // BI_3
      let bi3;
      if (row.bi3_id && bi2) {
        bi3 = bi2.bi3.find((x) => x.id === row.bi3_id);
        if (!bi3) {
          bi3 = {
            id: row.bi3_id,
            id_BI_2: bi2.id,
            options: row.bi3_opt,
            bi4: [],
          };
          bi2.bi3.push(bi3);
        }
      }

      // BI_4
      if (row.bi4_id && bi3) {
        const exists = bi3.bi4.find((x) => x.id === row.bi4_id);
        if (!exists) {
          bi3.bi4.push({
            id: row.bi4_id,
            id_BI_3: bi3.id,
            options: row.bi4_opt,
          });
        }
      }
    }

    res.status(200).json(result);
  } catch (error) {
    console.log(error);
    res.status(500).send({
      message: error.message,
      code: error.code,
      requette: error.sql,
    });
  }
};
const getAllBI = async (req, res, next) => {
  try {
    const [rows] = await db.query(`
    SELECT 
      bi.id AS bi_id,
      bi.nom AS bi_nom,      
      bi.nom_Site AS bi_nom_Site,
      bi.id_Site AS bi_id_Site,
      bi.id_Grille AS bi_id_Grille,
      b1.id AS bi1_id,
      b1.options AS bi1_opt,
      b2.id AS bi2_id,
      b2.options AS bi2_opt,
      b3.id AS bi3_id,
      b3.options AS bi3_opt,
      b4.id AS bi4_id,
      b4.options AS bi4_opt
    FROM BUSINESS_INTELLIGENCE bi
    LEFT JOIN BI_1 b1 ON b1.id_Business_Intelligence = bi.id
    LEFT JOIN BI_2 b2 ON b2.id_BI_1 = b1.id
    LEFT JOIN BI_3 b3 ON b3.id_BI_2 = b2.id
    LEFT JOIN BI_4 b4 ON b4.id_BI_3 = b3.id
    ORDER BY bi.id, b1.id, b2.id, b3.id, b4.id
  `);
    if (rows.length === 0) {
      res.status(400).send({ message: "Aucun resultat trouver !" });
    }
    const map = {};
    const result = [];

    for (const row of rows) {
      // BI
      if (!map[row.bi_id]) {
        map[row.bi_id] = {
          id: row.bi_id,
          nom: row.bi_nom,
          nom_Site: row.bi_nom_Site,
          id_Site: row.bi_id_Site,
          id_Grille: row.bi_id_Grille,
          bi1: [],
        };
        result.push(map[row.bi_id]);
      }

      const bi = map[row.bi_id];

      // BI_1
      let bi1;
      if (row.bi1_id) {
        bi1 = bi.bi1.find((x) => x.id === row.bi1_id);
        if (!bi1) {
          bi1 = {
            id: row.bi1_id,
            id_Business_Intelligence: bi.id,
            options: row.bi1_opt,
            bi2: [],
          };
          bi.bi1.push(bi1);
        }
      }

      // BI_2
      let bi2;
      if (row.bi2_id && bi1) {
        bi2 = bi1.bi2.find((x) => x.id === row.bi2_id);
        if (!bi2) {
          bi2 = {
            id: row.bi2_id,
            id_BI_1: bi1.id,
            options: row.bi2_opt,
            bi3: [],
          };
          bi1.bi2.push(bi2);
        }
      }

      // BI_3
      let bi3;
      if (row.bi3_id && bi2) {
        bi3 = bi2.bi3.find((x) => x.id === row.bi3_id);
        if (!bi3) {
          bi3 = {
            id: row.bi3_id,
            id_BI_2: bi2.id,
            options: row.bi3_opt,
            bi4: [],
          };
          bi2.bi3.push(bi3);
        }
      }

      // BI_4
      if (row.bi4_id && bi3) {
        const exists = bi3.bi4.find((x) => x.id === row.bi4_id);
        if (!exists) {
          bi3.bi4.push({
            id: row.bi4_id,
            id_BI_3: bi3.id,
            options: row.bi4_opt,
          });
        }
      }
    }

    res.status(200).json(result);
  } catch (error) {
    console.log(error);
    res.status(500).send({
      message: error.message,
      code: error.code,
      requette: error.sql,
    });
  }
};
const getBusinessIntelligenceById = async (req, res, next) => {
  const { id } = req.params;
  try {
    if (isNullOrEmpty(id)) {
      res.status(400).send({ message: "La valeur de l'id est nulle !" });
    }
    const [[bi]] = await db.query(
      `SELECT * FROM BUSINESS_INTELLIGENCE WHERE id=?`,
      [id],
    );
    if (isNullOrEmpty(bi)) {
      res
        .status(400)
        .send({ message: "Aucune ressource ne corresponds a l'id fournit !" });
    }
    res.status(200).send(bi);
  } catch (error) {
    console.log(error);
    res.status(500).send({
      message: error.message,
      code: error.code,
      requette: error.sql,
    });
  }
};

const getBusinessIntelligenceBySite = async (req, res, next) => {
  const { id } = req.params;
  try {
    if (isNullOrEmpty(id)) {
      res.status(400).send({ message: "La valeur de l'id est nulle !" });
    }
    const [bi] = await db.query(
      `SELECT * FROM BUSINESS_INTELLIGENCE WHERE id_Site=?`,
      [id],
    );
    if (bi.length === 0) {
      res
        .status(400)
        .send({ message: "Aucune ressource ne corresponds a l'id fournit !" });
    }
    res.status(200).send(bi);
  } catch (error) {
    console.log(error);
    res.status(500).send({
      message: error.message,
      code: error.code,
      requette: error.sql,
    });
  }
};
const getBusinessIntelligenceByGrille = async (req, res, next) => {
  const { id } = req.params;
  try {
    if (isNullOrEmpty(id)) {
      res.status(400).send({ message: "La valeur de l'id est nulle !" });
    }
    const [bi] = await db.query(
      `SELECT * FROM BUSINESS_INTELLIGENCE WHERE id_Grille=?`,
      [id],
    );
    if (bi.length === 0) {
      res
        .status(400)
        .send({ message: "Aucune ressource ne corresponds a l'id fournit !" });
    }
    res.status(200).send(bi);
  } catch (error) {
    console.log(error);
    res.status(500).send({
      message: error.message,
      code: error.code,
      requette: error.sql,
    });
  }
};
/** Fin */

/** Fonctions liées au BI1 */

const createBI1 = async (req, res, next) => {
  const { id_Business_Intelligence, options } = req.body;
  try {
    const Query = `INSERT INTO BI_1(id_Business_Intelligence,options) VALUES(?,?)`;
    if (isNullOrEmpty(id_Business_Intelligence)) {
      res.status(400).send({ message: "La valeur de l'id est nulle !" });
    }
    const [resultat] = await db.query(Query, [
      id_Business_Intelligence,
      options,
    ]);
    if (resultat.affectedRows > 0) {
      res.status(201).send({ message: "BI_2 ajouter avec succès !" });
    }
  } catch (error) {
    console.log(error);
    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      res.status(400).send({
        message:
          "Violation de la contrainte de clé étrangère pour l'id du Business intelligence",
      });
    }
    res.status(500).send({
      message: error.message,
      code: error.code,
      requette: error.sql,
    });
  }
};

const updateBI1 = async (req, res, next) => {
  const { id_Business_Intelligence, options } = req.body;
  const { id } = req.params;
  try {
    const Query = `UPDATE BI_1 SET id_Business_Intelligence=?,options=? WHERE id=?`;
    if (isNullOrEmpty(id)) {
      res.status(400).send({ message: "La valeur de l'id est nulle !" });
    }
    const [[BI1]] = await db.query(`SELECT * FROM BI_1 WHERE id=?`, [id]);
    if (isNullOrEmpty(BI1)) {
      res.status(400).send({ message: "Aucune entrée correspond avec cet id" });
    }
    const [resultat] = await db.query(Query, [
      isNullOrEmpty(id_Business_Intelligence)
        ? BI1.id_Business_Intelligence
        : id_Business_Intelligence,
      isNullOrEmpty(options) ? BI1.options : options,
      id,
    ]);
    if (resultat.affectedRows > 0) {
      res.status(201).send({ message: "Mise a jour ok" });
    }
  } catch (error) {
    console.log(error);
    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      res.status(400).send({
        message:
          "Violation de la contrainte de clé étrangère pour l'id du Business intelligence",
      });
    }
    res.status(500).send({
      message: error.message,
      code: error.code,
      requette: error.sql,
    });
  }
};

const deleteBI1 = async (req, res, next) => {
  const { id } = req.params;
  await db.query("START TRANSACTION");
  try {
    if (isNullOrEmpty(id)) {
      res.status(400).send({ message: "La valeur de l'id est nulle !" });
    }
    await db.query(
      `
      DELETE BI_4 FROM BI_4
      JOIN BI_3 ON BI_4.id_BI_3 = BI_3.id
      JOIN BI_2 ON BI_3.id_BI_2 = BI_2.id
      WHERE BI_2.id_BI_1 =?;
    `,
      [id],
    );

    await db.query(
      `
      DELETE BI_3 FROM BI_3
      JOIN BI_2 ON BI_3.id_BI_2 = BI_2.id
      WHERE BI_2.id_BI_1 =?;
    `,
      [id],
    );

    await db.query(
      `
      DELETE BI_2 FROM BI_2
      WHERE BI_2.id_BI_1 =?;
    `,
      [id],
    );

    const [resultat] = await db.query(`DELETE FROM BI_1 WHERE id=?`, [id]);
    if (resultat.affectedRows === 0) {
      await db.query("ROLLBACK");
      res
        .status(400)
        .send({ message: "Aucune ressource ne correspond a l'id fournit !" });
    } else {
      await db.query("COMMIT");
      res.status(200).send({ message: "Suppression ok !" });
    }
  } catch (error) {
    console.log(error);
    await db.query("ROLLBACK");
    res.status(500).send({
      message: error.message,
      code: error.code,
      requette: error.sql,
    });
  }
};

const getBI1ById = async (req, res, next) => {
  const { id } = req.params;
  try {
    if (isNullOrEmpty(id)) {
      res.status(400).send({ message: "La valeur de l'id est nulle !" });
    }
    const [[BI1]] = await db.query(`SELECT * FROM BI_1 WHERE id=?`, [id]);
    if (isNullOrEmpty(BI1)) {
      res
        .status(400)
        .send({ message: "Aucune ressource ne correspond a l'id fournit !" });
    }
    res.status(200).send(BI1);
  } catch (error) {
    console.log(error);
    res.status(500).send({
      message: error.message,
      code: error.code,
      requette: error.sql,
    });
  }
};
const getBI1ByBusinessIntelligence = async (req, res, next) => {
  const { id } = req.params;
  try {
    if (isNullOrEmpty(id)) {
      res.status(400).send({ message: "La valeur de l'id est nulle !" });
    }
    const [BI1] = await db.query(
      `SELECT * FROM BI_1 WHERE id_Business_Intelligence=?`,
      [id],
    );
    if (BI1.length === 0) {
      res
        .status(400)
        .send({ message: "Aucune ressource ne correspond a l'id fournit !" });
    }
    res.status(200).send(BI1);
  } catch (error) {
    console.log(error);
    res.status(500).send({
      message: error.message,
      code: error.code,
      requette: error.sql,
    });
  }
};
/** Fin */

/** Fonctions liées au BI1 */

const createBI2 = async (req, res, next) => {
  const { id_BI_1, options } = req.body;
  try {
    const Query = `INSERT INTO BI_2(id_BI_1,options) VALUES(?,?)`;
    if (isNullOrEmpty(id_BI_1)) {
      res.status(400).send({ message: "La valeur de l'id est nulle !" });
    }
    const [resultat] = await db.query(Query, [id_BI_1, options]);
    if (resultat.affectedRows > 0) {
      res.status(201).send({ message: "BI_2 ajouter avec succès !" });
    }
  } catch (error) {
    console.log(error);
    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      res.status(400).send({
        message:
          "Violation de la contrainte de clé étrangère pour l'id du Business intelligence",
      });
    }
    res.status(500).send({
      message: error.message,
      code: error.code,
      requette: error.sql,
    });
  }
};

const updateBI2 = async (req, res, next) => {
  const { id_BI_1, options } = req.body;
  const { id } = req.params;
  try {
    const Query = `UPDATE BI_2 SET id_BI_1=?,options=? WHERE id=?`;
    if (isNullOrEmpty(id)) {
      res.status(400).send({ message: "La valeur de l'id est nulle !" });
    }
    const [[BI2]] = await db.query(`SELECT * FROM BI_2 WHERE id=?`, [id]);
    if (isNullOrEmpty(BI2)) {
      res.status(400).send({ message: "Aucune entrée correspond avec cet id" });
    }
    const [resultat] = await db.query(Query, [
      isNullOrEmpty(id_BI_1) ? BI2.id_BI_1 : id_BI_1,
      isNullOrEmpty(options) ? BI2.options : options,
      id,
    ]);
    if (resultat.affectedRows > 0) {
      res.status(201).send({ message: "Mise a jour ok" });
    }
  } catch (error) {
    console.log(error);
    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      res.status(400).send({
        message:
          "Violation de la contrainte de clé étrangère pour l'id du BI_1",
      });
    }
    res.status(500).send({
      message: error.message,
      code: error.code,
      requette: error.sql,
    });
  }
};

const deleteBI2 = async (req, res, next) => {
  const { id } = req.params;
  await db.query("START TRANSACTION");
  try {
    if (isNullOrEmpty(id)) {
      res.status(400).send({ message: "La valeur de l'id est nulle !" });
    }
    await db.query(
      `
      DELETE BI_4 FROM BI_4
      JOIN BI_3 ON BI_4.id_BI_3 = BI_3.id
      WHERE BI_3.id_BI_2 =?;
    `,
      [id],
    );

    await db.query(
      `
      DELETE BI_3 FROM BI_3
      WHERE BI_3.id_BI_2 =?;
    `,
      [id],
    );

    const [resultat] = await db.query(`DELETE FROM BI_2 WHERE id=?`, [id]);
    if (resultat.affectedRows === 0) {
      await db.query("ROLLBACK");
      res
        .status(400)
        .send({ message: "Aucune ressource ne correspond a l'id fournit !" });
    } else {
      await db.query("COMMIT");
      res.status(200).send({ message: "Suppression ok !" });
    }
  } catch (error) {
    console.log(error);
    await db.query("ROLLBACK");
    res.status(500).send({
      message: error.message,
      code: error.code,
      requette: error.sql,
    });
  }
};

const getBI2ById = async (req, res, next) => {
  const { id } = req.params;
  try {
    if (isNullOrEmpty(id)) {
      res.status(400).send({ message: "La valeur de l'id est nulle !" });
    }
    const [[BI1]] = await db.query(`SELECT * FROM BI_2 WHERE id=?`, [id]);
    if (isNullOrEmpty(BI1)) {
      res
        .status(400)
        .send({ message: "Aucune ressource ne correspond a l'id fournit !" });
    }
    res.status(200).send(BI1);
  } catch (error) {
    console.log(error);
    res.status(500).send({
      message: error.message,
      code: error.code,
      requette: error.sql,
    });
  }
};
const getBI2ByBI_1 = async (req, res, next) => {
  const { id } = req.params;
  try {
    if (isNullOrEmpty(id)) {
      res.status(400).send({ message: "La valeur de l'id est nulle !" });
    }
    const [BI2] = await db.query(`SELECT * FROM BI_2 WHERE id_BI_1=?`, [id]);
    if (BI2.length === 0) {
      res
        .status(400)
        .send({ message: "Aucune ressource ne correspond a l'id fournit !" });
    }
    res.status(200).send(BI2);
  } catch (error) {
    console.log(error);
    res.status(500).send({
      message: error.message,
      code: error.code,
      requette: error.sql,
    });
  }
};
/** Fin */

/** Fonctions liées au BI3 */

const createBI3 = async (req, res, next) => {
  const { id_BI_2, options } = req.body;
  try {
    const Query = `INSERT INTO BI_3(id_BI_2,options) VALUES(?,?)`;
    if (isNullOrEmpty(id_BI_2)) {
      res.status(400).send({ message: "La valeur de l'id est nulle !" });
    }
    const [resultat] = await db.query(Query, [id_BI_2, options]);
    if (resultat.affectedRows > 0) {
      res.status(201).send({ message: "BI_3 ajouter avec succès !" });
    }
  } catch (error) {
    console.log(error);
    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      res.status(400).send({
        message:
          "Violation de la contrainte de clé étrangère pour l'id du BI_2",
      });
    }
    res.status(500).send({
      message: error.message,
      code: error.code,
      requette: error.sql,
    });
  }
};

const updateBI3 = async (req, res, next) => {
  const { id_BI_2, options } = req.body;
  const { id } = req.params;
  try {
    const Query = `UPDATE BI_3 SET id_BI_2=?,options=? WHERE id=?`;
    if (isNullOrEmpty(id)) {
      res.status(400).send({ message: "La valeur de l'id est nulle !" });
    }
    const [[BI3]] = await db.query(`SELECT * FROM BI_3 WHERE id=?`, [id]);
    if (isNullOrEmpty(BI3)) {
      res.status(400).send({ message: "Aucune entrée correspond avec cet id" });
    }
    const [resultat] = await db.query(Query, [
      isNullOrEmpty(id_BI_2) ? BI3.id_BI_2 : id_BI_2,
      isNullOrEmpty(options) ? BI3.options : options,
      id,
    ]);
    if (resultat.affectedRows > 0) {
      res.status(201).send({ message: "Mise a jour ok" });
    }
  } catch (error) {
    console.log(error);
    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      res.status(400).send({
        message:
          "Violation de la contrainte de clé étrangère pour l'id du BI_2",
      });
    }
    res.status(500).send({
      message: error.message,
      code: error.code,
      requette: error.sql,
    });
  }
};

const deleteBI3 = async (req, res, next) => {
  const { id } = req.params;
  await db.query("START TRANSACTION");
  try {
    if (isNullOrEmpty(id)) {
      res.status(400).send({ message: "La valeur de l'id est nulle !" });
    }
    console.log("id");
    console.log(id);

    await db.query(
      `
      DELETE BI_4 FROM BI_4 WHERE BI_4.id_BI_3 =?;
    `,
      [id],
    );

    const [resultat] = await db.query(`DELETE FROM BI_3 WHERE id=?`, [id]);
    if (resultat.affectedRows === 0) {
      await db.query("ROLLBACK");
      res
        .status(400)
        .send({ message: "Aucune ressource ne correspond a l'id fournit !" });
    } else {
      await db.query("COMMIT");
      res.status(200).send({ message: "Suppression ok !" });
    }
  } catch (error) {
    console.log(error);
    await db.query("ROLLBACK");
    res.status(500).send({
      message: error.message,
      code: error.code,
      requette: error.sql,
    });
  }
};

const getBI3ById = async (req, res, next) => {
  const { id } = req.params;
  try {
    if (isNullOrEmpty(id)) {
      res.status(400).send({ message: "La valeur de l'id est nulle !" });
    }
    const [[BI1]] = await db.query(`SELECT * FROM BI_3 WHERE id=?`, [id]);
    if (isNullOrEmpty(BI1)) {
      res
        .status(400)
        .send({ message: "Aucune ressource ne correspond a l'id fournit !" });
    }
    res.status(200).send(BI1);
  } catch (error) {
    console.log(error);
    res.status(500).send({
      message: error.message,
      code: error.code,
      requette: error.sql,
    });
  }
};
const getBI3ByBI_2 = async (req, res, next) => {
  const { id } = req.params;
  try {
    if (isNullOrEmpty(id)) {
      res.status(400).send({ message: "La valeur de l'id est nulle !" });
    }
    const [BI3] = await db.query(`SELECT * FROM BI_3 WHERE id_BI_2=?`, [id]);
    if (BI3.length === 0) {
      res
        .status(400)
        .send({ message: "Aucune ressource ne correspond a l'id fournit !" });
    }
    res.status(200).send(BI3);
  } catch (error) {
    console.log(error);
    res.status(500).send({
      message: error.message,
      code: error.code,
      requette: error.sql,
    });
  }
};
/** Fin */

/** Fonctions liées au BI4 */

const createBI4 = async (req, res, next) => {
  const { id_BI_3, options } = req.body;
  try {
    const Query = `INSERT INTO BI_4(id_BI_3,options) VALUES(?,?)`;
    if (isNullOrEmpty(id_BI_3)) {
      res.status(400).send({ message: "La valeur de l'id est nulle !" });
    }
    const [resultat] = await db.query(Query, [id_BI_3, options]);
    if (resultat.affectedRows > 0) {
      res.status(201).send({ message: "BI_4 ajouter avec succès !" });
    }
  } catch (error) {
    console.log(error);
    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      res.status(400).send({
        message:
          "Violation de la contrainte de clé étrangère pour l'id du BI_3",
      });
    }
    res.status(500).send({
      message: error.message,
      code: error.code,
      requette: error.sql,
    });
  }
};

const updateBI4 = async (req, res, next) => {
  const { id_BI_3, options } = req.body;
  const { id } = req.params;
  try {
    const Query = `UPDATE BI_4 SET id_BI_3=?,options=? WHERE id=?`;
    if (isNullOrEmpty(id)) {
      res.status(400).send({ message: "La valeur de l'id est nulle !" });
    }
    const [[BI4]] = await db.query(`SELECT * FROM BI_4 WHERE id=?`, [id]);
    if (isNullOrEmpty(BI4)) {
      res.status(400).send({ message: "Aucune entrée correspond avec cet id" });
    }
    const [resultat] = await db.query(Query, [
      isNullOrEmpty(id_BI_3) ? BI4.id_BI_3 : id_BI_3,
      isNullOrEmpty(options) ? BI4.options : options,
      id,
    ]);
    if (resultat.affectedRows > 0) {
      res.status(201).send({ message: "Mise a jour ok" });
    }
  } catch (error) {
    console.log(error);
    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      res.status(400).send({
        message:
          "Violation de la contrainte de clé étrangère pour l'id du BI_3",
      });
    }
    res.status(500).send({
      message: error.message,
      code: error.code,
      requette: error.sql,
    });
  }
};

const deleteBI4 = async (req, res, next) => {
  const { id } = req.params;
  try {
    if (isNullOrEmpty(id)) {
      res.status(400).send({ message: "La valeur de l'id est nulle !" });
    }
    const [resultat] = await db.query(`DELETE FROM BI_4 WHERE id=?`, [id]);
    if (resultat.affectedRows === 0) {
      res
        .status(400)
        .send({ message: "Aucune ressource ne correspond a l'id fournit !" });
    }
    res.status(200).send({ message: "Suppression ok !" });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      message: error.message,
      code: error.code,
      requette: error.sql,
    });
  }
};

const getBI4ById = async (req, res, next) => {
  const { id } = req.params;
  try {
    if (isNullOrEmpty(id)) {
      res.status(400).send({ message: "La valeur de l'id est nulle !" });
    }
    const [[BI1]] = await db.query(`SELECT * FROM BI_4 WHERE id=?`, [id]);
    if (isNullOrEmpty(BI1)) {
      res
        .status(400)
        .send({ message: "Aucune ressource ne correspond a l'id fournit !" });
    }
    res.status(200).send(BI1);
  } catch (error) {
    console.log(error);
    res.status(500).send({
      message: error.message,
      code: error.code,
      requette: error.sql,
    });
  }
};
const getBI4ByBI_3 = async (req, res, next) => {
  const { id } = req.params;
  try {
    if (isNullOrEmpty(id)) {
      res.status(400).send({ message: "La valeur de l'id est nulle !" });
    }
    const [BI4] = await db.query(`SELECT * FROM BI_4 WHERE id_BI_3=?`, [id]);
    if (BI4.length === 0) {
      res
        .status(400)
        .send({ message: "Aucune ressource ne correspond a l'id fournit !" });
    }
    res.status(200).send(BI4);
  } catch (error) {
    console.log(error);
    res.status(500).send({
      message: error.message,
      code: error.code,
      requette: error.sql,
    });
  }
};
/** Fin */

/** Fonctions utiliser pour factoriser certaines operations */

//Fonction de calcul du poids des sous categories, du score sur vingt et en pourcent des erreurs
async function calculPoidsScore() {
  try {
    //Calcul du poids des sous categories
    await db.query(`
      UPDATE SOUS_CATEGORIES_ERREURS sc
      JOIN(
            SELECT
                e.id_Sous_Categories_Erreurs AS id_sc,
                e.id_Categories_Erreurs AS id_cat,
                CAST((100 *COUNT(*)) AS DECIMAL(30,12))
                /CAST((SUM(COUNT(*)) OVER (PARTITION BY e.id_Categories_Erreurs)) AS DECIMAL(30,12)) AS poids
            FROM ERREURS e
            GROUP BY e.id_Sous_Categories_Erreurs, e.id_Categories_Erreurs
      ) x ON x.id_sc=sc.id
      SET sc.poids=x.poids
      `);

    //Calcul du poids des erreurs
    await db.query(`
      UPDATE ERREURS e
      JOIN(
            SELECT
                id_Sous_Categories_Erreurs,
                sc.poids / COUNT(*) AS poidsErreurs
            FROM ERREURS 
            JOIN SOUS_CATEGORIES_ERREURS sc ON sc.id = id_Sous_Categories_Erreurs
            GROUP BY id_Sous_Categories_Erreurs
      ) x ON x.id_Sous_Categories_Erreurs=e.id_Sous_Categories_Erreurs
      SET e.poids_items=x.poidsErreurs
      `);
    //Calcul du score en pourcent et sur vingt des erreurs
    await db.query(`
      UPDATE ERREURS e
      JOIN CATEGORIES_ERREURS cat ON cat.id = id_Categories_Erreurs
      SET 
        e.score_en_pourcent=(e.poids_items*cat.poids) / 100,
        e.score_sur_vingt=(((e.poids_items*cat.poids) / 100)/100) * 20
      `);
    await db.query("COMMIT");
  } catch (error) {
    console.log(error);
    await db.query("ROLLBACK");
    throw error;
  }
}

//Fonction de mise a jour du calendrier en fonction de la politique de fermeture definit dans calendars policies
async function updateCalendrierPerPolicie(calendar_policie) {
  console.log("testttttttttt");
  console.log(calendar_policie);
  const mois_courant_et_posterieurs_query = `UPDATE CALENDARS c
            JOIN CALENDARS_POLICIES cp ON cp.id_Site=c.id_Site
             SET c.etat=
             CASE 
              WHEN MONTH(CURDATE())<=6 THEN
                CASE 
                  WHEN c.numero < MONTH(CURDATE()) THEN 0
                  WHEN c.numero>6 THEN 0
                  WHEN c.numero BETWEEN MONTH(CURDATE()) AND 6 THEN 1
                END
              ELSE
                CASE
                  WHEN c.numero < MONTH(CURDATE()) THEN 0
                  WHEN c.numero<=6 THEN 0
                  WHEN c.numero BETWEEN MONTH(CURDATE()) AND 12 THEN 1
                END
             END
            WHERE c.id_Site=?`;

  const mois_courant_query = `UPDATE CALENDARS c
            SET c.etat=IF(MONTH(CURDATE()) = c.numero, 1, 0)
            WHERE c.id_Site=?`;

  const tous_les_mois_query = `UPDATE CALENDARS
             SET etat=1
            WHERE id_Site=?`;

  if (calendar_policie.mois_courant_et_posterieurs === 1) {
    const result = await db.query(mois_courant_et_posterieurs_query, [
      calendar_policie.id_Site,
    ]);
    console.log("result");
    console.log(result);
  }
  if (calendar_policie.mois_courant === 1) {
    const result1 = await db.query(mois_courant_query, [
      calendar_policie.id_Site,
    ]);
    console.log("result1");
    console.log(result1);
  }
  if (calendar_policie.tous_les_mois === 1) {
    const result2 = await db.query(tous_les_mois_query, [
      calendar_policie.id_Site,
    ]);
    console.log("result2");
    console.log(result2);
  }
}
//Fonction de mise a jour de l'annee du calendrier
async function updateAnneeCalendrier() {
  await db.query(`UPDATE CALENDARS SET annee=YEAR(CURDATE())`);
}

//Fonction de generer un calendrier

function genererCalendrier(date_debut, date_fin, id_Site) {
  const debut = new Date(date_debut);
  const fin = new Date(date_fin);
  const formatter = new Intl.DateTimeFormat("fr-FR", { month: "long" });
  const resultat = [];
  let mois = debut.getMonth();
  let annee = debut.getFullYear();
  console.log(typeof annee);
  console.log(typeof fin.getFullYear());
  if (fin < debut) {
    throw new Error("La date de debut est posterieure a la date de fin !");
  }

  if (debut.getFullYear() !== fin.getFullYear()) {
    throw new Error("L'année de début doit être la même que l'année de fin !");
  }
  while (annee === fin.getFullYear() && mois <= fin.getMonth()) {
    const dateTmp = new Date(annee, mois, 1);
    resultat.push({
      id_Site,
      numero: mois + 1,
      mois: formatter.format(dateTmp),
      annee,
    });

    mois++;
    if (mois > 11) {
      mois = 0;
      annee++;
    }
  }

  return resultat;
}

/** Fin */
module.exports = {
  createEvaluation,
  getAgentByUsername,
  createCategoriesErreurs,
  createSousCategoriesErreurs,
  createErreurs,
  updateEvaluationsResultats,
  createSupplementaire,
  updateSupplementairesResultats,
  createCalendars,
  createCalendarsPolicies,
  updateCalendars,
  afficherCalendarsBySite,
  afficherCalendars,
  afficherCalendarsPolicies,
  actualiserCalendars,
  updateCalendarsPolicies,
  deleteCalendarsBySite,
  deleteCalendarsPolicies,
  deleteSupplementaires,
  deleteEvaluations,
  updateCategoriesErreurs,
  updateSousCategoriesErreurs,
  deleteSousCategoriesErreurs,
  deleteCategoriesErreurs,
  deleteErreurs,
  updateErreurs,
  getAllCategoriesErreurs,
  getCategoriesErreursByGrilleId,
  getCategoriesErreursById,
  getAllSousCategoriesErreurs,
  getSousCategoriesErreursByCategorieId,
  getSousCategoriesErreursById,
  getAllErreurs,
  getErreursByCategorie,
  getErreursByGrille,
  getErreursById,
  getAllEvaluationsResultatsByEvaluationsAndCategorie,
  getAllSupplementairesResultatsByEvaluationsAndCategorie,
  getAllEvaluations,
  getAllEvaluationsTerminer,
  getEvaluationsById,
  getAllSupplementaires,
  getAllSupplementairesEnCours,
  getAllSupplementairesTerminer,
  getSupplementaireCountByEvaluation,
  getAllSupplementairesByEvaluations,
  getSupplementairesById,
  updateSupplementaires,
  updateEvaluations,
  terminerEvaluations,
  getAllScoresByIdEvaluations,
  getAllScoresByIdSupplementaires,
  createBusinessIntelligence,
  updateBusinessIntelligence,
  deleteBusinessIntelligence,
  getAllBusinessIntelligence,
  getBusinessIntelligenceByGrille,
  getBusinessIntelligenceById,
  getBusinessIntelligenceBySite,
  createBI1,
  updateBI1,
  deleteBI1,
  getBI1ByBusinessIntelligence,
  getBI1ById,
  createBI2,
  updateBI2,
  deleteBI2,
  getBI2ByBI_1,
  getBI2ById,
  createBI3,
  updateBI3,
  deleteBI3,
  getBI3ByBI_2,
  getBI3ById,
  createBI4,
  updateBI4,
  deleteBI4,
  getBI4ByBI_3,
  getBI4ById,
  getAllBI,
  getAllBIByGrille,
};
