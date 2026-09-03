const db = require("../../config/db");
const isNullOrEmpty = require("../../utils/isNullOrEmpty");

/** Fonctions liées aux contextes d'évaluation */

const createContexte = async (req, res, next) => {
  const { nom, description } = req.body;
  try {
    if (isNullOrEmpty(nom)) {
      return res
        .status(400)
        .send({ message: "Le nom du contexte est obligatoire" });
    }
    const [resultat] = await db.query(
      `INSERT INTO CONTEXTES (nom, description, etat, date_creation)
       VALUES (?,?,?,NOW())`,
      [nom.trim(), description || null, "ACTIF"],
    );
    return res.status(201).send({
      message: "Le contexte a été bien enregistré",
      id: resultat.insertId,
    });
  } catch (error) {
    console.log(error);
    if (error.code === "ER_DUP_ENTRY") {
      return res
        .status(409)
        .send({ message: "Un contexte avec ce nom existe déjà" });
    }
    return res
      .status(500)
      .send({ message: error.message, code: error.code, requette: error.sql });
  }
};

const getAllContextes = async (req, res, next) => {
  try {
    const [contextes] = await db.query(
      `SELECT * FROM CONTEXTES ORDER BY nom ASC`,
    );
    return res.status(200).send({ data: contextes });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .send({ message: error.message, code: error.code, requette: error.sql });
  }
};

const getAllContextesActifs = async (req, res, next) => {
  try {
    const [contextes] = await db.query(
      `SELECT * FROM CONTEXTES WHERE etat='ACTIF' ORDER BY nom ASC`,
    );
    return res.status(200).send({ data: contextes });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .send({ message: error.message, code: error.code, requette: error.sql });
  }
};

const getContexteById = async (req, res, next) => {
  const { id } = req.params;
  try {
    if (isNullOrEmpty(id)) {
      return res
        .status(400)
        .send({ message: "L'identifiant du contexte est vide" });
    }
    const [[contexte]] = await db.query(`SELECT * FROM CONTEXTES WHERE id=?`, [
      id,
    ]);
    if (!contexte) {
      return res.status(404).send({ message: "Aucun contexte trouvé" });
    }
    return res.status(200).send(contexte);
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .send({ message: error.message, code: error.code, requette: error.sql });
  }
};

const updateContexte = async (req, res, next) => {
  const { id } = req.params;
  const { nom, description, etat } = req.body;
  try {
    if (isNullOrEmpty(id)) {
      return res
        .status(400)
        .send({ message: "L'identifiant du contexte est vide" });
    }
    if (isNullOrEmpty(nom)) {
      return res
        .status(400)
        .send({ message: "Le nom du contexte est obligatoire" });
    }
    const [resultat] = await db.query(
      `UPDATE CONTEXTES
       SET nom=?, description=?, etat=?, date_modification=NOW()
       WHERE id=?`,
      [nom.trim(), description || null, etat || "ACTIF", id],
    );
    if (resultat.affectedRows > 0) {
      return res.status(200).send({ message: "Mise a jour ok !" });
    }
    return res.status(410).send({
      message: "La ressource que vous essayez de modifier, n'existe plus!",
    });
  } catch (error) {
    console.log(error);
    if (error.code === "ER_DUP_ENTRY") {
      return res
        .status(409)
        .send({ message: "Un contexte avec ce nom existe déjà" });
    }
    return res
      .status(500)
      .send({ message: error.message, code: error.code, requette: error.sql });
  }
};

const deleteContexte = async (req, res, next) => {
  const { id } = req.params;
  try {
    if (isNullOrEmpty(id)) {
      return res
        .status(400)
        .send({ message: "L'identifiant du contexte est vide" });
    }
    const [[usage]] = await db.query(
      `SELECT COUNT(*) AS nombre FROM EVALUATIONS WHERE id_Contexte=?`,
      [id],
    );
    if (usage.nombre > 0) {
      return res.status(409).send({
        message: `Ce contexte est utilisé par ${usage.nombre} évaluation(s), il ne peut pas être supprimé. Vous pouvez le désactiver.`,
      });
    }
    const [resultat] = await db.query(`DELETE FROM CONTEXTES WHERE id=?`, [id]);
    if (resultat.affectedRows > 0) {
      return res.status(200).send({ message: "Suppression ok !" });
    }
    return res.status(410).send({
      message: "La ressource que vous essayer de supprimer, n'existe plus!",
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .send({ message: error.message, code: error.code, requette: error.sql });
  }
};

/** Fin */

module.exports = {
  createContexte,
  getAllContextes,
  getAllContextesActifs,
  getContexteById,
  updateContexte,
  deleteContexte,
};
