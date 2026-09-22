// =====================================================================
// MODULE CALIBRAGE — Phase 2 : Déroulement (F.46)
// Écran de session (participant / jauge), constats + états, chrono lazy,
// clôture de participation (unitaire & globale), réinitialisation,
// clôture de la référence. Snapshot de grille par évaluation de transaction.
// =====================================================================
const db = require("../config/db");
const { emit } = require("../utils/notify");

const num = (v) => (v === null || v === undefined ? 0 : Number(v));
const applied = (mode, row) => (mode === "AUTO" ? num(row.poids_calcule) : num(row.poids_saisi));

const withTx = async (fn) => {
  const conn = await db.getConnection();
  try { await conn.beginTransaction(); const r = await fn(conn); await conn.commit(); return r; }
  catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
};

// Contexte : session + rôle (jauge | participant | null) de l'utilisateur courant.
const contexte = async (conn, sessionId, userId) => {
  const [[s]] = await conn.query("SELECT * FROM b_cal_session WHERE id=?", [sessionId]);
  if (!s) return { notFound: true };
  if (s.id_jauge === userId) return { s, role: "jauge" };
  const [[p]] = await conn.query(
    "SELECT * FROM b_cal_participant WHERE id_session=? AND id_evaluateur=?", [sessionId, userId]
  );
  if (p) return { s, role: "participant", p };
  return { s, role: null };
};

