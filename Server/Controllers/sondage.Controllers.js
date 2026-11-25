// =====================================================================
// Controllers SONDAGE (sondages du personnel) - Phase 1 : fondations
// Sondage -> Questions (par page, types varies) -> Options.
// =====================================================================
const db = require("../config/db");
const { lirePage, decouper } = require("../utils/paginationMemoire");
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

/* ------------------------------------------------------------------ */
/* Sondage déjà répondu : modifications qui remettent le sondage à zéro */
/* ------------------------------------------------------------------ */
// Ajouter / supprimer une question ou une option, changer le type d'une question ou
// l'échelle d'un curseur rend les réponses existantes incohérentes. Si le sondage a
// déjà des réponses, le serveur demande une confirmation explicite (409
// CONFIRMATION_REQUISE) ; une fois confirmée, la modification est appliquée et TOUTES
// les réponses sont supprimées : les cibles internes doivent répondre à nouveau
// (sondage redemandé à la connexion / au rechargement). Corriger un libellé (question
// ou option) ne touche pas aux réponses.
const nbReponsesSondage = async (cx, idSondage) => {
  const [[r]] = await cx.query("SELECT COUNT(*) AS n FROM B_SD_PASSATION WHERE id_Sondage=?", [idSondage]);
  return Number(r.n) || 0;
};
const reinitialiserReponsesSondage = async (cx, idSondage) => {
  const [r] = await cx.query("DELETE FROM B_SD_PASSATION WHERE id_Sondage=?", [idSondage]); // cascade réponses
  return r.affectedRows || 0;
};
const confirmationRequise = (res, nb, motifs) =>
  res.status(409).json({
    code: "CONFIRMATION_REQUISE",
    nb_reponses: nb,
    motifs,
    message:
      `Ce sondage a déjà ${nb} réponse${nb > 1 ? "s" : ""}. ${motifs.join(", ")} : ` +
      "le sondage sera remis à zéro et toutes les réponses supprimées.",
  });
const estConfirme = (req) =>
  req.body?.confirmer_reinitialisation === true || ["1", "true"].includes(String(req.query?.confirmer || ""));
