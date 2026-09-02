// =====================================================================
// Controllers Quiz (nouveau modele structure) - Phase 1 : generateur
// Quiz -> Questions (Vrai/Faux) -> Options (avec bonne reponse)
// Coexiste avec le quiz legacy (B_QUIZ / B_REPONSE_QUIZ).
// =====================================================================
const db = require("../config/db");

// Role de l'utilisateur (pour scoper la visibilite des quiz).
const getRole = async (userId) => {
  if (!userId) return null;
  const [r] = await db.query(
    `SELECT f.Role_Associe AS role FROM B_UTILISATEUR u JOIN B_FONCTION f ON u.id_Fonction=f.id WHERE u.id=?`,
    [userId]
  );
  return r.length ? r[0].role : null;
};

// Un utilisateur peut gerer un quiz s'il est admin ou s'il en est le createur.
const peutGererQuiz = async (userId, idQuiz) => {
  const role = await getRole(userId);
  if (role === "R_ADMI") return true;
  const [r] = await db.query(`SELECT id_createur FROM B_QZ_QUIZ WHERE id=?`, [idQuiz]);
  if (!r.length) return true; // laisse le handler renvoyer 404
  return r[0].id_createur === userId;
};

// Meme controle a partir d'une question (via son quiz).
const peutGererQuestion = async (userId, idQuestion) => {
  const [r] = await db.query(`SELECT id_Quiz FROM B_QZ_QUESTION WHERE id=?`, [idQuestion]);
  if (!r.length) return true;
  return peutGererQuiz(userId, r[0].id_Quiz);
};

// Peut CONSULTER la page detail d'un quiz : admin, createur, ou superviseur d'un
// agent ayant une demande d'acces IP sur ce quiz (toute statut, pour que traiter
// une demande ne coupe pas l'acces a la page).
const peutVoirDetailQuiz = async (userId, idQuiz) => {
  if (await peutGererQuiz(userId, idQuiz)) return true;
  const [sup] = await db.query(
    `SELECT 1 FROM B_QZ_IP_DEMANDE d
      WHERE d.id_Quiz = ?
        AND d.id_UTILISATEUR IN (SELECT id_AGENT FROM B_R_SUPERVISEUR_AGENT WHERE id_SUPERVISEUR = ?)
      LIMIT 1`,
    [idQuiz, userId]
  );
  return sup.length > 0;
};

// L'utilisateur appartient-il a l'un des sites cibles par le quiz ?
// True si le quiz ne cible aucun site (pas de restriction par site).
const utilisateurDansSiteDuQuiz = async (userId, idQuiz) => {
  const [sites] = await db.query("SELECT id_Site FROM B_QZ_QUIZ_SITE WHERE id_Quiz = ?", [idQuiz]);
  if (!sites.length) return true;
  const [u] = await db.query("SELECT id_Site FROM B_UTILISATEUR WHERE id = ?", [userId]);
  if (!u.length) return false;
  return sites.some((x) => Number(x.id_Site) === Number(u[0].id_Site));
};

