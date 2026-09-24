// =====================================================================
// MODULE CALIBRAGE — Phase 1 : Préparation d'une session (F.44 / F.45)
// Création de session, transactions, participants + invitations (socle S6),
// duplication d'un jeu de transactions, recherche de sessions.
// Réutilise les grilles Actives du domaine Évaluation.
// =====================================================================
const db = require("../config/db");
const { emit } = require("../utils/notify");

const num = (v) => (v === null || v === undefined || v === "" ? 0 : Number(v));

const withTx = async (fn) => {
  const conn = await db.getConnection();
  try { await conn.beginTransaction(); const r = await fn(conn); await conn.commit(); return r; }
  catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
};

// Garde d'état : la préparation n'est possible qu'en BROUILLON.
const enBrouillon = (s) => s && s.statut === "BROUILLON";

// ---------------------------------------------------------------------
// F.44 — Sessions
// ---------------------------------------------------------------------
const createSession = async (req, res) => {
  const { nom, description, date_calibrage, id_site, id_grille, nombre_transactions, duree_minutes } = req.body;
  if (!nom || !nom.trim() || !date_calibrage || !id_site || !id_grille || !nombre_transactions || !duree_minutes) {
    return res.status(400).json({ message: "Champs obligatoires manquants (nom, date, site, grille, nombre de transactions, durée)." });
  }
  try {
    const [[g]] = await db.query(
      "SELECT id, type_ressource_cible, statut FROM b_eval_grille WHERE id=?", [id_grille]
    );
    if (!g) return res.status(404).json({ message: "Grille introuvable." });
    if (g.statut !== "ACTIVE") return res.status(400).json({ message: "Seule une grille Active peut être utilisée." });
    const [r] = await db.query(
      `INSERT INTO b_cal_session
        (nom, description, date_calibrage, id_site, id_grille, type_ressource_cible,
         nombre_transactions, duree_minutes, statut, visibilite, id_jauge, dateCreation)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'BROUILLON', 0, ?, NOW())`,
      [nom.trim(), description || null, date_calibrage, id_site, id_grille, g.type_ressource_cible,
       num(nombre_transactions), num(duree_minutes), req.auth.userId]
    );
    return res.status(201).json({ id: r.insertId, message: "Session créée." });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors de la création." }); }
};

// Recherche : par site et intervalle de dates ; sessions organisées par l'utilisateur
// ou auxquelles il participe.
const getSessions = async (req, res) => {
  const uid = req.auth.userId;
  const { id_site, date_debut, date_fin, statut } = req.query;
  const where = ["(s.id_jauge = ? OR p.id_evaluateur = ?)"];
  const args = [uid, uid];
  if (id_site) { where.push("s.id_site = ?"); args.push(id_site); }
  if (date_debut) { where.push("s.date_calibrage >= ?"); args.push(date_debut); }
  if (date_fin) { where.push("s.date_calibrage <= ?"); args.push(date_fin); }
  if (statut) { where.push("s.statut = ?"); args.push(statut); }
  try {
    const [rows] = await db.query(
      `SELECT s.id, s.nom, s.date_calibrage, s.statut, s.visibilite, s.id_jauge, s.nombre_transactions,
              si.nom AS site, gr.nom AS grille,
              (SELECT COUNT(*) FROM b_cal_participant cp WHERE cp.id_session=s.id) AS nb_participants,
              (SELECT COUNT(*) FROM b_cal_participant cp WHERE cp.id_session=s.id AND cp.statut_participation='CLOSE') AS nb_termines,
              (SELECT COUNT(*) FROM b_cal_transaction ct WHERE ct.id_session=s.id) AS nb_transactions_chargees
         FROM b_cal_session s
         LEFT JOIN b_cal_participant p ON p.id_session=s.id AND p.id_evaluateur=?
         LEFT JOIN b_site si ON s.id_site=si.id
         LEFT JOIN b_eval_grille gr ON s.id_grille=gr.id
        WHERE ${where.join(" AND ")}
        GROUP BY s.id
        ORDER BY s.date_calibrage DESC, s.id DESC`,
      [uid, ...args]
    );
    return res.status(200).json(rows);
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors du chargement." }); }
};

const getSessionDetail = async (req, res) => {
  const id = req.params.id;
  try {
    const [[s]] = await db.query(
      `SELECT s.*, si.nom AS site, gr.nom AS grille
         FROM b_cal_session s
         LEFT JOIN b_site si ON s.id_site=si.id
         LEFT JOIN b_eval_grille gr ON s.id_grille=gr.id
        WHERE s.id=?`, [id]
    );
    if (!s) return res.status(404).json({ message: "Session introuvable." });
    const [participants] = await db.query(
      `SELECT p.id, p.id_evaluateur, p.invite, p.date_invitation, p.statut_participation, p.date_cloture,
              u.nom, u.prenom
         FROM b_cal_participant p
         LEFT JOIN b_utilisateur u ON p.id_evaluateur=u.id
        WHERE p.id_session=? ORDER BY u.nom, u.prenom`, [id]
    );
    const [[tx]] = await db.query("SELECT COUNT(*) AS n FROM b_cal_transaction WHERE id_session=?", [id]);
    return res.status(200).json({ session: s, participants, nb_transactions_chargees: tx.n });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors du chargement." }); }
};

const updateSession = async (req, res) => {
  const id = req.params.id;
  const { nom, description, date_calibrage, id_site, id_grille, nombre_transactions, duree_minutes } = req.body;
  try {
    const [[s]] = await db.query("SELECT * FROM b_cal_session WHERE id=?", [id]);
    if (!s) return res.status(404).json({ message: "Session introuvable." });
    if (!enBrouillon(s)) return res.status(409).json({ message: "Session non modifiable (déjà ouverte ou close)." });
    let type = s.type_ressource_cible;
    if (id_grille && id_grille !== s.id_grille) {
      const [[g]] = await db.query("SELECT type_ressource_cible, statut FROM b_eval_grille WHERE id=?", [id_grille]);
      if (!g) return res.status(404).json({ message: "Grille introuvable." });
      if (g.statut !== "ACTIVE") return res.status(400).json({ message: "Seule une grille Active peut être utilisée." });
      type = g.type_ressource_cible;
    }
    await db.query(
      `UPDATE b_cal_session SET nom=?, description=?, date_calibrage=?, id_site=?, id_grille=?,
              type_ressource_cible=?, nombre_transactions=?, duree_minutes=?, dateModification=NOW()
        WHERE id=?`,
      [nom != null ? nom : s.nom, description !== undefined ? description : s.description,
       date_calibrage || s.date_calibrage, id_site || s.id_site, id_grille || s.id_grille,
       type, nombre_transactions != null ? num(nombre_transactions) : s.nombre_transactions,
       duree_minutes != null ? num(duree_minutes) : s.duree_minutes, id]
    );
    return res.status(200).json({ message: "Session mise à jour." });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur." }); }
};

const deleteSession = async (req, res) => {
  const id = req.params.id;
  try {
    const [[s]] = await db.query("SELECT statut FROM b_cal_session WHERE id=?", [id]);
    if (!s) return res.status(404).json({ message: "Session introuvable." });
    if (!enBrouillon(s)) return res.status(409).json({ message: "Seule une session en brouillon peut être supprimée." });
    await db.query("DELETE FROM b_cal_session WHERE id=?", [id]); // cascade transactions/participants
    return res.status(200).json({ message: "Session supprimée." });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur." }); }
};

// F.44 C — ouverture : nb transactions atteint + au moins un participant invité
const ouvrirSession = async (req, res) => {
  const id = req.params.id;
  try {
    const out = await withTx(async (conn) => {
      const [[s]] = await conn.query("SELECT * FROM b_cal_session WHERE id=?", [id]);
      if (!s) return { notFound: true };
      if (s.statut !== "BROUILLON") return { deja: true };
      const [[tx]] = await conn.query("SELECT COUNT(*) AS n FROM b_cal_transaction WHERE id_session=?", [id]);
      if (tx.n < s.nombre_transactions) return { txManquantes: { chargees: tx.n, attendues: s.nombre_transactions } };
      const [[inv]] = await conn.query("SELECT COUNT(*) AS n FROM b_cal_participant WHERE id_session=? AND invite=1", [id]);
      if (inv.n < 1) return { sansInvite: true };
      await conn.query("UPDATE b_cal_session SET statut='OUVERTE', dateOuverture=NOW(), dateModification=NOW() WHERE id=?", [id]);
      return { ok: true };
    });
    if (out.notFound) return res.status(404).json({ message: "Session introuvable." });
    if (out.deja) return res.status(409).json({ message: "Session déjà ouverte ou close." });
    if (out.txManquantes) return res.status(409).json({ message: `Transactions insuffisantes : ${out.txManquantes.chargees}/${out.txManquantes.attendues}.` });
    if (out.sansInvite) return res.status(409).json({ message: "Au moins un participant doit être invité avant l'ouverture." });
    return res.status(200).json({ message: "Session ouverte." });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors de l'ouverture." }); }
};

// ---------------------------------------------------------------------
// F.44 B — Participants
// ---------------------------------------------------------------------
const getEvaluateursDisponibles = async (req, res) => {
  const id = req.params.id;
  try {
    const [[s]] = await db.query("SELECT id_site, id_jauge FROM b_cal_session WHERE id=?", [id]);
    if (!s) return res.status(404).json({ message: "Session introuvable." });
    const [rows] = await db.query(
      `SELECT u.id, u.nom, u.prenom, u.nom_utilisateur
         FROM b_utilisateur u
        WHERE u.id_Site=? AND u.id<>? AND u.status='ACTIF'
        ORDER BY u.nom, u.prenom`, [s.id_site, s.id_jauge]
    );
    return res.status(200).json(rows);
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur." }); }
};

// Remplace la liste des participants (tant que BROUILLON). Conserve invitations existantes.
const setParticipants = async (req, res) => {
  const id = req.params.id;
  const { ids } = req.body; // liste d'id_evaluateur
  if (!Array.isArray(ids)) return res.status(400).json({ message: "Liste d'évaluateurs attendue." });
  try {
    const out = await withTx(async (conn) => {
      const [[s]] = await conn.query("SELECT statut, id_jauge FROM b_cal_session WHERE id=?", [id]);
      if (!s) return { notFound: true };
      // On peut gérer les participants tant que la session n'est pas en révision/clôturée
      // (le jauge peut donc en ajouter/inviter après l'ouverture).
      if (["RESULTATS_EN_REVISION", "CLOTUREE"].includes(s.statut)) return { locked: true };
      const cibles = ids.filter((x) => Number(x) !== s.id_jauge);
      const [existants] = await conn.query(
        "SELECT id_evaluateur, statut_participation FROM b_cal_participant WHERE id_session=?", [id]
      );
      const setExist = new Set(existants.map((x) => x.id_evaluateur));
      const setCible = new Set(cibles.map(Number));
      // suppressions : jamais un participant qui a déjà commencé (protège sa progression)
      for (const e of existants) {
        if (setCible.has(e.id_evaluateur)) continue;
        if (e.statut_participation && e.statut_participation !== "NON_COMMENCEE") continue;
        await conn.query("DELETE FROM b_cal_participant WHERE id_session=? AND id_evaluateur=?", [id, e.id_evaluateur]);
      }
      // ajouts
      for (const e of setCible) if (!setExist.has(e))
        await conn.query(
          "INSERT INTO b_cal_participant (id_session, id_evaluateur, invite, statut_participation, dateCreation) VALUES (?, ?, 0, 'NON_COMMENCEE', NOW())",
          [id, e]
        );
      return { ok: true };
    });
    if (out.notFound) return res.status(404).json({ message: "Session introuvable." });
    if (out.locked) return res.status(409).json({ message: "Participants non modifiables (session en révision ou clôturée)." });
    return res.status(200).json({ message: "Participants mis à jour." });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur." }); }
};

const removeParticipant = async (req, res) => {
  const { id, pid } = req.params;
  try {
    const [[s]] = await db.query("SELECT statut FROM b_cal_session WHERE id=?", [id]);
    if (!s) return res.status(404).json({ message: "Session introuvable." });
    const [[p]] = await db.query("SELECT statut_participation FROM b_cal_participant WHERE id=? AND id_session=?", [pid, id]);
    if (!p) return res.status(404).json({ message: "Participant introuvable." });
    // F.44 : une fois ouverte, un participant ayant commencé ne peut plus être retiré
    if (s.statut !== "BROUILLON" && p.statut_participation !== "NON_COMMENCEE") {
      return res.status(409).json({ message: "Ce participant a commencé : retrait impossible." });
    }
    await db.query("DELETE FROM b_cal_participant WHERE id=?", [pid]);
    return res.status(200).json({ message: "Participant retiré." });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur." }); }
};

// F.44 8bis/8ter — invitation explicite (tous ou une partie), relance possible
const inviterParticipants = async (req, res) => {
  const id = req.params.id;
  const { ids } = req.body; // ids de b_cal_participant ; si absent -> non encore invités
  try {
    const [[s]] = await db.query("SELECT id, nom, date_calibrage FROM b_cal_session WHERE id=?", [id]);
    if (!s) return res.status(404).json({ message: "Session introuvable." });
    let q = "SELECT id, id_evaluateur FROM b_cal_participant WHERE id_session=?";
    const args = [id];
    if (Array.isArray(ids) && ids.length) { q += ` AND id IN (${ids.map(() => "?").join(",")})`; args.push(...ids); }
    else { q += " AND invite=0"; }
    const [cibles] = await db.query(q, args);
    if (cibles.length === 0) return res.status(200).json({ message: "Aucun participant à inviter.", invites: 0 });
    for (const p of cibles) {
      await db.query("UPDATE b_cal_participant SET invite=1, date_invitation=NOW() WHERE id=?", [p.id]);
      await emit(db, {
        id_utilisateur: p.id_evaluateur,
        titre: "Invitation à un calibrage",
        message: `Vous êtes convié(e) à la session de calibrage « ${s.nom} ».`,
        type: "CALIBRAGE", nature_objet: "CALIBRAGE", id_objet: id,
        url: `/mon-espace/calibrage/session/${id}`,
      });
    }
    return res.status(200).json({ message: `Invitation envoyée à ${cibles.length} participant(s).`, invites: cibles.length });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors de l'invitation." }); }
};

// ---------------------------------------------------------------------
// F.45 — Transactions
// ---------------------------------------------------------------------
const addTransaction = async (req, res) => {
  const id = req.params.id;
  const { identifiant_appel, descriptif, numero_case, numero_appel, id_agent, date_appel, motif_appel, ordre_passage } = req.body;
  if (!identifiant_appel || !identifiant_appel.trim() || !descriptif || !descriptif.trim() || ordre_passage == null) {
    return res.status(400).json({ message: "Identifiant d'appel, descriptif et ordre de passage sont obligatoires." });
  }
  try {
    const [[s]] = await db.query("SELECT statut, nombre_transactions FROM b_cal_session WHERE id=?", [id]);
    if (!s) return res.status(404).json({ message: "Session introuvable." });
    if (!enBrouillon(s)) return res.status(409).json({ message: "Le jeu de transactions est figé (session ouverte)." });
    // Plafond : on ne peut pas dépasser le nombre de transactions défini pour la session.
    const [[{ nb }]] = await db.query("SELECT COUNT(*) AS nb FROM b_cal_transaction WHERE id_session=?", [id]);
    if (num(s.nombre_transactions) > 0 && nb >= num(s.nombre_transactions)) {
      return res.status(409).json({ message: `Nombre de transactions atteint (${s.nombre_transactions}). Augmentez d'abord le nombre défini pour la session.` });
    }
    const [[dup]] = await db.query(
      "SELECT id FROM b_cal_transaction WHERE id_session=? AND identifiant_appel=?", [id, identifiant_appel.trim()]
    );
    if (dup) return res.status(409).json({ message: "Cette transaction est déjà chargée dans la session." });
    const [r] = await db.query(
      `INSERT INTO b_cal_transaction
        (id_session, identifiant_appel, descriptif, numero_case, numero_appel, id_agent, date_appel, motif_appel, ordre_passage, dateCreation)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [id, identifiant_appel.trim(), descriptif.trim(), numero_case || null, numero_appel || null, id_agent || null,
       date_appel || null, motif_appel || null, num(ordre_passage)]
    );
    return res.status(201).json({ id: r.insertId, message: "Transaction ajoutée." });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur." }); }
};

const getTransactions = async (req, res) => {
  const id = req.params.id;
  try {
    const [rows] = await db.query(
      `SELECT t.*, u.nom AS agent_nom, u.prenom AS agent_prenom, u.nom_utilisateur AS agent_login
         FROM b_cal_transaction t LEFT JOIN b_utilisateur u ON t.id_agent=u.id
        WHERE t.id_session=? ORDER BY t.ordre_passage, t.id`, [id]
    );
    return res.status(200).json(rows);
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur." }); }
};

const updateTransaction = async (req, res) => {
  const tid = req.params.tid;
  const { identifiant_appel, descriptif, numero_case, numero_appel, id_agent, date_appel, motif_appel, ordre_passage } = req.body;
  try {
    const [[t]] = await db.query(
      "SELECT t.*, s.statut FROM b_cal_transaction t JOIN b_cal_session s ON t.id_session=s.id WHERE t.id=?", [tid]
    );
    if (!t) return res.status(404).json({ message: "Transaction introuvable." });
    if (t.statut !== "BROUILLON") return res.status(409).json({ message: "Le jeu de transactions est figé (session ouverte)." });
    if (identifiant_appel && identifiant_appel.trim() !== t.identifiant_appel) {
      const [[dup]] = await db.query(
        "SELECT id FROM b_cal_transaction WHERE id_session=? AND identifiant_appel=? AND id<>?",
        [t.id_session, identifiant_appel.trim(), tid]
      );
      if (dup) return res.status(409).json({ message: "Un autre enregistrement porte déjà cet identifiant d'appel." });
    }
    await db.query(
      `UPDATE b_cal_transaction SET identifiant_appel=?, descriptif=?, numero_case=?, numero_appel=?, id_agent=?,
              date_appel=?, motif_appel=?, ordre_passage=? WHERE id=?`,
      [identifiant_appel != null ? identifiant_appel.trim() : t.identifiant_appel,
       descriptif != null ? descriptif : t.descriptif, numero_case !== undefined ? numero_case : t.numero_case,
       numero_appel !== undefined ? numero_appel : t.numero_appel,
       id_agent !== undefined ? (id_agent || null) : t.id_agent,
       date_appel !== undefined ? date_appel : t.date_appel,
       motif_appel !== undefined ? motif_appel : t.motif_appel,
       ordre_passage != null ? num(ordre_passage) : t.ordre_passage, tid]
    );
    return res.status(200).json({ message: "Transaction mise à jour." });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur." }); }
};

const deleteTransaction = async (req, res) => {
  const tid = req.params.tid;
  try {
    const [[t]] = await db.query(
      "SELECT s.statut FROM b_cal_transaction t JOIN b_cal_session s ON t.id_session=s.id WHERE t.id=?", [tid]
    );
    if (!t) return res.status(404).json({ message: "Transaction introuvable." });
    if (t.statut !== "BROUILLON") return res.status(409).json({ message: "Le jeu de transactions est figé (session ouverte)." });
    await db.query("DELETE FROM b_cal_transaction WHERE id=?", [tid]);
    return res.status(200).json({ message: "Transaction supprimée." });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur." }); }
};

// F.45 B — duplication du jeu de transactions d'une autre session
const dupliquerTransactions = async (req, res) => {
  const id = req.params.id;
  const { id_source } = req.body;
  if (!id_source) return res.status(400).json({ message: "Session source obligatoire." });
  try {
    const out = await withTx(async (conn) => {
      const [[s]] = await conn.query("SELECT statut FROM b_cal_session WHERE id=?", [id]);
      if (!s) return { notFound: true };
      if (s.statut !== "BROUILLON") return { locked: true };
      const [src] = await conn.query("SELECT * FROM b_cal_transaction WHERE id_session=? ORDER BY ordre_passage, id", [id_source]);
      let n = 0;
      for (const t of src) {
        const [[dup]] = await conn.query(
          "SELECT id FROM b_cal_transaction WHERE id_session=? AND identifiant_appel=?", [id, t.identifiant_appel]
        );
        if (dup) continue; // évite les doublons
        await conn.query(
          `INSERT INTO b_cal_transaction
            (id_session, identifiant_appel, descriptif, numero_case, numero_appel, date_appel, motif_appel, ordre_passage, dateCreation)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [id, t.identifiant_appel, t.descriptif, t.numero_case, t.numero_appel, t.date_appel, t.motif_appel, t.ordre_passage]
        );
        n++;
      }
      return { n };
    });
    if (out.notFound) return res.status(404).json({ message: "Session introuvable." });
    if (out.locked) return res.status(409).json({ message: "Le jeu de transactions est figé (session ouverte)." });
    return res.status(200).json({ message: `${out.n} transaction(s) dupliquée(s).`, dupliquees: out.n });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors de la duplication." }); }
};

module.exports = {
  createSession, getSessions, getSessionDetail, updateSession, deleteSession, ouvrirSession,
  getEvaluateursDisponibles, setParticipants, removeParticipant, inviterParticipants,
  addTransaction, getTransactions, updateTransaction, deleteTransaction, dupliquerTransactions,
};
