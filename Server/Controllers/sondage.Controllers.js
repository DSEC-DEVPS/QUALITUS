// =====================================================================
// Controllers SONDAGE (sondages du personnel) - Phase 1 : fondations
// Sondage -> Questions (par page, types varies) -> Options.
// =====================================================================
const db = require("../config/db");
const crypto = require("crypto");
const XLSX = require("xlsx");

const statutSondage = async (idSondage) => {
  const [r] = await db.query("SELECT statut FROM B_SD_SONDAGE WHERE id=?", [idSondage]);
  return r.length ? r[0].statut : null;
};

// Insere les reponses d'une passation (partage entre lien public et obligatoire).
const insererReponses = async (connection, pid, reponses) => {
  for (const r of reponses) {
    if (!r || !r.id_Question) continue;
    if (Array.isArray(r.id_Options)) {
      for (const opt of r.id_Options) {
        await connection.query("INSERT INTO B_SD_REPONSE (id_Passation, id_Question, id_Option) VALUES (?,?,?)", [pid, r.id_Question, opt]);
      }
    } else if (Array.isArray(r.classement)) {
      let i = 0;
      for (const opt of r.classement) {
        await connection.query("INSERT INTO B_SD_REPONSE (id_Passation, id_Question, id_Option, ordre) VALUES (?,?,?,?)", [pid, r.id_Question, opt, i++]);
      }
    } else if (r.valeur_num !== undefined && r.valeur_num !== null && r.valeur_num !== "") {
      await connection.query("INSERT INTO B_SD_REPONSE (id_Passation, id_Question, valeur_num) VALUES (?,?,?)", [pid, r.id_Question, r.valeur_num]);
    } else if (r.valeur_texte !== undefined && r.valeur_texte !== null && r.valeur_texte !== "") {
      await connection.query("INSERT INTO B_SD_REPONSE (id_Passation, id_Question, valeur_texte) VALUES (?,?,?)", [pid, r.id_Question, r.valeur_texte]);
    }
  }
};

const genererToken = () => crypto.randomBytes(16).toString("hex");

// Charge les questions d'un sondage avec leurs options ET leurs conditions.
const chargerQuestionsAvecOptions = async (idSondage) => {
  const [questions] = await db.query(
    `SELECT id, id_Sondage, page, ordre, type, libelle, obligatoire, curseur_min, curseur_max
     FROM B_SD_QUESTION WHERE id_Sondage = ? ORDER BY page, ordre, id`,
    [idSondage]
  );
  const [options] = await db.query(
    `SELECT o.id, o.id_Question, o.libelle, o.ordre FROM B_SD_OPTION o
     JOIN B_SD_QUESTION q ON q.id = o.id_Question WHERE q.id_Sondage = ? ORDER BY o.ordre, o.id`,
    [idSondage]
  );
  const [conds] = await db.query(
    `SELECT c.id, c.id_Question, c.id_Question_source, c.operateur, c.id_Option, c.valeur
     FROM B_SD_CONDITION c JOIN B_SD_QUESTION q ON q.id = c.id_Question WHERE q.id_Sondage = ?`,
    [idSondage]
  );
  const byQ = {}, condByQ = {};
  for (const o of options) (byQ[o.id_Question] = byQ[o.id_Question] || []).push(o);
  for (const c of conds) (condByQ[c.id_Question] = condByQ[c.id_Question] || []).push(c);
  for (const q of questions) {
    q.options = byQ[q.id] || [];
    q.conditions = condByQ[q.id] || [];
  }
  return questions;
};

// Enregistre les conditions d'une question (remplace l'existant).
const enregistrerConditions = async (connection, idQuestion, conditions) => {
  await connection.query("DELETE FROM B_SD_CONDITION WHERE id_Question=?", [idQuestion]);
  if (!Array.isArray(conditions)) return;
  for (const c of conditions) {
    if (!c || !c.id_Question_source) continue;
    await connection.query(
      "INSERT INTO B_SD_CONDITION (id_Question, id_Question_source, operateur, id_Option, valeur) VALUES (?,?,?,?,?)",
      [idQuestion, c.id_Question_source, c.operateur || "EGAL", c.id_Option ?? null, c.valeur ?? null]
    );
  }
};

const TYPES = ["CHOIX_UNIQUE", "CHOIX_MULTIPLE", "OUVERTE", "CLASSEMENT", "CURSEUR", "INFO"];
// Types qui portent des options (reponses proposees)
const TYPES_AVEC_OPTIONS = ["CHOIX_UNIQUE", "CHOIX_MULTIPLE", "CLASSEMENT"];