const libelleOption = (o) => String((o && typeof o === "object" ? o.libelle : o) ?? "").trim();

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
    // Filtre de période (facultatif) : ?du=AAAA-MM-JJ&au=AAAA-MM-JJ (bornes incluses)
    // sur la date choisie par l'utilisateur : ?champ=creation (défaut) | modification
    // | reponse (sondages ayant reçu au moins une réponse terminée dans la période).
    const ymd = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || "")) ? String(v) : null);
    const du = ymd(req.query.du), au = ymd(req.query.au);
    const champ = ["creation", "modification", "reponse"].includes(req.query.champ) ? req.query.champ : "creation";
    const where = [], args = [];
    if (restreint) { where.push("s.id_createur = ?"); args.push(userId); }
    if (du || au) {
      if (champ === "reponse") {
        const c = ["p.id_Sondage = s.id", "p.termine = 1"];
        if (du) { c.push("COALESCE(p.date_fin, p.date_debut) >= ?"); args.push(du); }
        if (au) { c.push("COALESCE(p.date_fin, p.date_debut) < DATE_ADD(?, INTERVAL 1 DAY)"); args.push(au); }
        where.push(`EXISTS (SELECT 1 FROM B_SD_PASSATION p WHERE ${c.join(" AND ")})`);
      } else {
        // une modification jamais faite compte comme la date de création
        const col = champ === "modification" ? "COALESCE(s.dateModification, s.dateCreation)" : "s.dateCreation";
        if (du) { where.push(`${col} >= ?`); args.push(du); }
        if (au) { where.push(`${col} < DATE_ADD(?, INTERVAL 1 DAY)`); args.push(au); }
      }
    }
    const [rows] = await db.query(
      `SELECT s.id, s.nom, s.langue, s.statut, s.bouton_retour, s.id_createur,
              s.dateCreation, s.dateModification,
              (SELECT COUNT(*) FROM B_SD_QUESTION q WHERE q.id_Sondage = s.id) AS nb_questions,
              (SELECT COUNT(*) FROM B_SD_PASSATION p WHERE p.id_Sondage = s.id AND p.termine = 1) AS nb_reponses,
              (SELECT MAX(COALESCE(p.date_fin, p.date_debut)) FROM B_SD_PASSATION p WHERE p.id_Sondage = s.id AND p.termine = 1) AS derniere_reponse
       FROM B_SD_SONDAGE s
       ${where.length ? "WHERE " + where.join(" AND ") : ""}
       ORDER BY s.id DESC`,
      args
    );
    // out113 : ?page=&taille= -> recherche (nom ou n°) et statut appliqués ici comme à l'écran ;
    // statut=NON_DESACTIF : actifs et en cours de rédaction (défaut de l'écran).
    const pg = lirePage(req.query);
    if (!pg) return res.status(200).send(rows);
    const rech = String(req.query.q || "").trim().toLowerCase();
    const st = String(req.query.statut || "");
    const l = rows.filter((s) =>
      (!rech || (s.nom || "").toLowerCase().includes(rech) || String(s.id) === rech) &&
      (!st || (st === "ENCOURS" ? s.statut !== "ACTIF" && s.statut !== "DESACTIF"
        : st === "NON_DESACTIF" ? s.statut !== "DESACTIF" : s.statut === st)));
    return res.status(200).json(decouper(l, pg));
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
      return res.status(403).json({ message: "Accès non autorisé à ce sondage" });
    }
    const sondage = rows[0];
    sondage.questions = await chargerQuestionsAvecOptions(id);
    sondage.nb_reponses = await nbReponsesSondage(db, id);
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
    return res.status(201).json({ message: "Sondage créé avec succès", id: r.insertId });
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
      return res.status(403).json({ message: "Accès non autorisé à ce sondage" });
    }
    await db.query(
      `UPDATE B_SD_SONDAGE SET nom=?, langue=?, statut=?, bouton_retour=?, dateModification=? WHERE id=?`,
      [String(nom).trim(), langue || "Francais", statut || "ENCOURS", bouton_retour ? 1 : 0, new Date(), id]
    );
    return res.status(200).json({ message: "Sondage modifié" });
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
      return res.status(403).json({ message: "Accès non autorisé à ce sondage" });
    }
    await db.query(`UPDATE B_SD_SONDAGE SET statut=?, dateModification=? WHERE id=?`, [
      statut,
      new Date(),
      id,
    ]);
    return res.status(200).json({ message: "Statut mis à jour" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

const deleteSondage = async (req, res) => {
  const { id } = req.params;
  try {
    if (!(await peutGerer(req.auth ? req.auth.userId : null, id))) {
      return res.status(403).json({ message: "Accès non autorisé à ce sondage" });
    }
    await db.query(`DELETE FROM B_SD_SONDAGE WHERE id=?`, [id]); // cascade questions + options
    return res.status(200).json({ message: "Sondage supprimé" });
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
      return res.status(403).json({ message: "Accès non autorisé à ce sondage" });
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
      return res.status(403).json({ message: "Accès non autorisé à ce sondage" });
    }
    const nbReponses = await nbReponsesSondage(connection, id_Sondage);
    if (nbReponses && !estConfirme(req)) {
      connection.release();
      return confirmationRequise(res, nbReponses, ["Ajouter une question"]);
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
    const supprimees = nbReponses ? await reinitialiserReponsesSondage(connection, id_Sondage) : 0;
    await connection.commit();
    return res.status(201).json({
      message: supprimees ? "Question ajoutée : sondage remis à zéro" : "Question ajoutée",
      id: r.insertId,
      reinitialise: supprimees > 0,
    });
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
    const [qr] = await connection.query(
      `SELECT id_Sondage, type, curseur_min, curseur_max FROM B_SD_QUESTION WHERE id=?`, [id]
    );
    if (!qr.length) {
      connection.release();
      return res.status(404).json({ message: "Question introuvable" });
    }
    if (!(await peutGerer(req.auth ? req.auth.userId : null, qr[0].id_Sondage))) {
      connection.release();
      return res.status(403).json({ message: "Accès non autorisé à ce sondage" });
    }
    const avant = qr[0];
    const [optsAvant] = await connection.query(`SELECT id FROM B_SD_OPTION WHERE id_Question=?`, [id]);
    const idsAvant = new Set(optsAvant.map((o) => o.id));
    // Options envoyées : { id?, libelle } ; id connu = option existante (libellé corrigé sur place).
    const envoyees = (TYPES_AVEC_OPTIONS.includes(type) && Array.isArray(options) ? options : [])
      .map((o) => ({ id: o && typeof o === "object" && idsAvant.has(Number(o.id)) ? Number(o.id) : null, libelle: libelleOption(o) }))
      .filter((o) => o.libelle);
    const idsGardes = new Set(envoyees.filter((o) => o.id).map((o) => o.id));
    const retirees = [...idsAvant].filter((x) => !idsGardes.has(x));
    const ajoutees = envoyees.filter((o) => !o.id);
    const motifs = [];
    if (avant.type !== type) motifs.push("Changer le type de la question");
    else if (type === "CURSEUR" && (Number(avant.curseur_min ?? 1) !== Number(curseur_min ?? 1) || Number(avant.curseur_max ?? 10) !== Number(curseur_max ?? 10))) {
      motifs.push("Changer l'échelle du curseur");
    }
    // « Réponses proposées » : libellé des options dans l'éditeur.
    if (avant.type === type && retirees.length) {
      motifs.push(retirees.length > 1 ? "Supprimer des réponses proposées" : "Supprimer une réponse proposée");
    }
    if (avant.type === type && ajoutees.length) {
      motifs.push(ajoutees.length > 1 ? "Ajouter des réponses proposées" : "Ajouter une réponse proposée");
    }
    const nbReponses = motifs.length ? await nbReponsesSondage(connection, avant.id_Sondage) : 0;
    if (nbReponses && !estConfirme(req)) {
      connection.release();
      return confirmationRequise(res, nbReponses, motifs);
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
    // Options mises à jour SUR PLACE (identifiants conservés) : les réponses déjà
    // données et les conditions d'affichage qui pointent vers une option restent valides.
    if (retirees.length) {
      await connection.query(`DELETE FROM B_SD_CONDITION WHERE id_Option IN (?)`, [retirees]);
      await connection.query(`DELETE FROM B_SD_OPTION WHERE id IN (?)`, [retirees]);
    }
    let i = 0;
    for (const o of envoyees) {
      if (o.id) {
        await connection.query(`UPDATE B_SD_OPTION SET libelle=?, ordre=? WHERE id=?`, [o.libelle, i++, o.id]);
      } else {
        await connection.query(`INSERT INTO B_SD_OPTION (id_Question, libelle, ordre) VALUES (?,?,?)`, [id, o.libelle, i++]);
      }
    }
    await enregistrerConditions(connection, id, req.body.conditions);
    const supprimees = nbReponses ? await reinitialiserReponsesSondage(connection, avant.id_Sondage) : 0;
    await connection.commit();
    return res.status(200).json({
      message: supprimees ? "Question modifiée : sondage remis à zéro" : "Question modifiée",
      reinitialise: supprimees > 0,
    });
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
      return res.status(403).json({ message: "Accès non autorisé à ce sondage" });
    }
    const nbReponses = await nbReponsesSondage(db, qr[0].id_Sondage);
    if (nbReponses && !estConfirme(req)) return confirmationRequise(res, nbReponses, ["Supprimer une question"]);
    const cx = await db.getConnection();
    let supprimees = 0;
    try {
      await cx.beginTransaction();
      // Conditions d'autres questions qui dépendaient de celle-ci : sans objet.
      await cx.query(`DELETE FROM B_SD_CONDITION WHERE id_Question_source=?`, [id]);
      await cx.query(`DELETE FROM B_SD_QUESTION WHERE id=?`, [id]); // cascade options + ses conditions
      if (nbReponses) supprimees = await reinitialiserReponsesSondage(cx, qr[0].id_Sondage);
      await cx.commit();
    } catch (e) {
      try { await cx.rollback(); } catch (e2) {}
      throw e;
    } finally {
      cx.release();
    }
    return res.status(200).json({
      message: supprimees ? "Question supprimée : sondage remis à zéro" : "Question supprimée",
      reinitialise: supprimees > 0,
    });
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
  if (!Array.isArray(reponses)) return res.status(403).json({ message: "Réponses invalides" });
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
    return res.status(201).json({ message: "Merci, vos réponses ont été enregistrées", id: pid });
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
      return res.status(403).json({ message: "Accès non autorisé à ce sondage" });
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
    return res.status(403).json({ message: "Aucun utilisateur sélectionné" });
  }
  try {
    const userId = req.auth ? req.auth.userId : null;
    if (!(await peutGerer(userId, id))) return res.status(403).json({ message: "Accès non autorisé à ce sondage" });
    if ((await statutSondage(id)) === "ACTIF") {
      return res.status(403).json({ message: "Sondage actif : desactivez-le pour modifier la cible." });
    }
    const [ex] = await db.query(
      "SELECT id_UTILISATEUR FROM B_SD_CIBLE WHERE id_Sondage=? AND id_UTILISATEUR IS NOT NULL", [id]
    );
    const deja = new Set(ex.map((x) => x.id_UTILISATEUR));
    const aAjouter = id_utilisateurs.filter((u) => !deja.has(u));
    if (!aAjouter.length) return res.status(200).json({ message: "Déjà dans la cible", nb: 0 });
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
    if (!(await peutGerer(userId, id))) return res.status(403).json({ message: "Accès non autorisé à ce sondage" });
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
    return res.status(201).json({ message: "Import réussi : " + nb + " destinataire(s)", nb });
  } catch (error) { console.log(error); res.status(500).json({ message: "Échec de l'import Excel" }); }
};

const deleteCible = async (req, res) => {
  const { cibleId } = req.params;
  try {
    const [r] = await db.query("SELECT id_Sondage FROM B_SD_CIBLE WHERE id=?", [cibleId]);
    if (!r.length) return res.status(404).json({ message: "Introuvable" });
    const userId = req.auth ? req.auth.userId : null;
    if (!(await peutGerer(userId, r[0].id_Sondage))) return res.status(403).json({ message: "Accès non autorisé" });
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
    if (!(await peutGerer(userId, id))) return res.status(403).json({ message: "Accès non autorisé à ce sondage" });
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
      message: "Diffusion enregistrée : " + nbEmail + " email(s), " + nbSms + " SMS",
      nbEmail, nbSms, token: srow[0].token,
    });
  } catch (error) { console.log(error); res.status(500).json({ message: "Error request" }); }
};

