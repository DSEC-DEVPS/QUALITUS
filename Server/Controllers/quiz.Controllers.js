// =====================================================================
// Controllers Quiz (nouveau modele structure) - Phase 1 : generateur
// Quiz -> Questions (Vrai/Faux) -> Options (avec bonne reponse)
// Coexiste avec le quiz legacy (B_QUIZ / B_REPONSE_QUIZ).
// =====================================================================
const db = require("../config/db");
const { lirePage, decouper, normaliser, trierCommeMaterial } = require("../utils/paginationMemoire");
const { synchroniserBadges, badgesUtilisateur } = require("../utils/badgesQuiz");
const { permissionsEffectives } = require("../middlewares/permission");
const { sqlRetestADecider, RETEST_MAX_MIN, RETEST_MAX_MAX } = require("../utils/retestQuiz");

// Role de l'utilisateur (pour scoper la visibilite des quiz).
const getRole = async (userId) => {
  if (!userId) return null;
  const [r] = await db.query(
    `SELECT f.Role_Associe AS role FROM B_UTILISATEUR u JOIN B_FONCTION f ON u.id_Fonction=f.id WHERE u.id=?`,
    [userId]
  );
  return r.length ? r[0].role : null;
};

// --- Modèle d'accès par site (cahier Quiz, Partie III) -------------------
// Site de rattachement d'un utilisateur.
const siteDe = async (userId) => {
  const [r] = await db.query("SELECT id_Site FROM B_UTILISATEUR WHERE id=?", [userId]);
  return r.length ? r[0].id_Site : null;
};
// Sites vers lesquels l'utilisateur peut DIFFUSER un quiz (out114, règle du site à
// vision globale) : null = tous les sites (administrateur, ou utilisateur du site à
// vision globale) ; sinon son site et le site à vision globale (s'il est paramétré).
const sitesDiffusionPermis = async (userId) => {
  const { porteeSite, PARAM_SITE_GLOBAL } = require("../utils/siteVisionGlobale");
  const role = await getRole(userId);
  const portee = await porteeSite(userId, role === "R_ADMI");
  if (portee.visionGlobale) return null;
  const [[param]] = await db.query(`SELECT valeur FROM b_param_habilitation WHERE cle = ?`, [PARAM_SITE_GLOBAL]);
  const global = param && /^\d+$/.test(String(param.valeur)) ? Number(param.valeur) : null;
  return [...new Set([portee.idSite, global].filter((x) => x != null).map(Number))];
};
// L'utilisateur appartient-il au SITE PROPRIÉTAIRE du quiz (= site du créateur) ?
const estSiteProprietaire = async (userId, idQuiz) => {
  const [r] = await db.query(
    `SELECT 1 FROM B_QZ_QUIZ q
       JOIN B_UTILISATEUR cr ON cr.id = q.id_createur
       JOIN B_UTILISATEUR me ON me.id = ?
      WHERE q.id = ? AND cr.id_Site = me.id_Site LIMIT 1`,
    [userId, idQuiz]
  );
  return r.length > 0;
};
// L'utilisateur est-il explicitement AUTORISÉ sur ce quiz (site invité) ?
const estAutorise = async (userId, idQuiz) => {
  const [r] = await db.query(
    "SELECT 1 FROM B_QZ_AUTORISE WHERE id_Quiz=? AND id_UTILISATEUR=? LIMIT 1",
    [idQuiz, userId]
  );
  return r.length > 0;
};

// GÉRER un quiz (config, diffusion, rapport, clôture) : admin, créateur,
// utilisateur du site propriétaire (équivalence, point 18), ou utilisateur
// explicitement autorisé (point 23). La suppression et l'autorisation d'autrui
// en sont EXCLUES (voir peutSupprimer / peutAutoriser).
const peutGererQuiz = async (userId, idQuiz) => {
  const role = await getRole(userId);
  if (role === "R_ADMI") return true;
  const [r] = await db.query(`SELECT id_createur FROM B_QZ_QUIZ WHERE id=?`, [idQuiz]);
  if (!r.length) return true; // laisse le handler renvoyer 404
  if (Number(r[0].id_createur) === Number(userId)) return true;
  if (await estSiteProprietaire(userId, idQuiz)) return true;
  if (await estAutorise(userId, idQuiz)) return true;
  return false;
};

// AUTORISER LE RETEST d'un agent sur un quiz :
//  - admin : tous les agents ;
//  - créateur / utilisateur du site propriétaire : tous les PARTICIPANTS du quiz,
//    quel que soit leur site ;
//  - utilisateur AUTORISÉ (site invité) : les participants de SON site ;
//  - site invité non autorisé : aucun.
const peutAutoriserRetest = async (userId, idQuiz, idAgent) => {
  const role = await getRole(userId);
  if (role === "R_ADMI") return true;
  const [r] = await db.query(`SELECT id_createur FROM B_QZ_QUIZ WHERE id=?`, [idQuiz]);
  if (!r.length) return false;
  if (!(await estParticipant(idAgent, idQuiz))) return false;
  if (Number(r[0].id_createur) === Number(userId)) return true;
  if (await estSiteProprietaire(userId, idQuiz)) return true;
  if (await estAutorise(userId, idQuiz)) {
    const [siteMoi, siteAgent] = await Promise.all([siteDe(userId), siteDe(idAgent)]);
    return siteMoi != null && Number(siteMoi) === Number(siteAgent);
  }
  return false;
};

// AUTORISER des utilisateurs d'un autre site (Partie IV) : réservé au site
// propriétaire (admin, créateur, ou utilisateur du site propriétaire). Un
// utilisateur simplement autorisé n'en dispose PAS (non-transmissibilité).
const peutAutoriser = async (userId, idQuiz) => {
  const role = await getRole(userId);
  if (role === "R_ADMI") return true;
  const [r] = await db.query(`SELECT id_createur FROM B_QZ_QUIZ WHERE id=?`, [idQuiz]);
  if (!r.length) return false;
  if (Number(r[0].id_createur) === Number(userId)) return true;
  return await estSiteProprietaire(userId, idQuiz);
};

// SUPPRIMER un quiz (point 24) : réservé au créateur. L'admin garde la voie
// d'administration (créateur parti). Non couvert par les équivalences.
const peutSupprimer = async (userId, idQuiz) => {
  const role = await getRole(userId);
  if (role === "R_ADMI") return true;
  const [r] = await db.query(`SELECT id_createur FROM B_QZ_QUIZ WHERE id=?`, [idQuiz]);
  if (!r.length) return false;
  return Number(r[0].id_createur) === Number(userId);
};

// CÔTÉ PROPRIÉTAIRE : admin, créateur ou utilisateur du site propriétaire.
// Seul ce côté peut : ajouter / modifier / supprimer les questions, changer le
// STATUT (actif / inactif) et modifier l'ensemble des paramètres du quiz.
// Un utilisateur autorisé (site invité) n'y a pas accès.
const estCoteProprietaire = async (userId, idQuiz) => {
  const role = await getRole(userId);
  if (role === "R_ADMI") return true;
  const [r] = await db.query(`SELECT id_createur FROM B_QZ_QUIZ WHERE id=?`, [idQuiz]);
  if (!r.length) return false;
  if (Number(r[0].id_createur) === Number(userId)) return true;
  return estSiteProprietaire(userId, idQuiz);
};

// Questions : réservées au côté propriétaire (contrôle à partir de la question).
const peutGererQuestion = async (userId, idQuestion) => {
  const [r] = await db.query(`SELECT id_Quiz FROM B_QZ_QUESTION WHERE id=?`, [idQuestion]);
  if (!r.length) return true; // laisse le handler renvoyer 404
  return estCoteProprietaire(userId, r[0].id_Quiz);
};
const MSG_QUESTIONS_PROPRIETAIRE =
  "Seul le site propriétaire peut ajouter, modifier ou supprimer les questions de ce quiz.";

// Filtre de période ?du=AAAA-MM-JJ&au=AAAA-MM-JJ (bornes incluses, chacune
// facultative) appliqué à la colonne DATETIME `col`.
// Renvoie { sql: " AND ...", params: [...] } ou { erreur: "message" }.
const RE_DATE = /^\d{4}-\d{2}-\d{2}$/;
const dateValide = (s) => RE_DATE.test(s) && !isNaN(new Date(`${s}T00:00:00Z`).getTime())
  && new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s;
const filtrePeriode = (query, col) => {
  const du = query && query.du ? String(query.du).trim() : "";
  const au = query && query.au ? String(query.au).trim() : "";
  if ((du && !dateValide(du)) || (au && !dateValide(au))) {
    return { erreur: "Période invalide : format de date attendu AAAA-MM-JJ." };
  }
  if (du && au && du > au) {
    return { erreur: "Période invalide : la date de début est postérieure à la date de fin." };
  }
  let sql = "";
  const params = [];
  if (du) { sql += ` AND ${col} >= ?`; params.push(`${du} 00:00:00`); }
  // Borne haute incluse : toute la journée « au ».
  if (au) { sql += ` AND ${col} < DATE_ADD(?, INTERVAL 1 DAY)`; params.push(`${au} 00:00:00`); }
  return { sql, params };
};

// Valeurs autorisées
const STATUTS_QUIZ = ["ACTIF", "INACTIF"];
const ETATS_QUIZ = ["OUVERT", "CLOTURER"];

// BARÈME : les points des questions d'un quiz totalisent exactement 100.
// Un quiz non conforme ne peut être ni activé, ni ouvert, ni diffusé, et
// n'est pas proposé aux participants tant que son barème n'est pas ajusté.
const BAREME_TOTAL = 100;
// out116 : points décimaux (2 décimales). Les sommes sont arrondies au centième pour
// éviter les erreurs de calcul des nombres à virgule (33,33 + 33,33 + 33,34 = 100).
const r2 = (x) => Math.round(Number(x || 0) * 100) / 100;
const egalBareme = (t) => Math.round(Number(t) * 100) === BAREME_TOTAL * 100;
const fmtPoints = (x) => String(r2(x)).replace(".", ",");
const SQL_TOTAL_POINTS = (alias) =>
  `(SELECT ROUND(COALESCE(SUM(qb.points), 0), 2) + 0e0 FROM B_QZ_QUESTION qb WHERE qb.id_Quiz = ${alias}.id)`;
// Comparaison exacte sur la somme DECIMAL (pas de flottant).
const SQL_BAREME_CONFORME = `(SELECT COALESCE(SUM(qb.points), 0) FROM B_QZ_QUESTION qb WHERE qb.id_Quiz = q.id) = ${BAREME_TOTAL}`;
const totalPointsQuiz = async (cx, idQuiz) => {
  const [[r]] = await cx.query("SELECT COALESCE(SUM(points), 0) AS t FROM B_QZ_QUESTION WHERE id_Quiz = ?", [idQuiz]);
  return r2(r.t);
};
const msgBareme = (total) =>
  `Le barème du quiz doit totaliser exactement ${BAREME_TOTAL} points (actuellement ${fmtPoints(total)}). ` +
  `Ajustez les points des questions ou utilisez « Répartir équitablement ».`;

// Le quiz peut-il être passé ? Renvoie null si oui, sinon le message à afficher.
// Conditions : statut ACTIF, état OUVERT, date de fermeture non dépassée,
// barème conforme (si total_points est fourni).
const indisponibiliteQuiz = (q) => {
  if (!q) return "Quiz introuvable.";
  if ((q.statut || "ACTIF") !== "ACTIF") return "Ce quiz n'est pas disponible.";
  if ((q.Etat || "OUVERT") !== "OUVERT") return "Ce quiz est clôturé.";
  if (q.total_points !== undefined && !egalBareme(q.total_points)) {
    return "Ce quiz n'est pas encore disponible : son barème est en cours d'ajustement.";
  }
  if (q.date_fermeture && new Date(q.date_fermeture) <= new Date()) {
    const d = new Date(q.date_fermeture);
    const p = (n) => String(n).padStart(2, "0");
    return `Ce quiz est fermé depuis le ${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}.`;
  }
  return null;
};
// Fragment SQL équivalent (listes « Participer »), alias q.
const SQL_QUIZ_DISPONIBLE =
  "q.statut = 'ACTIF' AND q.Etat = 'OUVERT' AND (q.date_fermeture IS NULL OR q.date_fermeture > NOW())";

// Délai de grâce à la date de fermeture : un passage COMMENCÉ avant l'échéance reste
// terminable et soumettable — jusqu'à la fin de son chrono (quiz chronométré, marge
// incluse), sinon GRACE_FERMETURE_MINUTES après la fermeture. Ne s'applique pas à une
// clôture manuelle (Etat CLOTURER) ni à un quiz inactif.
const GRACE_FERMETURE_MINUTES = 15;
// Fin de grâce (SQL) d'une session s du quiz q.
const sqlFinGrace = (s = "s", q = "q") =>
  `CASE WHEN ${q}.duree > 0 THEN ${s}.date_debut + INTERVAL (${q}.duree * 60 + ${MARGE_TEMPS_SECONDES}) SECOND
        ELSE ${q}.date_fermeture + INTERVAL ${GRACE_FERMETURE_MINUTES} MINUTE END`;
// Session s encore dans son délai de grâce (quiz q fermé par sa date seulement).
const sqlSessionEnGrace = (s = "s", q = "q") =>
  `(${q}.statut = 'ACTIF' AND ${q}.Etat = 'OUVERT' AND ${q}.date_fermeture IS NOT NULL
    AND ${q}.date_fermeture <= NOW() AND ${s}.date_debut < ${q}.date_fermeture
    AND (${q}.date_reinitialisation IS NULL OR ${s}.date_debut >= ${q}.date_reinitialisation)
    AND NOW() <= ${sqlFinGrace(s, q)})`;
// Fin de grâce du passage de l'utilisateur ("YYYY-MM-DDTHH:mm:ss", heure locale), ou null.
const finGracePassage = async (idQuiz, userId) => {
  const [r] = await db.query(
    `SELECT DATE_FORMAT(${sqlFinGrace("s", "q")}, '%Y-%m-%dT%H:%i:%s') AS fin
       FROM B_QZ_SESSION s JOIN B_QZ_QUIZ q ON q.id = s.id_Quiz
      WHERE s.id_Quiz = ? AND s.id_UTILISATEUR = ? AND ${sqlSessionEnGrace("s", "q")}
      LIMIT 1`,
    [idQuiz, userId]
  );
  return r.length ? r[0].fin : null;
};

// Peut CONSULTER la page detail d'un quiz : mêmes règles que la gestion
// (admin, créateur, site propriétaire, utilisateur autorisé). Être superviseur
// d'un agent participant ou ayant fait une demande d'accès IP ne suffit pas.
const peutVoirDetailQuiz = (userId, idQuiz) => peutGererQuiz(userId, idQuiz);

// Rapport d'un quiz (onglet Rapports du détail) : le côté propriétaire (admin,
// créateur, site propriétaire) voit tous les agents ; les autres (utilisateur
// autorisé d'un site invité) uniquement les agents de LEUR site.
// Renvoie null (aucune restriction) ou l'id du site imposé (-1 si l'utilisateur
// n'a pas de site : il ne voit alors aucun agent).
const siteImposeRapport = async (userId, idQuiz) => {
  if (await estCoteProprietaire(userId, idQuiz)) return null;
  const site = await siteDe(userId);
  return site == null ? -1 : Number(site);
};

// Participation : seuls les PARTICIPANTS DÉSIGNÉS (onglet Diffusion) peuvent
// passer un quiz, quel que soit leur profil (la permission quiz.participer est
// contrôlée sur les routes). Remplace l'ancienne restriction par « Sites concernés ».
const estParticipant = async (userId, idQuiz) => {
  if (!userId) return false;
  const [r] = await db.query(
    "SELECT 1 FROM B_QZ_PARTICIPANT WHERE id_Quiz = ? AND id_UTILISATEUR = ? LIMIT 1",
    [idQuiz, userId]
  );
  return r.length > 0;
};
const MSG_NON_PARTICIPANT = "Vous n'êtes pas participant à ce quiz.";