const getRole = async (userId) => {
  if (!userId) return null;
  const [r] = await db.query(
    `SELECT f.Role_Associe AS role FROM B_UTILISATEUR u JOIN B_FONCTION f ON u.id_Fonction=f.id WHERE u.id=?`,
    [userId]
  );
  return r.length ? r[0].role : null;
};

// Peut gerer un sondage : admin, ou createur du sondage.
const peutGerer = async (userId, idSondage) => {
  const role = await getRole(userId);
  if (role === "R_ADMI") return true;
  const [r] = await db.query(`SELECT id_createur FROM B_SD_SONDAGE WHERE id=?`, [idSondage]);
  if (!r.length) return true; // laisse le handler renvoyer 404
  return r[0].id_createur === userId;
};

/* ------------------------------------------------------------------ */
/* SONDAGE                                                            */
/* ------------------------------------------------------------------ */
const getAllSondage = async (req, res) => {
  const userId = req.auth ? req.auth.userId : null;
  try {
    const role = await getRole(userId);
    const restreint = role !== "R_ADMI";
    const [rows] = await db.query(
      `SELECT s.id, s.nom, s.langue, s.statut, s.bouton_retour, s.id_createur,
              s.dateCreation, s.dateModification,
              (SELECT COUNT(*) FROM B_SD_QUESTION q WHERE q.id_Sondage = s.id) AS nb_questions
       FROM B_SD_SONDAGE s
       ${restreint ? "WHERE s.id_createur = ?" : ""}
       ORDER BY s.id DESC`,
      restreint ? [userId] : []
    );
    return res.status(200).send(rows);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

const getOneSondage = async (req, res) => {
  const { id } = req.params;
  const userId = req.auth ? req.auth.userId : null;
  try {
    const [rows] = await db.query(`SELECT * FROM B_SD_SONDAGE WHERE id = ?`, [id]);
    if (!rows.length) return res.status(404).json({ message: "Sondage introuvable" });
    if (!(await peutGerer(userId, id))) {
      return res.status(403).json({ message: "Acces non autorise a ce sondage" });
    }
    const sondage = rows[0];
    sondage.questions = await chargerQuestionsAvecOptions(id);
    return res.status(200).send(sondage);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

const addSondage = async (req, res) => {
  const { nom, langue, statut, bouton_retour } = req.body;
  if (!nom || !String(nom).trim()) {
    return res.status(403).json({ message: "Merci de renseigner le nom du sondage" });
  }
  try {
    const now = new Date();
    const token = genererToken();
    const [r] = await db.query(
      `INSERT INTO B_SD_SONDAGE (nom, token, langue, statut, bouton_retour, id_createur, dateCreation)
       VALUES (?,?,?,?,?,?,?)`,
      [
        String(nom).trim(),
        token,
        langue || "Francais",
        statut || "ENCOURS",
        bouton_retour ? 1 : 0,
        req.auth ? req.auth.userId : null,
        now,
      ]
    );
    return res.status(201).json({ message: "Sondage cree avec succes", id: r.insertId });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

const updateSondage = async (req, res) => {
  const { id } = req.params;
  const { nom, langue, statut, bouton_retour } = req.body;
  if (!nom || !String(nom).trim()) {
    return res.status(403).json({ message: "Merci de renseigner le nom du sondage" });
  }
  try {
    if (!(await peutGerer(req.auth ? req.auth.userId : null, id))) {
      return res.status(403).json({ message: "Acces non autorise a ce sondage" });
    }
    await db.query(
      `UPDATE B_SD_SONDAGE SET nom=?, langue=?, statut=?, bouton_retour=?, dateModification=? WHERE id=?`,
      [String(nom).trim(), langue || "Francais", statut || "ENCOURS", bouton_retour ? 1 : 0, new Date(), id]
    );
    return res.status(200).json({ message: "Sondage modifie" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

const changerStatut = async (req, res) => {
  const { id } = req.params;
  const { statut } = req.body;
  if (!["ENCOURS", "ACTIF", "DESACTIF"].includes(statut)) {
    return res.status(403).json({ message: "Statut invalide" });
  }
  try {
    if (!(await peutGerer(req.auth ? req.auth.userId : null, id))) {
      return res.status(403).json({ message: "Acces non autorise a ce sondage" });
    }
    await db.query(`UPDATE B_SD_SONDAGE SET statut=?, dateModification=? WHERE id=?`, [
      statut,
      new Date(),
      id,
    ]);
    return res.status(200).json({ message: "Statut mis a jour" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

const deleteSondage = async (req, res) => {
  const { id } = req.params;
  try {
    if (!(await peutGerer(req.auth ? req.auth.userId : null, id))) {
      return res.status(403).json({ message: "Acces non autorise a ce sondage" });
    }
    await db.query(`DELETE FROM B_SD_SONDAGE WHERE id=?`, [id]); // cascade questions + options
    return res.status(200).json({ message: "Sondage supprime" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

// Duplique un sondage (entete + questions + options) ; statut remis a ENCOURS.
const dupliquerSondage = async (req, res) => {
  const { id } = req.params;
  const userId = req.auth ? req.auth.userId : null;
  const connection = await db.getConnection();
  try {
    const [rows] = await connection.query(`SELECT * FROM B_SD_SONDAGE WHERE id=?`, [id]);
    if (!rows.length) {
      connection.release();
      return res.status(404).json({ message: "Sondage introuvable" });
    }
    if (!(await peutGerer(userId, id))) {
      connection.release();
      return res.status(403).json({ message: "Acces non autorise a ce sondage" });
    }
    const s = rows[0];
    await connection.beginTransaction();
    const now = new Date();
    const [ins] = await connection.query(
      `INSERT INTO B_SD_SONDAGE (nom, langue, statut, bouton_retour, id_createur, dateCreation)
       VALUES (?,?,?,?,?,?)`,
      [`${s.nom} (copie)`, s.langue, "ENCOURS", s.bouton_retour, userId, now]
    );
    const nouveauId = ins.insertId;
    const [questions] = await connection.query(`SELECT * FROM B_SD_QUESTION WHERE id_Sondage=?`, [id]);
    for (const q of questions) {
      const [qi] = await connection.query(
        `INSERT INTO B_SD_QUESTION (id_Sondage, page, ordre, type, libelle, obligatoire, curseur_min, curseur_max, dateCreation)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [nouveauId, q.page, q.ordre, q.type, q.libelle, q.obligatoire, q.curseur_min, q.curseur_max, now]
      );
      const [opts] = await connection.query(`SELECT * FROM B_SD_OPTION WHERE id_Question=?`, [q.id]);
      for (const o of opts) {
        await connection.query(
          `INSERT INTO B_SD_OPTION (id_Question, libelle, ordre) VALUES (?,?,?)`,
          [qi.insertId, o.libelle, o.ordre]
        );
      }
    }
    await connection.commit();
    return res.status(201).json({ message: "Sondage duplique", id: nouveauId });
  } catch (error) {
    try { await connection.rollback(); } catch (e) {}
    console.log(error);
    res.status(500).json({ message: "Error request" });
  } finally {
    connection.release();
  }
};

/* ------------------------------------------------------------------ */
/* QUESTIONS (+ options)                                              */
/* ------------------------------------------------------------------ */
const addQuestion = async (req, res) => {
  const { id_Sondage, page, ordre, type, libelle, obligatoire, curseur_min, curseur_max, options } =
    req.body;
  if (!id_Sondage || !type || !libelle || !String(libelle).trim()) {
    return res.status(403).json({ message: "Merci de renseigner le type et le libelle" });
  }
  if (!TYPES.includes(type)) {
    return res.status(403).json({ message: "Type de question invalide" });
  }
  const connection = await db.getConnection();
  try {
    if (!(await peutGerer(req.auth ? req.auth.userId : null, id_Sondage))) {
      connection.release();
      return res.status(403).json({ message: "Acces non autorise a ce sondage" });
    }
    await connection.beginTransaction();
    const [r] = await connection.query(
      `INSERT INTO B_SD_QUESTION (id_Sondage, page, ordre, type, libelle, obligatoire, curseur_min, curseur_max, dateCreation)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [
        id_Sondage,
        page || 1,
        ordre || 0,
        type,
        String(libelle).trim(),
        obligatoire ? 1 : 0,
        type === "CURSEUR" ? (curseur_min ?? 1) : null,
        type === "CURSEUR" ? (curseur_max ?? 10) : null,
        new Date(),
      ]
    );
    if (TYPES_AVEC_OPTIONS.includes(type) && Array.isArray(options)) {
      let i = 0;
      for (const o of options) {
        const lib = (o && (o.libelle ?? o)) || "";
        if (!String(lib).trim()) continue;
        await connection.query(
          `INSERT INTO B_SD_OPTION (id_Question, libelle, ordre) VALUES (?,?,?)`,
          [r.insertId, String(lib).trim(), i++]
        );
      }
    }
    await enregistrerConditions(connection, r.insertId, req.body.conditions);
    await connection.commit();
    return res.status(201).json({ message: "Question ajoutee", id: r.insertId });
  } catch (error) {
    try { await connection.rollback(); } catch (e) {}
    console.log(error);
    res.status(500).json({ message: "Error request" });
  } finally {
    connection.release();
  }
};

const updateQuestion = async (req, res) => {
  const { id } = req.params;
  const { page, ordre, type, libelle, obligatoire, curseur_min, curseur_max, options } = req.body;
  if (!type || !libelle || !String(libelle).trim()) {
    return res.status(403).json({ message: "Merci de renseigner le type et le libelle" });
  }
  if (!TYPES.includes(type)) {
    return res.status(403).json({ message: "Type de question invalide" });
  }
  const connection = await db.getConnection();
  try {
    const [qr] = await connection.query(`SELECT id_Sondage FROM B_SD_QUESTION WHERE id=?`, [id]);
    if (!qr.length) {
      connection.release();
      return res.status(404).json({ message: "Question introuvable" });
    }
    if (!(await peutGerer(req.auth ? req.auth.userId : null, qr[0].id_Sondage))) {
      connection.release();
      return res.status(403).json({ message: "Acces non autorise a ce sondage" });
    }
    await connection.beginTransaction();
    await connection.query(
      `UPDATE B_SD_QUESTION SET page=?, ordre=?, type=?, libelle=?, obligatoire=?, curseur_min=?, curseur_max=? WHERE id=?`,
      [
        page || 1,
        ordre || 0,
        type,
        String(libelle).trim(),
        obligatoire ? 1 : 0,
        type === "CURSEUR" ? (curseur_min ?? 1) : null,
        type === "CURSEUR" ? (curseur_max ?? 10) : null,
        id,
      ]
    );
    // Remplace l'ensemble des options
    await connection.query(`DELETE FROM B_SD_OPTION WHERE id_Question=?`, [id]);
    if (TYPES_AVEC_OPTIONS.includes(type) && Array.isArray(options)) {
      let i = 0;
      for (const o of options) {
        const lib = (o && (o.libelle ?? o)) || "";
        if (!String(lib).trim()) continue;
        await connection.query(
          `INSERT INTO B_SD_OPTION (id_Question, libelle, ordre) VALUES (?,?,?)`,
          [id, String(lib).trim(), i++]
        );
      }
    }
    await enregistrerConditions(connection, id, req.body.conditions);
    await connection.commit();
    return res.status(200).json({ message: "Question modifiee" });
  } catch (error) {
    try { await connection.rollback(); } catch (e) {}
    console.log(error);
    res.status(500).json({ message: "Error request" });
  } finally {
    connection.release();
  }
};

const deleteQuestion = async (req, res) => {
  const { id } = req.params;
  try {
    const [qr] = await db.query(`SELECT id_Sondage FROM B_SD_QUESTION WHERE id=?`, [id]);
    if (!qr.length) return res.status(404).json({ message: "Question introuvable" });
    if (!(await peutGerer(req.auth ? req.auth.userId : null, qr[0].id_Sondage))) {
      return res.status(403).json({ message: "Acces non autorise a ce sondage" });
    }
    await db.query(`DELETE FROM B_SD_QUESTION WHERE id=?`, [id]); // cascade options
    return res.status(200).json({ message: "Question supprimee" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

// ============ Passation par lien public (token) ============
const getSondagePublic = async (req, res) => {
  const { token } = req.params;
  try {
    const [rows] = await db.query(
      "SELECT id, nom, langue, statut, bouton_retour FROM B_SD_SONDAGE WHERE token=?",
      [token]
    );
    if (!rows.length) return res.status(200).json({ etat: "INTROUVABLE" });
    if (rows[0].statut !== "ACTIF") {
      return res.status(200).json({ etat: "INDISPONIBLE", nom: rows[0].nom });
    }
    const sondage = rows[0];
    sondage.questions = await chargerQuestionsAvecOptions(sondage.id);
    return res.status(200).json({ etat: "OK", sondage });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

const soumettreSondagePublic = async (req, res) => {
  const { token } = req.params;
  const { reponses } = req.body;
  if (!Array.isArray(reponses)) return res.status(403).json({ message: "Reponses invalides" });
  const connection = await db.getConnection();
  try {
    const [s] = await connection.query("SELECT id, statut FROM B_SD_SONDAGE WHERE token=?", [token]);
    if (!s.length) {
      connection.release();
      return res.status(404).json({ message: "Sondage introuvable" });
    }
    if (s[0].statut !== "ACTIF") {
      connection.release();
      return res.status(403).json({ message: "Sondage indisponible" });
    }
    const userId = req.auth ? req.auth.userId : null;
    const now = new Date();
    await connection.beginTransaction();
    const [p] = await connection.query(
      "INSERT INTO B_SD_PASSATION (id_Sondage, id_UTILISATEUR, date_debut, date_fin, termine) VALUES (?,?,?,?,1)",
      [s[0].id, userId, now, now]
    );
    const pid = p.insertId;
    for (const r of reponses) {
      if (!r || !r.id_Question) continue;
      if (Array.isArray(r.id_Options)) {
        for (const opt of r.id_Options) {
          await connection.query(
            "INSERT INTO B_SD_REPONSE (id_Passation, id_Question, id_Option) VALUES (?,?,?)",
            [pid, r.id_Question, opt]
          );
        }
      } else if (Array.isArray(r.classement)) {
        let i = 0;
        for (const opt of r.classement) {
          await connection.query(
            "INSERT INTO B_SD_REPONSE (id_Passation, id_Question, id_Option, ordre) VALUES (?,?,?,?)",
            [pid, r.id_Question, opt, i++]
          );
        }
      } else if (r.valeur_num !== undefined && r.valeur_num !== null && r.valeur_num !== "") {
        await connection.query(
          "INSERT INTO B_SD_REPONSE (id_Passation, id_Question, valeur_num) VALUES (?,?,?)",
          [pid, r.id_Question, r.valeur_num]
        );
      } else if (r.valeur_texte !== undefined && r.valeur_texte !== null && r.valeur_texte !== "") {
        await connection.query(
          "INSERT INTO B_SD_REPONSE (id_Passation, id_Question, valeur_texte) VALUES (?,?,?)",
          [pid, r.id_Question, r.valeur_texte]
        );
      }
    }
    await connection.commit();
    return res.status(201).json({ message: "Merci, vos reponses ont ete enregistrees", id: pid });
  } catch (error) {
    try { await connection.rollback(); } catch (e) {}
    console.log(error);
    res.status(500).json({ message: "Error request" });
  } finally {
    connection.release();
  }
};

// ============ Phase 3 : cible & diffusion ============
// Recherche d'utilisateurs internes (annuaire) avec filtres avances.
const rechercherUtilisateurs = async (req, res) => {
  try {
    const { sites, fonctions, anciennete_min } = req.query;
    const toIds = (v) => String(v || "").split(",").map((x) => parseInt(x, 10)).filter((n) => !isNaN(n));
    const sIds = toIds(sites), fIds = toIds(fonctions);
    const where = ["(u.status IS NULL OR u.status <> 'INACTIF')"];
    const params = [];
    if (sIds.length) { where.push("u.id_Site IN (" + sIds.map(() => "?").join(",") + ")"); params.push(...sIds); }
    if (fIds.length) { where.push("u.id_Fonction IN (" + fIds.map(() => "?").join(",") + ")"); params.push(...fIds); }
    if (anciennete_min && !isNaN(parseInt(anciennete_min, 10))) {
      where.push("TIMESTAMPDIFF(MONTH, u.dateCreation, NOW()) >= ?");
      params.push(parseInt(anciennete_min, 10));
    }
    const [rows] = await db.query(
      `SELECT u.id, u.nom, u.prenom, u.email, u.telephone, u.id_Site, u.id_Fonction,
              st.nom AS site, f.nom AS fonction,
              TIMESTAMPDIFF(MONTH, u.dateCreation, NOW()) AS anciennete_mois
       FROM B_UTILISATEUR u
       LEFT JOIN B_SITE st ON st.id = u.id_Site
       LEFT JOIN B_FONCTION f ON f.id = u.id_Fonction
       WHERE ${where.join(" AND ")}
       ORDER BY u.nom, u.prenom`,
      params
    );
    return res.status(200).send(rows);
  } catch (error) { console.log(error); res.status(500).json({ message: "Error request" }); }
};

const getCibles = async (req, res) => {
  const { id } = req.params;
  try {
    if (!(await peutGerer(req.auth ? req.auth.userId : null, id))) {
      return res.status(403).json({ message: "Acces non autorise a ce sondage" });
    }
    const [rows] = await db.query(
      "SELECT id, id_Sondage, id_UTILISATEUR, nom, prenom, email, telephone, date_envoi_email, date_envoi_sms FROM B_SD_CIBLE WHERE id_Sondage=? ORDER BY nom, prenom",
      [id]
    );
    return res.status(200).send(rows);
  } catch (error) { console.log(error); res.status(500).json({ message: "Error request" }); }
};

const addCibleUtilisateurs = async (req, res) => {
  const { id } = req.params;
  const { id_utilisateurs } = req.body;
  if (!Array.isArray(id_utilisateurs) || !id_utilisateurs.length) {
    return res.status(403).json({ message: "Aucun utilisateur selectionne" });
  }
  try {
    const userId = req.auth ? req.auth.userId : null;
    if (!(await peutGerer(userId, id))) return res.status(403).json({ message: "Acces non autorise a ce sondage" });
    if ((await statutSondage(id)) === "ACTIF") {
      return res.status(403).json({ message: "Sondage actif : desactivez-le pour modifier la cible." });
    }
    const [ex] = await db.query(
      "SELECT id_UTILISATEUR FROM B_SD_CIBLE WHERE id_Sondage=? AND id_UTILISATEUR IS NOT NULL", [id]
    );
    const deja = new Set(ex.map((x) => x.id_UTILISATEUR));
    const aAjouter = id_utilisateurs.filter((u) => !deja.has(u));
    if (!aAjouter.length) return res.status(200).json({ message: "Deja dans la cible", nb: 0 });
    const [users] = await db.query(
      "SELECT id, nom, prenom, email, telephone FROM B_UTILISATEUR WHERE id IN (" + aAjouter.map(() => "?").join(",") + ")",
      aAjouter
    );
    const now = new Date();
    for (const u of users) {
      await db.query(
        "INSERT INTO B_SD_CIBLE (id_Sondage, id_UTILISATEUR, nom, prenom, email, telephone, dateCreation) VALUES (?,?,?,?,?,?,?)",
        [id, u.id, u.nom, u.prenom, u.email, u.telephone, now]
      );
    }
    return res.status(201).json({ message: users.length + " destinataire(s) ajoute(s)", nb: users.length });
  } catch (error) { console.log(error); res.status(500).json({ message: "Error request" }); }
};

const importCibles = async (req, res) => {
  const { id } = req.params;
  if (!req.file) return res.status(403).json({ message: "Aucun fichier Excel fourni" });
  try {
    const userId = req.auth ? req.auth.userId : null;
    if (!(await peutGerer(userId, id))) return res.status(403).json({ message: "Acces non autorise a ce sondage" });
    if ((await statutSondage(id)) === "ACTIF") {
      return res.status(403).json({ message: "Sondage actif : desactivez-le pour modifier la cible." });
    }
    let wb;
    try { wb = XLSX.read(req.file.buffer, { type: "buffer" }); } catch (e) {
      return res.status(400).json({ message: "Fichier Excel illisible" });
    }
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });
    const now = new Date();
    let nb = 0;
    for (const r of rows) {
      const nom = String(r.Nom || r.nom || "").trim();
      const prenom = String(r.Prenom || r["Prénom"] || r.prenom || "").trim() || null;
      const email = String(r.Email || r.email || r["E-mail"] || "").trim() || null;
      const tel = String(r.Telephone || r["Téléphone"] || r.telephone || r.Tel || "").trim() || null;
      if (!nom && !email && !tel) continue;
      await db.query(
        "INSERT INTO B_SD_CIBLE (id_Sondage, nom, prenom, email, telephone, dateCreation) VALUES (?,?,?,?,?,?)",
        [id, nom || null, prenom, email, tel, now]
      );
      nb++;
    }
    return res.status(201).json({ message: "Import reussi : " + nb + " destinataire(s)", nb });
  } catch (error) { console.log(error); res.status(500).json({ message: "Echec de l'import Excel" }); }
};

const deleteCible = async (req, res) => {
  const { cibleId } = req.params;
  try {
    const [r] = await db.query("SELECT id_Sondage FROM B_SD_CIBLE WHERE id=?", [cibleId]);
    if (!r.length) return res.status(404).json({ message: "Introuvable" });
    const userId = req.auth ? req.auth.userId : null;
    if (!(await peutGerer(userId, r[0].id_Sondage))) return res.status(403).json({ message: "Acces non autorise" });
    if ((await statutSondage(r[0].id_Sondage)) === "ACTIF") {
      return res.status(403).json({ message: "Sondage actif : desactivez-le pour modifier la cible." });
    }
    await db.query("DELETE FROM B_SD_CIBLE WHERE id=?", [cibleId]);
    return res.status(200).json({ message: "Destinataire retire" });
  } catch (error) { console.log(error); res.status(500).json({ message: "Error request" }); }
};

// Diffuse le lien du sondage a la cible par email et/ou SMS.
// NB : envoi reel (SMTP / passerelle SMS) a brancher ; ici on trace la diffusion.
const diffuser = async (req, res) => {
  const { id } = req.params;
  const canaux = Array.isArray(req.body && req.body.canaux) ? req.body.canaux : [];
  try {
    const userId = req.auth ? req.auth.userId : null;
    if (!(await peutGerer(userId, id))) return res.status(403).json({ message: "Acces non autorise a ce sondage" });
    const [srow] = await db.query("SELECT token, statut FROM B_SD_SONDAGE WHERE id=?", [id]);
    if (!srow.length) return res.status(404).json({ message: "Sondage introuvable" });
    if (srow[0].statut !== "ACTIF") {
      return res.status(403).json({ message: "Activez le sondage avant de diffuser le lien." });
    }
    const [cibles] = await db.query("SELECT id, email, telephone FROM B_SD_CIBLE WHERE id_Sondage=?", [id]);
    if (!cibles.length) return res.status(403).json({ message: "Aucun destinataire dans la cible." });
    const now = new Date();
    let nbEmail = 0, nbSms = 0;
    for (const c of cibles) {
      if (canaux.includes("email") && c.email) { await db.query("UPDATE B_SD_CIBLE SET date_envoi_email=? WHERE id=?", [now, c.id]); nbEmail++; }
      if (canaux.includes("sms") && c.telephone) { await db.query("UPDATE B_SD_CIBLE SET date_envoi_sms=? WHERE id=?", [now, c.id]); nbSms++; }
    }
    return res.status(200).json({
      message: "Diffusion enregistree : " + nbEmail + " email(s), " + nbSms + " SMS",
      nbEmail, nbSms, token: srow[0].token,
    });
  } catch (error) { console.log(error); res.status(500).json({ message: "Error request" }); }
};

// ============ Phase 4 : rapport / analyses par question ============
const getRapport = async (req, res) => {
  const { id } = req.params;
  try {
    if (!(await peutGerer(req.auth ? req.auth.userId : null, id))) {
      return res.status(403).json({ message: "Acces non autorise a ce sondage" });
    }
    const [srow] = await db.query("SELECT id, nom FROM B_SD_SONDAGE WHERE id=?", [id]);
    if (!srow.length) return res.status(404).json({ message: "Sondage introuvable" });
    const [np] = await db.query(
      "SELECT COUNT(*) AS n FROM B_SD_PASSATION WHERE id_Sondage=? AND termine=1",
      [id]
    );
    const nb_passations = np[0].n;
    const [questions] = await db.query(
      "SELECT id, page, ordre, type, libelle, curseur_min, curseur_max FROM B_SD_QUESTION WHERE id_Sondage=? ORDER BY page, ordre, id",
      [id]
    );
    for (const q of questions) {
      if (q.type === "CHOIX_UNIQUE" || q.type === "CHOIX_MULTIPLE") {
        const [opts] = await db.query(
          `SELECT o.id, o.libelle,
                  (SELECT COUNT(*) FROM B_SD_REPONSE r WHERE r.id_Question=o.id_Question AND r.id_Option=o.id) AS nb
           FROM B_SD_OPTION o WHERE o.id_Question=? ORDER BY o.ordre, o.id`,
          [q.id]
        );
        const total = opts.reduce((a, o) => a + o.nb, 0);
        q.resultat = { options: opts, total };
      } else if (q.type === "CLASSEMENT") {
        const [opts] = await db.query(
          `SELECT o.id, o.libelle, COUNT(r.id) AS nb, AVG(r.ordre) AS ordre_moyen
           FROM B_SD_OPTION o
           LEFT JOIN B_SD_REPONSE r ON r.id_Option=o.id AND r.id_Question=o.id_Question
           WHERE o.id_Question=? GROUP BY o.id, o.libelle`,
          [q.id]
        );
        // rang moyen = ordre (0-based) + 1
        for (const o of opts) o.rang_moyen = o.ordre_moyen != null ? Number(o.ordre_moyen) + 1 : null;
        opts.sort((a, b) => (a.rang_moyen ?? 999) - (b.rang_moyen ?? 999));
        q.resultat = { options: opts };
      } else if (q.type === "CURSEUR") {
        const [st] = await db.query(
          "SELECT COUNT(*) AS nb, AVG(valeur_num) AS moyenne, MIN(valeur_num) AS mini, MAX(valeur_num) AS maxi FROM B_SD_REPONSE WHERE id_Question=?",
          [q.id]
        );
        q.resultat = {
          nb: st[0].nb,
          moyenne: st[0].moyenne != null ? Math.round(Number(st[0].moyenne) * 100) / 100 : null,
          mini: st[0].mini,
          maxi: st[0].maxi,
        };
      } else if (q.type === "OUVERTE") {
        const [txts] = await db.query(
          "SELECT valeur_texte FROM B_SD_REPONSE WHERE id_Question=? AND valeur_texte IS NOT NULL AND valeur_texte<>'' ORDER BY id DESC",
          [q.id]
        );
        q.resultat = { reponses: txts.map((t) => t.valeur_texte), nb: txts.length };
      } else {
        q.resultat = null; // INFO
      }
    }
    return res.status(200).json({ id: srow[0].id, nom: srow[0].nom, nb_passations, questions });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

// ============ Sondages OBLIGATOIRES (cible interne, bloquant a la connexion) ============
// Liste des sondages ACTIFS ou l'utilisateur connecte est cible et n'a pas encore repondu.
const getObligatoiresMes = async (req, res) => {
  const userId = req.auth ? req.auth.userId : null;
  if (!userId) return res.status(200).send([]);
  try {
    const [rows] = await db.query(
      `SELECT DISTINCT s.id, s.nom
       FROM B_SD_SONDAGE s
       JOIN B_SD_CIBLE c ON c.id_Sondage = s.id AND c.id_UTILISATEUR = ?
       WHERE s.statut = 'ACTIF'
         AND NOT EXISTS (SELECT 1 FROM B_SD_PASSATION p
                         WHERE p.id_Sondage = s.id AND p.id_UTILISATEUR = ? AND p.termine = 1)
       ORDER BY s.id`,
      [userId, userId]
    );
    return res.status(200).send(rows);
  } catch (error) { console.log(error); res.status(500).json({ message: "Error request" }); }
};

// Structure d'un sondage obligatoire pour l'utilisateur connecte (verifie cible + non fait).
const getSondageObligatoire = async (req, res) => {
  const { id } = req.params;
  const userId = req.auth ? req.auth.userId : null;
  try {
    const [rows] = await db.query("SELECT id, nom, langue, statut, bouton_retour FROM B_SD_SONDAGE WHERE id=?", [id]);
    if (!rows.length) return res.status(200).json({ etat: "INTROUVABLE" });
    if (rows[0].statut !== "ACTIF") return res.status(200).json({ etat: "INDISPONIBLE" });
    const [c] = await db.query("SELECT 1 FROM B_SD_CIBLE WHERE id_Sondage=? AND id_UTILISATEUR=? LIMIT 1", [id, userId]);
    if (!c.length) return res.status(200).json({ etat: "NON_CIBLE" });
    const [pf] = await db.query("SELECT 1 FROM B_SD_PASSATION WHERE id_Sondage=? AND id_UTILISATEUR=? AND termine=1 LIMIT 1", [id, userId]);
    if (pf.length) return res.status(200).json({ etat: "FAIT" });
    const sondage = rows[0];
    sondage.questions = await chargerQuestionsAvecOptions(id);
    return res.status(200).json({ etat: "OK", sondage });
  } catch (error) { console.log(error); res.status(500).json({ message: "Error request" }); }
};

const soumettreSondageObligatoire = async (req, res) => {
  const { id } = req.params;
  const userId = req.auth ? req.auth.userId : null;
  const { reponses } = req.body;
  if (!userId || !Array.isArray(reponses)) return res.status(403).json({ message: "Requete invalide" });
  const connection = await db.getConnection();
  try {
    const [rows] = await connection.query("SELECT statut FROM B_SD_SONDAGE WHERE id=?", [id]);
    if (!rows.length) { connection.release(); return res.status(404).json({ message: "Sondage introuvable" }); }
    if (rows[0].statut !== "ACTIF") { connection.release(); return res.status(403).json({ message: "Sondage indisponible" }); }
    const [c] = await connection.query("SELECT 1 FROM B_SD_CIBLE WHERE id_Sondage=? AND id_UTILISATEUR=? LIMIT 1", [id, userId]);
    if (!c.length) { connection.release(); return res.status(403).json({ message: "Vous n'etes pas cible par ce sondage" }); }
    const [dp] = await connection.query("SELECT 1 FROM B_SD_PASSATION WHERE id_Sondage=? AND id_UTILISATEUR=? AND termine=1 LIMIT 1", [id, userId]);
    if (dp.length) { connection.release(); return res.status(200).json({ message: "Deja repondu" }); }
    const now = new Date();
    await connection.beginTransaction();
    const [p] = await connection.query(
      "INSERT INTO B_SD_PASSATION (id_Sondage, id_UTILISATEUR, date_debut, date_fin, termine) VALUES (?,?,?,?,1)",
      [id, userId, now, now]
    );
    await insererReponses(connection, p.insertId, reponses);
    await connection.commit();
    return res.status(201).json({ message: "Merci, vos reponses ont ete enregistrees", id: p.insertId });
  } catch (error) {
    try { await connection.rollback(); } catch (e) {}
    console.log(error);
    res.status(500).json({ message: "Error request" });
  } finally { connection.release(); }
};

module.exports = {
  getAllSondage,
  getOneSondage,
  getRapport,
  getObligatoiresMes,
  getSondageObligatoire,
  soumettreSondageObligatoire,
  rechercherUtilisateurs,
  getCibles,
  addCibleUtilisateurs,
  importCibles,
  deleteCible,
  diffuser,
  getSondagePublic,
  soumettreSondagePublic,
  addSondage,
  updateSondage,
  changerStatut,
  deleteSondage,
  dupliquerSondage,
  addQuestion,
  updateQuestion,
  deleteQuestion,
};