// ============ Phase 4 : rapport / analyses par question ============
const getRapport = async (req, res) => {
  const { id } = req.params;
  try {
    if (!(await peutGerer(req.auth ? req.auth.userId : null, id))) {
      return res.status(403).json({ message: "Accès non autorisé à ce sondage" });
    }
    const [srow] = await db.query("SELECT id, nom FROM B_SD_SONDAGE WHERE id=?", [id]);
    if (!srow.length) return res.status(404).json({ message: "Sondage introuvable" });
    // Performance (out110) : un nombre fixe de requêtes agrégées pour tout le sondage
    // (plus une requête par question et par option), appuyées sur les index de la
    // migration 56. Passations prises en compte : celles qui sont terminées.
    const REP = `B_SD_REPONSE r JOIN B_SD_PASSATION pt ON pt.id = r.id_Passation AND pt.termine = 1 AND pt.id_Sondage = ?`;
    const [[np], [questions], [options], [parOption], [parQuestion], [textes]] = await Promise.all([
      db.query("SELECT COUNT(*) AS n FROM B_SD_PASSATION WHERE id_Sondage=? AND termine=1", [id]),
      db.query("SELECT id, page, ordre, type, libelle, curseur_min, curseur_max FROM B_SD_QUESTION WHERE id_Sondage=? ORDER BY page, ordre, id", [id]),
      db.query(`SELECT o.id, o.id_Question, o.libelle FROM B_SD_OPTION o JOIN B_SD_QUESTION q ON q.id = o.id_Question
                 WHERE q.id_Sondage = ? ORDER BY o.id_Question, o.ordre, o.id`, [id]),
      // choix et classement : nombre de réponses et rang moyen par option
      db.query(`SELECT r.id_Question, r.id_Option, COUNT(*) AS nb, AVG(r.ordre) AS ordre_moyen
                  FROM ${REP} WHERE r.id_Option IS NOT NULL GROUP BY r.id_Question, r.id_Option`, [id]),
      // par question : lignes de réponse, curseur (moyenne, min, max), répondants
      db.query(`SELECT r.id_Question, COUNT(*) AS nb, AVG(r.valeur_num) AS moyenne, MIN(r.valeur_num) AS mini,
                       MAX(r.valeur_num) AS maxi, COUNT(DISTINCT r.id_Passation) AS repondants
                  FROM ${REP} GROUP BY r.id_Question`, [id]),
      // questions ouvertes : textes, du plus récent au plus ancien
      db.query(`SELECT r.id_Question, r.valeur_texte FROM ${REP}
                 JOIN B_SD_QUESTION qo ON qo.id = r.id_Question AND qo.type = 'OUVERTE'
                 WHERE r.valeur_texte IS NOT NULL AND r.valeur_texte <> '' ORDER BY r.id DESC`, [id]),
    ]);
    const nb_passations = np[0].n;
    const optionsParQ = new Map();
    for (const o of options) {
      if (!optionsParQ.has(o.id_Question)) optionsParQ.set(o.id_Question, []);
      optionsParQ.get(o.id_Question).push(o);
    }
    const statOpt = new Map(parOption.map((x) => [`${x.id_Question}:${x.id_Option}`, x]));
    const statQ = new Map(parQuestion.map((x) => [x.id_Question, x]));
    const textesParQ = new Map();
    for (const t of textes) {
      if (!textesParQ.has(t.id_Question)) textesParQ.set(t.id_Question, []);
      textesParQ.get(t.id_Question).push(t.valeur_texte);
    }
    for (const q of questions) {
      const opts = optionsParQ.get(q.id) || [];
      const sq = statQ.get(q.id);
      if (q.type === "CHOIX_UNIQUE" || q.type === "CHOIX_MULTIPLE") {
        const liste = opts.map((o) => ({ id: o.id, libelle: o.libelle, nb: Number((statOpt.get(`${q.id}:${o.id}`) || {}).nb || 0) }));
        q.resultat = { options: liste, total: liste.reduce((a, o) => a + o.nb, 0) };
      } else if (q.type === "CLASSEMENT") {
        const liste = opts.map((o) => {
          const s = statOpt.get(`${q.id}:${o.id}`);
          const ordre_moyen = s && s.ordre_moyen != null ? s.ordre_moyen : null;
          // rang moyen = ordre (0-based) + 1
          return { id: o.id, libelle: o.libelle, nb: Number((s || {}).nb || 0), ordre_moyen,
                   rang_moyen: ordre_moyen != null ? Number(ordre_moyen) + 1 : null };
        });
        liste.sort((a, b) => (a.rang_moyen ?? 999) - (b.rang_moyen ?? 999));
        q.resultat = { options: liste };
      } else if (q.type === "CURSEUR") {
        q.resultat = {
          nb: Number((sq || {}).nb || 0),
          moyenne: sq && sq.moyenne != null ? Math.round(Number(sq.moyenne) * 100) / 100 : null,
          mini: sq ? sq.mini : null,
          maxi: sq ? sq.maxi : null,
        };
      } else if (q.type === "OUVERTE") {
        const reponses = textesParQ.get(q.id) || [];
        q.resultat = { reponses, nb: reponses.length };
      } else {
        q.resultat = null; // INFO
      }
      // Nombre de répondants par question (passations terminées ayant au moins une réponse).
      q.nb_repondants = Number((sq || {}).repondants || 0);
    }

    // ---- Participation de la cible ----
    // « Touchés » = ciblés INTERNES ayant terminé le sondage (réponse rattachée à
    // leur compte). Les ciblés externes répondent par le lien public commun,
    // anonyme : leurs réponses ne peuvent pas leur être rattachées.
    const [[cb]] = await db.query(
      `SELECT COUNT(*) AS total,
              COUNT(DISTINCT CASE WHEN id_UTILISATEUR IS NOT NULL THEN id_UTILISATEUR END) AS internes,
              SUM(id_UTILISATEUR IS NULL) AS externes
         FROM B_SD_CIBLE WHERE id_Sondage = ?`, [id]
    );
    const [[tc]] = await db.query(
      `SELECT COUNT(DISTINCT c.id_UTILISATEUR) AS touches
         FROM B_SD_CIBLE c
        WHERE c.id_Sondage = ? AND c.id_UTILISATEUR IS NOT NULL
          AND EXISTS (SELECT 1 FROM B_SD_PASSATION p WHERE p.id_Sondage = c.id_Sondage AND p.id_UTILISATEUR = c.id_UTILISATEUR AND p.termine = 1)`, [id]
    );
    const [[hc]] = await db.query(
      `SELECT SUM(p.id_UTILISATEUR IS NULL) AS anonymes,
              SUM(p.id_UTILISATEUR IS NOT NULL AND NOT EXISTS (
                    SELECT 1 FROM B_SD_CIBLE c WHERE c.id_Sondage = p.id_Sondage AND c.id_UTILISATEUR = p.id_UTILISATEUR)) AS hors_cible
         FROM B_SD_PASSATION p WHERE p.id_Sondage = ? AND p.termine = 1`, [id]
    );
    const [nonRep] = await db.query(
      `SELECT u.id, u.nom, u.prenom, u.nom_utilisateur, u.email, si.nom AS site, f.nom AS fonction,
              MAX(c.date_envoi_email) AS date_envoi_email, MAX(c.date_envoi_sms) AS date_envoi_sms
         FROM B_SD_CIBLE c
         JOIN b_utilisateur u ON u.id = c.id_UTILISATEUR
         LEFT JOIN b_site si ON si.id = u.id_Site
         LEFT JOIN b_fonction f ON f.id = u.id_Fonction
        WHERE c.id_Sondage = ?
          AND NOT EXISTS (SELECT 1 FROM B_SD_PASSATION p WHERE p.id_Sondage = c.id_Sondage AND p.id_UTILISATEUR = c.id_UTILISATEUR AND p.termine = 1)
        GROUP BY u.id, u.nom, u.prenom, u.nom_utilisateur, u.email, si.nom, f.nom
        ORDER BY u.nom, u.prenom`, [id]
    );
    const internes = Number(cb.internes || 0);
    const touches = Number(tc.touches || 0);
    const participation = {
      cibles: Number(cb.total || 0) ? internes + Number(cb.externes || 0) : 0,
      internes,
      externes: Number(cb.externes || 0),
      touches,
      taux: internes ? Math.round((touches / internes) * 1000) / 10 : null,
      anonymes: Number(hc.anonymes || 0),
      hors_cible: Number(hc.hors_cible || 0),
      non_repondants: nonRep,
    };
    return res.status(200).json({ id: srow[0].id, nom: srow[0].nom, nb_passations, participation, questions });
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
  if (!userId || !Array.isArray(reponses)) return res.status(403).json({ message: "Requête invalide" });
  const connection = await db.getConnection();
  try {
    const [rows] = await connection.query("SELECT statut FROM B_SD_SONDAGE WHERE id=?", [id]);
    if (!rows.length) { connection.release(); return res.status(404).json({ message: "Sondage introuvable" }); }
    if (rows[0].statut !== "ACTIF") { connection.release(); return res.status(403).json({ message: "Sondage indisponible" }); }
    const [c] = await connection.query("SELECT 1 FROM B_SD_CIBLE WHERE id_Sondage=? AND id_UTILISATEUR=? LIMIT 1", [id, userId]);
    if (!c.length) { connection.release(); return res.status(403).json({ message: "Vous n'êtes pas ciblé par ce sondage" }); }
    const [dp] = await connection.query("SELECT 1 FROM B_SD_PASSATION WHERE id_Sondage=? AND id_UTILISATEUR=? AND termine=1 LIMIT 1", [id, userId]);
    if (dp.length) { connection.release(); return res.status(200).json({ message: "Déjà répondu" }); }
    const now = new Date();
    await connection.beginTransaction();
    const [p] = await connection.query(
      "INSERT INTO B_SD_PASSATION (id_Sondage, id_UTILISATEUR, date_debut, date_fin, termine) VALUES (?,?,?,?,1)",
      [id, userId, now, now]
    );
    await insererReponses(connection, p.insertId, reponses);
    await connection.commit();
    return res.status(201).json({ message: "Merci, vos réponses ont été enregistrées", id: p.insertId });
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