// Quiz PRIVÉ : déverrouillage mémorisé (B_QZ_PIN_VALIDE). Le participant qui a saisi
// le bon code PIN n'a plus à le ressaisir tant que le code du quiz est inchangé.
const memoriserPinValide = async (userId, idQuiz, codePin) => {
  if (!userId || !codePin) return;
  try {
    await db.query(
      `INSERT INTO B_QZ_PIN_VALIDE (id_Quiz, id_UTILISATEUR, code_pin, date_validation)
       VALUES (?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE code_pin = VALUES(code_pin), date_validation = NOW()`,
      [idQuiz, userId, String(codePin)]
    );
  } catch (e) {
    // Table absente (migration 51 non jouée) : le PIN reste simplement demandé.
    console.log("memoriserPinValide :", e.code || e.message);
  }
};
const pinDejaValide = async (userId, idQuiz, codePin) => {
  if (!userId || !codePin) return false;
  try {
    const [r] = await db.query(
      "SELECT 1 FROM B_QZ_PIN_VALIDE WHERE id_Quiz = ? AND id_UTILISATEUR = ? AND code_pin = ? LIMIT 1",
      [idQuiz, userId, String(codePin)]
    );
    return r.length > 0;
  } catch (e) {
    console.log("pinDejaValide :", e.code || e.message);
    return false;
  }
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
//  - Non (0) : seules les IP de la liste blanche autorisées POUR LE SITE du
//              participant passent (une même adresse privée peut exister sur
//              plusieurs sites) ; liste vide => aucune machine autorisee.
const ipAutoriseePourQuiz = async (idQuiz, req, userId) => {
  const [qr] = await db.query(
    "SELECT autoriser_machines FROM B_QZ_QUIZ WHERE id = ?",
    [idQuiz]
  );
  // Oui => acces libre a toutes les machines
  if (qr.length && Number(qr[0].autoriser_machines) === 1) return true;
  // Non => restriction par liste blanche d'IP
  const site = await siteDe(userId);
  if (site == null) return false; // participant sans site : aucune IP ne peut lui correspondre
  const [rows] = await db.query(
    "SELECT adresse_ip FROM B_QZ_IP_AUTORISEE WHERE id_Quiz = ? AND id_Site = ?",
    [idQuiz, site]
  );
  if (!rows.length) return false; // aucune IP autorisee pour ce site => aucune machine ne passe
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

// Liste des quiz (cahier Quiz, Partie III) : un quiz apparaît si son créateur
// est du MÊME SITE que l'utilisateur (quiz du site propriétaire, ouverture libre)
// OU si le site de l'utilisateur figure parmi les SITES INVITÉS, déduits des
// sites des participants (quiz d'un site invitant, ouverture soumise à
// autorisation explicite). L'admin voit tout. Chaque quiz porte `origine`
// (SITE | INVITE) et `autorise` (1 si l'utilisateur peut ouvrir le détail).
const getAllQuiz = async (req, res, next) => {
  const userId = req.auth ? req.auth.userId : null;
  try {
    const role = await getRole(userId);
    const admin = role === "R_ADMI";
    const monSite = await siteDe(userId);
    const per = filtrePeriode(req.query, "q.dateCreation");
    if (per.erreur) return res.status(400).json({ message: per.erreur });
    const Query = `
      SELECT q.id, q.titre, q.code_pin, q.type, q.duree, q.date_fermeture, q.description, q.id_Fiche,
             q.note_passage, q.acces, q.alterner_questions, q.autoriser_machines,
             q.retest_auto, q.nb_retest_max, q.Etat, q.statut, q.id_createur, q.dateCreation, q.dateModification,
             FCH.titre AS fiche_titre,
             (SELECT GROUP_CONCAT(f2.titre SEPARATOR ', ') FROM B_QZ_QUIZ_FICHE qf
                JOIN B_FICHE f2 ON f2.id = qf.id_Fiche WHERE qf.id_Quiz = q.id) AS fiches_titres,
             (SELECT COUNT(*) FROM B_QZ_QUESTION qq WHERE qq.id_Quiz = q.id) AS nb_questions,
             ${SQL_TOTAL_POINTS("q")} AS total_points,
             EXISTS(SELECT 1 FROM B_UTILISATEUR cr WHERE cr.id = q.id_createur AND cr.id_Site = ?) AS est_site_proprietaire,
             EXISTS(SELECT 1 FROM B_QZ_AUTORISE a WHERE a.id_Quiz = q.id AND a.id_UTILISATEUR = ?) AS est_autorise,
             ucr.id_Site AS createur_site_id, scr.nom AS createur_site
      FROM B_QZ_QUIZ q
      LEFT JOIN B_FICHE FCH ON FCH.id = q.id_Fiche
      LEFT JOIN B_UTILISATEUR ucr ON ucr.id = q.id_createur
      LEFT JOIN B_SITE scr ON scr.id = ucr.id_Site
      WHERE 1=1
      ${admin ? "" : `AND (
             q.id_createur = ?
             OR EXISTS(SELECT 1 FROM B_UTILISATEUR cr WHERE cr.id = q.id_createur AND cr.id_Site = ?)
             OR EXISTS(SELECT 1 FROM B_QZ_AUTORISE a2 WHERE a2.id_Quiz = q.id AND a2.id_UTILISATEUR = ?)
           )`}
      ${per.sql}
      ORDER BY q.id DESC`;
    // out114 : liste = quiz que l'on peut gérer (même règle que le détail, peutGererQuiz) :
    // créateur, site du créateur, ou utilisateur autorisé. Une simple diffusion à des
    // participants de son site ne rend plus le quiz visible dans la liste.
    const params = (admin ? [monSite, userId] : [monSite, userId, userId, monSite, userId]).concat(per.params);
    const [rows] = await db.query(Query, params);
    const fichesLiees = await fichesLieesParQuiz(rows.map(r => r.id));
    const result = rows.map((r) => {
      const estSite = admin || !!r.est_site_proprietaire;
      const autorise = admin || estSite || !!r.est_autorise;
      // Suppression (point D) : créateur ou admin uniquement.
      const peutSupprimer = admin || Number(r.id_createur) === Number(userId);
      return {
        ...r,
        origine: estSite ? "SITE" : "INVITE",
        autorise: autorise ? 1 : 0,
        peut_supprimer: peutSupprimer ? 1 : 0,
        // Activer / désactiver : côté propriétaire uniquement.
        cote_proprietaire: admin || estSite ? 1 : 0,
        fiches_liees: fichesLiees[r.id] || [],
      };
    });
    // out113 : ?page=&taille= (ou ?export=1 : toutes les lignes) -> filtres de l'écran
    // appliqués ici à l'identique (statut, recherche sur toutes les colonnes, tri).
    const pg = lirePage(req.query);
    if (pg || req.query.export === "1") {
      const st = ["ACTIF", "INACTIF"].includes(req.query.statut) ? req.query.statut : "";
      const t = String(req.query.q || "").trim().toLowerCase();
      // out115 : sites des créateurs des quiz visibles (liste du filtre) ; « aucun » = sans site.
      const sitesCreateurs = new Map();
      for (const q of result) {
        const k = q.createur_site_id == null ? "aucun" : String(q.createur_site_id);
        if (!sitesCreateurs.has(k)) sitesCreateurs.set(k, { id: k, nom: q.createur_site || "Sans site" });
      }
      const fSite = String(req.query.site_createur || "");
      let l = result.filter((q) => {
        if (fSite && (q.createur_site_id == null ? "aucun" : String(q.createur_site_id)) !== fSite) return false;
        if (st && (q.statut === "INACTIF" ? "INACTIF" : "ACTIF") !== st) return false;
        if (!t) return true;
        return Object.values(q).map((v) => (v === null || v === undefined ? "" : String(v))).join("◬").toLowerCase().includes(t);
      });
      const TRI = ["id", "titre", "code_pin", "fiche_titre", "nb_questions", "note_passage", "Etat", "statut", "createur_site"];
      if (TRI.includes(req.query.tri)) l = trierCommeMaterial(l, req.query.tri, req.query.sens);
      const sites_createurs = [...sitesCreateurs.values()]
        .sort((a, b) => (a.id === "aucun") - (b.id === "aucun") || a.nom.localeCompare(b.nom, "fr"));
      if (!pg) return res.status(200).json({ lignes: l, total: l.length, sites_createurs });
      return res.status(200).json({ ...decouper(l, pg), sites_createurs });
    }
    return res.status(200).send(result);
  } catch (error) {
    console.error("getAllQuiz:", error && error.message);
    res.status(500).json({ message: "Error request" });
  }
};

const getOneQuiz = async (req, res, next) => {
  const { id } = req.params;
  const userId = req.auth ? req.auth.userId : null;
  try {
    await cloturerSessionsExpirees({ idQuiz: id }); // passages au temps épuisé
    const [quizRows] = await db.query(
      `SELECT q.id, q.titre, q.code_pin, q.type, q.duree, q.date_fermeture, q.description, q.id_Fiche,
              q.note_passage, q.acces, q.alterner_questions, q.autoriser_machines,
              q.retest_auto, q.nb_retest_max, q.Etat, q.statut, q.id_createur, q.dateCreation, q.dateModification,
              FCH.titre AS fiche_titre, ${SQL_TOTAL_POINTS("q")} AS total_points
       FROM B_QZ_QUIZ q
       LEFT JOIN B_FICHE FCH ON FCH.id = q.id_Fiche
       WHERE q.id = ?`,
      [id]
    );
    if (!quizRows.length) {
      return res.status(404).json({ message: "Quiz introuvable" });
    }
    const quiz = quizRows[0];
    // Ouverture du détail : site propriétaire (libre) ou utilisateur autorisé.
    // Un utilisateur d'un site invité non autorisé voit le quiz dans sa liste
    // mais ne peut pas l'ouvrir (point 22).
    if (!(await peutVoirDetailQuiz(userId, id))) {
      return res.status(403).json({ message: "Autorisation requise pour ouvrir ce quiz.", autorisation_requise: true });
    }
    // Droit de GÉRER les utilisateurs autorisés (Partie IV) : réservé au site
    // propriétaire. Pilote l'affichage de la commande dans le sous-onglet Actions.
    quiz.peut_autoriser = (await peutAutoriser(userId, id)) ? 1 : 0;

    const [questions] = await db.query(
      `SELECT id, id_Quiz, type, libelle, points + 0e0 AS points, ordre
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
    // Bonnes réponses réservées au côté propriétaire : retirées pour l'invité.
    const voitReponses = await estCoteProprietaire(userId, id);
    for (const q of questions) {
      q.options = (optionsByQuestion[q.id] || []).map((o) => {
        if (voitReponses) return o;
        const { est_correcte, ...sansReponse } = o;
        return sansReponse;
      });
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

    // Suppression (point D) : créateur ou admin — pilote l'affichage de l'action.
    quiz.peut_supprimer = (await peutSupprimer(userId, id)) ? 1 : 0;
    // Côté propriétaire : questions, statut et tous les paramètres ; sinon
    // (utilisateur autorisé) : durée, date de fermeture et état uniquement.
    quiz.cote_proprietaire = (await estCoteProprietaire(userId, id)) ? 1 : 0;
    // Site de l'utilisateur connecté (liste « Site » de la Diffusion d'un utilisateur autorisé).
    quiz.mon_site_id = await siteDe(userId);
    // Sites proposés dans la Diffusion (out114) : null = tous.
    quiz.sites_diffusion = await sitesDiffusionPermis(userId);

    // Nombre de participants distincts ayant passé le quiz (page detail) :
    // tous les sites côté propriétaire, le site de l'utilisateur sinon (invité).
    const siteImpose = quiz.cote_proprietaire ? null : (quiz.mon_site_id == null ? -1 : Number(quiz.mon_site_id));
    const [partRows] = await db.query(
      `SELECT COUNT(DISTINCT t.id_UTILISATEUR) AS n
         FROM B_QZ_TENTATIVE t
         ${siteImpose != null ? "JOIN B_UTILISATEUR u ON u.id = t.id_UTILISATEUR AND u.id_Site = ?" : ""}
        WHERE t.id_Quiz = ?`,
      siteImpose != null ? [siteImpose, id] : [id]
    );
    quiz.nb_participants = partRows[0].n;
    // Avertissements avant modification des questions (côté propriétaire) :
    // tentatives / participants tous sites, et disponibilité du quiz.
    if (quiz.cote_proprietaire) {
      const st = await statsTentatives(db, id);
      quiz.nb_tentatives_total = st.nb_tentatives;
      quiz.nb_participants_total = st.nb_participants;
      quiz.disponible = (await quizDisponible(id)) ? 1 : 0;
    }

    return res.status(200).send(quiz);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

// Nombre maximum de retests par agent : entier entre RETEST_MAX_MIN et RETEST_MAX_MAX.
const verifierNbRetestMax = (v) => {
  if (v == null || v === "") return null;
  const n = Number(v);
  if (!Number.isInteger(n) || n < RETEST_MAX_MIN || n > RETEST_MAX_MAX) {
    return `Le nombre maximum de retests doit être un entier entre ${RETEST_MAX_MIN} et ${RETEST_MAX_MAX}.`;
  }
  return null;
};

const addQuiz = async (req, res, next) => {
  const {
    titre, type, duree, date_fermeture, note_passage, acces,
    alterner_questions, autoriser_machines, id_Fiche, fiches, description,
    retest_auto, nb_retest_max, statut, Etat,
  } = req.body;
  if (!titre) {
    return res
      .status(403)
      .json({ message: "Merci de bien renseigner les paramètres" });
  }
  const erreurRetest = verifierNbRetestMax(nb_retest_max);
  if (erreurRetest) return res.status(400).json({ message: erreurRetest });
  // Liste des fiches associees (n..n) ; compat : id_Fiche simple
  const listeFiches = Array.isArray(fiches) ? fiches : id_Fiche ? [id_Fiche] : [];
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const codePin = await genererPinUnique(connection);
    const [r] = await connection.query(
      `INSERT INTO B_QZ_QUIZ
        (titre, code_pin, type, duree, date_fermeture, note_passage, acces, alterner_questions, autoriser_machines,
         id_Fiche, description, retest_auto, nb_retest_max, Etat, statut, id_createur, dateCreation)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
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
        retest_auto ? 1 : 0, // retests : opt-in (non par défaut)
        nb_retest_max == null || nb_retest_max === "" ? 1 : Number(nb_retest_max),
        ETATS_QUIZ.includes(Etat) ? Etat : "OUVERT",
        STATUTS_QUIZ.includes(statut) ? statut : "ACTIF",
        req.auth ? req.auth.userId : null,
        new Date(),
      ]
    );
    const fichesOk = await verifierFichesQuiz(connection, listeFiches);
    if (fichesOk.erreur) {
      await connection.rollback();
      return res.status(400).json({ message: fichesOk.erreur });
    }
    for (const idf of fichesOk.ids) {
      await connection.query(
        `INSERT INTO B_QZ_QUIZ_FICHE (id_Quiz, id_Fiche, dateCreation) VALUES (?,?,?)`,
        [r.insertId, idf, new Date()]
      );
    }
    if (fichesOk.ids.length) {
      await connection.query(`UPDATE B_QZ_QUIZ SET id_Fiche=? WHERE id=?`, [fichesOk.ids[0], r.insertId]);
    }
    await connection.commit();
    return res.status(201).json({ message: "Quiz créé avec succès", id: r.insertId, code_pin: codePin });
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
  const userId = req.auth ? req.auth.userId : null;
  const body = req.body || {};
  if (!/^\d+$/.test(String(id || ""))) {
    return res.status(400).json({ message: "Quiz invalide." });
  }
  if ("titre" in body && !String(body.titre || "").trim()) {
    return res.status(400).json({ message: "Le titre du quiz est obligatoire." });
  }
  if ("statut" in body && !STATUTS_QUIZ.includes(body.statut)) {
    return res.status(400).json({ message: "Statut invalide (ACTIF ou INACTIF)." });
  }
  if ("Etat" in body && !ETATS_QUIZ.includes(body.Etat)) {
    return res.status(400).json({ message: "État invalide (OUVERT ou CLOTURER)." });
  }
  if (!(await peutGererQuiz(userId, id))) {
    return res.status(403).json({ message: "Accès non autorisé à ce quiz" });
  }
  // Côté propriétaire : tous les paramètres. Utilisateur autorisé (site invité) :
  // uniquement la durée, la date de fermeture et l'état ; le reste est ignoré.
  const proprietaire = await estCoteProprietaire(userId, id);
  const CHAMPS_INVITE = ["duree", "date_fermeture", "Etat"];
  const CHAMPS = {
    titre: (v) => String(v).trim(),
    type: (v) => v || null,
    duree: (v) => (v === "" || v == null ? null : v),
    date_fermeture: (v) => v || null,
    note_passage: (v) => (v == null || v === "" ? 70 : v),
    acces: (v) => v || "PRIVATE",
    alterner_questions: (v) => (v ? 1 : 0),
    autoriser_machines: (v) => (v ? 1 : 0),
    description: (v) => v || null,
    retest_auto: (v) => (v ? 1 : 0),
    nb_retest_max: (v) => (v == null || v === "" ? 1 : Number(v)),
    Etat: (v) => v,
    statut: (v) => v,
  };
  if (proprietaire && "nb_retest_max" in body) {
    const erreurRetest = verifierNbRetestMax(body.nb_retest_max);
    if (erreurRetest) return res.status(400).json({ message: erreurRetest });
  }
  const sets = [];
  const vals = [];
  for (const [champ, conv] of Object.entries(CHAMPS)) {
    if (!(champ in body)) continue; // champ non envoyé : on ne l'écrase pas
    if (!proprietaire && !CHAMPS_INVITE.includes(champ)) continue;
    sets.push(`${champ}=?`);
    vals.push(conv(body[champ]));
  }
  const modifieFiches = proprietaire && ("fiches" in body || "id_Fiche" in body);
  const listeFiches = Array.isArray(body.fiches) ? body.fiches : body.id_Fiche ? [body.id_Fiche] : [];
  if (modifieFiches) {
    sets.push("id_Fiche=?");
    vals.push(listeFiches.length ? listeFiches[0] : null);
  }
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [ex] = await connection.query(`SELECT id, statut, Etat FROM B_QZ_QUIZ WHERE id=?`, [id]);
    if (!ex.length) {
      await connection.rollback();
      return res.status(404).json({ message: "Quiz introuvable." });
    }
    // Activer ou rouvrir un quiz exige un barème conforme (100 points).
    const active = "statut" in body && body.statut === "ACTIF" && ex[0].statut !== "ACTIF";
    const rouvre = "Etat" in body && body.Etat === "OUVERT" && ex[0].Etat !== "OUVERT";
    if (active || rouvre) {
      const total = await totalPointsQuiz(connection, id);
      if (!egalBareme(total)) {
        await connection.rollback();
        return res.status(409).json({ message: msgBareme(total), total_points: total });
      }
    }
    sets.push("dateModification=?");
    vals.push(new Date());
    let fichesOk = { ids: [] };
    if (modifieFiches) {
      fichesOk = await verifierFichesQuiz(connection, listeFiches, id);
      if (fichesOk.erreur) {
        await connection.rollback();
        return res.status(400).json({ message: fichesOk.erreur });
      }
    }
    await connection.query(`UPDATE B_QZ_QUIZ SET ${sets.join(", ")} WHERE id=?`, [...vals, id]);
    if (modifieFiches) {
      // Remplace l'ensemble des associations de contenus
      await connection.query(`DELETE FROM B_QZ_QUIZ_FICHE WHERE id_Quiz=?`, [id]);
      for (const idf of fichesOk.ids) {
        await connection.query(
          `INSERT INTO B_QZ_QUIZ_FICHE (id_Quiz, id_Fiche, dateCreation) VALUES (?,?,?)`,
          [id, idf, new Date()]
        );
      }
    }
    // « Sites concernés » retiré : B_QZ_QUIZ_SITE n'est plus ni lue ni modifiée
    // (conservée pour l'historique).
    await connection.commit();
    return res.status(201).json({ message: "Quiz modifié" });
  } catch (error) {
    try { await connection.rollback(); } catch (e) {}
    console.log(error);
    res.status(500).json({ message: "Error request" });
  } finally {
    connection.release();
  }
};

// Active / désactive un quiz (STATUT) : réservé au côté propriétaire.
const changerStatutQuiz = async (req, res) => {
  const { id } = req.params;
  const { statut } = req.body || {};
  const userId = req.auth ? req.auth.userId : null;
  if (!/^\d+$/.test(String(id || "")) || !STATUTS_QUIZ.includes(statut)) {
    return res.status(400).json({ message: "Statut invalide (ACTIF ou INACTIF)." });
  }
  try {
    const [[q]] = await db.query(`SELECT id, titre FROM B_QZ_QUIZ WHERE id=?`, [id]);
    if (!q) return res.status(404).json({ message: "Quiz introuvable." });
    if (!(await estCoteProprietaire(userId, id))) {
      return res.status(403).json({ message: "Seul le site propriétaire peut activer ou désactiver ce quiz." });
    }
    if (statut === "ACTIF") {
      const total = await totalPointsQuiz(db, id);
      if (!egalBareme(total)) return res.status(409).json({ message: msgBareme(total), total_points: total });
    }
    await db.query(`UPDATE B_QZ_QUIZ SET statut=?, dateModification=? WHERE id=?`, [statut, new Date(), id]);
    return res.status(200).json({
      message: statut === "ACTIF" ? `Quiz « ${q.titre} » activé.` : `Quiz « ${q.titre} » désactivé.`,
      statut,
    });
  } catch (error) {
    console.error("changerStatutQuiz error:", error && (error.sqlMessage || error.message));
    return res.status(500).json({ message: "Erreur lors du changement de statut, veuillez réessayer." });
  }
};

const deleteQuiz = async (req, res, next) => {
  const { id } = req.params;
  if (!id) {
    return res
      .status(403)
      .json({ message: "Merci de bien renseigner les paramètres" });
  }
  if (!(await peutSupprimer(req.auth ? req.auth.userId : null, id))) {
    return res.status(403).json({ message: "La suppression d'un quiz est réservée à son créateur." });
  }
  try {
    // FK ON DELETE CASCADE : questions + options supprimees automatiquement
    await db.query(`DELETE FROM B_QZ_QUIZ WHERE id=?`, [id]);
    return res.status(201).json({ message: "Quiz supprimé avec succès" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

/* ------------------------------------------------------------------ */
/* QUESTIONS (+ options)                                               */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* BARÈME (points par question) : recalcul, réinitialisation, badges    */
/* ------------------------------------------------------------------ */
// Score (%) = points des questions réussies / points de toutes les questions x 100
// (chaque question est en « tout ou rien »). Modifier les points ou supprimer une
// question d'un quiz déjà passé -> RECALCUL des tentatives à partir des réponses
// enregistrées. Ajouter une question ou modifier ses réponses -> RÉINITIALISATION
// de toutes les tentatives (les réponses déjà données ne peuvent pas être
// réévaluées). Dans les deux cas : badges réévalués, participants touchés notifiés.

const POINTS_DEFAUT = 5;
// Points saisis (out116) : nombre de 0,01 à 100, 2 décimales au plus ; virgule ou point
// acceptés (5 si absent). Renvoie null si invalide.
const lirePoints = (v) => {
  if (v === undefined || v === null || v === "") return POINTS_DEFAUT;
  const t = String(v).trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
  const n = r2(t);
  return n >= 0.01 && n <= 100 ? n : null;
};
const MSG_POINTS = "Les points d'une question doivent être un nombre compris entre 0,01 et 100 (2 décimales au plus).";
const MSG_QUIZ_FERME_AJOUT =
  "Rouvrez le quiz avant de modifier ses questions : il a déjà été passé et les participants devront le repasser.";

// Pourcentage affiché dans les notifications : 66.67 %, 100 %, 0 %.
const pct = (v) => `${Number(Number(v || 0).toFixed(2))} %`;

const statsTentatives = async (cx, idQuiz) => {
  const [[r]] = await cx.query(
    "SELECT COUNT(*) AS nb_tentatives, COUNT(DISTINCT id_UTILISATEUR) AS nb_participants FROM B_QZ_TENTATIVE WHERE id_Quiz = ?",
    [idQuiz]
  );
  return { nb_tentatives: Number(r.nb_tentatives), nb_participants: Number(r.nb_participants) };
};

const notifierQuiz = (cx, idQuiz, idUser, titre, message) =>
  cx.query(
    `INSERT INTO B_QZ_NOTIFICATION (id_Quiz, id_UTILISATEUR, titre, message, lu, dateCreation) VALUES (?,?,?,?,0,?)`,
    [idQuiz, idUser, titre, message.slice(0, 255), new Date()]
  );

// Réévalue les badges d'un agent à partir de ses tentatives restantes : retire
// ceux dont la condition n'est plus remplie, attribue ceux désormais mérités
// (calcul : utils/badgesQuiz.js). Retourne les NOMS ajoutés / retirés.
const reevaluerBadges = async (cx, userId) => {
  const { ajoutes, retires } = await synchroniserBadges(cx, userId);
  return { ajoutes: ajoutes.map((b) => b.nom), retires: retires.map((b) => b.nom) };
};
const texteBadges = ({ ajoutes, retires }) =>
  (retires.length ? ` Badge retiré : ${retires.join(", ")}.` : "") +
  (ajoutes.length ? ` Badge obtenu : ${ajoutes.join(", ")}.` : "");

// Recalcule toutes les tentatives d'un quiz avec le barème actuel.
// Notifie (une fois) chaque participant dont au moins une tentative change.
const recalculerTentatives = async (cx, idQuiz) => {
  const [[quiz]] = await cx.query("SELECT titre, note_passage FROM B_QZ_QUIZ WHERE id = ?", [idQuiz]);
  const [questions] = await cx.query("SELECT id, points + 0e0 AS points FROM B_QZ_QUESTION WHERE id_Quiz = ?", [idQuiz]);
  const pointsQ = new Map(questions.map((q) => [Number(q.id), Number(q.points)]));
  const total = r2(questions.reduce((a, q) => a + Number(q.points), 0));
  const [tentatives] = await cx.query(
    "SELECT id, id_UTILISATEUR, score, reussi, num_essai, statut FROM B_QZ_TENTATIVE WHERE id_Quiz = ? ORDER BY id_UTILISATEUR, num_essai",
    [idQuiz]
  );
  const changements = new Map(); // userId -> [{essai, avant, apres, reussi}]
  for (const t of tentatives) {
    const [reps] = await cx.query("SELECT id_Question, est_correcte FROM B_QZ_REPONSE WHERE id_Tentative = ?", [t.id]);
    let obtenus = 0;
    let bonnes = 0;
    for (const r of reps) {
      if (!pointsQ.has(Number(r.id_Question))) continue;
      if (Number(r.est_correcte) === 1) {
        obtenus += pointsQ.get(Number(r.id_Question));
        bonnes++;
      }
    }
    obtenus = r2(obtenus);
    const score = total ? Math.round((obtenus / total) * 10000) / 100 : 0;
    const reussi = score >= Number(quiz.note_passage);
    await cx.query(
      `UPDATE B_QZ_TENTATIVE SET score=?, reussi=?, statut=?, nb_bonnes=?, nb_total=?, nb_points=?, nb_points_total=? WHERE id=?`,
      [score, reussi ? 1 : 0, t.statut === "TEMPS_ECOULE" ? "TEMPS_ECOULE" : reussi ? "REUSSI" : "ECHEC", bonnes, questions.length, obtenus, total, t.id]
    );
    if (Number(t.score) !== score || Number(t.reussi) !== (reussi ? 1 : 0)) {
      if (!changements.has(t.id_UTILISATEUR)) changements.set(t.id_UTILISATEUR, []);
      changements.get(t.id_UTILISATEUR).push({ essai: t.num_essai, avant: t.score, apres: score, reussi });
    }
  }
  for (const [uid, chg] of changements) {
    const badges = await reevaluerBadges(cx, uid);
    const detail = chg
      .map((c) => `${chg.length > 1 ? `essai ${c.essai} : ` : ""}${pct(c.avant)} → ${pct(c.apres)} (${c.reussi ? "réussi" : "échec"})`)
      .join(", ");
    await notifierQuiz(
      cx, idQuiz, uid, "Score recalculé",
      `Votre score au quiz « ${quiz.titre} » a été recalculé suite à une modification du barème : ${detail}.${texteBadges(badges)}`
    );
  }
  return { nb_tentatives: [...changements.values()].reduce((a, c) => a + c.length, 0), nb_participants: changements.size };
};

// Supprime toutes les tentatives d'un quiz (ajout d'une question ou modification
// de ses réponses) : réponses, retests ; demandes de réinitialisation annulées ;
// sessions en cours périmées. Notifie chaque participant concerné.
const reinitialiserTentatives = async (cx, idQuiz, userId) => {
  const [[quiz]] = await cx.query("SELECT titre FROM B_QZ_QUIZ WHERE id = ?", [idQuiz]);
  const [agents] = await cx.query("SELECT DISTINCT id_UTILISATEUR FROM B_QZ_TENTATIVE WHERE id_Quiz = ?", [idQuiz]);
  const stats = await statsTentatives(cx, idQuiz);
  await cx.query(
    "DELETE r FROM B_QZ_REPONSE r JOIN B_QZ_TENTATIVE t ON t.id = r.id_Tentative WHERE t.id_Quiz = ?",
    [idQuiz]
  );
  await cx.query("DELETE FROM B_QZ_TENTATIVE WHERE id_Quiz = ?", [idQuiz]);
  await cx.query("DELETE FROM B_QZ_RETEST WHERE id_Quiz = ?", [idQuiz]);
  await cx.query(
    "UPDATE B_QZ_REINITIALISATION SET statut='ANNULEE', dateReponse=NOW(), id_traitePar=? WHERE id_Quiz=? AND statut='EN_ATTENTE'",
    [userId, idQuiz]
  );
  await cx.query("UPDATE B_QZ_QUIZ SET date_reinitialisation = NOW() WHERE id = ?", [idQuiz]);
  // Passages en cours : session marquée périmée (date antérieure à toute réinitialisation,
  // y compris si elle a été ouverte dans la même seconde) -> soumission refusée.
  await cx.query("UPDATE B_QZ_SESSION SET date_debut = '1970-01-02 00:00:00' WHERE id_Quiz = ?", [idQuiz]);
  for (const a of agents) {
    const badges = await reevaluerBadges(cx, a.id_UTILISATEUR);
    await notifierQuiz(
      cx, idQuiz, a.id_UTILISATEUR, "Quiz modifié",
      `Le quiz « ${quiz.titre} » a été modifié : vos résultats ont été réinitialisés, merci de le repasser.${texteBadges(badges)}`
    );
  }
  return stats;
};

const msgImpact = (base, impact) => {
  if (!impact) return base;
  if (impact.type === "REINITIALISATION") {
    return `${base} : ${impact.nb_tentatives} tentative(s) réinitialisée(s), ${impact.nb_participants} participant(s) prévenu(s).`;
  }
  return `${base} : ${impact.nb_tentatives} tentative(s) recalculée(s), ${impact.nb_participants} participant(s) prévenu(s).`;
};

const addQuestion = async (req, res, next) => {
  const { id_Quiz, type, libelle, ordre, options } = req.body;
  const userId = req.auth ? req.auth.userId : null;
  if (!id_Quiz || !libelle || !Array.isArray(options) || options.length === 0) {
    return res
      .status(403)
      .json({ message: "Merci de bien renseigner la question et ses options" });
  }
  const points = lirePoints(req.body.points);
  if (points == null) return res.status(403).json({ message: MSG_POINTS });
  if (!(await estCoteProprietaire(userId, id_Quiz))) {
    return res.status(403).json({ message: MSG_QUESTIONS_PROPRIETAIRE });
  }
  const connection = await db.getConnection();
  try {
    // Quiz déjà passé : l'ajout réinitialise toutes les tentatives -> quiz disponible requis.
    const dejaPasse = (await statsTentatives(connection, id_Quiz)).nb_tentatives > 0;
    if (dejaPasse && !(await quizDisponible(id_Quiz))) {
      return res.status(403).json({ message: MSG_QUIZ_FERME_AJOUT });
    }
    await connection.beginTransaction();
    const [q] = await connection.query(
      `INSERT INTO B_QZ_QUESTION (id_Quiz, type, libelle, points, ordre, dateCreation) VALUES (?,?,?,?,?,?)`,
      [id_Quiz, type || "VRAI_FAUX", libelle, points, ordre || 0, new Date()]
    );
    const questionId = q.insertId;
    let i = 0;
    for (const opt of options) {
      await connection.query(
        `INSERT INTO B_QZ_OPTION (id_Question, libelle, est_correcte, ordre) VALUES (?,?,?,?)`,
        [questionId, opt.libelle, opt.est_correcte ? 1 : 0, i++]
      );
    }
    let impact = null;
    if (dejaPasse) impact = { type: "REINITIALISATION", ...(await reinitialiserTentatives(connection, id_Quiz, userId)) };
    await connection.commit();
    return res.status(201).json({ message: msgImpact("Question ajoutée", impact), id: questionId, impact });
  } catch (error) {
    await connection.rollback();
    console.log(error);
    res.status(500).json({ message: "Error request" });
  } finally {
    connection.release();
  }
};

// POST /quiz/:id/repartir-points : répartit équitablement les 100 points entre
// les questions (le reste de la division va aux premières questions, dans l'ordre
// d'affichage : 34 + 33 + 33). Quiz déjà passé -> recalcul des tentatives.
const repartirPoints = async (req, res) => {
  const { id } = req.params;
  const userId = req.auth ? req.auth.userId : null;
  if (!/^\d+$/.test(String(id || ""))) return res.status(400).json({ message: "Quiz invalide." });
  if (!(await estCoteProprietaire(userId, id))) return res.status(403).json({ message: MSG_QUESTIONS_PROPRIETAIRE });
  const connection = await db.getConnection();
  try {
    const [questions] = await connection.query("SELECT id, points + 0e0 AS points FROM B_QZ_QUESTION WHERE id_Quiz = ? ORDER BY ordre, id", [id]);
    if (!questions.length) return res.status(400).json({ message: "Ajoutez des questions avant de répartir les points." });
    // out116 : répartition au centième (100 / 3 -> 33,34 + 33,33 + 33,33 ; le reste va
    // aux premières questions) ; entière si la division tombe juste (4 -> 25 chacune).
    const CENTIEMES = BAREME_TOTAL * 100;
    if (questions.length > CENTIEMES) {
      return res.status(400).json({ message: `Impossible de répartir ${BAREME_TOTAL} points entre ${questions.length} questions (0,01 point minimum par question).` });
    }
    const baseC = Math.floor(CENTIEMES / questions.length);
    const resteC = CENTIEMES - baseC * questions.length;
    const base = baseC / 100;
    const nouveaux = questions.map((q, i) => ({ id: q.id, points: (baseC + (i < resteC ? 1 : 0)) / 100, avant: r2(q.points) }));
    const reste = resteC;
    const modifies = nouveaux.filter((q) => Math.round(q.points * 100) !== Math.round(q.avant * 100));
    await connection.beginTransaction();
    for (const q of modifies) await connection.query("UPDATE B_QZ_QUESTION SET points = ? WHERE id = ?", [q.points, q.id]);
    let impact = null;
    if (modifies.length && (await statsTentatives(connection, id)).nb_tentatives > 0) {
      impact = { type: "RECALCUL", ...(await recalculerTentatives(connection, id)) };
    }
    await connection.commit();
    return res.status(200).json({
      message: msgImpact(`Points répartis : ${reste ? `${fmtPoints((baseC + 1) / 100)} ou ${fmtPoints(base)}` : fmtPoints(base)} point(s) par question`, impact),
      points: nouveaux.map(({ id: qid, points }) => ({ id: qid, points })),
      total_points: BAREME_TOTAL,
      impact,
    });
  } catch (error) {
    await connection.rollback();
    console.log(error);
    return res.status(500).json({ message: "Erreur lors de la répartition des points." });
  } finally {
    connection.release();
  }
};

// Réponses identiques : même type, mêmes libellés et bonnes réponses, dans le même ordre.
const memesReponses = (typeAvant, optsAvant, typeApres, optsApres) => {
  if ((typeAvant || "VRAI_FAUX") !== (typeApres || "VRAI_FAUX")) return false;
  if (optsAvant.length !== optsApres.length) return false;
  return optsAvant.every(
    (o, i) =>
      String(o.libelle).trim() === String(optsApres[i].libelle || "").trim() &&
      (Number(o.est_correcte) ? 1 : 0) === (optsApres[i].est_correcte ? 1 : 0)
  );
};

const updateQuestion = async (req, res, next) => {
  const { id } = req.params;
  const { type, libelle, ordre, options } = req.body;
  const userId = req.auth ? req.auth.userId : null;
  if (!id || !libelle || !Array.isArray(options) || options.length === 0) {
    return res
      .status(403)
      .json({ message: "Merci de bien renseigner la question et ses options" });
  }
  if (!(await peutGererQuestion(userId, id))) {
    return res.status(403).json({ message: MSG_QUESTIONS_PROPRIETAIRE });
  }
  const connection = await db.getConnection();
  try {
    const [[avant]] = await connection.query("SELECT id_Quiz, type, points FROM B_QZ_QUESTION WHERE id = ?", [id]);
    const points = req.body.points === undefined ? Number(avant.points) : lirePoints(req.body.points);
    if (points == null) return res.status(403).json({ message: MSG_POINTS });
    const [optsAvant] = await connection.query(
      "SELECT libelle, est_correcte FROM B_QZ_OPTION WHERE id_Question = ? ORDER BY ordre, id",
      [id]
    );
    const reponsesModifiees = !memesReponses(avant.type, optsAvant, type, options);
    const pointsModifies = Math.round(points * 100) !== Math.round(Number(avant.points) * 100);
    const dejaPasse = (await statsTentatives(connection, avant.id_Quiz)).nb_tentatives > 0;
    if (dejaPasse && reponsesModifiees && !(await quizDisponible(avant.id_Quiz))) {
      return res.status(403).json({ message: MSG_QUIZ_FERME_AJOUT });
    }
    await connection.beginTransaction();
    await connection.query(
      `UPDATE B_QZ_QUESTION SET type=?, libelle=?, points=?, ordre=? WHERE id=?`,
      [type || "VRAI_FAUX", libelle, points, ordre || 0, id]
    );
    // Les options ne sont remplacées que si les réponses changent (les réponses
    // enregistrées gardent ainsi leurs références pour les rapports).
    if (reponsesModifiees) {
      await connection.query(`DELETE FROM B_QZ_OPTION WHERE id_Question=?`, [id]);
      let i = 0;
      for (const opt of options) {
        await connection.query(
          `INSERT INTO B_QZ_OPTION (id_Question, libelle, est_correcte, ordre) VALUES (?,?,?,?)`,
          [id, opt.libelle, opt.est_correcte ? 1 : 0, i++]
        );
      }
    }
    let impact = null;
    if (dejaPasse && reponsesModifiees) {
      impact = { type: "REINITIALISATION", ...(await reinitialiserTentatives(connection, avant.id_Quiz, userId)) };
    } else if (dejaPasse && pointsModifies) {
      impact = { type: "RECALCUL", ...(await recalculerTentatives(connection, avant.id_Quiz)) };
    }
    await connection.commit();
    return res.status(201).json({ message: msgImpact("Question modifiée", impact), impact });
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
      .json({ message: "Merci de bien renseigner les paramètres" });
  }
  if (!(await peutGererQuestion(req.auth ? req.auth.userId : null, id))) {
    return res.status(403).json({ message: MSG_QUESTIONS_PROPRIETAIRE });
  }
  const connection = await db.getConnection();
  try {
    const [[q]] = await connection.query("SELECT id_Quiz FROM B_QZ_QUESTION WHERE id = ?", [id]);
    const dejaPasse = (await statsTentatives(connection, q.id_Quiz)).nb_tentatives > 0;
    await connection.beginTransaction();
    // Les réponses à cette question sortent du calcul ; les autres restent valables.
    await connection.query("DELETE FROM B_QZ_REPONSE WHERE id_Question = ?", [id]);
    await connection.query(`DELETE FROM B_QZ_QUESTION WHERE id=?`, [id]);
    let impact = null;
    if (dejaPasse) impact = { type: "RECALCUL", ...(await recalculerTentatives(connection, q.id_Quiz)) };
    await connection.commit();
    return res.status(201).json({ message: msgImpact("Question supprimée", impact), impact });
  } catch (error) {
    await connection.rollback();
    console.log(error);
    res.status(500).json({ message: "Error request" });
  } finally {
    connection.release();
  }
};

/* ------------------------------------------------------------------ */
/* CONTENUS KB (fiches) pour lier un quiz a un contenu                 */
/* ------------------------------------------------------------------ */

// Fiches liées à une liste de quiz (une seule requête) : { idQuiz: [{ id, titre, ETAT }] }.
const fichesLieesParQuiz = async (idsQuiz) => {
  const ids = [...new Set((idsQuiz || []).filter(Boolean))];
  const parQuiz = {};
  if (!ids.length) return parQuiz;
  const [lignes] = await db.query(
    `SELECT qf.id_Quiz, f.id, f.titre, f.ETAT
       FROM B_QZ_QUIZ_FICHE qf JOIN B_FICHE f ON f.id = qf.id_Fiche
      WHERE qf.id_Quiz IN (?) ORDER BY qf.id`,
    [ids]
  );
  for (const l of lignes) {
    (parQuiz[l.id_Quiz] = parQuiz[l.id_Quiz] || []).push({ id: l.id, titre: l.titre, ETAT: l.ETAT });
  }
  return parQuiz;
};

// Fiches liées à un quiz (liste actuelle) visibles pour le site et la fonction de
// l'utilisateur (même règle que la liste des fiches de l'accueil). Les fiches
// archivées restent listées (ETAT = 'ARCHIVE') : affichées avec la mention, non ouvrables.
// Une fiche retirée du quiz n'apparaît plus.
const contenusAccessibles = async (userId, idQuiz) => {
  if (!userId) return [];
  const [l] = await db.query(
    `SELECT f.id, f.titre, f.ETAT
       FROM B_QZ_QUIZ_FICHE qf
       JOIN B_FICHE f ON f.id = qf.id_Fiche
       JOIN B_UTILISATEUR u ON u.id = ?
      WHERE qf.id_Quiz = ? AND f.ETAT IN ('ACTIF', 'ARCHIVE')
        AND FIND_IN_SET(u.id_Site, f.AccesSite) > 0 AND FIND_IN_SET(u.id_Fonction, f.AccesProfil) > 0
      ORDER BY (f.ETAT <> 'ACTIF'), qf.id`,
    [userId, idQuiz]
  );
  return l;
};

// Contenus liés à un quiz : une fiche NOUVELLEMENT liée doit être active ; une fiche
// déjà liée (archivée depuis) peut être conservée. Renvoie { ids } ou { erreur }.
const verifierFichesQuiz = async (connection, liste, idQuiz = null) => {
  const ids = [...new Set((liste || []).map(x => parseInt(x, 10)).filter(x => Number.isInteger(x) && x > 0))];
  if (!ids.length) return { ids };
  const [fiches] = await connection.query(`SELECT id, ETAT FROM B_FICHE WHERE id IN (?)`, [ids]);
  if (fiches.length !== ids.length) return { erreur: "Une des fiches choisies n'existe plus." };
  let dejaLiees = new Set();
  if (idQuiz) {
    const [l] = await connection.query(`SELECT id_Fiche FROM B_QZ_QUIZ_FICHE WHERE id_Quiz=?`, [idQuiz]);
    dejaLiees = new Set(l.map(x => x.id_Fiche));
  }
  const inactive = fiches.find(f => f.ETAT !== "ACTIF" && !dejaLiees.has(f.id));
  if (inactive) return { erreur: "Seules les fiches actives peuvent être associées à un quiz." };
  return { ids };
};

// Sélecteur de contenus de l'éditeur de quiz.
//  - ?q=texte : recherche dans le titre des fiches ACTIVES (30 résultats max) ;
//    sans q : les 30 fiches actives les plus récentes.
//  - ?ids=1,2 : détail des fiches déjà liées au quiz, quel que soit leur état
//    (une fiche archivée depuis reste affichée et peut être retirée).
const SQL_FICHE_SELECTEUR = `SELECT FH.id, FH.titre, FH.ETAT,
       CT.nom AS Categorie, SCT.nom AS Sous_Categorie,
       DATE_FORMAT(COALESCE(FH.dateDebut, FH.dateEnregistrement), '%Y-%m-%d') AS date
  FROM B_FICHE FH
  LEFT JOIN B_CATEGORIE CT ON CT.id = FH.id_Categorie
  LEFT JOIN B_SOUS_CATEGORIE SCT ON SCT.id = FH.id_SousCategorie`;
const getFichesRecentes = async (req, res, next) => {
  try {
    const ids = String(req.query.ids || "")
      .split(",")
      .map(x => parseInt(x, 10))
      .filter(x => Number.isInteger(x) && x > 0);
    if (ids.length) {
      const [lignes] = await db.query(`${SQL_FICHE_SELECTEUR} WHERE FH.id IN (?)`, [ids]);
      return res.status(200).send(lignes);
    }
    const q = String(req.query.q || "").trim().slice(0, 100);
    const params = [];
    let filtre = "";
    if (q) {
      // Recherche littérale : %, _ et \ saisis (ex. « 200% ») ne sont pas des jokers.
      filtre = " AND FH.titre LIKE ? ESCAPE '\\\\'";
      params.push(`%${q.replace(/[\\%_]/g, c => "\\" + c)}%`);
    }
    const [resultat] = await db.query(
      `${SQL_FICHE_SELECTEUR}
        WHERE FH.ETAT = 'ACTIF'${filtre}
        ORDER BY COALESCE(FH.dateModification, FH.dateEnregistrement) DESC
        LIMIT 30`,
      params
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
       WHERE ${SQL_QUIZ_DISPONIBLE} AND ${SQL_BAREME_CONFORME}
         AND (SELECT COUNT(*) FROM B_QZ_QUESTION qq WHERE qq.id_Quiz = q.id) > 0
         AND EXISTS (SELECT 1 FROM B_QZ_PARTICIPANT p WHERE p.id_Quiz = q.id AND p.id_UTILISATEUR = ?)
       ORDER BY q.id DESC`,
      [userId, userId, userId, userId]
    );
    return res.status(200).send(rows);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

// Quiz a passer : questions + options SANS reveler la bonne reponse
// Écran d'accueil d'un quiz (avant démarrage) : informations, droit de participer et
// fiches à lire, SANS les questions et SANS démarrer le chronomètre. Mêmes contrôles
// d'accès que le démarrage : participant désigné + code PIN pour un quiz privé (sauf
// passage déjà commencé). La machine (liste blanche IP) est contrôlée au démarrage.
// Dernier passage du participant (écran d'accueil / « Voir ») : résultat seulement,
// jamais les réponses ni la correction.
const SQL_DERNIER_PASSAGE = `SELECT statut, reussi, score, nb_points + 0e0 AS nb_points, nb_points_total + 0e0 AS nb_points_total, num_essai,
       DATE_FORMAT(COALESCE(date_fin, date_tentative), '%Y-%m-%dT%H:%i:%s') AS date_passage
  FROM B_QZ_TENTATIVE WHERE id_Quiz=? AND id_UTILISATEUR=? ORDER BY id DESC LIMIT 1`;
const dernierPassage = (der) =>
  der.length
    ? {
        reussi: Number(der[0].reussi) ? 1 : 0,
        score: der[0].score == null ? null : Number(der[0].score),
        nb_points: der[0].nb_points == null ? null : Number(der[0].nb_points),
        nb_points_total: der[0].nb_points_total == null ? null : Number(der[0].nb_points_total),
        num_essai: Number(der[0].num_essai) || 1,
        statut: der[0].statut,
        date: der[0].date_passage,
      }
    : null;

const getQuizApercu = async (req, res, next) => {
  const { id } = req.params;
  const userId = req.auth ? req.auth.userId : null;
  try {
    const [quizRows] = await db.query(
      `SELECT id, titre, description, note_passage, retest_auto, nb_retest_max, duree, acces, code_pin,
              statut, Etat, date_fermeture, date_reinitialisation, ${SQL_TOTAL_POINTS("B_QZ_QUIZ")} AS total_points,
              (SELECT COUNT(*) FROM B_QZ_QUESTION qq WHERE qq.id_Quiz = B_QZ_QUIZ.id) AS nb_questions
       FROM B_QZ_QUIZ WHERE id = ?`,
      [id]
    );
    if (!quizRows.length) {
      return res.status(404).json({ message: "Quiz introuvable" });
    }
    const quiz = quizRows[0];
    const indispo = indisponibiliteQuiz(quiz);
    // Fermé par sa date : un passage commencé avant reste accessible (délai de grâce).
    const finGrace = indispo ? await finGracePassage(id, userId) : null;
    if (indispo && !finGrace) {
      return res.status(403).json({ code: "QUIZ_INDISPONIBLE", message: indispo });
    }
    if (!(await estParticipant(userId, id))) {
      return res.status(403).json({ message: MSG_NON_PARTICIPANT });
    }
    // Durée épuisée sans soumission : clôture avant tout calcul.
    await cloturerSessionsExpirees({ idQuiz: id, userId });
    const [sess] = await db.query(
      `SELECT TIMESTAMPDIFF(SECOND, date_debut, NOW()) AS ecoule, date_debut
         FROM B_QZ_SESSION WHERE id_Quiz=? AND id_UTILISATEUR=?`,
      [id, userId]
    );
    const sessionValide =
      sess.length &&
      !(quiz.date_reinitialisation && new Date(sess[0].date_debut) < new Date(quiz.date_reinitialisation));
    if ((quiz.acces || "PRIVATE") !== "PUBLIC") {
      const pinFourni = String(req.query.pin || "").trim();
      if (
        pinFourni !== String(quiz.code_pin || "") &&
        !sessionValide &&
        !(await pinDejaValide(userId, id, quiz.code_pin))
      ) {
        return res.status(403).json({
          code: "PIN_REQUIS",
          message: "Ce quiz est privé : saisissez son code PIN depuis l'écran Participer.",
        });
      }
    }
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
    const [der] = await db.query(
      SQL_DERNIER_PASSAGE,
      [id, userId]
    );
    const enCours = !!(peut && sessionValide);
    return res.status(200).send({
      id: quiz.id,
      titre: quiz.titre,
      description: quiz.description,
      note_passage: quiz.note_passage,
      retest_auto: quiz.retest_auto,
      nb_retest_max: quiz.nb_retest_max,
      duree: quiz.duree,
      acces: quiz.acces,
      total_points: quiz.total_points,
      nb_questions: quiz.nb_questions,
      nb_essais: cnt[0].n,
      deja_tente: cnt[0].n > 0,
      peut_participer: peut,
      derniere_tentative_statut: der.length ? der[0].statut : null,
      dernier_passage: dernierPassage(der),
      // Passage déjà commencé (rechargement, reprise) : le front reprend directement.
      session_en_cours: enCours,
      temps_ecoule_secondes: enCours ? Math.max(0, sess[0].ecoule) : 0,
      // Quiz fermé, passage commencé avant : à soumettre avant cette heure.
      fin_grace: finGrace,
      contenus: await contenusAccessibles(userId, id),
      questions: [],
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

const getQuizForTaking = async (req, res, next) => {
  const { id } = req.params;
  const userId = req.auth ? req.auth.userId : null;
  try {
    const [quizRows] = await db.query(
      `SELECT id, titre, description, note_passage, retest_auto, nb_retest_max, duree, acces, code_pin,
              statut, Etat, date_fermeture, ${SQL_TOTAL_POINTS("B_QZ_QUIZ")} AS total_points
       FROM B_QZ_QUIZ WHERE id = ?`,
      [id]
    );
    if (!quizRows.length) {
      return res.status(404).json({ message: "Quiz introuvable" });
    }
    // Statut ACTIF + état OUVERT + date de fermeture non dépassée — sauf passage
    // commencé avant la fermeture et encore dans son délai de grâce.
    const indispo = indisponibiliteQuiz(quizRows[0]);
    const finGrace = indispo ? await finGracePassage(id, userId) : null;
    if (indispo && !finGrace) {
      return res.status(403).json({ code: "QUIZ_INDISPONIBLE", message: indispo });
    }
    quizRows[0].fin_grace = finGrace;
    delete quizRows[0].statut;
    delete quizRows[0].Etat;
    // Participants désignés uniquement, quel que soit le profil.
    if (!(await estParticipant(userId, id))) {
      return res.status(403).json({ message: MSG_NON_PARTICIPANT });
    }
    // Quiz PRIVÉ : accès conditionné au code PIN (?pin=...). Une tentative déjà
    // démarrée (rechargement de la page) ou un PIN déjà validé par ce participant
    // (même code) restent accessibles sans ressaisir le PIN.
    const estPrive = (quizRows[0].acces || "PRIVATE") !== "PUBLIC";
    const pinCorrect = String(req.query.pin || "").trim() === String(quizRows[0].code_pin || "");
    if (estPrive) {
      if (!pinCorrect && !(await pinDejaValide(userId, id, quizRows[0].code_pin))) {
        const [sess] = await db.query(
          "SELECT 1 FROM B_QZ_SESSION WHERE id_Quiz=? AND id_UTILISATEUR=? LIMIT 1",
          [id, userId]
        );
        if (!sess.length) {
          return res.status(403).json({
            code: "PIN_REQUIS",
            message: "Ce quiz est privé : saisissez son code PIN depuis l'écran Participer.",
          });
        }
      }
    }
    // Restriction par adresse IP (liste blanche du quiz), si definie
    if (!(await ipAutoriseePourQuiz(id, req, userId))) {
      await enregistrerDemandeIp(id, userId, req);
      return res.status(403).json({
        code: "IP_EN_ATTENTE",
        message:
          "Accès refusé : votre adresse IP n'est pas autorisée. Une demande a été transmise pour autorisation.",
      });
    }
    const quiz = quizRows[0];
    if (estPrive && pinCorrect) await memoriserPinValide(userId, id, quiz.code_pin);
    delete quiz.code_pin; // ne jamais renvoyer le PIN au participant
    const [questions] = await db.query(
      `SELECT id, id_Quiz, type, libelle, points + 0e0 AS points, ordre FROM B_QZ_QUESTION WHERE id_Quiz = ? ORDER BY ordre, id`,
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
    // Durée épuisée sans soumission : passage clôturé avant tout (chrono non relançable).
    await cloturerSessionsExpirees({ idQuiz: id, userId });
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
    // Dernier essai clôturé faute de temps : message dédié à l'écran.
    const [der] = await db.query(
      SQL_DERNIER_PASSAGE,
      [id, userId]
    );
    quiz.derniere_tentative_statut = der.length ? der[0].statut : null;
    quiz.dernier_passage = dernierPassage(der);

    // Horodate l'ouverture (date de debut de la tentative). INSERT IGNORE : on ne
    // reinitialise PAS a chaque rechargement -> le chrono reste base sur le 1er debut.
    if (peut) {
      // Session ouverte avant une réinitialisation du quiz : périmée, on repart à zéro.
      await db.query(
        `DELETE s FROM B_QZ_SESSION s JOIN B_QZ_QUIZ q ON q.id = s.id_Quiz
          WHERE s.id_Quiz=? AND s.id_UTILISATEUR=? AND q.date_reinitialisation IS NOT NULL
            AND s.date_debut < q.date_reinitialisation`,
        [id, userId]
      );
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

    // Contenus à revoir : fiches liées actives auxquelles l'utilisateur a accès.
    quiz.contenus = await contenusAccessibles(userId, id);
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
    return res.status(403).json({ message: "Merci de bien renseigner les paramètres" });
  }
  // Participants désignés uniquement, quel que soit le profil.
  if (!(await estParticipant(userId, id))) {
    return res.status(403).json({ message: MSG_NON_PARTICIPANT });
  }
  // Quiz privé : la tentative doit avoir été ouverte (après saisie du PIN).
  const [[accesQ]] = await db.query("SELECT acces, statut, Etat, date_fermeture FROM B_QZ_QUIZ WHERE id=?", [id]);
  // Statut ACTIF + état OUVERT + date de fermeture non dépassée.
  const indispoSoumission = indisponibiliteQuiz(accesQ);
  // Fermé par sa date : un passage commencé avant reste soumettable (délai de grâce).
  if (indispoSoumission && !(await finGracePassage(id, userId))) {
    return res.status(403).json({ code: "QUIZ_INDISPONIBLE", message: indispoSoumission });
  }
  if (accesQ && (accesQ.acces || "PRIVATE") !== "PUBLIC") {
    const [sess] = await db.query(
      "SELECT 1 FROM B_QZ_SESSION WHERE id_Quiz=? AND id_UTILISATEUR=? LIMIT 1",
      [id, userId]
    );
    if (!sess.length) {
      return res.status(403).json({
        code: "PIN_REQUIS",
        message: "Ce quiz est privé : saisissez son code PIN depuis l'écran Participer.",
      });
    }
  }
  if (!(await ipAutoriseePourQuiz(id, req, userId))) {
    await enregistrerDemandeIp(id, userId, req);
    return res.status(403).json({
      code: "IP_EN_ATTENTE",
      message:
        "Accès refusé : votre adresse IP n'est pas autorisée. Une demande a été transmise pour autorisation.",
    });
  }
  // Quiz modifié (réinitialisé) pendant le passage : la copie porte sur l'ancienne version.
  const [perimee] = await db.query(
    `SELECT 1 FROM B_QZ_SESSION s JOIN B_QZ_QUIZ q ON q.id = s.id_Quiz
      WHERE s.id_Quiz=? AND s.id_UTILISATEUR=? AND q.date_reinitialisation IS NOT NULL
        AND s.date_debut < q.date_reinitialisation LIMIT 1`,
    [id, userId]
  );
  if (perimee.length) {
    await db.query("DELETE FROM B_QZ_SESSION WHERE id_Quiz=? AND id_UTILISATEUR=?", [id, userId]);
    return res.status(409).json({
      code: "QUIZ_MODIFIE",
      message: "Le quiz a été modifié pendant votre passage, merci de le recommencer.",
    });
  }
  // Durée épuisée (+ marge) : la copie n'est plus acceptée, le passage est clôturé.
  if (await cloturerSessionsExpirees({ idQuiz: id, userId })) {
    return res.status(409).json({
      code: "TEMPS_ECOULE",
      message: "Le temps imparti est écoulé : votre passage a été clôturé.",
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
      `SELECT id, libelle, type, points + 0e0 AS points FROM B_QZ_QUESTION WHERE id_Quiz = ? ORDER BY ordre, id`,
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
    let nbPoints = 0;
    const nbPointsTotal = r2(questions.reduce((a, q) => a + Number(q.points || 0), 0));
    for (const q of questions) {
      const opts = optByQ[q.id] || [];
      const corrects = opts.filter(o => o.est_correcte).map(o => Number(o.id));
      const choisis = choixParQuestion[q.id] || [];
      const setC = new Set(corrects);
      const setX = new Set(choisis);
      const estCorrecte =
        setC.size > 0 && setC.size === setX.size && [...setX].every(x => setC.has(x));
      if (estCorrecte) {
        nbBonnes++;
        nbPoints += Number(q.points || 0);
      }
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
    nbPoints = r2(nbPoints);
    // Score pondéré : points des questions réussies / points du quiz.
    const score = nbPointsTotal ? Math.round((nbPoints / nbPointsTotal) * 10000) / 100 : 0;
    const reussi = score >= quiz.note_passage;

    // Numero d'essai
    const [cnt] = await connection.query(
      `SELECT COUNT(*) AS n FROM B_QZ_TENTATIVE WHERE id_Quiz = ? AND id_UTILISATEUR = ?`,
      [id, userId]
    );
    const numEssai = cnt[0].n + 1;

    // Retest contrôlé (créateur, site propriétaire, invités pour leur site) : au-delà de la 1re tentative, une
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
            "Retest non autorisé : un nouvel essai doit être accordé par le responsable du quiz.",
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
        (id_Quiz, id_UTILISATEUR, score, nb_bonnes, nb_total, nb_points, nb_points_total, reussi, num_essai, statut, date_tentative, date_debut, date_fin)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, userId, score, nbBonnes, nbTotal, nbPoints, nbPointsTotal, reussi ? 1 : 0, numEssai, statut, dateFin, dateDebut, dateFin]
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
      nb_points: nbPoints,
      nb_points_total: nbPointsTotal,
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
    await cloturerSessionsExpirees({ userId }); // passages au temps épuisé
    const per = filtrePeriode(req.query, "t.date_tentative");
    if (per.erreur) return res.status(400).json({ message: per.erreur });
    const [rows] = await db.query(
      `SELECT t.id, t.id_Quiz, q.titre AS quiz_titre, t.score, t.nb_bonnes, t.nb_total,
              t.nb_points + 0e0 AS nb_points, t.nb_points_total + 0e0 AS nb_points_total,
              t.reussi, t.num_essai, t.statut, t.date_tentative
       FROM B_QZ_TENTATIVE t
       JOIN B_QZ_QUIZ q ON q.id = t.id_Quiz
       WHERE t.id_UTILISATEUR = ? ${per.sql}
       ORDER BY t.id DESC`,
      [userId, ...per.params]
    );
    const pg = lirePage(req.query); // out113 : une page seulement
    return res.status(200).send(pg ? decouper(rows, pg) : rows);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

/* ------------------------------------------------------------------ */
/* PHASE 3 - NOTIFICATIONS "NOUVEAUX QUIZ" (section dediee)            */
/* ------------------------------------------------------------------ */

// Notifications quiz de l'utilisateur connecte (section "Nouveautes")
const getMesNotificationsQuiz = async (req, res, next) => {
  const userId = req.auth ? req.auth.userId : null;
  try {
    const [rows] = await db.query(
      `SELECT n.id, n.id_Quiz, n.titre, n.message, n.lu, n.dateCreation, q.Etat AS quiz_etat,
              q.titre AS quiz_titre, q.acces AS quiz_acces
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
    await db.query(`UPDATE B_QZ_NOTIFICATION SET lu=1, dateLecture=COALESCE(dateLecture, NOW()) WHERE id=? AND id_UTILISATEUR=?`, [id, userId]);
    return res.status(201).json({ message: "Notification marquee comme lue" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

/* ------------------------------------------------------------------ */
/* PHASE 3 - BADGES / RECOMPENSES                                      */
/* ------------------------------------------------------------------ */

// Evalue et attribue les badges merites par l'utilisateur (utils/badgesQuiz.js).
// Retourne les badges NOUVELLEMENT obtenus (pour feedback immediat).
const attribuerBadges = async (connection, userId) => {
  const { ajoutes } = await synchroniserBadges(connection, userId);
  return ajoutes.map(({ code, nom, description, icone }) => ({ code, nom, description, icone }));
};

// Tous les badges + drapeau "obtenu" pour l'utilisateur connecte
const getMesBadges = async (req, res, next) => {
  const userId = req.auth ? req.auth.userId : null;
  try {
    return res.status(200).send(await badgesUtilisateur(db, userId));
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
// Rapports (sous-menu Quiz > Rapports) — mêmes droits que la gestion d'un quiz :
//  - admin : tous les quiz, tous les participants ;
//  - créateur / utilisateur du site propriétaire : ses quiz, tous les participants ;
//  - utilisateur AUTORISÉ (site invité) : le quiz, mais seulement les tentatives
//    des agents de SON site (limite_site = 1) ;
//  - les autres : aucun quiz.
// Les statistiques ne comptent que les tentatives de la période ?du=&au= ;
// quand une période est choisie, les quiz sans tentative sur la période sont retirés.
/**
 * out113 — page du rapport de difficulté : rang, chiffres de synthèse (sur tous les quiz
 * de la période) et filtres de l'écran (recherche, « masquer sans tentative »), calculés
 * ici exactement comme le faisait le navigateur.
 */
const paginerRapport = (rapport, q, pg) => {
  let rang = 0;
  const lignes = rapport.map((r) => {
    const l = {
      ...r,
      nb_tentatives: Number(r.nb_tentatives) || 0,
      nb_reussis: Number(r.nb_reussis) || 0,
      score_moyen: r.score_moyen == null ? null : Number(r.score_moyen),
      taux_reussite: r.taux_reussite == null ? null : Number(r.taux_reussite),
      nb_designes: Number(r.nb_designes) || 0,
      nb_passes: Number(r.nb_passes) || 0,
      nb_non_passes: Number(r.nb_non_passes) || 0,
      taux_participation: r.taux_participation == null ? null : Number(r.taux_participation),
      rang: null,
    };
    if (l.nb_tentatives > 0) l.rang = ++rang;
    return l;
  });
  const avec = lignes.filter((r) => r.nb_tentatives > 0);
  const totalTentatives = avec.reduce((s, r) => s + r.nb_tentatives, 0);
  const totalReussites = avec.reduce((s, r) => s + r.nb_reussis, 0);
  const totalDesignes = lignes.reduce((s, r) => s + (r.nb_designes || 0), 0);
  const totalNonPasses = lignes.reduce((s, r) => s + (r.nb_non_passes || 0), 0);
  const avecScore = avec.filter((r) => r.score_moyen != null);
  const n = avecScore.reduce((s, r) => s + r.nb_tentatives, 0);
  const synthese = {
    nb_quiz: lignes.length,
    nb_avec_tentatives: avec.length,
    total_tentatives: totalTentatives,
    total_reussites: totalReussites,
    taux_global: totalTentatives ? (100 * totalReussites) / totalTentatives : null,
    total_designes: totalDesignes,
    total_non_passes: totalNonPasses,
    taux_participation_global: totalDesignes ? (100 * (totalDesignes - totalNonPasses)) / totalDesignes : null,
    score_global: n ? avecScore.reduce((s, r) => s + r.score_moyen * r.nb_tentatives, 0) / n : null,
    a_des_limites: lignes.some((r) => r.limite_site === 1),
  };
  const nrm = (t) => normaliser(t).trim();
  const rech = nrm(q.q);
  const masquer = String(q.masquer_sans_tentative || "") === "1";
  const filtres = lignes.filter((r) => (!masquer || r.nb_tentatives > 0) &&
    (!rech || nrm(r.titre).includes(rech) || (r.fiches_liees || []).some((f) => nrm(f.titre).includes(rech))));
  return { ...decouper(filtres, pg), synthese };
};

const getRapportDifficulte = async (req, res, next) => {
  const userId = req.auth ? req.auth.userId : null;
  try {
    await cloturerSessionsExpirees(); // passages au temps épuisé
    const role = await getRole(userId);
    const admin = role === "R_ADMI";
    const monSite = await siteDe(userId);
    const per = filtrePeriode(req.query, "t.date_tentative");
    if (per.erreur) return res.status(400).json({ message: per.erreur });
    // Côté propriétaire (créateur ou même site que le créateur), évalué par quiz.
    const COTE_PROPRIO = `(q.id_createur = ? OR EXISTS(SELECT 1 FROM B_UTILISATEUR cr
                             WHERE cr.id = q.id_createur AND cr.id_Site = ?))`;
    const params = [];
    let limite = "0";
    let joinScope = "";
    let where = "";
    if (!admin) {
      limite = `CASE WHEN ${COTE_PROPRIO} THEN 0 ELSE 1 END`;
      params.push(userId, monSite);
      // Invité : seulement les tentatives des agents de son site.
      joinScope = ` AND (${COTE_PROPRIO} OR EXISTS(SELECT 1 FROM B_UTILISATEUR ut
                                WHERE ut.id = t.id_UTILISATEUR AND ut.id_Site = ?))`;
      params.push(...per.params, userId, monSite, monSite);
      where = `WHERE ${COTE_PROPRIO}
                  OR EXISTS(SELECT 1 FROM B_QZ_AUTORISE a WHERE a.id_Quiz = q.id AND a.id_UTILISATEUR = ?)`;
      params.push(userId, monSite, userId);
    } else {
      params.push(...per.params);
    }
    const [rows] = await db.query(
      `SELECT * FROM (
       SELECT q.id, q.titre, FCH.titre AS fiche_titre, q.Etat, q.statut,
              ${limite} AS limite_site,
              COUNT(t.id) AS nb_tentatives,
              SUM(CASE WHEN t.reussi=1 THEN 1 ELSE 0 END) AS nb_reussis,
              ROUND(AVG(t.score), 2) AS score_moyen,
              ROUND(100 * SUM(CASE WHEN t.reussi=1 THEN 1 ELSE 0 END) / NULLIF(COUNT(t.id),0), 2) AS taux_reussite
       FROM B_QZ_QUIZ q
       LEFT JOIN B_FICHE FCH ON FCH.id = q.id_Fiche
       LEFT JOIN B_QZ_TENTATIVE t ON t.id_Quiz = q.id ${per.sql}${joinScope}
       ${where}
       GROUP BY q.id, q.titre, FCH.titre, q.Etat, q.statut
       ) x
       ${per.sql ? "WHERE x.nb_tentatives > 0" : ""}
       ORDER BY (taux_reussite IS NULL) ASC, taux_reussite ASC, nb_tentatives DESC, x.id ASC`,
      params
    );
    const fichesLiees = await fichesLieesParQuiz(rows.map(r => r.id));
    // Participation (état actuel, hors période) : participants désignés et ceux qui ont
    // passé le quiz au moins une fois. Invité : les participants de son site.
    const part = {};
    if (rows.length) {
      const [pr] = await db.query(
        `SELECT p.id_Quiz, p.id_Site,
                EXISTS (SELECT 1 FROM B_QZ_TENTATIVE t WHERE t.id_Quiz = p.id_Quiz AND t.id_UTILISATEUR = p.id_UTILISATEUR) AS passe
           FROM B_QZ_PARTICIPANT p WHERE p.id_Quiz IN (?)`,
        [rows.map(r => r.id)]
      );
      for (const r of rows) part[r.id] = { designes: 0, passes: 0 };
      const limite = Object.fromEntries(rows.map(r => [r.id, Number(r.limite_site) === 1]));
      for (const p of pr) {
        if (limite[p.id_Quiz] && Number(p.id_Site) !== Number(monSite)) continue;
        part[p.id_Quiz].designes++;
        if (Number(p.passe)) part[p.id_Quiz].passes++;
      }
    }
    const rapport = rows.map(r => {
      const p = part[r.id] || { designes: 0, passes: 0 };
      return {
        ...r,
        fiches_liees: fichesLiees[r.id] || [],
        nb_designes: p.designes,
        nb_passes: p.passes,
        nb_non_passes: p.designes - p.passes,
        taux_participation: p.designes ? Math.round((10000 * p.passes) / p.designes) / 100 : null,
      };
    });
    const pg = lirePage(req.query);
    if (!pg) return res.status(200).send(rapport); // liste complète (export, compatibilité)
    return res.status(200).json(paginerRapport(rapport, req.query, pg));
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

// Détail par question d'un quiz : taux d'échec (réponses incorrectes).
// Accès : peutGererQuiz. Invité : tentatives des agents de son site uniquement.
const getRapportQuestions = async (req, res, next) => {
  const { id } = req.params;
  const userId = req.auth ? req.auth.userId : null;
  try {
    if (!(await peutGererQuiz(userId, id))) {
      return res.status(403).json({ message: "Accès non autorisé à ce quiz" });
    }
    const per = filtrePeriode(req.query, "t.date_tentative");
    if (per.erreur) return res.status(400).json({ message: per.erreur });
    const params = [...per.params];
    let scopeSite = "";
    if (!(await estCoteProprietaire(userId, id))) {
      scopeSite = " AND EXISTS(SELECT 1 FROM B_UTILISATEUR ut WHERE ut.id = t.id_UTILISATEUR AND ut.id_Site = ?)";
      params.push(await siteDe(userId));
    }
    params.push(id);
    const [rows] = await db.query(
      `SELECT qq.id, qq.libelle,
              COUNT(t.id) AS nb_reponses,
              SUM(CASE WHEN t.id IS NOT NULL AND r.est_correcte=0 THEN 1 ELSE 0 END) AS nb_echecs,
              ROUND(100 * SUM(CASE WHEN t.id IS NOT NULL AND r.est_correcte=0 THEN 1 ELSE 0 END) / NULLIF(COUNT(t.id),0), 2) AS taux_echec
       FROM B_QZ_QUESTION qq
       LEFT JOIN B_QZ_REPONSE r ON r.id_Question = qq.id
       LEFT JOIN B_QZ_TENTATIVE t ON t.id = r.id_Tentative ${per.sql}${scopeSite}
       WHERE qq.id_Quiz = ?
       GROUP BY qq.id, qq.libelle
       ORDER BY taux_echec DESC`,
      params
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
    await cloturerSessionsExpirees(); // passages au temps épuisé
    const [urows] = await db.query(
      `SELECT f.Role_Associe AS role FROM B_UTILISATEUR u JOIN B_FONCTION f ON u.id_Fonction=f.id WHERE u.id=?`,
      [userId]
    );
    const estAdmin = urows.length && urows[0].role === "R_ADMI";
    const per = filtrePeriode(req.query, "t.date_tentative");
    if (per.erreur) return res.status(400).json({ message: per.erreur });
    const params = [];
    let scope = "";
    if (!estAdmin) {
      // Mêmes règles que peutAutoriserRetest :
      //  - site propriétaire (créateur ou même site que le créateur) : tous les participants ;
      //  - utilisateur autorisé (site invité) : les participants de son site.
      const monSite = await siteDe(userId);
      scope = `AND EXISTS (SELECT 1 FROM B_QZ_PARTICIPANT p
                            WHERE p.id_Quiz = t.id_Quiz AND p.id_UTILISATEUR = t.id_UTILISATEUR)
               AND ( q.id_createur = ?
                     OR EXISTS (SELECT 1 FROM B_UTILISATEUR cr
                                 WHERE cr.id = q.id_createur AND cr.id_Site = ?)
                     OR ( EXISTS (SELECT 1 FROM B_QZ_AUTORISE a
                                   WHERE a.id_Quiz = t.id_Quiz AND a.id_UTILISATEUR = ?)
                          AND u.id_Site = ? ) )`;
      params.push(userId, monSite, userId, monSite);
    }
    const [rows] = await db.query(
      `SELECT t.id AS id_tentative, t.id_Quiz, t.id_UTILISATEUR, t.score, t.num_essai, t.date_tentative,
              q.titre AS quiz_titre, GREATEST(COALESCE(q.nb_retest_max, 1), 1) AS nb_retest_max,
              u.nom, u.prenom, u.nom_utilisateur AS login,
              (SELECT COUNT(*) FROM B_QZ_RETEST r
                 WHERE r.id_Quiz=t.id_Quiz AND r.id_UTILISATEUR=t.id_UTILISATEUR AND r.consomme=0) AS retest_en_attente
       FROM B_QZ_TENTATIVE t
       JOIN B_QZ_QUIZ q ON q.id = t.id_Quiz
       JOIN B_UTILISATEUR u ON u.id = t.id_UTILISATEUR
       WHERE t.reussi = 0
         AND t.id = (SELECT MAX(t2.id) FROM B_QZ_TENTATIVE t2
                       WHERE t2.id_Quiz=t.id_Quiz AND t2.id_UTILISATEUR=t.id_UTILISATEUR)
         -- Seuls les échecs qui attendent vraiment une décision (quiz avec retest,
         -- encore ouvert, maximum non atteint, pas déjà refusé, agent participant).
         AND ${sqlRetestADecider("t", "q")}
         ${scope}
         ${per.sql}
       ORDER BY t.date_tentative DESC`,
      params.concat(per.params)
    );
    return res.status(200).send(rows);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

// Retest impossible pour cet agent sur ce quiz ? Renvoie le motif, sinon null.
const motifRetestImpossible = async (idQuiz, idAgent) => {
  const [[q]] = await db.query(
    `SELECT retest_auto, GREATEST(COALESCE(nb_retest_max, 1), 1) AS nb_retest_max, statut, Etat, date_fermeture
       FROM B_QZ_QUIZ WHERE id = ?`,
    [idQuiz]
  );
  if (!q) return "Quiz introuvable.";
  if (!Number(q.retest_auto)) {
    return "Ce quiz n'autorise pas de retest : activez « Autoriser les retests » dans ses paramètres.";
  }
  const indispo = indisponibiliteQuiz(q);
  if (indispo) return `Retest impossible : ${indispo.charAt(0).toLowerCase()}${indispo.slice(1)}`;
  const [der] = await db.query(
    "SELECT id, reussi, num_essai FROM B_QZ_TENTATIVE WHERE id_Quiz=? AND id_UTILISATEUR=? ORDER BY id DESC LIMIT 1",
    [idQuiz, idAgent]
  );
  if (!der.length || Number(der[0].reussi)) return "Aucun échec à traiter pour cet agent sur ce quiz.";
  if (Number(der[0].num_essai || 1) - 1 >= q.nb_retest_max) {
    return `Nombre maximum de retests atteint (${q.nb_retest_max}) pour cet agent.`;
  }
  return null;
};

// Classe des échecs « retest non autorisé » : ils sortent de la page des retests.
//  - une ligne : { id_Quiz, id_UTILISATEUR } ;
//  - tout un quiz : { id_Quiz, tous: true } -> tous les échecs en attente de décision
//    que l'utilisateur peut traiter (même périmètre que la page), hors retests déjà accordés.
const refuserRetest = async (req, res) => {
  const { id_Quiz, id_UTILISATEUR, tous } = req.body || {};
  const userId = req.auth ? req.auth.userId : null;
  if (!/^\d+$/.test(String(id_Quiz ?? "")) || (!tous && !/^\d+$/.test(String(id_UTILISATEUR ?? "")))) {
    return res.status(400).json({ message: "Quiz ou agent invalide." });
  }
  try {
    const [cands] = await db.query(
      `SELECT t.id, t.id_UTILISATEUR FROM B_QZ_TENTATIVE t JOIN B_QZ_QUIZ q ON q.id = t.id_Quiz
        WHERE t.id_Quiz = ? ${tous ? "" : "AND t.id_UTILISATEUR = ?"}
          AND t.reussi = 0
          AND t.id = (SELECT MAX(t2.id) FROM B_QZ_TENTATIVE t2
                        WHERE t2.id_Quiz = t.id_Quiz AND t2.id_UTILISATEUR = t.id_UTILISATEUR)
          AND NOT EXISTS (SELECT 1 FROM B_QZ_RETEST r WHERE r.id_Quiz = t.id_Quiz
                            AND r.id_UTILISATEUR = t.id_UTILISATEUR AND r.consomme = 0)
          AND ${sqlRetestADecider("t", "q")}`,
      tous ? [id_Quiz] : [id_Quiz, id_UTILISATEUR]
    );
    let n = 0;
    for (const c of cands) {
      if (!(await peutAutoriserRetest(userId, id_Quiz, c.id_UTILISATEUR))) continue;
      const [r] = await db.query(
        `INSERT IGNORE INTO B_QZ_RETEST_REFUS (id_Quiz, id_UTILISATEUR, id_Tentative, refuse_par, date_refus)
         VALUES (?, ?, ?, ?, NOW())`,
        [id_Quiz, c.id_UTILISATEUR, c.id, userId]
      );
      n += r.affectedRows || 0;
    }
    if (!tous && !n) {
      return res.status(400).json({ message: "Aucun échec en attente de décision pour cet agent sur ce quiz." });
    }
    return res.status(200).json({
      nb: n,
      message: n > 1 ? `${n} échecs classés « retest non autorisé ».` : n === 1
        ? "Échec classé « retest non autorisé »." : "Aucun échec à classer.",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

// Autorise un retest pour un agent sur un quiz + notifie l'agent.
const autoriserRetest = async (req, res, next) => {
  const { id_Quiz, id_UTILISATEUR } = req.body;
  if (!/^\d+$/.test(String(id_Quiz ?? "")) || !/^\d+$/.test(String(id_UTILISATEUR ?? ""))) {
    return res.status(400).json({ message: "Quiz ou agent invalide." });
  }
  try {
    const [[quizExiste]] = await db.query(`SELECT id FROM B_QZ_QUIZ WHERE id=?`, [id_Quiz]);
    if (!quizExiste) {
      return res.status(404).json({ message: "Quiz introuvable." });
    }
    if (!(await peutAutoriserRetest(req.auth ? req.auth.userId : null, id_Quiz, id_UTILISATEUR))) {
      return res.status(403).json({
        message: "Vous ne pouvez pas autoriser le retest de cet agent sur ce quiz.",
      });
    }
    const [ex] = await db.query(
      `SELECT id FROM B_QZ_RETEST WHERE id_Quiz=? AND id_UTILISATEUR=? AND consomme=0`,
      [id_Quiz, id_UTILISATEUR]
    );
    if (ex.length) {
      return res.status(200).json({ message: "Un retest est déjà en attente pour cet agent." });
    }
    const refus = await motifRetestImpossible(id_Quiz, id_UTILISATEUR);
    if (refus) return res.status(400).json({ message: refus });
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
    return res.status(201).json({ message: "Retest autorisé et notifié à l'agent" });
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
    const [r] = await db.query(
      `SELECT id, titre, statut, Etat, date_fermeture, code_pin, ${SQL_TOTAL_POINTS("B_QZ_QUIZ")} AS total_points FROM B_QZ_QUIZ WHERE code_pin=?`,
      [String(pin).trim()]
    );
    if (!r.length) {
      return res.status(200).json({ etat: "PIN_INVALIDE" });
    }
    const indispoPin = indisponibiliteQuiz(r[0]);
    if (indispoPin) {
      return res.status(200).json({ etat: "INDISPONIBLE", titre: r[0].titre, message: indispoPin });
    }
    // Participants désignés uniquement (privé : participant + PIN).
    if (!(await estParticipant(userId, r[0].id))) {
      return res.status(200).json({ etat: "NON_PARTICIPANT", titre: r[0].titre });
    }
    // Controle machine (parametre "autoriser_machines") : si la machine n'est pas
    // autorisee, on enregistre une demande et on renvoie l'etat "en attente".
    if (!(await ipAutoriseePourQuiz(r[0].id, req, userId))) {
      await enregistrerDemandeIp(r[0].id, userId, req);
      return res.status(200).json({ etat: "EN_ATTENTE", titre: r[0].titre });
    }
    // PIN valide sur une machine autorisée : mémorisé, plus de ressaisie ensuite.
    await memoriserPinValide(userId, r[0].id, r[0].code_pin);
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
      return res.status(403).json({ message: "Accès non autorisé à ce quiz" });
    }
    // Invité : seuls les agents de son site sont comptés.
    const siteImpose = await siteImposeRapport(userId, id);
    const scopeT = siteImpose == null ? "" :
      " AND EXISTS(SELECT 1 FROM B_UTILISATEUR ut WHERE ut.id = t.id_UTILISATEUR AND ut.id_Site = ?)";
    const scopeR = siteImpose == null ? "" :
      ` AND EXISTS(SELECT 1 FROM B_QZ_TENTATIVE t2 JOIN B_UTILISATEUR ut ON ut.id = t2.id_UTILISATEUR
                    WHERE t2.id = r.id_Tentative AND ut.id_Site = ?)`;
    // Questions ayant au moins un agent en echec
    const [questions] = await db.query(
      `SELECT qq.id, qq.libelle,
              COUNT(DISTINCT CASE WHEN r.est_correcte = 0 THEN t.id_UTILISATEUR END) AS nb_agents
       FROM B_QZ_QUESTION qq
       LEFT JOIN B_QZ_REPONSE r ON r.id_Question = qq.id
       LEFT JOIN B_QZ_TENTATIVE t ON t.id = r.id_Tentative${scopeT}
       WHERE qq.id_Quiz = ?
       GROUP BY qq.id, qq.libelle
       HAVING nb_agents > 0
       ORDER BY nb_agents DESC, qq.ordre, qq.id`,
      siteImpose == null ? [id] : [siteImpose, id]
    );
    // Distribution des choix par option pour chaque question
    // Invité (hors site propriétaire) : seulement les questions et le nombre
    // d'agents en échec, sans les réponses (rien qui permette de déduire la bonne).
    if (siteImpose != null) {
      for (const q of questions) q.options = [];
      return res.status(200).send(questions);
    }
    for (const q of questions) {
      const [opts] = await db.query(
        `SELECT o.id, o.libelle, o.est_correcte,
                (SELECT COUNT(*) FROM B_QZ_REPONSE r
                   WHERE r.id_Question = o.id_Question AND r.id_Option = o.id${scopeR}) AS nb_choix
         FROM B_QZ_OPTION o WHERE o.id_Question = ? ORDER BY o.ordre, o.id`,
        siteImpose == null ? [q.id] : [siteImpose, q.id]
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
    await cloturerSessionsExpirees({ idQuiz: id }); // passages au temps épuisé
    if (!(await peutVoirDetailQuiz(userId, id))) {
      return res.status(403).json({ message: "Accès non autorisé à ce quiz" });
    }
    const where = ["t.id_Quiz = ?"];
    const params = [id];
    // Agent : identifiant, login, nom ou prénom (recherche partielle, mot par mot).
    const mots = String(agent || "").trim().split(/\s+/).filter(Boolean);
    for (const mot of mots) {
      const like = `%${mot.replace(/[\\%_]/g, (c) => "\\" + c)}%`;
      const parId = /^\d+$/.test(mot) ? " OR u.id = ?" : "";
      where.push(`(u.nom_utilisateur LIKE ? OR u.nom LIKE ? OR u.prenom LIKE ?${parId})`);
      params.push(like, like, like);
      if (parId) params.push(Number(mot));
    }
    if (statut === "REUSSI") where.push("t.reussi = 1");
    else if (statut === "ECHEC") where.push("t.reussi = 0");
    // Invité : son site, quel que soit le filtre envoyé.
    const siteImpose = await siteImposeRapport(userId, id);
    if (siteImpose != null) {
      where.push("u.id_Site = ?");
      params.push(siteImpose);
    } else if (site && /^\d+$/.test(String(site).trim())) {
      where.push("u.id_Site = ?");
      params.push(Number(site));
    }
    const [rows] = await db.query(
      `SELECT t.id, t.id_UTILISATEUR, u.prenom, u.nom, u.id_Site, st.nom AS site,
              t.date_debut, t.date_fin, t.date_tentative, t.score, t.reussi, t.num_essai, t.statut,
              t.nb_points + 0e0 AS nb_points, t.nb_points_total + 0e0 AS nb_points_total,
              TIMESTAMPDIFF(SECOND, t.date_debut, t.date_fin) AS temps_secondes,
              (SELECT COUNT(*) FROM B_QZ_TENTATIVE t2
                WHERE t2.id_Quiz = t.id_Quiz AND t2.id_UTILISATEUR = t.id_UTILISATEUR) AS nb_essais,
              (SELECT COUNT(*) FROM B_QZ_RETEST rt
                WHERE rt.id_Quiz = t.id_Quiz AND rt.id_UTILISATEUR = t.id_UTILISATEUR AND rt.consomme = 0) AS retest_en_attente,
              (SELECT ri.id FROM B_QZ_REINITIALISATION ri
                WHERE ri.id_Quiz = t.id_Quiz AND ri.id_UTILISATEUR = t.id_UTILISATEUR AND ri.statut = 'EN_ATTENTE'
                LIMIT 1) AS reinit_id
       FROM B_QZ_TENTATIVE t
       JOIN B_UTILISATEUR u ON u.id = t.id_UTILISATEUR
       LEFT JOIN B_SITE st ON st.id = u.id_Site
       WHERE ${where.join(" AND ")}
       ORDER BY t.id DESC`,
      params
    );
    // Réinitialisation possible (données) : 1 seul essai, pas de retest en attente,
    // pas de demande en cours, quiz disponible. Les droits du demandeur (site
    // propriétaire + quiz.modifier) sont vérifiés à l'écran et par le serveur.
    await expirerReinitialisations();
    const dispo = await quizDisponible(id);
    for (const r of rows) {
      r.reinitialisable = dispo && Number(r.nb_essais) === 1 && Number(r.retest_en_attente) === 0 && !r.reinit_id ? 1 : 0;
    }
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
              t.nb_points + 0e0 AS nb_points, t.nb_points_total + 0e0 AS nb_points_total,
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
      return res.status(403).json({ message: "Accès non autorisé" });
    }
    // Invité : uniquement les tentatives des agents de son site.
    const siteImpose = await siteImposeRapport(userId, tr[0].id_Quiz);
    if (siteImpose != null) {
      const siteAgent = await siteDe(tr[0].id_UTILISATEUR);
      if (siteAgent == null || Number(siteAgent) !== siteImpose) {
        return res.status(403).json({ message: "Vous ne pouvez consulter que les tentatives des agents de votre site." });
      }
    }
    const [reps] = await db.query(
      `SELECT r.id_Question, qq.libelle, qq.points + 0e0 AS points, r.est_correcte
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

/* ------------------------------------------------------------------ */
/* DURÉE ÉPUISÉE : clôture des passages par le serveur                 */
/* ------------------------------------------------------------------ */
// Quand la durée d'un quiz est épuisée (+ marge), le passage non soumis est
// enregistré comme une tentative « TEMPS_ECOULE » (0 %, réponses non données
// comptées fausses) et la session supprimée : le chrono ne peut plus être relancé.
// Reprise possible seulement par un retest autorisé ou une réinitialisation
// (site propriétaire + confirmation de l'agent). Clôture « paresseuse » : faite au
// chargement des écrans concernés (Participer, quiz, Mes scores, rapports, retests).
const MARGE_TEMPS_SECONDES = 30;

const cloturerSessionsExpirees = async ({ idQuiz = null, userId = null } = {}) => {
  const params = [MARGE_TEMPS_SECONDES];
  let filtre = "";
  if (idQuiz) { filtre += " AND s.id_Quiz = ?"; params.push(idQuiz); }
  if (userId) { filtre += " AND s.id_UTILISATEUR = ?"; params.push(userId); }
  const [sessions] = await db.query(
    `SELECT s.id_Quiz, s.id_UTILISATEUR, s.date_debut, q.duree, q.titre
       FROM B_QZ_SESSION s JOIN B_QZ_QUIZ q ON q.id = s.id_Quiz
      WHERE q.duree > 0
        AND TIMESTAMPDIFF(SECOND, s.date_debut, NOW()) > q.duree * 60 + ?
        AND (q.date_reinitialisation IS NULL OR s.date_debut >= q.date_reinitialisation)
        ${filtre}`,
    params
  );
  let nb = 0;
  for (const se of sessions) {
    const cx = await db.getConnection();
    try {
      await cx.beginTransaction();
      // La session est consommée ici (protège d'une clôture en double).
      const [del] = await cx.query(
        "DELETE FROM B_QZ_SESSION WHERE id_Quiz=? AND id_UTILISATEUR=? AND date_debut=?",
        [se.id_Quiz, se.id_UTILISATEUR, se.date_debut]
      );
      if (!del.affectedRows) { await cx.rollback(); continue; }
      const [questions] = await cx.query("SELECT id, points + 0e0 AS points FROM B_QZ_QUESTION WHERE id_Quiz=?", [se.id_Quiz]);
      const total = r2(questions.reduce((a, q) => a + Number(q.points || 0), 0));
      const [[c]] = await cx.query(
        "SELECT COUNT(*) AS n FROM B_QZ_TENTATIVE WHERE id_Quiz=? AND id_UTILISATEUR=?",
        [se.id_Quiz, se.id_UTILISATEUR]
      );
      const numEssai = Number(c.n) + 1;
      if (numEssai > 1) {
        // Le retest autorisé est consommé par ce passage.
        await cx.query(
          `UPDATE B_QZ_RETEST SET consomme=1, date_consommation=NOW()
            WHERE id_Quiz=? AND id_UTILISATEUR=? AND consomme=0 ORDER BY id LIMIT 1`,
          [se.id_Quiz, se.id_UTILISATEUR]
        );
      }
      const dateFin = new Date(new Date(se.date_debut).getTime() + Number(se.duree) * 60000);
      const [t] = await cx.query(
        `INSERT INTO B_QZ_TENTATIVE
          (id_Quiz, id_UTILISATEUR, score, nb_bonnes, nb_total, nb_points, nb_points_total, reussi, num_essai, statut, date_tentative, date_debut, date_fin)
         VALUES (?,?,0,0,?,0,?,0,?,'TEMPS_ECOULE',?,?,?)`,
        [se.id_Quiz, se.id_UTILISATEUR, questions.length, total, numEssai, dateFin, se.date_debut, dateFin]
      );
      for (const q of questions) {
        await cx.query(
          "INSERT INTO B_QZ_REPONSE (id_Tentative, id_Question, id_Option, est_correcte) VALUES (?,?,NULL,0)",
          [t.insertId, q.id]
        );
      }
      await notifierQuiz(
        cx, se.id_Quiz, se.id_UTILISATEUR, "Temps écoulé",
        `Le temps imparti pour le quiz « ${se.titre} » est écoulé : votre passage a été clôturé (score 0 %).`
      );
      await cx.commit();
      nb++;
    } catch (e) {
      try { await cx.rollback(); } catch (er) {}
      console.log(e);
    } finally {
      cx.release();
    }
  }
  return nb;
};

// Quiz EN COURS de l'utilisateur (privés et publics) : passage ouvert, non soumis,
// avec du temps restant (ou sans durée), quiz toujours disponible, participant désigné,
// passage non périmé (quiz non réinitialisé depuis). Reprise sans code PIN.
const getQuizEnCours = async (req, res) => {
  const userId = req.auth ? req.auth.userId : null;
  try {
    await cloturerSessionsExpirees({ userId });
    const [rows] = await db.query(
      `SELECT q.id, q.titre, q.acces, q.note_passage, q.duree,
              (SELECT COUNT(*) FROM B_QZ_QUESTION qq WHERE qq.id_Quiz = q.id) AS nb_questions,
              (SELECT COUNT(*) FROM B_QZ_TENTATIVE t WHERE t.id_Quiz = q.id AND t.id_UTILISATEUR = s.id_UTILISATEUR) AS nb_essais,
              GREATEST(0, TIMESTAMPDIFF(SECOND, s.date_debut, NOW())) AS temps_ecoule_secondes,
              CASE WHEN ${sqlSessionEnGrace("s", "q")}
                   THEN DATE_FORMAT(${sqlFinGrace("s", "q")}, '%Y-%m-%dT%H:%i:%s') END AS fin_grace
         FROM B_QZ_SESSION s JOIN B_QZ_QUIZ q ON q.id = s.id_Quiz
        WHERE s.id_UTILISATEUR = ?
          AND (${SQL_QUIZ_DISPONIBLE} OR ${sqlSessionEnGrace("s", "q")})
          AND (q.date_reinitialisation IS NULL OR s.date_debut >= q.date_reinitialisation)
          AND EXISTS (SELECT 1 FROM B_QZ_PARTICIPANT p WHERE p.id_Quiz = q.id AND p.id_UTILISATEUR = s.id_UTILISATEUR)
        ORDER BY s.date_debut DESC`,
      [userId]
    );
    return res.status(200).send(rows);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

// ============ Participer : « Quiz disponibles » + « Quiz terminés » ============
// Une seule liste pour l'écran Participer (hors passages en cours, listés à part) :
//  - disponibles : quiz ouverts où l'utilisateur est participant, PUBLICS ou PRIVÉS
//    déjà déverrouillés par code PIN (B_QZ_PIN_VALIDE, code inchangé), jamais tentés
//    ou avec un retest autorisé ;
//  - terminés : quiz tentés sans nouvel essai possible, quel que soit le type, y
//    compris les quiz depuis fermés (historique ; « Voir » seulement si encore ouvert).
const getMesQuiz = async (req, res) => {
  const userId = req.auth ? req.auth.userId : null;
  try {
    await cloturerSessionsExpirees({ userId });
    let pinJoin = "0";
    try {
      await db.query("SELECT 1 FROM B_QZ_PIN_VALIDE LIMIT 1");
      pinJoin = `EXISTS (SELECT 1 FROM B_QZ_PIN_VALIDE pv WHERE pv.id_Quiz = q.id AND pv.id_UTILISATEUR = u.id
                          AND pv.code_pin = q.code_pin)`;
    } catch (e) {
      // migration 51 non jouée : aucun quiz privé déverrouillé
    }
    const [rows] = await db.query(
      `SELECT q.id, q.titre, COALESCE(q.acces, 'PRIVATE') AS acces, q.note_passage, q.duree, q.dateCreation,
              (${SQL_QUIZ_DISPONIBLE} AND ${SQL_BAREME_CONFORME}) AS dispo,
              EXISTS (SELECT 1 FROM B_QZ_PARTICIPANT p WHERE p.id_Quiz = q.id AND p.id_UTILISATEUR = u.id) AS participant,
              ${pinJoin} AS pin_ok,
              (SELECT COUNT(*) FROM B_QZ_QUESTION qq WHERE qq.id_Quiz = q.id) AS nb_questions,
              (SELECT COUNT(*) FROM B_QZ_TENTATIVE t WHERE t.id_Quiz = q.id AND t.id_UTILISATEUR = u.id) AS nb_essais,
              (SELECT COUNT(*) FROM B_QZ_RETEST r WHERE r.id_Quiz = q.id AND r.id_UTILISATEUR = u.id AND r.consomme = 0) AS retest_autorise,
              (SELECT t2.reussi FROM B_QZ_TENTATIVE t2 WHERE t2.id_Quiz = q.id AND t2.id_UTILISATEUR = u.id
                 ORDER BY t2.id DESC LIMIT 1) AS derniere_reussi,
              (SELECT t3.score FROM B_QZ_TENTATIVE t3 WHERE t3.id_Quiz = q.id AND t3.id_UTILISATEUR = u.id
                 ORDER BY t3.id DESC LIMIT 1) AS dernier_score,
              (SELECT MAX(COALESCE(t4.date_fin, t4.date_tentative)) FROM B_QZ_TENTATIVE t4
                 WHERE t4.id_Quiz = q.id AND t4.id_UTILISATEUR = u.id) AS date_dernier_passage,
              (q.statut = 'ACTIF' AND (q.Etat <> 'OUVERT' OR q.date_fermeture <= NOW())) AS ferme,
              CASE WHEN q.date_fermeture <= NOW() THEN q.date_fermeture END AS date_fermeture
         FROM B_QZ_QUIZ q JOIN B_UTILISATEUR u ON u.id = ?
        WHERE (SELECT COUNT(*) FROM B_QZ_QUESTION qq WHERE qq.id_Quiz = q.id) > 0
          -- Passage en cours (quiz ouvert, ou fermé mais encore dans son délai de grâce) :
          -- listé à part dans « Quiz en cours ». Un passage abandonné à la fermeture ne compte pas.
          AND NOT EXISTS (SELECT 1 FROM B_QZ_SESSION s WHERE s.id_Quiz = q.id AND s.id_UTILISATEUR = u.id
                            AND (q.date_reinitialisation IS NULL OR s.date_debut >= q.date_reinitialisation)
                            AND ((${SQL_QUIZ_DISPONIBLE}) OR ${sqlSessionEnGrace("s", "q")}))
          AND (
            EXISTS (SELECT 1 FROM B_QZ_TENTATIVE t WHERE t.id_Quiz = q.id AND t.id_UTILISATEUR = u.id)
            OR (EXISTS (SELECT 1 FROM B_QZ_PARTICIPANT p WHERE p.id_Quiz = q.id AND p.id_UTILISATEUR = u.id)
                AND (COALESCE(q.acces, 'PRIVATE') = 'PUBLIC' OR ${pinJoin}
                     -- Quiz fermé sans passage : historique « Non passé » (même privé sans PIN saisi)
                     OR (q.statut = 'ACTIF' AND (q.Etat <> 'OUVERT' OR q.date_fermeture <= NOW()))))
          )
        ORDER BY q.id DESC`,
      [userId]
    );
    const disponibles = [];
    const termines = [];
    for (const r of rows) {
      const ouvertPourMoi = !!(r.dispo && r.participant && (r.acces === "PUBLIC" || r.pin_ok));
      const item = {
        id: r.id,
        titre: r.titre,
        acces: r.acces,
        note_passage: r.note_passage,
        duree: r.duree,
        dateCreation: r.dateCreation,
        nb_questions: r.nb_questions,
        nb_essais: r.nb_essais,
        retest_autorise: r.retest_autorise,
        derniere_reussi: r.derniere_reussi,
        dernier_score: r.dernier_score,
        date_dernier_passage: r.date_dernier_passage,
      };
      if (ouvertPourMoi && (r.nb_essais === 0 || r.retest_autorise > 0)) {
        item.etat = r.nb_essais === 0 ? "A_COMMENCER" : "RETEST";
        disponibles.push(item);
      } else if (r.nb_essais > 0) {
        item.etat = "TERMINE";
        item.peut_voir = ouvertPourMoi; // quiz fermé / non accessible : historique seul
        termines.push(item);
      } else if (r.participant && r.ferme) {
        // Désigné, jamais passé, quiz arrivé à échéance (ou clôturé) : « Non passé ».
        item.etat = "NON_PASSE";
        item.peut_voir = false;
        item.date_fermeture = r.date_fermeture; // null : clôturé manuellement
        termines.push(item);
      }
    }
    // Retest d'abord, puis les plus récents ; terminés : dernier passage (ou fermeture) d'abord.
    disponibles.sort((x, y) => (x.etat === "RETEST" ? 0 : 1) - (y.etat === "RETEST" ? 0 : 1) || y.id - x.id);
    const dateTri = (x) => new Date(x.date_dernier_passage || x.date_fermeture || 0);
    termines.sort((x, y) => dateTri(y) - dateTri(x) || y.id - x.id);
    return res.status(200).send({ disponibles, termines });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

// ============ Quiz PUBLICS visibles selon le site (sans code PIN) ============
const getQuizPublics = async (req, res) => {
  const userId = req.auth ? req.auth.userId : null;
  try {
    await cloturerSessionsExpirees({ userId });
    // Quiz PUBLICS : visibles directement (sans PIN) par leurs participants désignés.
    const [rows] = await db.query(
      `SELECT q.id, q.titre, q.note_passage, q.duree, q.dateCreation,
              (SELECT COUNT(*) FROM B_QZ_QUESTION qq WHERE qq.id_Quiz = q.id) AS nb_questions,
              (SELECT COUNT(*) FROM B_QZ_TENTATIVE t WHERE t.id_Quiz = q.id AND t.id_UTILISATEUR = ?) AS nb_essais,
              (SELECT TIMESTAMPDIFF(SECOND, ss.date_debut, NOW()) FROM B_QZ_SESSION ss
                 WHERE ss.id_Quiz = q.id AND ss.id_UTILISATEUR = ?) AS temps_ecoule_secondes
       FROM B_QZ_QUIZ q
       WHERE ${SQL_QUIZ_DISPONIBLE} AND ${SQL_BAREME_CONFORME} AND q.acces = 'PUBLIC'
         AND (SELECT COUNT(*) FROM B_QZ_QUESTION qq WHERE qq.id_Quiz = q.id) > 0
         AND EXISTS (SELECT 1 FROM B_QZ_PARTICIPANT p WHERE p.id_Quiz = q.id AND p.id_UTILISATEUR = ?)
       ORDER BY q.id DESC`,
      [userId, userId, userId]
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
    if (!(await peutGererQuiz(userId, id))) {
      return res.status(403).json({ message: "Accès non autorisé à ce quiz" });
    }
    // Invité autorisé : seulement les demandes des agents de son site.
    const siteImpose = await siteImposeRapport(userId, id);
    let scope = "";
    const params = [id];
    if (siteImpose != null) {
      scope = "AND u.id_Site = ?";
      params.push(siteImpose);
    }
    const [rows] = await db.query(
      "SELECT d.id, d.id_Quiz, d.id_UTILISATEUR, d.adresse_ip, d.statut, d.dateCreation, u.nom, u.prenom, u.nom_utilisateur AS login, st.nom AS site FROM B_QZ_IP_DEMANDE d JOIN B_UTILISATEUR u ON u.id = d.id_UTILISATEUR LEFT JOIN B_SITE st ON st.id = u.id_Site WHERE d.id_Quiz = ? AND d.statut = 'EN_ATTENTE' " + scope + " ORDER BY d.dateCreation DESC",
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
      return res.status(409).json({ message: "Demande déjà traitée" });
    }
    // Mêmes droits que la gestion du quiz ; l'invité autorisé ne traite que
    // les demandes des agents de son site.
    if (!(await peutGererQuiz(userId, dem.id_Quiz))) {
      return res.status(403).json({ message: "Accès non autorisé" });
    }
    const siteAgent = await siteDe(dem.id_UTILISATEUR);
    const siteImpose = await siteImposeRapport(userId, dem.id_Quiz);
    if (siteImpose != null && (siteAgent == null || Number(siteAgent) !== siteImpose)) {
      return res.status(403).json({ message: "Vous ne pouvez traiter que les demandes des agents de votre site." });
    }

    const now = new Date().toISOString().slice(0, 19).replace("T", " ");
    if (decision === "AUTORISER") {
      if (siteAgent == null) {
        return res.status(403).json({ message: "Cet agent n'est rattaché à aucun site : l'adresse IP ne peut pas être autorisée." });
      }
      // L'IP est autorisée pour le site de l'agent uniquement.
      await db.query(
        "INSERT INTO B_QZ_IP_AUTORISEE (id_Quiz, adresse_ip, id_Site, libelle, dateCreation) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE libelle = VALUES(libelle)",
        [dem.id_Quiz, dem.adresse_ip, siteAgent, "Demande approuvee", now]
      );
      // Les autres demandes en attente sur cette IP sont validées seulement pour le même site.
      await db.query(
        `UPDATE B_QZ_IP_DEMANDE d JOIN B_UTILISATEUR u ON u.id = d.id_UTILISATEUR
            SET d.statut='AUTORISE', d.dateTraitement=?, d.id_traitePar=?
          WHERE d.id_Quiz=? AND d.adresse_ip=? AND d.statut='EN_ATTENTE' AND u.id_Site=?`,
        [now, userId, dem.id_Quiz, dem.adresse_ip, siteAgent]
      );
      return res.status(200).json({ message: "Accès autorisé pour cette adresse IP" });
    }
    await db.query(
      "UPDATE B_QZ_IP_DEMANDE SET statut='REFUSE', dateTraitement=?, id_traitePar=? WHERE id=?",
      [now, userId, demandeId]
    );
    return res.status(200).json({ message: "Demande refusée" });
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
      return res.status(403).json({ message: "Accès non autorisé à ce quiz" });
    }
    // Invité autorisé : seulement les IP autorisées pour son site.
    const siteImpose = await siteImposeRapport(userId, id);
    const [rows] = await db.query(
      `SELECT i.id, i.id_Quiz, i.adresse_ip, i.id_Site, st.nom AS site, i.libelle, i.dateCreation,
              (SELECT GROUP_CONCAT(DISTINCT CONCAT(u.prenom, ' ', u.nom) SEPARATOR ', ')
                 FROM B_QZ_IP_DEMANDE d
                 JOIN B_UTILISATEUR u ON u.id = d.id_UTILISATEUR
                WHERE d.id_Quiz = i.id_Quiz AND d.adresse_ip = i.adresse_ip
                  AND u.id_Site = i.id_Site) AS agents
       FROM B_QZ_IP_AUTORISEE i
       LEFT JOIN B_SITE st ON st.id = i.id_Site
       WHERE i.id_Quiz = ? ${siteImpose != null ? "AND i.id_Site = ?" : ""}
       ORDER BY st.nom, i.adresse_ip`,
      siteImpose != null ? [id, siteImpose] : [id]
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
  const { adresse_ip, libelle, id_Site } = req.body;
  if (!adresse_ip || !String(adresse_ip).trim()) {
    return res.status(403).json({ message: "Merci de saisir une adresse IP" });
  }
  if (id_Site == null || !/^\d+$/.test(String(id_Site))) {
    return res.status(403).json({ message: "Merci de choisir le site" });
  }
  try {
    if (!(await peutGererQuiz(userId, id))) {
      return res.status(403).json({ message: "Accès non autorisé à ce quiz" });
    }
    // Invité autorisé : uniquement pour son site.
    const siteImpose = await siteImposeRapport(userId, id);
    if (siteImpose != null && Number(id_Site) !== siteImpose) {
      return res.status(403).json({ message: "Vous ne pouvez autoriser une adresse IP que pour votre site." });
    }
    const [st] = await db.query("SELECT id FROM B_SITE WHERE id = ?", [Number(id_Site)]);
    if (!st.length) return res.status(403).json({ message: "Site introuvable" });
    const ip = String(adresse_ip).trim();
    const now = new Date().toISOString().slice(0, 19).replace("T", " ");
    const [r] = await db.query(
      "INSERT INTO B_QZ_IP_AUTORISEE (id_Quiz, adresse_ip, id_Site, libelle, dateCreation) VALUES (?,?,?,?,?)",
      [id, ip, Number(id_Site), libelle ? String(libelle).trim() : null, now]
    );
    return res.status(201).json({ message: "Adresse IP ajoutee", id: r.insertId });
  } catch (error) {
    if (error && error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Cette adresse IP est déjà autorisée pour ce site" });
    }
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

const deleteQuizIp = async (req, res) => {
  const { ipId } = req.params;
  const userId = req.auth ? req.auth.userId : null;
  try {
    const [rows] = await db.query("SELECT id_Quiz, id_Site FROM B_QZ_IP_AUTORISEE WHERE id = ?", [ipId]);
    if (!rows.length) return res.status(404).json({ message: "Introuvable" });
    if (!(await peutGererQuiz(userId, rows[0].id_Quiz))) {
      return res.status(403).json({ message: "Accès non autorisé à ce quiz" });
    }
    const siteImpose = await siteImposeRapport(userId, rows[0].id_Quiz);
    if (siteImpose != null && Number(rows[0].id_Site) !== siteImpose) {
      return res.status(403).json({ message: "Vous ne pouvez supprimer que les adresses IP de votre site." });
    }
    await db.query("DELETE FROM B_QZ_IP_AUTORISEE WHERE id = ?", [ipId]);
    return res.status(200).json({ message: "Adresse IP supprimée" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

// =====================================================================
// DIFFUSION — désignation des participants (cahier Quiz, Partie II)
// Mécanisme aligné sur le module Sondage : filtres Site / Poste (fonction) /
// Programme restreignant la population, puis sélection NOMINATIVE dans le champ
// Utilisateur. L'audience est figée (liste nominative), additive à la
// rediffusion, et seuls les NOUVEAUX participants sont notifiés.
// =====================================================================

// Population éligible selon les filtres (multi-sélection, combinés en ET ;
// un filtre vide n'exclut rien).
const rechercherUtilisateursDiffusion = async (req, res) => {
  try {
    const toIds = (v) => String(v || "").split(",").map((x) => parseInt(x, 10)).filter((n) => !isNaN(n));
    let sIds = toIds(req.query.sites);
    // Quiz concerné (?quiz=) : un utilisateur AUTORISÉ (site invité) ne peut
    // rechercher que les utilisateurs de SON site, quels que soient les filtres.
    const idQuiz = parseInt(req.query.quiz, 10);
    if (!isNaN(idQuiz)) {
      const userId = req.auth ? req.auth.userId : null;
      if (!(await peutGererQuiz(userId, idQuiz))) {
        return res.status(403).json({ message: "Accès non autorisé à ce quiz" });
      }
    }
    // out114 : seuls les sites permis (son site + site à vision globale, ou tous).
    {
      const permis = await sitesDiffusionPermis(req.auth ? req.auth.userId : null);
      if (permis) {
        sIds = sIds.length ? sIds.filter((s) => permis.includes(s)) : permis;
        if (!sIds.length) return res.status(200).send([]);
      }
    }
    const pIds = toIds(req.query.postes);       // « Poste » = fonction du socle commun
    const prIds = toIds(req.query.programmes);
    const where = ["u.status = 'ACTIF'"];
    const params = [];
    if (sIds.length) { where.push("u.id_Site IN (" + sIds.map(() => "?").join(",") + ")"); params.push(...sIds); }
    if (pIds.length) { where.push("u.id_Fonction IN (" + pIds.map(() => "?").join(",") + ")"); params.push(...pIds); }
    if (prIds.length) { where.push("u.id_Programme IN (" + prIds.map(() => "?").join(",") + ")"); params.push(...prIds); }
    const [rows] = await db.query(
      `SELECT u.id, u.nom, u.prenom, u.nom_utilisateur, u.id_Site,
              st.nom AS site, f.nom AS fonction, pr.nom AS programme
         FROM B_UTILISATEUR u
         LEFT JOIN B_SITE st ON st.id = u.id_Site
         LEFT JOIN B_FONCTION f ON f.id = u.id_Fonction
         LEFT JOIN B_PROGRAMME pr ON pr.id = u.id_Programme
        WHERE ${where.join(" AND ")}
        ORDER BY u.nom, u.prenom`,
      params
    );
    return res.status(200).send(rows);
  } catch (error) {
    console.error("rechercherUtilisateursDiffusion:", error && error.message);
    res.status(500).json({ message: "Error request" });
  }
};

// Liste nominative des participants déjà diffusés d'un quiz.
const getParticipantsQuiz = async (req, res) => {
  const { id } = req.params;
  try {
    const userId = req.auth ? req.auth.userId : null;
    if (!(await peutGererQuiz(userId, id))) return res.status(403).json({ message: "Accès non autorisé à ce quiz" });
    // Utilisateur AUTORISÉ (site invité) : uniquement les participants de son site
    // (site figé au moment de la diffusion).
    const params = [id];
    let filtreSite = "";
    if (!(await estCoteProprietaire(userId, id))) {
      filtreSite = " AND p.id_Site = ?";
      params.push(await siteDe(userId));
    }
    await cloturerSessionsExpirees({ idQuiz: id }); // passages au temps épuisé
    const [rows] = await db.query(
      `SELECT p.id, p.id_UTILISATEUR, u.nom, u.prenom, u.nom_utilisateur,
              p.id_Site, st.nom AS site, p.notifie,
              DATE_FORMAT(p.dateDiffusion,'%Y-%m-%d %H:%i:%s') AS dateDiffusion,
              (SELECT COUNT(*) FROM B_QZ_TENTATIVE t WHERE t.id_Quiz = p.id_Quiz AND t.id_UTILISATEUR = p.id_UTILISATEUR) AS nb_essais,
              (SELECT t2.reussi FROM B_QZ_TENTATIVE t2 WHERE t2.id_Quiz = p.id_Quiz AND t2.id_UTILISATEUR = p.id_UTILISATEUR
                 ORDER BY t2.id DESC LIMIT 1) AS derniere_reussi,
              (SELECT t3.score FROM B_QZ_TENTATIVE t3 WHERE t3.id_Quiz = p.id_Quiz AND t3.id_UTILISATEUR = p.id_UTILISATEUR
                 ORDER BY t3.id DESC LIMIT 1) AS dernier_score,
              (SELECT DATE_FORMAT(MAX(COALESCE(t4.date_fin, t4.date_tentative)), '%Y-%m-%d %H:%i:%s') FROM B_QZ_TENTATIVE t4
                 WHERE t4.id_Quiz = p.id_Quiz AND t4.id_UTILISATEUR = p.id_UTILISATEUR) AS date_dernier_passage,
              EXISTS (SELECT 1 FROM B_QZ_SESSION s WHERE s.id_Quiz = q.id AND s.id_UTILISATEUR = p.id_UTILISATEUR
                        AND (q.date_reinitialisation IS NULL OR s.date_debut >= q.date_reinitialisation)
                        AND ((${SQL_QUIZ_DISPONIBLE}) OR ${sqlSessionEnGrace("s", "q")})) AS en_cours
         FROM B_QZ_PARTICIPANT p
         JOIN B_QZ_QUIZ q ON q.id = p.id_Quiz
         JOIN B_UTILISATEUR u ON u.id = p.id_UTILISATEUR
         LEFT JOIN B_SITE st ON st.id = p.id_Site
        WHERE p.id_Quiz = ?${filtreSite} ORDER BY u.nom, u.prenom`,
      params
    );
    // Statut du participant : passage en cours, dernier résultat, ou pas encore passé.
    for (const r of rows) {
      r.statut_passage = Number(r.en_cours)
        ? "EN_COURS"
        : Number(r.nb_essais) > 0
          ? (Number(r.derniere_reussi) ? "REUSSI" : "ECHEC")
          : "NON_PASSE";
    }
    return res.status(200).send(rows);
  } catch (error) {
    console.error("getParticipantsQuiz:", error && error.message);
    res.status(500).json({ message: "Error request" });
  }
};

// Diffusion / rediffusion : ajoute des participants (ADDITIF — ne remplace pas),
// fige leur site de rattachement, et NE NOTIFIE QUE LES NOUVEAUX.
const diffuserParticipants = async (req, res) => {
  const { id } = req.params;
  const ids = Array.isArray(req.body && req.body.id_utilisateurs) ? req.body.id_utilisateurs : [];
  if (!ids.length) return res.status(400).json({ message: "Aucun participant sélectionné : la diffusion est refusée." });
  try {
    const userId = req.auth ? req.auth.userId : null;
    if (!(await peutGererQuiz(userId, id))) return res.status(403).json({ message: "Accès non autorisé à ce quiz" });
    const [[quiz]] = await db.query("SELECT id, titre FROM B_QZ_QUIZ WHERE id=?", [id]);
    if (!quiz) return res.status(404).json({ message: "Quiz introuvable" });
    const totalPts = await totalPointsQuiz(db, id);
    if (!egalBareme(totalPts)) return res.status(409).json({ message: msgBareme(totalPts), total_points: totalPts });

    // Participants déjà désignés : conservés tels quels (pas de re-notification).
    const [ex] = await db.query("SELECT id_UTILISATEUR FROM B_QZ_PARTICIPANT WHERE id_Quiz=?", [id]);
    const deja = new Set(ex.map((x) => x.id_UTILISATEUR));
    const aAjouter = ids.filter((u) => Number.isInteger(u) && !deja.has(u));
    if (!aAjouter.length) {
      return res.status(200).json({ message: "Tous les utilisateurs sélectionnés sont déjà participants.", nb: 0 });
    }
    const [users] = await db.query(
      "SELECT id, id_Site FROM B_UTILISATEUR WHERE id IN (" + aAjouter.map(() => "?").join(",") + ")",
      aAjouter
    );
    // out114 : diffusion limitée aux sites permis (son site + site à vision globale ;
    // tous pour l'administrateur et le site à vision globale), même hors écran.
    const permis = await sitesDiffusionPermis(userId);
    if (permis && users.some((u) => u.id_Site == null || !permis.includes(Number(u.id_Site)))) {
      return res.status(403).json({ message: "Vous ne pouvez diffuser ce quiz qu'aux utilisateurs de votre site et du site à vision globale." });
    }
    const now = new Date();
    for (const u of users) {
      await db.query(
        `INSERT INTO B_QZ_PARTICIPANT (id_Quiz, id_UTILISATEUR, id_Site, notifie, dateDiffusion, id_diffusePar)
         VALUES (?,?,?,1,?,?)
         ON DUPLICATE KEY UPDATE id_UTILISATEUR = id_UTILISATEUR`,
        [id, u.id, u.id_Site, now, userId]
      );
      // Notification uniquement pour les nouveaux participants.
      await db.query(
        `INSERT INTO B_QZ_NOTIFICATION (id_Quiz, id_UTILISATEUR, titre, message, lu, dateCreation)
         VALUES (?,?,?,?,0,?)`,
        [id, u.id, "Nouveau quiz", `Un quiz vous a été diffusé : ${quiz.titre}`, now]
      );
    }
    return res.status(201).json({ message: `${users.length} participant(s) ajouté(s) à la diffusion.`, nb: users.length });
  } catch (error) {
    console.error("diffuserParticipants:", error && error.message);
    res.status(500).json({ message: "Error request" });
  }
};

// =====================================================================
// UTILISATEURS AUTORISÉS (cahier Quiz, Partie IV)
// Ouvre un quiz à des utilisateurs d'un SITE INVITÉ. Réservé au site
// propriétaire (peutAutoriser). Les utilisateurs du site propriétaire n'y
// figurent pas (leur capacité vient du rattachement au site). Traçabilité
// (auteur + date) et notification de l'utilisateur autorisé.
// =====================================================================
const getAutorises = async (req, res) => {
  const { id } = req.params;
  try {
    const userId = req.auth ? req.auth.userId : null;
    if (!(await peutGererQuiz(userId, id))) return res.status(403).json({ message: "Accès non autorisé à ce quiz" });
    const [rows] = await db.query(
      `SELECT a.id, a.id_UTILISATEUR, u.nom, u.prenom, u.nom_utilisateur, st.nom AS site,
              au.nom_utilisateur AS auteur,
              DATE_FORMAT(a.dateCreation,'%Y-%m-%d %H:%i:%s') AS dateCreation
         FROM B_QZ_AUTORISE a
         JOIN B_UTILISATEUR u ON u.id = a.id_UTILISATEUR
         LEFT JOIN B_SITE st ON st.id = u.id_Site
         LEFT JOIN B_UTILISATEUR au ON au.id = a.id_auteur
        WHERE a.id_Quiz = ? ORDER BY u.nom, u.prenom`,
      [id]
    );
    return res.status(200).send(rows);
  } catch (e) { console.error("getAutorises:", e && e.message); res.status(500).json({ message: "Error request" }); }
};

// Population éligible à l'autorisation : même filtrage que la diffusion, mais
// EXCLUANT les utilisateurs du site propriétaire (point 27).
const candidatsAutorisation = async (req, res) => {
  const { id } = req.params;
  try {
    const userId = req.auth ? req.auth.userId : null;
    if (!(await peutAutoriser(userId, id))) return res.status(403).json({ message: "Réservé aux utilisateurs du site propriétaire." });
    const [[prop]] = await db.query(
      `SELECT cr.id_Site AS site FROM B_QZ_QUIZ q JOIN B_UTILISATEUR cr ON cr.id = q.id_createur WHERE q.id = ?`, [id]
    );
    const ownerSite = prop ? prop.site : null;
    const toIds = (v) => String(v || "").split(",").map((x) => parseInt(x, 10)).filter((n) => !isNaN(n));
    const sIds = toIds(req.query.sites), pIds = toIds(req.query.postes), prIds = toIds(req.query.programmes);
    const where = ["u.status = 'ACTIF'"]; const params = [];
    if (ownerSite != null) { where.push("u.id_Site <> ?"); params.push(ownerSite); }
    if (sIds.length) { where.push("u.id_Site IN (" + sIds.map(() => "?").join(",") + ")"); params.push(...sIds); }
    if (pIds.length) { where.push("u.id_Fonction IN (" + pIds.map(() => "?").join(",") + ")"); params.push(...pIds); }
    if (prIds.length) { where.push("u.id_Programme IN (" + prIds.map(() => "?").join(",") + ")"); params.push(...prIds); }
    const [rows] = await db.query(
      `SELECT u.id, u.nom, u.prenom, u.nom_utilisateur, u.id_Site,
              st.nom AS site, f.nom AS fonction, pr.nom AS programme
         FROM B_UTILISATEUR u
         LEFT JOIN B_SITE st ON st.id = u.id_Site
         LEFT JOIN B_FONCTION f ON f.id = u.id_Fonction
         LEFT JOIN B_PROGRAMME pr ON pr.id = u.id_Programme
        WHERE ${where.join(" AND ")} ORDER BY u.nom, u.prenom`,
      params
    );
    return res.status(200).send(rows);
  } catch (e) { console.error("candidatsAutorisation:", e && e.message); res.status(500).json({ message: "Error request" }); }
};

const addAutorises = async (req, res) => {
  const { id } = req.params;
  const ids = Array.isArray(req.body && req.body.id_utilisateurs) ? req.body.id_utilisateurs : [];
  if (!ids.length) return res.status(400).json({ message: "Aucun utilisateur sélectionné." });
  try {
    const userId = req.auth ? req.auth.userId : null;
    if (!(await peutAutoriser(userId, id))) return res.status(403).json({ message: "Réservé aux utilisateurs du site propriétaire." });
    const [[quiz]] = await db.query("SELECT id, titre FROM B_QZ_QUIZ WHERE id=?", [id]);
    if (!quiz) return res.status(404).json({ message: "Quiz introuvable" });
    const [[prop]] = await db.query(
      `SELECT cr.id_Site AS site FROM B_QZ_QUIZ q JOIN B_UTILISATEUR cr ON cr.id = q.id_createur WHERE q.id = ?`, [id]
    );
    const ownerSite = prop ? prop.site : null;
    const [ex] = await db.query("SELECT id_UTILISATEUR FROM B_QZ_AUTORISE WHERE id_Quiz=?", [id]);
    const deja = new Set(ex.map((x) => x.id_UTILISATEUR));
    const [users] = await db.query(
      "SELECT id, id_Site FROM B_UTILISATEUR WHERE id IN (" + ids.map(() => "?").join(",") + ")", ids
    );
    const now = new Date();
    let n = 0;
    for (const u of users) {
      if (deja.has(u.id)) continue;
      if (ownerSite != null && Number(u.id_Site) === Number(ownerSite)) continue; // site propriétaire exclu
      await db.query(
        `INSERT IGNORE INTO B_QZ_AUTORISE (id_Quiz, id_UTILISATEUR, id_auteur, dateCreation) VALUES (?,?,?,?)`,
        [id, u.id, userId, now]
      );
      await db.query(
        `INSERT INTO B_QZ_NOTIFICATION (id_Quiz, id_UTILISATEUR, titre, message, lu, dateCreation) VALUES (?,?,?,?,0,?)`,
        [id, u.id, "Autorisation quiz", `Vous êtes autorisé à ouvrir le quiz : ${quiz.titre}`, now]
      );
      n++;
    }
    return res.status(201).json({ message: `${n} utilisateur(s) autorisé(s).`, nb: n });
  } catch (e) { console.error("addAutorises:", e && e.message); res.status(500).json({ message: "Error request" }); }
};

const removeAutorise = async (req, res) => {
  const { id, uid } = req.params;
  try {
    const userId = req.auth ? req.auth.userId : null;
    if (!(await peutAutoriser(userId, id))) return res.status(403).json({ message: "Réservé aux utilisateurs du site propriétaire." });
    await db.query("DELETE FROM B_QZ_AUTORISE WHERE id_Quiz=? AND id_UTILISATEUR=?", [id, uid]);
    return res.status(200).json({ message: "Autorisation retirée." });
  } catch (e) { console.error("removeAutorise:", e && e.message); res.status(500).json({ message: "Error request" }); }
};

/* ------------------------------------------------------------------ */
/* RÉINITIALISATION DE LA PARTICIPATION D'UN AGENT                     */
/* ------------------------------------------------------------------ */
// Demandée par un utilisateur du site propriétaire (quiz.modifier) pour un
// agent qui n'a fait qu'UN essai ; effective seulement quand l'agent la confirme :
// son essai (et ses réponses) est alors supprimé et il repasse le quiz en 1er essai.
// Une demande sans réponse expire à la clôture du quiz (clôturé, inactif ou date
// de fermeture dépassée).

const quizDisponible = async (idQuiz) => {
  const [r] = await db.query(`SELECT 1 FROM B_QZ_QUIZ q WHERE q.id = ? AND ${SQL_QUIZ_DISPONIBLE}`, [idQuiz]);
  return r.length > 0;
};

// Passe en EXPIREE les demandes en attente des quiz qui ne sont plus disponibles.
const expirerReinitialisations = () =>
  db.query(
    `UPDATE B_QZ_REINITIALISATION r JOIN B_QZ_QUIZ q ON q.id = r.id_Quiz
        SET r.statut = 'EXPIREE', r.dateReponse = NOW()
      WHERE r.statut = 'EN_ATTENTE' AND NOT (${SQL_QUIZ_DISPONIBLE})`
  );

// Le demandeur : site propriétaire (admin, créateur, collègue) ET quiz.modifier.
const peutReinitialiser = async (userId, idQuiz) => {
  if (!(await estCoteProprietaire(userId, idQuiz))) return false;
  const { role, set } = await permissionsEffectives(userId);
  return role === "R_ADMI" || set.has("quiz.modifier");
};

const MSG_REINIT_DROITS =
  "Seuls les utilisateurs du site propriétaire ayant la permission de modifier le quiz peuvent réinitialiser une participation.";

const maintenant = () => new Date().toISOString().slice(0, 19).replace("T", " ");

// POST /quiz/:id/reinitialisation  { id_UTILISATEUR }
const demanderReinitialisation = async (req, res) => {
  const { id } = req.params;
  const agentId = Number(req.body && req.body.id_UTILISATEUR);
  const userId = req.auth ? req.auth.userId : null;
  if (!agentId) return res.status(403).json({ message: "Agent non précisé" });
  try {
    await cloturerSessionsExpirees({ idQuiz: id, userId: agentId }); // passage au temps épuisé = essai
    if (!(await peutReinitialiser(userId, id))) return res.status(403).json({ message: MSG_REINIT_DROITS });
    if (!(await quizDisponible(id))) {
      return res.status(403).json({ message: "Le quiz n'est pas disponible (clôturé, inactif ou date de fermeture dépassée) : la réinitialisation n'est pas possible." });
    }
    const [tent] = await db.query(
      "SELECT id, score FROM B_QZ_TENTATIVE WHERE id_Quiz = ? AND id_UTILISATEUR = ?",
      [id, agentId]
    );
    if (!tent.length) return res.status(403).json({ message: "Cet agent n'a pas encore passé ce quiz." });
    if (tent.length > 1) {
      return res.status(403).json({ message: "La réinitialisation n'est possible que si l'agent n'a fait qu'un seul essai." });
    }
    const [rt] = await db.query(
      "SELECT 1 FROM B_QZ_RETEST WHERE id_Quiz = ? AND id_UTILISATEUR = ? AND consomme = 0 LIMIT 1",
      [id, agentId]
    );
    if (rt.length) return res.status(403).json({ message: "Un retest est déjà autorisé pour cet agent." });
    const [enCours] = await db.query(
      "SELECT 1 FROM B_QZ_REINITIALISATION WHERE id_Quiz = ? AND id_UTILISATEUR = ? AND statut = 'EN_ATTENTE' LIMIT 1",
      [id, agentId]
    );
    if (enCours.length) {
      return res.status(409).json({ message: "Une demande de réinitialisation est déjà en attente pour cet agent." });
    }
    const now = maintenant();
    const [r] = await db.query(
      `INSERT INTO B_QZ_REINITIALISATION (id_Quiz, id_UTILISATEUR, id_demandeur, statut, score_initial, dateDemande)
       VALUES (?,?,?,'EN_ATTENTE',?,?)`,
      [id, agentId, userId, tent[0].score, now]
    );
    const [q] = await db.query("SELECT titre FROM B_QZ_QUIZ WHERE id = ?", [id]);
    await db.query(
      `INSERT INTO B_QZ_NOTIFICATION (id_Quiz, id_UTILISATEUR, titre, message, lu, dateCreation) VALUES (?,?,?,?,0,?)`,
      [id, agentId, "Réinitialisation demandée",
       `Réinitialisation de votre participation demandée : ${q.length ? q[0].titre : ""}. Merci de la confirmer ou de la refuser.`, now]
    );
    return res.status(201).json({ message: "Demande envoyée : la réinitialisation sera effective après confirmation de l'agent.", id: r.insertId });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

// DELETE /quiz/reinitialisation/:rid  (annulation d'une demande en attente)
const annulerReinitialisation = async (req, res) => {
  const { rid } = req.params;
  const userId = req.auth ? req.auth.userId : null;
  try {
    await expirerReinitialisations();
    const [rows] = await db.query("SELECT * FROM B_QZ_REINITIALISATION WHERE id = ?", [rid]);
    if (!rows.length) return res.status(404).json({ message: "Demande introuvable" });
    if (!(await peutReinitialiser(userId, rows[0].id_Quiz))) return res.status(403).json({ message: MSG_REINIT_DROITS });
    if (rows[0].statut !== "EN_ATTENTE") return res.status(409).json({ message: "Cette demande n'est plus en attente." });
    await db.query(
      "UPDATE B_QZ_REINITIALISATION SET statut = 'ANNULEE', dateReponse = ?, id_traitePar = ? WHERE id = ? AND statut = 'EN_ATTENTE'",
      [maintenant(), userId, rid]
    );
    return res.status(200).json({ message: "Demande de réinitialisation annulée" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

// GET /quiz/reinitialisations/mes  (demandes en attente de MA confirmation)
const getMesReinitialisations = async (req, res) => {
  const userId = req.auth ? req.auth.userId : null;
  try {
    await expirerReinitialisations();
    const [rows] = await db.query(
      `SELECT r.id, r.id_Quiz, q.titre AS quiz_titre, r.score_initial, r.dateDemande,
              CONCAT(d.prenom, ' ', d.nom) AS demandeur
         FROM B_QZ_REINITIALISATION r
         JOIN B_QZ_QUIZ q ON q.id = r.id_Quiz
         LEFT JOIN B_UTILISATEUR d ON d.id = r.id_demandeur
        WHERE r.id_UTILISATEUR = ? AND r.statut = 'EN_ATTENTE'
        ORDER BY r.dateDemande DESC`,
      [userId]
    );
    return res.status(200).send(rows);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

// POST /quiz/reinitialisation/:rid/repondre  { decision: CONFIRMER | REFUSER }
const repondreReinitialisation = async (req, res) => {
  const { rid } = req.params;
  const decision = req.body && req.body.decision;
  const userId = req.auth ? req.auth.userId : null;
  if (!["CONFIRMER", "REFUSER"].includes(decision)) return res.status(403).json({ message: "Décision invalide" });
  try {
    await expirerReinitialisations();
    const [rows] = await db.query(
      `SELECT r.*, q.titre AS quiz_titre, CONCAT(u.prenom, ' ', u.nom) AS agent
         FROM B_QZ_REINITIALISATION r
         JOIN B_QZ_QUIZ q ON q.id = r.id_Quiz
         JOIN B_UTILISATEUR u ON u.id = r.id_UTILISATEUR
        WHERE r.id = ?`,
      [rid]
    );
    if (!rows.length) return res.status(404).json({ message: "Demande introuvable" });
    const d = rows[0];
    // Seul l'agent concerné peut répondre.
    if (Number(d.id_UTILISATEUR) !== Number(userId)) {
      return res.status(403).json({ message: "Seul l'agent concerné peut répondre à cette demande." });
    }
    if (d.statut === "EXPIREE") return res.status(409).json({ message: "Cette demande a expiré : le quiz est clôturé." });
    if (d.statut !== "EN_ATTENTE") return res.status(409).json({ message: "Cette demande n'est plus en attente." });
    const now = maintenant();
    let badgesReinit = { ajoutes: [], retires: [] };
    if (decision === "REFUSER") {
      await db.query(
        "UPDATE B_QZ_REINITIALISATION SET statut = 'REFUSEE', dateReponse = ?, id_traitePar = ? WHERE id = ?",
        [now, userId, rid]
      );
    } else {
      // Effet : suppression définitive de l'essai (réponses en cascade), de la
      // session de passage et des retests de l'agent sur ce quiz -> 1er essai.
      const cx = await db.getConnection();
      try {
        await cx.beginTransaction();
        const [maj] = await cx.query(
          "UPDATE B_QZ_REINITIALISATION SET statut = 'CONFIRMEE', dateReponse = ?, id_traitePar = ? WHERE id = ? AND statut = 'EN_ATTENTE'",
          [now, userId, rid]
        );
        if (!maj.affectedRows) {
          await cx.rollback();
          return res.status(409).json({ message: "Cette demande n'est plus en attente." });
        }
        await cx.query(
          "DELETE r FROM B_QZ_REPONSE r JOIN B_QZ_TENTATIVE t ON t.id = r.id_Tentative WHERE t.id_Quiz = ? AND t.id_UTILISATEUR = ?",
          [d.id_Quiz, d.id_UTILISATEUR]
        );
        await cx.query("DELETE FROM B_QZ_TENTATIVE WHERE id_Quiz = ? AND id_UTILISATEUR = ?", [d.id_Quiz, d.id_UTILISATEUR]);
        await cx.query("DELETE FROM B_QZ_SESSION WHERE id_Quiz = ? AND id_UTILISATEUR = ?", [d.id_Quiz, d.id_UTILISATEUR]);
        await cx.query("DELETE FROM B_QZ_RETEST WHERE id_Quiz = ? AND id_UTILISATEUR = ?", [d.id_Quiz, d.id_UTILISATEUR]);
        badgesReinit = await reevaluerBadges(cx, d.id_UTILISATEUR);
        await cx.commit();
      } catch (e) {
        await cx.rollback();
        throw e;
      } finally {
        cx.release();
      }
    }
    // Le demandeur est informé de la réponse.
    const confirme = decision === "CONFIRMER";
    await db.query(
      `INSERT INTO B_QZ_NOTIFICATION (id_Quiz, id_UTILISATEUR, titre, message, lu, dateCreation) VALUES (?,?,?,?,0,?)`,
      [d.id_Quiz, d.id_demandeur, confirme ? "Réinitialisation confirmée" : "Réinitialisation refusée",
       `${d.agent} a ${confirme ? "confirmé" : "refusé"} la réinitialisation de sa participation : ${d.quiz_titre}`, now]
    );
    return res.status(200).json({
      message: confirme
        ? `Participation réinitialisée : vous pouvez repasser le quiz.${texteBadges(badgesReinit)}`
        : "Réinitialisation refusée : votre participation est conservée.",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

/* ------------------------------------------------------------------ */
/* REPRISE DES QUESTIONS D'UN ANCIEN QUIZ                              */
/* ------------------------------------------------------------------ */
// Sources possibles : quiz ACTIFS (ouverts ou clôturés) créés par l'utilisateur ou
// par un utilisateur de son site, ayant au moins une question (hors quiz cible).
// Les questions choisies sont COPIÉES (type, libellé, points, réponses) dans le
// quiz cible ; un libellé déjà présent est ignoré. Côté propriétaire uniquement.
const normLibelle = (v) => String(v || "").trim().replace(/\s+/g, " ").toLowerCase();

const SQL_SOURCES_QUESTIONS = `
  q.statut = 'ACTIF' AND q.id <> ?
  AND (q.id_createur = ? OR EXISTS (SELECT 1 FROM B_UTILISATEUR cr WHERE cr.id = q.id_createur AND cr.id_Site = ?))
  AND EXISTS (SELECT 1 FROM B_QZ_QUESTION qq WHERE qq.id_Quiz = q.id)`;

const sourceAutorisee = async (userId, idCible, idSource) => {
  const site = await siteDe(userId);
  const [r] = await db.query(
    `SELECT 1 FROM B_QZ_QUIZ q WHERE q.id = ? AND ${SQL_SOURCES_QUESTIONS}`,
    [idSource, idCible, userId, site == null ? -1 : site]
  );
  return r.length > 0;
};

// GET /quiz/:id/sources-questions?q=<titre>
const getSourcesQuestions = async (req, res) => {
  const { id } = req.params;
  const userId = req.auth ? req.auth.userId : null;
  try {
    if (!(await estCoteProprietaire(userId, id))) return res.status(403).json({ message: MSG_QUESTIONS_PROPRIETAIRE });
    const site = await siteDe(userId);
    const recherche = String(req.query.q || "").trim();
    const params = [id, userId, site == null ? -1 : site];
    let filtre = "";
    if (recherche) {
      filtre = "AND q.titre LIKE ?";
      params.push(`%${recherche.replace(/[\\%_]/g, (c) => "\\" + c)}%`);
    }
    const [rows] = await db.query(
      `SELECT q.id, q.titre, q.Etat, q.dateCreation,
              (SELECT COUNT(*) FROM B_QZ_QUESTION qq WHERE qq.id_Quiz = q.id) AS nb_questions
         FROM B_QZ_QUIZ q
        WHERE ${SQL_SOURCES_QUESTIONS} ${filtre}
        ORDER BY q.dateCreation DESC, q.id DESC
        LIMIT 50`,
      params
    );
    return res.status(200).send(rows);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

// GET /quiz/:id/sources-questions/:source  (questions de la source + doublons)
const getQuestionsSource = async (req, res) => {
  const { id, source } = req.params;
  const userId = req.auth ? req.auth.userId : null;
  try {
    if (!(await estCoteProprietaire(userId, id))) return res.status(403).json({ message: MSG_QUESTIONS_PROPRIETAIRE });
    if (!(await sourceAutorisee(userId, id, source))) return res.status(403).json({ message: "Quiz source non autorisé" });
    const [questions] = await db.query(
      "SELECT id, type, libelle, points + 0e0 AS points, ordre FROM B_QZ_QUESTION WHERE id_Quiz = ? ORDER BY ordre, id",
      [source]
    );
    const [existantes] = await db.query("SELECT libelle FROM B_QZ_QUESTION WHERE id_Quiz = ?", [id]);
    const deja = new Set(existantes.map((e) => normLibelle(e.libelle)));
    for (const q of questions) {
      const [opts] = await db.query(
        "SELECT libelle, est_correcte FROM B_QZ_OPTION WHERE id_Question = ? ORDER BY ordre, id",
        [q.id]
      );
      q.options = opts;
      q.deja_presente = deja.has(normLibelle(q.libelle)) ? 1 : 0;
    }
    return res.status(200).send(questions);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

// POST /quiz/:id/reprendre-questions  { id_source, ids_questions: [] }
const reprendreQuestions = async (req, res) => {
  const { id } = req.params;
  const userId = req.auth ? req.auth.userId : null;
  const idSource = Number(req.body && req.body.id_source);
  const ids = Array.isArray(req.body && req.body.ids_questions) ? req.body.ids_questions.map(Number).filter(Boolean) : [];
  if (!idSource || !ids.length) return res.status(403).json({ message: "Choisissez au moins une question à reprendre" });
  if (!(await estCoteProprietaire(userId, id))) return res.status(403).json({ message: MSG_QUESTIONS_PROPRIETAIRE });
  if (!(await sourceAutorisee(userId, id, idSource))) return res.status(403).json({ message: "Quiz source non autorisé" });
  const cx = await db.getConnection();
  try {
    const dejaPasse = (await statsTentatives(cx, id)).nb_tentatives > 0;
    const [source] = await cx.query(
      `SELECT id, type, libelle, points + 0e0 AS points FROM B_QZ_QUESTION WHERE id_Quiz = ? AND id IN (${ids.map(() => "?").join(",")}) ORDER BY ordre, id`,
      [idSource, ...ids]
    );
    if (!source.length) {
      return res.status(403).json({ message: "Les questions choisies n'appartiennent pas au quiz source." });
    }
    const [existantes] = await cx.query("SELECT libelle FROM B_QZ_QUESTION WHERE id_Quiz = ?", [id]);
    const deja = new Set(existantes.map((e) => normLibelle(e.libelle)));
    const aCopier = [];
    let ignorees = 0;
    for (const q of source) {
      const cle = normLibelle(q.libelle);
      if (deja.has(cle)) { ignorees++; continue; }
      deja.add(cle);
      aCopier.push(q);
    }
    if (!aCopier.length) {
      return res.status(409).json({ message: `Aucune question ajoutée : ${ignorees} question(s) déjà présente(s) ignorée(s).` });
    }
    // Quiz déjà passé : l'ajout réinitialise les tentatives -> quiz disponible requis.
    if (dejaPasse && !(await quizDisponible(id))) return res.status(403).json({ message: MSG_QUIZ_FERME_AJOUT });
    await cx.beginTransaction();
    const [[mx]] = await cx.query("SELECT COALESCE(MAX(ordre), 0) AS m FROM B_QZ_QUESTION WHERE id_Quiz = ?", [id]);
    let ordre = Number(mx.m);
    for (const q of aCopier) {
      const [n] = await cx.query(
        "INSERT INTO B_QZ_QUESTION (id_Quiz, type, libelle, points, ordre, dateCreation) VALUES (?,?,?,?,?,?)",
        [id, q.type, q.libelle, q.points, ++ordre, new Date()]
      );
      const [opts] = await cx.query(
        "SELECT libelle, est_correcte, ordre FROM B_QZ_OPTION WHERE id_Question = ? ORDER BY ordre, id",
        [q.id]
      );
      for (const o of opts) {
        await cx.query(
          "INSERT INTO B_QZ_OPTION (id_Question, libelle, est_correcte, ordre) VALUES (?,?,?,?)",
          [n.insertId, o.libelle, o.est_correcte, o.ordre]
        );
      }
    }
    let impact = null;
    if (dejaPasse) impact = { type: "REINITIALISATION", ...(await reinitialiserTentatives(cx, id, userId)) };
    await cx.commit();
    const base =
      `${aCopier.length} question(s) reprise(s)` +
      (ignorees ? `, ${ignorees} déjà présente(s) ignorée(s)` : "");
    return res.status(201).json({ message: msgImpact(base, impact), nb_ajoutees: aCopier.length, nb_ignorees: ignorees, impact });
  } catch (error) {
    try { await cx.rollback(); } catch (e) {}
    console.log(error);
    res.status(500).json({ message: "Error request" });
  } finally {
    cx.release();
  }
};

module.exports = {
  getAllQuiz,
  repartirPoints,
  getSourcesQuestions,
  getQuestionsSource,
  reprendreQuestions,
  getQuizEnCours,
  // Réinitialisation de la participation
  demanderReinitialisation,
  annulerReinitialisation,
  getMesReinitialisations,
  repondreReinitialisation,
  getOneQuiz,
  // Diffusion (Partie II) — participants
  rechercherUtilisateursDiffusion,
  getParticipantsQuiz,
  diffuserParticipants,
  // Utilisateurs autorisés (Partie IV)
  getAutorises,
  candidatsAutorisation,
  addAutorises,
  removeAutorise,
  addQuiz,
  updateQuiz,
  changerStatutQuiz,
  deleteQuiz,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  getFichesRecentes,
  // Phase 2 - participation
  getQuizzesDisponibles,
  getQuizForTaking,
  getQuizApercu,
  getMesQuiz,
  refuserRetest,
  getQuizByPin,
  soumettreQuiz,
  getMesScores,
  // Phase 3 - notifications
  getMesNotificationsQuiz,
  marquerNotifLu,
  // Phase 3 - badges
  getMesBadges,
  // Phase 3 - rapports
  getRapportDifficulte,
  getRapportQuestions,
  // Retests (créateur, site propriétaire, invités)
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
