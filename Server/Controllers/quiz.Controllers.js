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
      SELECT q.id, q.titre, q.type, q.duree, q.date_fermeture, q.description, q.id_Fiche,
             q.note_passage, q.acces, q.alterner_questions, q.autoriser_machines,
             q.retest_auto, q.nb_retest_max, q.Etat, q.id_createur, q.dateCreation, q.dateModification,
             FCH.titre AS fiche_titre,
             (SELECT GROUP_CONCAT(f2.titre SEPARATOR ', ') FROM B_QZ_QUIZ_FICHE qf
                JOIN B_FICHE f2 ON f2.id = qf.id_Fiche WHERE qf.id_Quiz = q.id) AS fiches_titres,
             (SELECT COUNT(*) FROM B_QZ_QUESTION qq WHERE qq.id_Quiz = q.id) AS nb_questions
      FROM B_QZ_QUIZ q
      LEFT JOIN B_FICHE FCH ON FCH.id = q.id_Fiche
      ${restreint ? "WHERE q.id_createur = ?" : ""}
      ORDER BY q.id DESC`;
    const [resultat] = await db.query(Query, restreint ? [userId] : []);
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
      `SELECT q.id, q.titre, q.type, q.duree, q.date_fermeture, q.description, q.id_Fiche,
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
    const role = await getRole(userId);
    if (role !== "R_ADMI" && quiz.id_createur && quiz.id_createur !== userId) {
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

    return res.status(200).send(quiz);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

const addQuiz = async (req, res, next) => {
  const {
    titre, type, duree, date_fermeture, note_passage, acces,
    alterner_questions, autoriser_machines, id_Fiche, fiches, description,
    retest_auto, nb_retest_max,
  } = req.body;
  if (!titre) {
    return res
      .status(403)
      .json({ message: "Merci de bien renseigner les parametres" });
  }
  // Liste des fiches associees (n..n) ; compat : id_Fiche simple
  const listeFiches = Array.isArray(fiches) ? fiches : id_Fiche ? [id_Fiche] : [];
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [r] = await connection.query(
      `INSERT INTO B_QZ_QUIZ
        (titre, type, duree, date_fermeture, note_passage, acces, alterner_questions, autoriser_machines,
         id_Fiche, description, retest_auto, nb_retest_max, Etat, id_createur, dateCreation)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
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
    await connection.commit();
    return res.status(201).json({ message: "Quiz cree avec succes", id: r.insertId });
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
    alterner_questions, autoriser_machines, id_Fiche, fiches, description,
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
      `SELECT id, titre, description, note_passage, retest_auto, nb_retest_max
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

    await connection.beginTransaction();
    const [t] = await connection.query(
      `INSERT INTO B_QZ_TENTATIVE
        (id_Quiz, id_UTILISATEUR, score, nb_bonnes, nb_total, reussi, num_essai, statut, date_tentative)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [id, userId, score, nbBonnes, nbTotal, reussi ? 1 : 0, numEssai, statut, new Date()]
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
};