// Recopie immuable de la grille dans une évaluation de transaction (sans score).
const snapshotGrille = async (conn, calEvalId, grilleId) => {
  const [[grille]] = await conn.query("SELECT mode_ponderation FROM b_eval_grille WHERE id=?", [grilleId]);
  const mode = grille ? grille.mode_ponderation : "AUTO";
  const [cats] = await conn.query(
    "SELECT * FROM b_eval_categorie_erreur WHERE id_grille=? AND etat='ACTIF' ORDER BY ordre, id", [grilleId]
  );
  for (const cat of cats) {
    const [cr] = await conn.query(
      `INSERT INTO b_cal_evaluation_categorie
        (id_cal_evaluation, libelle, poids, seuil_reussite, comparateur, critique, ordre, id_categorie_origine)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [calEvalId, cat.libelle, num(cat.poids), num(cat.seuil_reussite), cat.comparateur, cat.critique, num(cat.ordre), cat.id]
    );
    const catSnap = cr.insertId;
    const [sousCats] = await conn.query(
      "SELECT * FROM b_eval_sous_categorie_erreur WHERE id_categorie_erreur=? AND etat='ACTIF' ORDER BY id", [cat.id]
    );
    for (const sc of sousCats) {
      const poidsSC = applied(mode, sc);
      const [errs] = await conn.query(
        "SELECT * FROM b_eval_erreur WHERE id_sous_categorie_erreur=? AND etat='ACTIF' ORDER BY id", [sc.id]
      );
      for (const e of errs) {
        await conn.query(
          `INSERT INTO b_cal_evaluation_erreur
            (id_cal_evaluation, id_cal_evaluation_categorie, item, sous_item, referentiel, poids,
             libelle_sous_categorie, poids_sous_categorie, coche, commentaire, id_erreur_origine, id_sous_categorie_origine)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, NULL, ?, ?)`,
          [calEvalId, catSnap, e.item, e.sous_item, e.referentiel, applied(mode, e), sc.libelle, poidsSC, e.id, sc.id]
        );
      }
    }
  }
};

// Crée les évaluations de transaction manquantes (une par transaction) pour un évaluateur.
const ensureEvaluations = async (conn, s, userId, estRef) => {
  const [txs] = await conn.query("SELECT id FROM b_cal_transaction WHERE id_session=?", [s.id]);
  for (const t of txs) {
    const [[ex]] = await conn.query(
      "SELECT id FROM b_cal_evaluation WHERE id_transaction=? AND id_evaluateur=?", [t.id, userId]
    );
    if (!ex) {
      const [r] = await conn.query(
        `INSERT INTO b_cal_evaluation (id_session, id_transaction, id_evaluateur, est_reference, etat, dateCreation)
         VALUES (?, ?, ?, ?, 'NON_COMMENCEE', NOW())`,
        [s.id, t.id, userId, estRef ? 1 : 0]
      );
      await snapshotGrille(conn, r.insertId, s.id_grille);
    }
  }
};

const dureeSecondes = (s) => num(s.duree_minutes) * 60;
const ecouleSecondes = (p) => (p.date_debut_participation ? Math.floor((Date.now() - new Date(p.date_debut_participation).getTime()) / 1000) : 0);
const restantSecondes = (s, p) => Math.max(0, dureeSecondes(s) - ecouleSecondes(p));

// Clôture automatique d'une participation dont le temps est écoulé (état conservé).
const autoCloreSiExpire = async (conn, s, p) => {
  if (p.statut_participation === "EN_COURS" && p.date_debut_participation && restantSecondes(s, p) <= 0) {
    await conn.query("UPDATE b_cal_participant SET statut_participation='CLOSE', date_cloture=NOW() WHERE id=?", [p.id]);
    p.statut_participation = "CLOSE";
    await majStatutSession(conn, s.id);
    return true;
  }
  return false;
};

// La référence est complète quand toutes ses évaluations existent et sont TERMINEE.
const referenceComplete = async (conn, s) => {
  const [[tx]] = await conn.query("SELECT COUNT(*) n FROM b_cal_transaction WHERE id_session=?", [s.id]);
  if (tx.n === 0) return false;
  const [[ref]] = await conn.query(
    "SELECT COUNT(*) n, SUM(etat='TERMINEE') t FROM b_cal_evaluation WHERE id_session=? AND est_reference=1", [s.id]
  );
  return ref.n === tx.n && num(ref.t) === tx.n;
};

// Passe la session en RESULTATS_EN_REVISION si toutes les participations sont closes
// et la référence complète.
const majStatutSession = async (conn, sessionId) => {
  const [[s]] = await conn.query("SELECT * FROM b_cal_session WHERE id=?", [sessionId]);
  if (!s || s.statut !== "OUVERTE") return;
  const [[part]] = await conn.query(
    "SELECT COUNT(*) n, SUM(statut_participation='CLOSE') c FROM b_cal_participant WHERE id_session=?", [sessionId]
  );
  const allClosed = part.n > 0 && num(part.c) === part.n;
  if (allClosed && (await referenceComplete(conn, s))) {
    await conn.query("UPDATE b_cal_session SET statut='RESULTATS_EN_REVISION', dateModification=NOW() WHERE id=?", [sessionId]);
    // Fige l'état initial des constats (traçabilité des corrections en révision — F.47 E)
    await conn.query(
      `UPDATE b_cal_evaluation_erreur ee JOIN b_cal_evaluation e ON ee.id_cal_evaluation=e.id
          SET ee.coche_initial = ee.coche
        WHERE e.id_session=? AND ee.coche_initial IS NULL`, [sessionId]
    );
  }
};

// ---------------------------------------------------------------------
// GET écran de session (données selon le rôle)
// ---------------------------------------------------------------------
const getTravail = async (req, res) => {
  const id = req.params.id;
  const uid = req.auth.userId;
  try {
    const out = await withTx(async (conn) => {
      const ctx = await contexte(conn, id, uid);
      if (ctx.notFound) return { notFound: true };
      const s = ctx.s;

      if (ctx.role === "jauge") {
        await ensureEvaluations(conn, s, uid, true);
        const [transactions] = await conn.query(
          `SELECT t.id, t.identifiant_appel, t.ordre_passage, t.descriptif,
                  e.id AS id_evaluation, e.etat
             FROM b_cal_transaction t
             LEFT JOIN b_cal_evaluation e ON e.id_transaction=t.id AND e.id_evaluateur=?
            WHERE t.id_session=? ORDER BY t.ordre_passage, t.id`, [uid, id]
        );
        const [participants] = await conn.query(
          `SELECT p.id, p.id_evaluateur, p.invite, p.statut_participation, p.date_debut_participation, p.date_cloture,
                  u.nom, u.prenom
             FROM b_cal_participant p LEFT JOIN b_utilisateur u ON p.id_evaluateur=u.id
            WHERE p.id_session=? ORDER BY u.nom, u.prenom`, [id]
        );
        const ref = await referenceComplete(conn, s);
        return { role: "jauge", session: s, transactions, participants, reference_complete: ref };
      }

      if (ctx.role === "participant") {
        // Accès conditionné : session ouverte + visibilité accordée
        if (s.statut === "BROUILLON" || !s.visibilite) {
          return { role: "participant", accessible: false, session: { id: s.id, nom: s.nom, statut: s.statut, visibilite: s.visibilite } };
        }
        const p = ctx.p;
        // démarrage de la participation à la première ouverture (démarre le chrono)
        if (!p.date_debut_participation && p.statut_participation !== "CLOSE") {
          await conn.query(
            "UPDATE b_cal_participant SET date_debut_participation=NOW(), statut_participation='EN_COURS' WHERE id=?", [p.id]
          );
          p.date_debut_participation = new Date();
          p.statut_participation = "EN_COURS";
          await ensureEvaluations(conn, s, uid, false);
        }
        await autoCloreSiExpire(conn, s, p);
        const [transactions] = await conn.query(
          `SELECT t.id, t.identifiant_appel, t.ordre_passage,
                  e.id AS id_evaluation, e.etat
             FROM b_cal_transaction t
             LEFT JOIN b_cal_evaluation e ON e.id_transaction=t.id AND e.id_evaluateur=?
            WHERE t.id_session=? ORDER BY t.ordre_passage, t.id`, [uid, id]
        );
        return {
          role: "participant", accessible: true,
          session: { id: s.id, nom: s.nom, statut: s.statut, visibilite: s.visibilite },
          statut_participation: p.statut_participation,
          temps_restant_secondes: restantSecondes(s, p),
          duree_minutes: s.duree_minutes,
          transactions,
        };
      }
      return { forbidden: true };
    });
    if (out.notFound) return res.status(404).json({ message: "Session introuvable." });
    if (out.forbidden) return res.status(403).json({ message: "Vous ne participez pas à cette session." });
    return res.status(200).json(out);
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors du chargement." }); }
};

// ---------------------------------------------------------------------
// GET grille d'une transaction pour l'utilisateur courant
// ---------------------------------------------------------------------
const getGrilleTransaction = async (req, res) => {
  const tid = req.params.tid;
  const uid = req.auth.userId;
  try {
    const out = await withTx(async (conn) => {
      const [[t]] = await conn.query("SELECT * FROM b_cal_transaction WHERE id=?", [tid]);
      if (!t) return { notFound: true };
      const ctx = await contexte(conn, t.id_session, uid);
      if (ctx.notFound) return { notFound: true };
      if (!ctx.role) return { forbidden: true };
      const s = ctx.s;
      if (ctx.role === "participant" && (s.statut === "BROUILLON" || !s.visibilite)) return { noAccess: true };

      let [[ev]] = await conn.query(
        "SELECT * FROM b_cal_evaluation WHERE id_transaction=? AND id_evaluateur=?", [tid, uid]
      );
      if (!ev) {
        await ensureEvaluations(conn, s, uid, ctx.role === "jauge");
        [[ev]] = await conn.query("SELECT * FROM b_cal_evaluation WHERE id_transaction=? AND id_evaluateur=?", [tid, uid]);
      }
      const [cats] = await conn.query(
        "SELECT * FROM b_cal_evaluation_categorie WHERE id_cal_evaluation=? ORDER BY ordre, id", [ev.id]
      );
      for (const c of cats) {
        const [errs] = await conn.query(
          "SELECT * FROM b_cal_evaluation_erreur WHERE id_cal_evaluation_categorie=? ORDER BY id", [c.id]
        );
        c.erreurs = errs;
      }
      // lecture seule si participation close (participant) ou session close (jauge)
      let lectureSeule = false;
      if (ctx.role === "participant") lectureSeule = ctx.p.statut_participation === "CLOSE" || restantSecondes(s, ctx.p) <= 0;
      else lectureSeule = s.statut === "CLOTUREE";
      return { transaction: t, evaluation: { id: ev.id, etat: ev.etat, est_reference: ev.est_reference }, categories: cats, role: ctx.role, lecture_seule: lectureSeule };
    });
    if (out.notFound) return res.status(404).json({ message: "Transaction introuvable." });
    if (out.forbidden) return res.status(403).json({ message: "Accès refusé." });
    if (out.noAccess) return res.status(403).json({ message: "La session n'est pas encore accessible." });
    return res.status(200).json(out);
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors du chargement." }); }
};

// ---------------------------------------------------------------------
// PUT cochage / commentaire d'une erreur
// ---------------------------------------------------------------------
const toggleErreur = async (req, res) => {
  const { evalId, erreurId } = req.params;
  const { coche, commentaire } = req.body;
  const uid = req.auth.userId;
  try {
    const out = await withTx(async (conn) => {
      const [[ev]] = await conn.query("SELECT * FROM b_cal_evaluation WHERE id=?", [evalId]);
      if (!ev) return { notFound: true };
      if (ev.id_evaluateur !== uid) return { forbidden: true };
      const ctx = await contexte(conn, ev.id_session, uid);
      const s = ctx.s;
      if (ctx.role === "participant") {
        await autoCloreSiExpire(conn, s, ctx.p);
        if (ctx.p.statut_participation === "CLOSE") return { locked: true };
        if (s.statut === "BROUILLON" || !s.visibilite) return { noAccess: true };
      } else if (ctx.role === "jauge") {
        if (s.statut === "CLOTUREE") return { locked: true };
      } else return { forbidden: true };

      const [[err]] = await conn.query(
        "SELECT id FROM b_cal_evaluation_erreur WHERE id=? AND id_cal_evaluation=?", [erreurId, evalId]
      );
      if (!err) return { notFound: true };
      await conn.query(
        "UPDATE b_cal_evaluation_erreur SET coche=?, commentaire=? WHERE id=?",
        [coche ? 1 : 0, commentaire !== undefined ? commentaire : null, erreurId]
      );
      if (ev.etat === "NON_COMMENCEE") {
        await conn.query("UPDATE b_cal_evaluation SET etat='EN_COURS', dateModification=NOW() WHERE id=?", [evalId]);
      }
      return { ok: true };
    });
    if (out.notFound) return res.status(404).json({ message: "Élément introuvable." });
    if (out.forbidden) return res.status(403).json({ message: "Accès refusé." });
    if (out.noAccess) return res.status(403).json({ message: "Session non accessible." });
    if (out.locked) return res.status(409).json({ message: "Participation close : modification impossible." });
    return res.status(200).json({ message: "Enregistré." });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur." }); }
};

// PUT déclarer une transaction terminée (unitaire) pour l'utilisateur courant
const terminerTransaction = async (req, res) => {
  const tid = req.params.tid;
  const uid = req.auth.userId;
  try {
    const [[ev]] = await db.query("SELECT * FROM b_cal_evaluation WHERE id_transaction=? AND id_evaluateur=?", [tid, uid]);
    if (!ev) return res.status(404).json({ message: "Évaluation introuvable." });
    await db.query("UPDATE b_cal_evaluation SET etat='TERMINEE', dateModification=NOW() WHERE id=?", [ev.id]);
    return res.status(200).json({ message: "Transaction déclarée terminée." });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur." }); }
};

// POST clôture de la participation (globale) — déclare toutes les transactions terminées
const cloturerParticipation = async (req, res) => {
  const id = req.params.id;
  const uid = req.auth.userId;
  try {
    const out = await withTx(async (conn) => {
      const ctx = await contexte(conn, id, uid);
      if (ctx.notFound || ctx.role !== "participant") return { forbidden: true };
      if (ctx.p.statut_participation === "CLOSE") return { deja: true };
      await ensureEvaluations(conn, ctx.s, uid, false);
      await conn.query(
        "UPDATE b_cal_evaluation SET etat='TERMINEE', dateModification=NOW() WHERE id_session=? AND id_evaluateur=?", [id, uid]
      );
      await conn.query(
        "UPDATE b_cal_participant SET statut_participation='CLOSE', date_cloture=NOW() WHERE id=?", [ctx.p.id]
      );
      await majStatutSession(conn, id);
      return { ok: true };
    });
    if (out.forbidden) return res.status(403).json({ message: "Vous ne participez pas à cette session." });
    if (out.deja) return res.status(409).json({ message: "Participation déjà close." });
    return res.status(200).json({ message: "Participation close." });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur." }); }
};

// POST clôture de la référence (jauge)
const cloturerReference = async (req, res) => {
  const id = req.params.id;
  const uid = req.auth.userId;
  try {
    const out = await withTx(async (conn) => {
      const ctx = await contexte(conn, id, uid);
      if (ctx.notFound || ctx.role !== "jauge") return { forbidden: true };
      await ensureEvaluations(conn, ctx.s, uid, true);
      await conn.query(
        "UPDATE b_cal_evaluation SET etat='TERMINEE', dateModification=NOW() WHERE id_session=? AND est_reference=1", [id]
      );
      await majStatutSession(conn, id);
      const [[s]] = await conn.query("SELECT statut FROM b_cal_session WHERE id=?", [id]);
      return { ok: true, statut: s.statut };
    });
    if (out.forbidden) return res.status(403).json({ message: "Réservé au jauge." });
    return res.status(200).json({ message: "Référence clôturée.", statut: out.statut });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur." }); }
};

// PUT interrupteur de visibilité (jauge)
const setVisibilite = async (req, res) => {
  const id = req.params.id;
  const uid = req.auth.userId;
  const { visible } = req.body;
  try {
    const [[s]] = await db.query("SELECT id_jauge FROM b_cal_session WHERE id=?", [id]);
    if (!s) return res.status(404).json({ message: "Session introuvable." });
    if (s.id_jauge !== uid) return res.status(403).json({ message: "Réservé au jauge." });
    await db.query("UPDATE b_cal_session SET visibilite=?, dateModification=NOW() WHERE id=?", [visible ? 1 : 0, id]);
    return res.status(200).json({ message: visible ? "Visibilité accordée." : "Visibilité retirée." });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur." }); }
};

// PUT réinitialisation d'une participation (jauge, uniquement si temps écoulé)
const reinitialiserParticipant = async (req, res) => {
  const pid = req.params.pid;
  const uid = req.auth.userId;
  try {
    const out = await withTx(async (conn) => {
      const [[p]] = await conn.query("SELECT * FROM b_cal_participant WHERE id=?", [pid]);
      if (!p) return { notFound: true };
      const ctx = await contexte(conn, p.id_session, uid);
      if (ctx.notFound || ctx.role !== "jauge") return { forbidden: true };
      const s = ctx.s;
      if (s.statut === "CLOTUREE") return { locked: true };
      // Le jauge peut remettre à neuf un participant à tout moment tant que la
      // session n'est pas clôturée — y compris si son compte à rebours a démarré.
      // remet à zéro les constats du participant
      await conn.query(
        `UPDATE b_cal_evaluation_erreur ee
           JOIN b_cal_evaluation e ON ee.id_cal_evaluation=e.id
            SET ee.coche=1, ee.commentaire=NULL
          WHERE e.id_session=? AND e.id_evaluateur=?`, [p.id_session, p.id_evaluateur]
      );
      await conn.query(
        "UPDATE b_cal_evaluation SET etat='NON_COMMENCEE', dateModification=NOW() WHERE id_session=? AND id_evaluateur=?",
        [p.id_session, p.id_evaluateur]
      );
      await conn.query(
        "UPDATE b_cal_participant SET statut_participation='NON_COMMENCEE', date_debut_participation=NULL, date_cloture=NULL WHERE id=?", [pid]
      );
      await conn.query(
        "INSERT INTO b_cal_reinitialisation (id_session, id_participant, id_auteur, dateReinit) VALUES (?, ?, ?, NOW())",
        [p.id_session, pid, uid]
      );
      await emit(conn, {
        id_utilisateur: p.id_evaluateur,
        titre: "Calibrage réinitialisé",
        message: `Votre participation à « ${s.nom} » a été réinitialisée : vous pouvez recommencer.`,
        type: "CALIBRAGE", nature_objet: "CALIBRAGE", id_objet: p.id_session,
        url: `/mon-espace/calibrage/session/${p.id_session}`,
      });
      return { ok: true };
    });
    if (out.notFound) return res.status(404).json({ message: "Participant introuvable." });
    if (out.forbidden) return res.status(403).json({ message: "Réservé au jauge." });
    if (out.locked) return res.status(409).json({ message: "Session clôturée : réinitialisation impossible." });
    return res.status(200).json({ message: "Participation réinitialisée." });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur." }); }
};

module.exports = {
  getTravail, getGrilleTransaction, toggleErreur, terminerTransaction,
  cloturerParticipation, cloturerReference, setVisibilite, reinitialiserParticipant,
};