// Adresse IP du client (sans proxy : socket ; avec proxy : x-forwarded-for).
const getClientIp = (req) => {
  let ip =
    (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
    (req.socket && req.socket.remoteAddress) ||
    req.ip ||
    "";
  ip = ip.replace(/^::ffff:/, "");
  if (ip === "::1") ip = "127.0.0.1";
  return ip;
};

// Controle d'acces machine, pilote par le parametre "autoriser_machines" du quiz :
//  - Oui (1) : toutes les machines peuvent acceder (liste IP ignoree)
//  - Non (0) : seules les IP de la liste blanche sont autorisees
//              (liste vide => aucune machine autorisee)
const ipAutoriseePourQuiz = async (idQuiz, req) => {
  const [qr] = await db.query(
    "SELECT autoriser_machines FROM B_QZ_QUIZ WHERE id = ?",
    [idQuiz]
  );
  // Oui => acces libre a toutes les machines
  if (qr.length && Number(qr[0].autoriser_machines) === 1) return true;
  // Non => restriction par liste blanche d'IP
  const [rows] = await db.query(
    "SELECT adresse_ip FROM B_QZ_IP_AUTORISEE WHERE id_Quiz = ?",
    [idQuiz]
  );
  if (!rows.length) return false; // aucune IP autorisee => aucune machine ne passe
  const ip = getClientIp(req);
  return rows.some((r) => String(r.adresse_ip).trim() === ip);
};

// Journalise une demande d'acces IP en attente (machine bloquee).
const enregistrerDemandeIp = async (idQuiz, userId, req) => {
  try {
    const ip = getClientIp(req);
    if (!userId || !ip) return;
    const now = new Date().toISOString().slice(0, 19).replace("T", " ");
    await db.query(
      "INSERT INTO B_QZ_IP_DEMANDE (id_Quiz, id_UTILISATEUR, adresse_ip, statut, dateCreation) VALUES (?,?,?, 'EN_ATTENTE', ?) ON DUPLICATE KEY UPDATE dateCreation = VALUES(dateCreation)",
      [idQuiz, userId, ip, now]
    );
  } catch (e) {
    console.log("demande ip:", e.message);
  }
};

// Genere un code PIN unique (6 chiffres) pour un quiz.
const genererPinUnique = async (executor) => {
  for (let i = 0; i < 25; i++) {
    const pin = String(Math.floor(100000 + Math.random() * 900000));
    const [r] = await executor.query("SELECT id FROM B_QZ_QUIZ WHERE code_pin=?", [pin]);
    if (!r.length) return pin;
  }
  return String(Date.now()).slice(-6);
};

/* ------------------------------------------------------------------ */
/* QUIZ                                                                */
/* ------------------------------------------------------------------ */

// Liste des quiz. R_ADMI voit tout ; les autres createurs (R_GB, R_SUP)
// ne voient QUE les quiz qu'ils ont crees.
const getAllQuiz = async (req, res, next) => {
  const userId = req.auth ? req.auth.userId : null;
  try {
    const role = await getRole(userId);
    const restreint = role !== "R_ADMI";
    const Query = `
      SELECT q.id, q.titre, q.code_pin, q.type, q.duree, q.date_fermeture, q.description, q.id_Fiche,
             q.note_passage, q.acces, q.alterner_questions, q.autoriser_machines,
             q.retest_auto, q.nb_retest_max, q.Etat, q.id_createur, q.dateCreation, q.dateModification,
             FCH.titre AS fiche_titre,
             (SELECT GROUP_CONCAT(f2.titre SEPARATOR ', ') FROM B_QZ_QUIZ_FICHE qf
                JOIN B_FICHE f2 ON f2.id = qf.id_Fiche WHERE qf.id_Quiz = q.id) AS fiches_titres,
             (SELECT GROUP_CONCAT(st.nom SEPARATOR ', ') FROM B_QZ_QUIZ_SITE qs
                JOIN B_SITE st ON st.id = qs.id_Site WHERE qs.id_Quiz = q.id) AS sites_titres,
             (SELECT COUNT(*) FROM B_QZ_QUESTION qq WHERE qq.id_Quiz = q.id) AS nb_questions
      FROM B_QZ_QUIZ q
      LEFT JOIN B_FICHE FCH ON FCH.id = q.id_Fiche
      ${restreint ? "WHERE (q.id_createur = ? OR q.id IN (SELECT d.id_Quiz FROM B_QZ_IP_DEMANDE d WHERE d.statut = 'EN_ATTENTE' AND d.id_UTILISATEUR IN (SELECT id_AGENT FROM B_R_SUPERVISEUR_AGENT WHERE id_SUPERVISEUR = ?)))" : ""}
      ORDER BY q.id DESC`;
    const [resultat] = await db.query(Query, restreint ? [userId, userId] : []);
    return res.status(200).send(resultat);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

const getOneQuiz = async (req, res, next) => {
  const { id } = req.params;
  const userId = req.auth ? req.auth.userId : null;
  try {
    const [quizRows] = await db.query(
      `SELECT q.id, q.titre, q.code_pin, q.type, q.duree, q.date_fermeture, q.description, q.id_Fiche,
              q.note_passage, q.acces, q.alterner_questions, q.autoriser_machines,
              q.retest_auto, q.nb_retest_max, q.Etat, q.id_createur, q.dateCreation, q.dateModification,
              FCH.titre AS fiche_titre
       FROM B_QZ_QUIZ q
       LEFT JOIN B_FICHE FCH ON FCH.id = q.id_Fiche
       WHERE q.id = ?`,
      [id]
    );
    if (!quizRows.length) {
      return res.status(404).json({ message: "Quiz introuvable" });
    }
    const quiz = quizRows[0];
    // Seul le createur (ou un admin) peut ouvrir/gerer ce quiz
    if (!(await peutVoirDetailQuiz(userId, id))) {
      return res.status(403).json({ message: "Acces non autorise a ce quiz" });
    }

    const [questions] = await db.query(
      `SELECT id, id_Quiz, type, libelle, ordre
       FROM B_QZ_QUESTION WHERE id_Quiz = ? ORDER BY ordre, id`,
      [id]
    );
    const [options] = await db.query(
      `SELECT o.id, o.id_Question, o.libelle, o.est_correcte, o.ordre
       FROM B_QZ_OPTION o
       JOIN B_QZ_QUESTION qq ON qq.id = o.id_Question
       WHERE qq.id_Quiz = ? ORDER BY o.ordre, o.id`,
      [id]
    );

    const optionsByQuestion = {};
    for (const o of options) {
      (optionsByQuestion[o.id_Question] = optionsByQuestion[o.id_Question] || []).push(o);
    }
    for (const q of questions) {
      q.options = optionsByQuestion[q.id] || [];
    }
    quiz.questions = questions;

    // Contenus (fiches) associes (n..n)
    const [fichesRows] = await db.query(
      `SELECT qf.id_Fiche, f.titre FROM B_QZ_QUIZ_FICHE qf
       LEFT JOIN B_FICHE f ON f.id = qf.id_Fiche WHERE qf.id_Quiz = ?`,
      [id]
    );
    quiz.fiches = fichesRows.map(x => x.id_Fiche);
    quiz.fiches_detail = fichesRows;

    // Sites cibles (n..n)
    const [sitesRows] = await db.query(
      `SELECT qs.id_Site, st.nom FROM B_QZ_QUIZ_SITE qs
       LEFT JOIN B_SITE st ON st.id = qs.id_Site WHERE qs.id_Quiz = ?`,
      [id]
    );
    quiz.sites = sitesRows.map(x => x.id_Site);
    quiz.sites_detail = sitesRows;

    // Nombre de participants distincts (page detail)
    const [partRows] = await db.query(
      "SELECT COUNT(DISTINCT id_UTILISATEUR) AS n FROM B_QZ_TENTATIVE WHERE id_Quiz = ?",
      [id]
    );
    quiz.nb_participants = partRows[0].n;

    return res.status(200).send(quiz);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

const addQuiz = async (req, res, next) => {
  const {
    titre, type, duree, date_fermeture, note_passage, acces,
    alterner_questions, autoriser_machines, id_Fiche, fiches, sites, description,
    retest_auto, nb_retest_max,
  } = req.body;
  if (!titre) {
    return res
      .status(403)
      .json({ message: "Merci de bien renseigner les parametres" });
  }
  // Liste des fiches associees (n..n) ; compat : id_Fiche simple
  const listeFiches = Array.isArray(fiches) ? fiches : id_Fiche ? [id_Fiche] : [];
  const listeSites = Array.isArray(sites) ? sites : [];
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const codePin = await genererPinUnique(connection);
    const [r] = await connection.query(
      `INSERT INTO B_QZ_QUIZ
        (titre, code_pin, type, duree, date_fermeture, note_passage, acces, alterner_questions, autoriser_machines,
         id_Fiche, description, retest_auto, nb_retest_max, Etat, id_createur, dateCreation)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        titre,
        codePin,
        type || null,
        duree ?? null,
        date_fermeture || null,
        note_passage ?? 70,
        acces || "PRIVATE",
        alterner_questions ? 1 : 0,
        autoriser_machines ? 1 : 0,
        listeFiches.length ? listeFiches[0] : null,
        description || null,
        retest_auto ?? 1,
        nb_retest_max ?? 1,
        "ACTIF",
        req.auth ? req.auth.userId : null,
        new Date(),
      ]
    );
    for (const idf of listeFiches) {
      await connection.query(
        `INSERT INTO B_QZ_QUIZ_FICHE (id_Quiz, id_Fiche, dateCreation) VALUES (?,?,?)`,
        [r.insertId, idf, new Date()]
      );
    }
    for (const ids of listeSites) {
      await connection.query(
        `INSERT INTO B_QZ_QUIZ_SITE (id_Quiz, id_Site, dateCreation) VALUES (?,?,?)`,
        [r.insertId, ids, new Date()]
      );
    }
    await connection.commit();
    return res.status(201).json({ message: "Quiz cree avec succes", id: r.insertId, code_pin: codePin });
  } catch (error) {
    try { await connection.rollback(); } catch (e) {}
    console.log(error);
    res.status(500).json({ message: "Error request" });
  } finally {
    connection.release();
  }
};

const updateQuiz = async (req, res, next) => {
  const { id } = req.params;
  const {
    titre, type, duree, date_fermeture, note_passage, acces,
    alterner_questions, autoriser_machines, id_Fiche, fiches, sites, description,
    retest_auto, nb_retest_max, Etat,
  } = req.body;
  if (!id || !titre) {
    return res
      .status(403)
      .json({ message: "Merci de bien renseigner les parametres" });
  }
  if (!(await peutGererQuiz(req.auth ? req.auth.userId : null, id))) {
    return res.status(403).json({ message: "Acces non autorise a ce quiz" });
  }
  const listeFiches = Array.isArray(fiches) ? fiches : id_Fiche ? [id_Fiche] : [];
  const listeSites = Array.isArray(sites) ? sites : [];
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query(
      `UPDATE B_QZ_QUIZ
       SET titre=?, type=?, duree=?, date_fermeture=?, note_passage=?, acces=?,
           alterner_questions=?, autoriser_machines=?, id_Fiche=?, description=?,
           retest_auto=?, nb_retest_max=?, Etat=?, dateModification=?
       WHERE id=?`,
      [
        titre,
        type || null,
        duree ?? null,
        date_fermeture || null,
        note_passage ?? 70,
        acces || "PRIVATE",
        alterner_questions ? 1 : 0,
        autoriser_machines ? 1 : 0,
        listeFiches.length ? listeFiches[0] : null,
        description || null,
        retest_auto ?? 1,
        nb_retest_max ?? 1,
        Etat || "ACTIF",
        new Date(),
        id,
      ]
    );
    // Remplace l'ensemble des associations de contenus
    await connection.query(`DELETE FROM B_QZ_QUIZ_FICHE WHERE id_Quiz=?`, [id]);
    for (const idf of listeFiches) {
      await connection.query(
        `INSERT INTO B_QZ_QUIZ_FICHE (id_Quiz, id_Fiche, dateCreation) VALUES (?,?,?)`,
        [id, idf, new Date()]
      );
    }
    await connection.query(`DELETE FROM B_QZ_QUIZ_SITE WHERE id_Quiz=?`, [id]);
    for (const ids of listeSites) {
      await connection.query(
        `INSERT INTO B_QZ_QUIZ_SITE (id_Quiz, id_Site, dateCreation) VALUES (?,?,?)`,
        [id, ids, new Date()]
      );
    }
    await connection.commit();
    return res.status(201).json({ message: "Quiz modifie" });
  } catch (error) {
    try { await connection.rollback(); } catch (e) {}
    console.log(error);
    res.status(500).json({ message: "Error request" });
  } finally {
    connection.release();
  }
};

const deleteQuiz = async (req, res, next) => {
  const { id } = req.params;
  if (!id) {
    return res
      .status(403)
      .json({ message: "Merci de bien renseigner les parametres" });
  }
  if (!(await peutGererQuiz(req.auth ? req.auth.userId : null, id))) {
    return res.status(403).json({ message: "Acces non autorise a ce quiz" });
  }
  try {
    // FK ON DELETE CASCADE : questions + options supprimees automatiquement
    await db.query(`DELETE FROM B_QZ_QUIZ WHERE id=?`, [id]);
    return res.status(201).json({ message: "Quiz supprime avec succes" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

/* ------------------------------------------------------------------ */
/* QUESTIONS (+ options)                                               */
/* ------------------------------------------------------------------ */

const addQuestion = async (req, res, next) => {
  const { id_Quiz, type, libelle, ordre, options } = req.body;
  if (!id_Quiz || !libelle || !Array.isArray(options) || options.length === 0) {
    return res
      .status(403)
      .json({ message: "Merci de bien renseigner la question et ses options" });
  }
  if (!(await peutGererQuiz(req.auth ? req.auth.userId : null, id_Quiz))) {
    return res.status(403).json({ message: "Acces non autorise a ce quiz" });
  }
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [q] = await connection.query(
      `INSERT INTO B_QZ_QUESTION (id_Quiz, type, libelle, ordre, dateCreation) VALUES (?,?,?,?,?)`,
      [id_Quiz, type || "VRAI_FAUX", libelle, ordre || 0, new Date()]
    );
    const questionId = q.insertId;
    let i = 0;
    for (const opt of options) {
      await connection.query(
        `INSERT INTO B_QZ_OPTION (id_Question, libelle, est_correcte, ordre) VALUES (?,?,?,?)`,
        [questionId, opt.libelle, opt.est_correcte ? 1 : 0, i++]
      );
    }
    await connection.commit();
    return res.status(201).json({ message: "Question ajoutee", id: questionId });
  } catch (error) {
    await connection.rollback();
    console.log(error);
    res.status(500).json({ message: "Error request" });
  } finally {
    connection.release();
  }
};

const updateQuestion = async (req, res, next) => {
  const { id } = req.params;
  const { type, libelle, ordre, options } = req.body;
  if (!id || !libelle || !Array.isArray(options) || options.length === 0) {
    return res
      .status(403)
      .json({ message: "Merci de bien renseigner la question et ses options" });
  }
  if (!(await peutGererQuestion(req.auth ? req.auth.userId : null, id))) {
    return res.status(403).json({ message: "Acces non autorise a cette question" });
  }
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query(
      `UPDATE B_QZ_QUESTION SET type=?, libelle=?, ordre=? WHERE id=?`,
      [type || "VRAI_FAUX", libelle, ordre || 0, id]
    );
    // On remplace l'ensemble des options
    await connection.query(`DELETE FROM B_QZ_OPTION WHERE id_Question=?`, [id]);
    let i = 0;
    for (const opt of options) {
      await connection.query(
        `INSERT INTO B_QZ_OPTION (id_Question, libelle, est_correcte, ordre) VALUES (?,?,?,?)`,
        [id, opt.libelle, opt.est_correcte ? 1 : 0, i++]
      );
    }
    await connection.commit();
    return res.status(201).json({ message: "Question modifiee" });
  } catch (error) {
    await connection.rollback();
    console.log(error);
    res.status(500).json({ message: "Error request" });
  } finally {
    connection.release();
  }
};

const deleteQuestion = async (req, res, next) => {
  const { id } = req.params;
  if (!id) {
    return res
      .status(403)
      .json({ message: "Merci de bien renseigner les parametres" });
  }
  if (!(await peutGererQuestion(req.auth ? req.auth.userId : null, id))) {
    return res.status(403).json({ message: "Acces non autorise a cette question" });
  }
  try {
    await db.query(`DELETE FROM B_QZ_QUESTION WHERE id=?`, [id]);
    return res.status(201).json({ message: "Question supprimee" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

/* ------------------------------------------------------------------ */
/* CONTENUS KB (fiches) pour lier un quiz a un contenu                 */
/* ------------------------------------------------------------------ */

const getFichesRecentes = async (req, res, next) => {
  try {
    const [resultat] = await db.query(
      `SELECT id, titre, dateModification, dateEnregistrement
       FROM B_FICHE
       ORDER BY COALESCE(dateModification, dateEnregistrement) DESC
       LIMIT 100`
    );
    return res.status(200).send(resultat);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

/* ------------------------------------------------------------------ */
/* PHASE 2 - PARTICIPATION / SCORING / RETEST / HISTORIQUE             */
/* ------------------------------------------------------------------ */

// Quiz disponibles pour l'utilisateur connecte (actifs + au moins 1 question)
// avec le statut de sa derniere tentative.
const getQuizzesDisponibles = async (req, res, next) => {
  const userId = req.auth ? req.auth.userId : null;
  try {
    const [rows] = await db.query(
      `SELECT q.id, q.titre, q.description, q.note_passage, q.retest_auto, q.nb_retest_max,
              FCH.titre AS fiche_titre,
              (SELECT COUNT(*) FROM B_QZ_QUESTION qq WHERE qq.id_Quiz = q.id) AS nb_questions,
              (SELECT COUNT(*) FROM B_QZ_TENTATIVE t WHERE t.id_Quiz = q.id AND t.id_UTILISATEUR = ?) AS nb_essais,
              (SELECT t2.reussi FROM B_QZ_TENTATIVE t2 WHERE t2.id_Quiz = q.id AND t2.id_UTILISATEUR = ?
                 ORDER BY t2.id DESC LIMIT 1) AS derniere_reussi,
              (SELECT COUNT(*) FROM B_QZ_RETEST r WHERE r.id_Quiz = q.id AND r.id_UTILISATEUR = ? AND r.consomme = 0) AS retest_autorise
       FROM B_QZ_QUIZ q
       LEFT JOIN B_FICHE FCH ON FCH.id = q.id_Fiche
       WHERE q.Etat = 'ACTIF'
         AND (SELECT COUNT(*) FROM B_QZ_QUESTION qq WHERE qq.id_Quiz = q.id) > 0
       ORDER BY q.id DESC`,
      [userId, userId, userId]
    );
    return res.status(200).send(rows);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

// Quiz a passer : questions + options SANS reveler la bonne reponse
const getQuizForTaking = async (req, res, next) => {
  const { id } = req.params;
  const userId = req.auth ? req.auth.userId : null;
  try {
    const [quizRows] = await db.query(
      `SELECT id, titre, description, note_passage, retest_auto, nb_retest_max, duree
       FROM B_QZ_QUIZ WHERE id = ? AND Etat = 'ACTIF'`,
      [id]
    );
    if (!quizRows.length) {
      return res.status(404).json({ message: "Quiz introuvable" });
    }
    // Le superviseur et le gestionnaire ne participent pas aux quiz.
    const roleTake = await getRole(userId);
    if (roleTake === "R_SUP" || roleTake === "R_GB") {
      return res.status(403).json({ message: "Ce profil ne participe pas aux quiz." });
    }
    // Restriction par site (si le quiz cible des sites)
    if (!(await utilisateurDansSiteDuQuiz(userId, id))) {
      return res.status(403).json({ message: "Ce quiz n'est pas destine a votre site." });
    }
    // Restriction par adresse IP (liste blanche du quiz), si definie
    if (!(await ipAutoriseePourQuiz(id, req))) {
      await enregistrerDemandeIp(id, userId, req);
      return res.status(403).json({
        code: "IP_EN_ATTENTE",
        message:
          "Acces refuse : votre adresse IP n'est pas autorisee. Une demande a ete transmise pour autorisation.",
      });
    }
    const quiz = quizRows[0];
    const [questions] = await db.query(
      `SELECT id, id_Quiz, type, libelle, ordre FROM B_QZ_QUESTION WHERE id_Quiz = ? ORDER BY ordre, id`,
      [id]
    );
    const [options] = await db.query(
      `SELECT o.id, o.id_Question, o.libelle, o.ordre
       FROM B_QZ_OPTION o JOIN B_QZ_QUESTION qq ON qq.id = o.id_Question
       WHERE qq.id_Quiz = ? ORDER BY o.ordre, o.id`,
      [id]
    );
    const byQ = {};
    for (const o of options) (byQ[o.id_Question] = byQ[o.id_Question] || []).push(o);
    for (const q of questions) q.options = byQ[q.id] || [];
    quiz.questions = questions;

    // Le conseiller peut participer si jamais tente, OU si un retest a ete
    // autorise par le superviseur (non consomme).
    const [cnt] = await db.query(
      `SELECT COUNT(*) AS n FROM B_QZ_TENTATIVE WHERE id_Quiz=? AND id_UTILISATEUR=?`,
      [id, userId]
    );
    let peut = cnt[0].n === 0;
    if (!peut) {
      const [autos] = await db.query(
        `SELECT id FROM B_QZ_RETEST WHERE id_Quiz=? AND id_UTILISATEUR=? AND consomme=0 LIMIT 1`,
        [id, userId]
      );
      peut = autos.length > 0;
    }
    quiz.deja_tente = cnt[0].n > 0;
    quiz.peut_participer = peut;

    // Horodate l'ouverture (date de debut de la tentative). INSERT IGNORE : on ne
    // reinitialise PAS a chaque rechargement -> le chrono reste base sur le 1er debut.
    if (peut) {
      await db.query(
        "INSERT IGNORE INTO B_QZ_SESSION (id_Quiz, id_UTILISATEUR, date_debut) VALUES (?,?,NOW())",
        [id, userId]
      );
      const [sess] = await db.query(
        "SELECT TIMESTAMPDIFF(SECOND, date_debut, NOW()) AS ecoule FROM B_QZ_SESSION WHERE id_Quiz=? AND id_UTILISATEUR=?",
        [id, userId]
      );
      // Temps deja ecoule depuis le debut (pour un chrono resistant au rechargement)
      quiz.temps_ecoule_secondes = sess.length ? Math.max(0, sess[0].ecoule) : 0;
    }

    return res.status(200).send(quiz);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

// Soumission : evalue, enregistre la tentative + reponses, renvoie le feedback
const soumettreQuiz = async (req, res, next) => {
  const { id } = req.params;
  const userId = req.auth ? req.auth.userId : null;
  const { reponses } = req.body; // [{ id_Question, id_Option }]
  if (!id || !userId || !Array.isArray(reponses)) {
    return res.status(403).json({ message: "Merci de bien renseigner les parametres" });
  }
  // Le superviseur et le gestionnaire ne participent pas aux quiz.
  const roleSub = await getRole(userId);
  if (roleSub === "R_SUP" || roleSub === "R_GB") {
    return res.status(403).json({ message: "Ce profil ne participe pas aux quiz." });
  }
  if (!(await ipAutoriseePourQuiz(id, req))) {
    await enregistrerDemandeIp(id, userId, req);
    return res.status(403).json({
      code: "IP_EN_ATTENTE",
      message:
        "Acces refuse : votre adresse IP n'est pas autorisee. Une demande a ete transmise pour autorisation.",
    });
  }
  const connection = await db.getConnection();
  try {
    const [quizRows] = await connection.query(
      `SELECT id, note_passage, retest_auto, nb_retest_max FROM B_QZ_QUIZ WHERE id = ?`,
      [id]
    );
    if (!quizRows.length) {
      connection.release();
      return res.status(404).json({ message: "Quiz introuvable" });
    }
    const quiz = quizRows[0];

    // Questions + options (avec bonne reponse, cote serveur)
    const [questions] = await connection.query(
      `SELECT id, libelle, type FROM B_QZ_QUESTION WHERE id_Quiz = ? ORDER BY ordre, id`,
      [id]
    );
    const [options] = await connection.query(
      `SELECT o.id, o.id_Question, o.libelle, o.est_correcte
       FROM B_QZ_OPTION o JOIN B_QZ_QUESTION qq ON qq.id = o.id_Question
       WHERE qq.id_Quiz = ?`,
      [id]
    );
    const optByQ = {};
    for (const o of options) (optByQ[o.id_Question] = optByQ[o.id_Question] || []).push(o);

    // Normalise les choix en tableaux d'ids (QCM = plusieurs ; QCU/Vrai-Faux = 1 ;
    // compat : ancien format id_Option unique)
    const choixParQuestion = {};
    for (const r of reponses) {
      const arr = Array.isArray(r.id_Options)
        ? r.id_Options
        : r.id_Option != null
          ? [r.id_Option]
          : [];
      choixParQuestion[r.id_Question] = arr.map(Number).filter(x => !Number.isNaN(x));
    }

    // Evaluation : une question est correcte si l'ensemble des options choisies
    // est exactement egal a l'ensemble des bonnes reponses (tout ou rien).
    const feedback = [];
    let nbBonnes = 0;
    for (const q of questions) {
      const opts = optByQ[q.id] || [];
      const corrects = opts.filter(o => o.est_correcte).map(o => Number(o.id));
      const choisis = choixParQuestion[q.id] || [];
      const setC = new Set(corrects);
      const setX = new Set(choisis);
      const estCorrecte =
        setC.size > 0 && setC.size === setX.size && [...setX].every(x => setC.has(x));
      if (estCorrecte) nbBonnes++;
      feedback.push({
        id_Question: q.id,
        libelle: q.libelle,
        type: q.type,
        ids_choisis: choisis,
        ids_corrects: corrects,
        bonnes_reponses: opts.filter(o => o.est_correcte).map(o => o.libelle),
        est_correcte: estCorrecte ? 1 : 0,
      });
    }
    const nbTotal = questions.length;
    const score = nbTotal ? Math.round((nbBonnes / nbTotal) * 10000) / 100 : 0;
    const reussi = score >= quiz.note_passage;

    // Numero d'essai
    const [cnt] = await connection.query(
      `SELECT COUNT(*) AS n FROM B_QZ_TENTATIVE WHERE id_Quiz = ? AND id_UTILISATEUR = ?`,
      [id, userId]
    );
    const numEssai = cnt[0].n + 1;

    // Retest controle par le superviseur : au-dela de la 1ere tentative, une
    // autorisation non consommee est obligatoire (le conseiller ne peut pas
    // refaire de lui-meme).
    let retestAutoId = null;
    if (numEssai > 1) {
      const [autos] = await connection.query(
        `SELECT id FROM B_QZ_RETEST WHERE id_Quiz=? AND id_UTILISATEUR=? AND consomme=0 ORDER BY id LIMIT 1`,
        [id, userId]
      );
      if (!autos.length) {
        connection.release();
        return res.status(403).json({
          message:
            "Retest non autorise. Votre superviseur doit autoriser une nouvelle tentative.",
        });
      }
      retestAutoId = autos[0].id;
    }
    const statut = reussi ? "REUSSI" : "ECHEC";

    // Temps reel : date_debut = ouverture (B_QZ_SESSION), date_fin = maintenant
    const [sess] = await connection.query(
      "SELECT date_debut FROM B_QZ_SESSION WHERE id_Quiz=? AND id_UTILISATEUR=?",
      [id, userId]
    );
    const dateFin = new Date();
    const dateDebut = sess.length ? sess[0].date_debut : dateFin;

    await connection.beginTransaction();
    const [t] = await connection.query(
      `INSERT INTO B_QZ_TENTATIVE
        (id_Quiz, id_UTILISATEUR, score, nb_bonnes, nb_total, reussi, num_essai, statut, date_tentative, date_debut, date_fin)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [id, userId, score, nbBonnes, nbTotal, reussi ? 1 : 0, numEssai, statut, dateFin, dateDebut, dateFin]
    );
    const tentativeId = t.insertId;
    for (const f of feedback) {
      // Une ligne par question (id_Option = 1er choix, ou null) : conserve la
      // conformite par question pour l'historique et les rapports.
      await connection.query(
        `INSERT INTO B_QZ_REPONSE (id_Tentative, id_Question, id_Option, est_correcte) VALUES (?,?,?,?)`,
        [tentativeId, f.id_Question, f.ids_choisis.length ? f.ids_choisis[0] : null, f.est_correcte]
      );
    }

    // Consomme l'autorisation de retest le cas echeant
    if (retestAutoId) {
      await connection.query(
        `UPDATE B_QZ_RETEST SET consomme=1, date_consommation=? WHERE id=?`,
        [new Date(), retestAutoId]
      );
    }

    // Attribution des badges (recompenses) selon les resultats cumules
    const nouveauxBadges = await attribuerBadges(connection, userId);

    // Session de passage consommee
    await connection.query(
      "DELETE FROM B_QZ_SESSION WHERE id_Quiz=? AND id_UTILISATEUR=?",
      [id, userId]
    );

    await connection.commit();

    // NB : on ne renvoie PAS le detail par question (bonnes reponses) au
    // conseiller — il ne voit que le resultat global (reussite / echec).
    return res.status(201).json({
      message: reussi ? "Quiz reussi" : "Quiz echoue",
      id_tentative: tentativeId,
      score,
      nb_bonnes: nbBonnes,
      nb_total: nbTotal,
      note_passage: quiz.note_passage,
      reussi,
      num_essai: numEssai,
      statut,
      nouveaux_badges: nouveauxBadges,
    });
  } catch (error) {
    try { await connection.rollback(); } catch (e) {}
    console.log(error);
    res.status(500).json({ message: "Error request" });
  } finally {
    connection.release();
  }
};

// Historique des scores de l'utilisateur connecte
const getMesScores = async (req, res, next) => {
  const userId = req.auth ? req.auth.userId : null;
  try {
    const [rows] = await db.query(
      `SELECT t.id, t.id_Quiz, q.titre AS quiz_titre, t.score, t.nb_bonnes, t.nb_total,
              t.reussi, t.num_essai, t.statut, t.date_tentative
       FROM B_QZ_TENTATIVE t
       JOIN B_QZ_QUIZ q ON q.id = t.id_Quiz
       WHERE t.id_UTILISATEUR = ?
       ORDER BY t.id DESC`,
      [userId]
    );
    return res.status(200).send(rows);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

/* ------------------------------------------------------------------ */
/* PHASE 3 - NOTIFICATIONS "NOUVEAUX QUIZ" (section dediee)            */
/* ------------------------------------------------------------------ */

// Notifie les utilisateurs (agents R_TC + superviseurs R_SUP) qu'un quiz
// est disponible. Insere une notification dediee par utilisateur cible.
const notifierQuiz = async (req, res, next) => {
  const { id } = req.params;
  try {
    const [quizRows] = await db.query(`SELECT id, titre FROM B_QZ_QUIZ WHERE id=?`, [id]);
    if (!quizRows.length) {
      return res.status(404).json({ message: "Quiz introuvable" });
    }
    const titre = quizRows[0].titre;

    const [cibles] = await db.query(
      `SELECT u.id FROM B_UTILISATEUR u
       INNER JOIN B_FONCTION f ON u.id_Fonction = f.id
       WHERE f.Role_Associe IN ('R_TC','R_SUP') AND u.status = 'ACTIF'`
    );
    const now = new Date();
    const message = `Un nouveau quiz est disponible : ${titre}`;
    for (const c of cibles) {
      await db.query(
        `INSERT INTO B_QZ_NOTIFICATION (id_Quiz, id_UTILISATEUR, titre, message, lu, dateCreation)
         VALUES (?,?,?,?,?,?)`,
        [id, c.id, "Nouveau quiz", message, 0, now]
      );
    }
    return res.status(201).json({
      message: `Notification envoyee a ${cibles.length} utilisateur(s)`,
      nb: cibles.length,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

// Notifications quiz de l'utilisateur connecte (section "Nouveautes")
const getMesNotificationsQuiz = async (req, res, next) => {
  const userId = req.auth ? req.auth.userId : null;
  try {
    const [rows] = await db.query(
      `SELECT n.id, n.id_Quiz, n.titre, n.message, n.lu, n.dateCreation, q.Etat AS quiz_etat
       FROM B_QZ_NOTIFICATION n
       JOIN B_QZ_QUIZ q ON q.id = n.id_Quiz
       WHERE n.id_UTILISATEUR = ?
       ORDER BY n.id DESC`,
      [userId]
    );
    return res.status(200).send(rows);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

const marquerNotifLu = async (req, res, next) => {
  const { id } = req.params;
  const userId = req.auth ? req.auth.userId : null;
  try {
    await db.query(`UPDATE B_QZ_NOTIFICATION SET lu=1 WHERE id=? AND id_UTILISATEUR=?`, [id, userId]);
    return res.status(201).json({ message: "Notification marquee comme lue" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

const marquerToutNotifLu = async (req, res, next) => {
  const userId = req.auth ? req.auth.userId : null;
  try {
    await db.query(`UPDATE B_QZ_NOTIFICATION SET lu=1 WHERE id_UTILISATEUR=?`, [userId]);
    return res.status(201).json({ message: "Toutes les notifications sont lues" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

/* ------------------------------------------------------------------ */
/* PHASE 3 - BADGES / RECOMPENSES                                      */
/* ------------------------------------------------------------------ */

// Evalue et attribue les badges merites par l'utilisateur.
// Retourne les badges NOUVELLEMENT obtenus (pour feedback immediat).
const attribuerBadges = async (connection, userId) => {
  const [statsRows] = await connection.query(
    `SELECT
       (SELECT COUNT(DISTINCT id_Quiz) FROM B_QZ_TENTATIVE WHERE id_UTILISATEUR=? AND reussi=1) AS quiz_reussis,
       (SELECT COUNT(*) FROM B_QZ_TENTATIVE WHERE id_UTILISATEUR=? AND score=100) AS nb_parfaits`,
    [userId, userId]
  );
  const stats = statsRows[0] || {};
  const quizReussis = stats.quiz_reussis || 0;
  const nbParfaits = stats.nb_parfaits || 0;

  const [badges] = await connection.query(`SELECT * FROM B_QZ_BADGE`);
  const [dejaObtenus] = await connection.query(
    `SELECT id_Badge FROM B_QZ_BADGE_UTILISATEUR WHERE id_UTILISATEUR=?`,
    [userId]
  );
  const obtenus = new Set(dejaObtenus.map(b => b.id_Badge));

  const nouveaux = [];
  const now = new Date();
  for (const b of badges) {
    if (obtenus.has(b.id)) continue;
    let merite = false;
    if (b.condition_type === "QUIZ_REUSSIS") merite = quizReussis >= b.condition_valeur;
    else if (b.condition_type === "SCORE_PARFAIT") merite = nbParfaits >= 1;
    if (merite) {
      await connection.query(
        `INSERT IGNORE INTO B_QZ_BADGE_UTILISATEUR (id_Badge, id_UTILISATEUR, dateObtention) VALUES (?,?,?)`,
        [b.id, userId, now]
      );
      nouveaux.push({ code: b.code, nom: b.nom, description: b.description, icone: b.icone });
    }
  }
  return nouveaux;
};

// Tous les badges + drapeau "obtenu" pour l'utilisateur connecte
const getMesBadges = async (req, res, next) => {
  const userId = req.auth ? req.auth.userId : null;
  try {
    const [rows] = await db.query(
      `SELECT b.id, b.code, b.nom, b.description, b.icone,
              bu.dateObtention,
              IF(bu.id IS NULL, 0, 1) AS obtenu
       FROM B_QZ_BADGE b
       LEFT JOIN B_QZ_BADGE_UTILISATEUR bu
         ON bu.id_Badge = b.id AND bu.id_UTILISATEUR = ?
       ORDER BY b.condition_valeur, b.id`,
      [userId]
    );
    return res.status(200).send(rows);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

/* ------------------------------------------------------------------ */
/* PHASE 3 - RAPPORTS DE DIFFICULTE                                    */
/* ------------------------------------------------------------------ */

// Par quiz : nb tentatives, nb reussis, taux de reussite, score moyen.
// Trie du plus difficile (taux de reussite le plus faible) au plus facile.
const getRapportDifficulte = async (req, res, next) => {
  const userId = req.auth ? req.auth.userId : null;
  try {
    const role = await getRole(userId);
    const restreint = role !== "R_ADMI";
    const [rows] = await db.query(
      `SELECT q.id, q.titre, FCH.titre AS fiche_titre,
              COUNT(t.id) AS nb_tentatives,
              SUM(CASE WHEN t.reussi=1 THEN 1 ELSE 0 END) AS nb_reussis,
              ROUND(AVG(t.score), 2) AS score_moyen,
              ROUND(100 * SUM(CASE WHEN t.reussi=1 THEN 1 ELSE 0 END) / NULLIF(COUNT(t.id),0), 2) AS taux_reussite
       FROM B_QZ_QUIZ q
       LEFT JOIN B_FICHE FCH ON FCH.id = q.id_Fiche
       LEFT JOIN B_QZ_TENTATIVE t ON t.id_Quiz = q.id
       ${restreint ? "WHERE q.id_createur = ?" : ""}
       GROUP BY q.id, q.titre, FCH.titre
       ORDER BY (taux_reussite IS NULL) ASC, taux_reussite ASC, nb_tentatives DESC`,
      restreint ? [userId] : []
    );
    return res.status(200).send(rows);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

// Detail par question d'un quiz : taux d'echec (reponses incorrectes)
const getRapportQuestions = async (req, res, next) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query(
      `SELECT qq.id, qq.libelle,
              COUNT(r.id) AS nb_reponses,
              SUM(CASE WHEN r.est_correcte=0 THEN 1 ELSE 0 END) AS nb_echecs,
              ROUND(100 * SUM(CASE WHEN r.est_correcte=0 THEN 1 ELSE 0 END) / NULLIF(COUNT(r.id),0), 2) AS taux_echec
       FROM B_QZ_QUESTION qq
       LEFT JOIN B_QZ_REPONSE r ON r.id_Question = qq.id
       WHERE qq.id_Quiz = ?
       GROUP BY qq.id, qq.libelle
       ORDER BY taux_echec DESC`,
      [id]
    );
    return res.status(200).send(rows);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

/* ------------------------------------------------------------------ */
/* RETEST CONTROLE PAR LE SUPERVISEUR                                  */
/* ------------------------------------------------------------------ */

// Liste des derniers echecs des agents (du superviseur, ou tous si admin),
// pour autoriser un retest. Indique si un retest est deja en attente.
const getRetestEchecs = async (req, res, next) => {
  const userId = req.auth ? req.auth.userId : null;
  try {
    const [urows] = await db.query(
      `SELECT f.Role_Associe AS role FROM B_UTILISATEUR u JOIN B_FONCTION f ON u.id_Fonction=f.id WHERE u.id=?`,
      [userId]
    );
    const estAdmin = urows.length && urows[0].role === "R_ADMI";
    const params = [];
    let scope = "";
    if (!estAdmin) {
      scope = `AND t.id_UTILISATEUR IN (SELECT id_AGENT FROM B_R_SUPERVISEUR_AGENT WHERE id_SUPERVISEUR = ?)`;
      params.push(userId);
    }
    const [rows] = await db.query(
      `SELECT t.id AS id_tentative, t.id_Quiz, t.id_UTILISATEUR, t.score, t.num_essai, t.date_tentative,
              q.titre AS quiz_titre, u.nom, u.prenom, u.nom_utilisateur AS login,
              (SELECT COUNT(*) FROM B_QZ_RETEST r
                 WHERE r.id_Quiz=t.id_Quiz AND r.id_UTILISATEUR=t.id_UTILISATEUR AND r.consomme=0) AS retest_en_attente
       FROM B_QZ_TENTATIVE t
       JOIN B_QZ_QUIZ q ON q.id = t.id_Quiz
       JOIN B_UTILISATEUR u ON u.id = t.id_UTILISATEUR
       WHERE t.reussi = 0
         AND t.id = (SELECT MAX(t2.id) FROM B_QZ_TENTATIVE t2
                       WHERE t2.id_Quiz=t.id_Quiz AND t2.id_UTILISATEUR=t.id_UTILISATEUR)
         ${scope}
       ORDER BY t.date_tentative DESC`,
      params
    );
    return res.status(200).send(rows);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

// Autorise un retest pour un agent sur un quiz + notifie l'agent.
const autoriserRetest = async (req, res, next) => {
  const { id_Quiz, id_UTILISATEUR } = req.body;
  if (!id_Quiz || !id_UTILISATEUR) {
    return res.status(403).json({ message: "Merci de bien renseigner les parametres" });
  }
  try {
    const [ex] = await db.query(
      `SELECT id FROM B_QZ_RETEST WHERE id_Quiz=? AND id_UTILISATEUR=? AND consomme=0`,
      [id_Quiz, id_UTILISATEUR]
    );
    if (ex.length) {
      return res.status(200).json({ message: "Un retest est deja en attente pour cet agent." });
    }
    const now = new Date();
    await db.query(
      `INSERT INTO B_QZ_RETEST (id_Quiz, id_UTILISATEUR, autorise_par, date_autorisation, consomme)
       VALUES (?,?,?,?,0)`,
      [id_Quiz, id_UTILISATEUR, req.auth ? req.auth.userId : null, now]
    );
    // Notifie l'agent (section "Nouveautes")
    const [q] = await db.query(`SELECT titre FROM B_QZ_QUIZ WHERE id=?`, [id_Quiz]);
    const titreQuiz = q.length ? q[0].titre : "";
    await db.query(
      `INSERT INTO B_QZ_NOTIFICATION (id_Quiz, id_UTILISATEUR, titre, message, lu, dateCreation)
       VALUES (?,?,?,?,?,?)`,
      [id_Quiz, id_UTILISATEUR, "Retest autorise", `Un retest vous a ete autorise : ${titreQuiz}`, 0, now]
    );
    return res.status(201).json({ message: "Retest autorise et notifie a l'agent" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

// Resout un quiz a partir de son code PIN (saisi par le conseiller).
const getQuizByPin = async (req, res, next) => {
  const { pin } = req.params;
  const userId = req.auth ? req.auth.userId : null;
  // Tous les cas metier renvoient 200 + un champ "etat" : l'ErrorInterceptor
  // global du front redirige sur 403/404/500, ce qui masquerait l'ecran "en attente".
  if (!pin) {
    return res.status(200).json({ etat: "PIN_INVALIDE" });
  }
  try {
    const role = await getRole(userId);
    if (role === "R_SUP" || role === "R_GB") {
      return res.status(200).json({ etat: "PROFIL_EXCLU" });
    }
    const [r] = await db.query(
      "SELECT id, titre, Etat FROM B_QZ_QUIZ WHERE code_pin=?",
      [String(pin).trim()]
    );
    if (!r.length) {
      return res.status(200).json({ etat: "PIN_INVALIDE" });
    }
    if (r[0].Etat !== "ACTIF") {
      return res.status(200).json({ etat: "INDISPONIBLE", titre: r[0].titre });
    }
    // Restriction par site : si le quiz cible des sites, l'utilisateur doit en faire partie
    if (!(await utilisateurDansSiteDuQuiz(userId, r[0].id))) {
      return res.status(200).json({ etat: "HORS_SITE", titre: r[0].titre });
    }
    // Controle machine (parametre "autoriser_machines") : si la machine n'est pas
    // autorisee, on enregistre une demande et on renvoie l'etat "en attente".
    if (!(await ipAutoriseePourQuiz(r[0].id, req))) {
      await enregistrerDemandeIp(r[0].id, userId, req);
      return res.status(200).json({ etat: "EN_ATTENTE", titre: r[0].titre });
    }
    return res.status(200).json({ etat: "OK", id: r[0].id, titre: r[0].titre });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

// ============ Rapport : questions ratees (distribution des reponses) ============
const getRapportQuestionsRatees = async (req, res) => {
  const { id } = req.params;
  const userId = req.auth ? req.auth.userId : null;
  try {
    if (!(await peutVoirDetailQuiz(userId, id))) {
      return res.status(403).json({ message: "Acces non autorise a ce quiz" });
    }
    // Questions ayant au moins un agent en echec
    const [questions] = await db.query(
      `SELECT qq.id, qq.libelle,
              COUNT(DISTINCT CASE WHEN r.est_correcte = 0 THEN t.id_UTILISATEUR END) AS nb_agents
       FROM B_QZ_QUESTION qq
       LEFT JOIN B_QZ_REPONSE r ON r.id_Question = qq.id
       LEFT JOIN B_QZ_TENTATIVE t ON t.id = r.id_Tentative
       WHERE qq.id_Quiz = ?
       GROUP BY qq.id, qq.libelle
       HAVING nb_agents > 0
       ORDER BY nb_agents DESC, qq.ordre, qq.id`,
      [id]
    );
    // Distribution des choix par option pour chaque question
    for (const q of questions) {
      const [opts] = await db.query(
        `SELECT o.id, o.libelle, o.est_correcte,
                (SELECT COUNT(*) FROM B_QZ_REPONSE r
                   WHERE r.id_Question = o.id_Question AND r.id_Option = o.id) AS nb_choix
         FROM B_QZ_OPTION o WHERE o.id_Question = ? ORDER BY o.ordre, o.id`,
        [q.id]
      );
      q.options = opts;
    }
    return res.status(200).send(questions);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

// ============ Rapport : participants d'un quiz (avec filtres) ============
const getRapportParticipants = async (req, res) => {
  const { id } = req.params;
  const userId = req.auth ? req.auth.userId : null;
  const { agent, statut, site } = req.query;
  try {
    if (!(await peutVoirDetailQuiz(userId, id))) {
      return res.status(403).json({ message: "Acces non autorise a ce quiz" });
    }
    const where = ["t.id_Quiz = ?"];
    const params = [id];
    if (agent && String(agent).trim()) {
      where.push("t.id_UTILISATEUR = ?");
      params.push(Number(agent));
    }
    if (statut === "REUSSI") where.push("t.reussi = 1");
    else if (statut === "ECHEC") where.push("t.reussi = 0");
    if (site && String(site).trim()) {
      where.push("u.id_Site = ?");
      params.push(Number(site));
    }
    const [rows] = await db.query(
      `SELECT t.id, t.id_UTILISATEUR, u.prenom, u.nom, u.id_Site, st.nom AS site,
              t.date_debut, t.date_fin, t.date_tentative, t.score, t.reussi, t.num_essai, t.statut,
              TIMESTAMPDIFF(SECOND, t.date_debut, t.date_fin) AS temps_secondes
       FROM B_QZ_TENTATIVE t
       JOIN B_UTILISATEUR u ON u.id = t.id_UTILISATEUR
       LEFT JOIN B_SITE st ON st.id = u.id_Site
       WHERE ${where.join(" AND ")}
       ORDER BY t.id DESC`,
      params
    );
    return res.status(200).send(rows);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

// Detail d'une tentative (pour l'action "oeil") : resultat + conformite par question
const getTentativeDetail = async (req, res) => {
  const { tid } = req.params;
  const userId = req.auth ? req.auth.userId : null;
  try {
    const [tr] = await db.query(
      `SELECT t.id, t.id_Quiz, t.id_UTILISATEUR, u.prenom, u.nom, st.nom AS site,
              t.score, t.reussi, t.num_essai, t.statut, t.date_debut, t.date_fin,
              TIMESTAMPDIFF(SECOND, t.date_debut, t.date_fin) AS temps_secondes,
              q.titre AS quiz_titre
       FROM B_QZ_TENTATIVE t
       JOIN B_UTILISATEUR u ON u.id = t.id_UTILISATEUR
       JOIN B_QZ_QUIZ q ON q.id = t.id_Quiz
       LEFT JOIN B_SITE st ON st.id = u.id_Site
       WHERE t.id = ?`,
      [tid]
    );
    if (!tr.length) return res.status(404).json({ message: "Tentative introuvable" });
    if (!(await peutVoirDetailQuiz(userId, tr[0].id_Quiz))) {
      return res.status(403).json({ message: "Acces non autorise" });
    }
    const [reps] = await db.query(
      `SELECT r.id_Question, qq.libelle, r.est_correcte
       FROM B_QZ_REPONSE r JOIN B_QZ_QUESTION qq ON qq.id = r.id_Question
       WHERE r.id_Tentative = ? ORDER BY qq.ordre, qq.id`,
      [tid]
    );
    return res.status(200).json({ ...tr[0], reponses: reps });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

// ============ Quiz PUBLICS visibles selon le site (sans code PIN) ============
const getQuizPublics = async (req, res) => {
  const userId = req.auth ? req.auth.userId : null;
  try {
    const role = await getRole(userId);
    if (role === "R_SUP" || role === "R_GB") return res.status(200).send([]);
    const [u] = await db.query("SELECT id_Site FROM B_UTILISATEUR WHERE id = ?", [userId]);
    const userSite = u.length ? u[0].id_Site : null;
    const [rows] = await db.query(
      `SELECT q.id, q.titre, q.note_passage, q.duree, q.dateCreation,
              (SELECT GROUP_CONCAT(st.nom SEPARATOR ', ') FROM B_QZ_QUIZ_SITE qs
                 JOIN B_SITE st ON st.id = qs.id_Site WHERE qs.id_Quiz = q.id) AS sites_titres,
              (SELECT COUNT(*) FROM B_QZ_QUESTION qq WHERE qq.id_Quiz = q.id) AS nb_questions,
              (SELECT COUNT(*) FROM B_QZ_TENTATIVE t WHERE t.id_Quiz = q.id AND t.id_UTILISATEUR = ?) AS nb_essais,
              (SELECT TIMESTAMPDIFF(SECOND, ss.date_debut, NOW()) FROM B_QZ_SESSION ss
                 WHERE ss.id_Quiz = q.id AND ss.id_UTILISATEUR = ?) AS temps_ecoule_secondes
       FROM B_QZ_QUIZ q
       WHERE q.Etat = 'ACTIF' AND q.acces = 'PUBLIC'
         AND (SELECT COUNT(*) FROM B_QZ_QUESTION qq WHERE qq.id_Quiz = q.id) > 0
         AND ( NOT EXISTS (SELECT 1 FROM B_QZ_QUIZ_SITE s WHERE s.id_Quiz = q.id)
               OR EXISTS (SELECT 1 FROM B_QZ_QUIZ_SITE s WHERE s.id_Quiz = q.id AND s.id_Site = ?) )
       ORDER BY q.id DESC`,
      [userId, userId, userSite]
    );
    return res.status(200).send(rows);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

// ============ Demandes d'acces IP en attente (validation) ============
const getQuizIpDemandes = async (req, res) => {
  const { id } = req.params;
  const userId = req.auth ? req.auth.userId : null;
  try {
    const estGestionnaire = await peutGererQuiz(userId, id); // admin ou createur
    let scope = "";
    const params = [id];
    if (!estGestionnaire) {
      scope = "AND d.id_UTILISATEUR IN (SELECT id_AGENT FROM B_R_SUPERVISEUR_AGENT WHERE id_SUPERVISEUR = ?)";
      params.push(userId);
    }
    const [rows] = await db.query(
      "SELECT d.id, d.id_Quiz, d.id_UTILISATEUR, d.adresse_ip, d.statut, d.dateCreation, u.nom, u.prenom, u.nom_utilisateur AS login FROM B_QZ_IP_DEMANDE d JOIN B_UTILISATEUR u ON u.id = d.id_UTILISATEUR WHERE d.id_Quiz = ? AND d.statut = 'EN_ATTENTE' " + scope + " ORDER BY d.dateCreation DESC",
      params
    );
    return res.status(200).send(rows);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

const traiterDemandeIp = async (req, res) => {
  const { demandeId } = req.params;
  const { decision } = req.body; // 'AUTORISER' | 'REFUSER'
  const userId = req.auth ? req.auth.userId : null;
  if (!["AUTORISER", "REFUSER"].includes(decision)) {
    return res.status(403).json({ message: "Decision invalide" });
  }
  try {
    const [drows] = await db.query("SELECT * FROM B_QZ_IP_DEMANDE WHERE id = ?", [demandeId]);
    if (!drows.length) return res.status(404).json({ message: "Demande introuvable" });
    const dem = drows[0];
    if (dem.statut !== "EN_ATTENTE") {
      return res.status(409).json({ message: "Demande deja traitee" });
    }
    let autorise = await peutGererQuiz(userId, dem.id_Quiz);
    if (!autorise) {
      const [sup] = await db.query(
        "SELECT 1 FROM B_R_SUPERVISEUR_AGENT WHERE id_SUPERVISEUR = ? AND id_AGENT = ? LIMIT 1",
        [userId, dem.id_UTILISATEUR]
      );
      autorise = sup.length > 0;
    }
    if (!autorise) return res.status(403).json({ message: "Acces non autorise" });

    const now = new Date().toISOString().slice(0, 19).replace("T", " ");
    if (decision === "AUTORISER") {
      await db.query(
        "INSERT INTO B_QZ_IP_AUTORISEE (id_Quiz, adresse_ip, libelle, dateCreation) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE libelle = VALUES(libelle)",
        [dem.id_Quiz, dem.adresse_ip, "Demande approuvee", now]
      );
      await db.query(
        "UPDATE B_QZ_IP_DEMANDE SET statut='AUTORISE', dateTraitement=?, id_traitePar=? WHERE id_Quiz=? AND adresse_ip=? AND statut='EN_ATTENTE'",
        [now, userId, dem.id_Quiz, dem.adresse_ip]
      );
      return res.status(200).json({ message: "Acces autorise pour cette adresse IP" });
    }
    await db.query(
      "UPDATE B_QZ_IP_DEMANDE SET statut='REFUSE', dateTraitement=?, id_traitePar=? WHERE id=?",
      [now, userId, demandeId]
    );
    return res.status(200).json({ message: "Demande refusee" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

// ================= Autorisations IP (liste blanche par quiz) =================
const getQuizIps = async (req, res) => {
  const { id } = req.params;
  const userId = req.auth ? req.auth.userId : null;
  try {
    if (!(await peutVoirDetailQuiz(userId, id))) {
      return res.status(403).json({ message: "Acces non autorise a ce quiz" });
    }
    const [rows] = await db.query(
      `SELECT i.id, i.id_Quiz, i.adresse_ip, i.libelle, i.dateCreation,
              (SELECT GROUP_CONCAT(DISTINCT CONCAT(u.prenom, ' ', u.nom) SEPARATOR ', ')
                 FROM B_QZ_IP_DEMANDE d
                 JOIN B_UTILISATEUR u ON u.id = d.id_UTILISATEUR
                WHERE d.id_Quiz = i.id_Quiz AND d.adresse_ip = i.adresse_ip) AS agents
       FROM B_QZ_IP_AUTORISEE i
       WHERE i.id_Quiz = ? ORDER BY i.id`,
      [id]
    );
    return res.status(200).send(rows);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

const addQuizIp = async (req, res) => {
  const { id } = req.params;
  const userId = req.auth ? req.auth.userId : null;
  const { adresse_ip, libelle } = req.body;
  if (!adresse_ip || !String(adresse_ip).trim()) {
    return res.status(403).json({ message: "Merci de saisir une adresse IP" });
  }
  try {
    if (!(await peutGererQuiz(userId, id))) {
      return res.status(403).json({ message: "Acces non autorise a ce quiz" });
    }
    const ip = String(adresse_ip).trim();
    const now = new Date().toISOString().slice(0, 19).replace("T", " ");
    const [r] = await db.query(
      "INSERT INTO B_QZ_IP_AUTORISEE (id_Quiz, adresse_ip, libelle, dateCreation) VALUES (?,?,?,?)",
      [id, ip, libelle ? String(libelle).trim() : null, now]
    );
    return res.status(201).json({ message: "Adresse IP ajoutee", id: r.insertId });
  } catch (error) {
    if (error && error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Cette adresse IP est deja autorisee" });
    }
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

const deleteQuizIp = async (req, res) => {
  const { ipId } = req.params;
  const userId = req.auth ? req.auth.userId : null;
  try {
    const [rows] = await db.query("SELECT id_Quiz FROM B_QZ_IP_AUTORISEE WHERE id = ?", [ipId]);
    if (!rows.length) return res.status(404).json({ message: "Introuvable" });
    if (!(await peutGererQuiz(userId, rows[0].id_Quiz))) {
      return res.status(403).json({ message: "Acces non autorise a ce quiz" });
    }
    await db.query("DELETE FROM B_QZ_IP_AUTORISEE WHERE id = ?", [ipId]);
    return res.status(200).json({ message: "Adresse IP supprimee" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

module.exports = {
  getAllQuiz,
  getOneQuiz,
  addQuiz,
  updateQuiz,
  deleteQuiz,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  getFichesRecentes,
  // Phase 2 - participation
  getQuizzesDisponibles,
  getQuizForTaking,
  getQuizByPin,
  soumettreQuiz,
  getMesScores,
  // Phase 3 - notifications
  notifierQuiz,
  getMesNotificationsQuiz,
  marquerNotifLu,
  marquerToutNotifLu,
  // Phase 3 - badges
  getMesBadges,
  // Phase 3 - rapports
  getRapportDifficulte,
  getRapportQuestions,
  // Retest superviseur
  getRetestEchecs,
  autoriserRetest,
  // Autorisations IP
  getQuizIps,
  addQuizIp,
  deleteQuizIp,
  getQuizIpDemandes,
  traiterDemandeIp,
  // Quiz publics (par site)
  getQuizPublics,
  // Rapport participants
  getRapportParticipants,
  getTentativeDetail,
  getRapportQuestionsRatees,
};
