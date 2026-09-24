// =====================================================================
// MODULE CALIBRAGE — Phase 3 : Résultats, confrontation, révision (F.47)
// Conformité (constats vs référence), conclusions par transaction et par
// évaluateur, tableau croisé, détail/confrontation, corrections des deux
// côtés (traçabilité), recalcul, validation + notifications, conclusions.
// =====================================================================
const db = require("../config/db");
const { emit } = require("../utils/notify");

const num = (v) => (v === null || v === undefined ? 0 : Number(v));
const EPS = 0.01; // tolérance d'arrondi (cohérent avec le domaine Évaluation)
const reussite = (score, comp, seuil) =>
  comp === ">=" ? num(score) >= num(seuil) - EPS : num(score) > num(seuil) - EPS;

const withTx = async (fn) => {
  const conn = await db.getConnection();
  try { await conn.beginTransaction(); const r = await fn(conn); await conn.commit(); return r; }
  catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
};

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

// Calcule les conclusions (par transaction et globales) de tous les participants.
const calculer = async (conn, sessionId) => {
  const [transactions] = await conn.query(
    "SELECT id, identifiant_appel, ordre_passage FROM b_cal_transaction WHERE id_session=? ORDER BY ordre_passage, id", [sessionId]
  );
  const [participants] = await conn.query(
    `SELECT p.id, p.id_evaluateur, u.nom, u.prenom, p.statut_participation
       FROM b_cal_participant p LEFT JOIN b_utilisateur u ON p.id_evaluateur=u.id
      WHERE p.id_session=? ORDER BY u.nom, u.prenom`, [sessionId]
  );
  // toutes les erreurs de la session, avec méta catégorie (seuil/comparateur) et origine
  const [rows] = await conn.query(
    `SELECT e.id_transaction, e.id_evaluateur, e.est_reference,
            cc.id_categorie_origine, cc.seuil_reussite, cc.comparateur,
            ee.id_erreur_origine, ee.coche, ee.poids
       FROM b_cal_evaluation e
       JOIN b_cal_evaluation_erreur ee ON ee.id_cal_evaluation=e.id
       JOIN b_cal_evaluation_categorie cc ON ee.id_cal_evaluation_categorie=cc.id
      WHERE e.id_session=?`, [sessionId]
  );
  // référence : ref[tid][origine] = coche
  const ref = {};
  for (const r of rows) if (r.est_reference) {
    (ref[r.id_transaction] ||= {})[r.id_erreur_origine] = r.coche;
  }
  // accumulation par participant/transaction/catégorie
  // acc[evaluateur][tid][catOrigine] = { score, seuil, comp }
  const acc = {};
  for (const r of rows) {
    if (r.est_reference) continue;
    const refT = ref[r.id_transaction] || {};
    const conforme = num(refT[r.id_erreur_origine]) === num(r.coche);
    const a = ((acc[r.id_evaluateur] ||= {})[r.id_transaction] ||= {});
    const cat = (a[r.id_categorie_origine] ||= { score: 0, seuil: num(r.seuil_reussite), comp: r.comparateur });
    if (conforme) cat.score += num(r.poids);
  }
  const grid = {}; const global = {};
  for (const p of participants) {
    const ev = p.id_evaluateur;
    grid[ev] = {};
    let globalOk = true;
    for (const t of transactions) {
      const cats = (acc[ev] && acc[ev][t.id]) || {};
      const catList = Object.values(cats);
      const txOk = catList.length > 0 && catList.every((c) => reussite(c.score, c.comp, c.seuil));
      grid[ev][t.id] = txOk ? "SUCCES" : "ECHEC";
      if (!txOk) globalOk = false;
    }
    global[ev] = globalOk ? "SUCCES" : "ECHEC";
  }
  return { transactions, participants, grid, global };
};

// ---------------------------------------------------------------------
// GET tableau des résultats
// ---------------------------------------------------------------------
const getResultats = async (req, res) => {
  const id = req.params.id;
  const uid = req.auth.userId;
  try {
    const out = await withTx(async (conn) => {
      const ctx = await contexte(conn, id, uid);
      if (ctx.notFound) return { notFound: true };
      if (!ctx.role) return { forbidden: true };
      // Le participant voit le résultat uniquement s'il est publié (validé) ET
      // que la visibilité est activée par le jauge (point cahier).
      if (ctx.role === "participant" && !(ctx.s.resultat_publie && ctx.s.visibilite)) return { pasEncore: true };
      const r = await calculer(conn, id);
      // « provisoire » tant que le résultat n'est pas figé (CLOTUREE).
      const provisoire = ctx.s.statut !== "CLOTUREE";
      const nomSession = ctx.s.nom;
      if (ctx.role === "participant") {
        // un participant ne voit que sa propre ligne
        const ev = uid;
        return {
          role: "participant", provisoire, statut: ctx.s.statut, nom: nomSession,
          transactions: r.transactions,
          participants: r.participants.filter((p) => p.id_evaluateur === ev),
          grid: { [ev]: r.grid[ev] || {} }, global: { [ev]: r.global[ev] },
          conclusions: ctx.s.conclusions,
        };
      }
      return { role: "jauge", provisoire, statut: ctx.s.statut, nom: nomSession, resultat_publie: !!ctx.s.resultat_publie, visibilite: !!ctx.s.visibilite, ...r, conclusions: ctx.s.conclusions };
    });
    if (out.notFound) return res.status(404).json({ message: "Session introuvable." });
    if (out.forbidden) return res.status(403).json({ message: "Accès refusé." });
    if (out.pasEncore) return res.status(409).json({ message: "Les résultats seront disponibles après validation de la session." });
    return res.status(200).json(out);
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur." }); }
};

// Construit la confrontation d'un participant (toutes ses transactions) vs référence.
const construireConfrontation = async (conn, sessionId, participantEvaluateur) => {
  const [transactions] = await conn.query(
    "SELECT id, identifiant_appel, ordre_passage, descriptif FROM b_cal_transaction WHERE id_session=? ORDER BY ordre_passage, id", [sessionId]
  );
  const result = [];
  for (const t of transactions) {
    // référence
    const [[refEval]] = await conn.query(
      "SELECT id FROM b_cal_evaluation WHERE id_session=? AND id_transaction=? AND est_reference=1", [sessionId, t.id]
    );
    const [[partEval]] = await conn.query(
      "SELECT id FROM b_cal_evaluation WHERE id_session=? AND id_transaction=? AND id_evaluateur=? AND est_reference=0",
      [sessionId, t.id, participantEvaluateur]
    );
    if (!refEval || !partEval) { result.push({ transaction: t, categories: [], conclusion: null }); continue; }
    const [refErr] = await conn.query("SELECT * FROM b_cal_evaluation_erreur WHERE id_cal_evaluation=?", [refEval.id]);
    const [refCats] = await conn.query("SELECT * FROM b_cal_evaluation_categorie WHERE id_cal_evaluation=? ORDER BY ordre, id", [refEval.id]);
    const [partErr] = await conn.query("SELECT * FROM b_cal_evaluation_erreur WHERE id_cal_evaluation=?", [partEval.id]);
    const refByOrig = {}; refErr.forEach((e) => (refByOrig[e.id_erreur_origine] = e));
    const partByOrig = {}; partErr.forEach((e) => (partByOrig[e.id_erreur_origine] = e));

    const categories = [];
    let txOk = true;
    for (const rc of refCats) {
      let score = 0;
      const erreurs = [];
      const rcErrs = refErr.filter((e) => e.id_cal_evaluation_categorie === rc.id);
      for (const re of rcErrs) {
        const pe = partByOrig[re.id_erreur_origine];
        const conforme = pe ? num(pe.coche) === num(re.coche) : false;
        if (conforme) score += num(re.poids);
        erreurs.push({
          id_erreur_origine: re.id_erreur_origine, item: re.item, referentiel: re.referentiel, poids: num(re.poids),
          conforme,
          reference: { coche: re.coche, coche_initial: re.coche_initial, commentaire: re.commentaire,
                       appreciation_jauge: re.appreciation_jauge, modifie_par: re.modifie_par, date_modif: re.date_modif },
          participant: pe ? { coche: pe.coche, coche_initial: pe.coche_initial, commentaire: pe.commentaire,
                       modifie_par: pe.modifie_par, date_modif: pe.date_modif } : null,
        });
      }
      const satisfaite = reussite(score, rc.comparateur, rc.seuil_reussite);
      if (!satisfaite) txOk = false;
      categories.push({ libelle: rc.libelle, seuil: num(rc.seuil_reussite), comparateur: rc.comparateur, score_conformite: score, satisfaite, erreurs });
    }
    result.push({ transaction: t, categories, conclusion: txOk ? "SUCCES" : "ECHEC" });
  }
  return { transactions: result };
};

const getConfrontation = async (req, res) => {
  const { id, pid } = req.params; // pid = id_evaluateur du participant
  const uid = req.auth.userId;
  try {
    const out = await withTx(async (conn) => {
      const ctx = await contexte(conn, id, uid);
      if (ctx.notFound) return { notFound: true };
      if (!ctx.role) return { forbidden: true };
      if (ctx.role === "participant") {
        if (Number(pid) !== uid) return { forbidden: true };
        if (ctx.s.statut !== "CLOTUREE") return { pasEncore: true };
      }
      const [[part]] = await conn.query(
        "SELECT u.nom, u.prenom FROM b_utilisateur u WHERE u.id=?", [pid]
      );
      const conf = await construireConfrontation(conn, id, Number(pid));
      return { role: ctx.role, statut: ctx.s.statut, provisoire: ctx.s.statut !== "CLOTUREE", participant: { id: Number(pid), ...part }, ...conf };
    });
    if (out.notFound) return res.status(404).json({ message: "Session introuvable." });
    if (out.forbidden) return res.status(403).json({ message: "Accès refusé." });
    if (out.pasEncore) return res.status(409).json({ message: "Disponible après validation." });
    return res.status(200).json(out);
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur." }); }
};

// ---------------------------------------------------------------------
// PUT correction d'un côté (jauge, en révision)
// ---------------------------------------------------------------------
const modifierCote = async (req, res) => {
  const id = req.params.id;
  const uid = req.auth.userId;
  const { cote, id_transaction, id_participant, id_erreur_origine, coche } = req.body;
  if (!["REFERENCE", "PARTICIPANT"].includes(cote) || !id_transaction || id_erreur_origine == null) {
    return res.status(400).json({ message: "Paramètres invalides." });
  }
  try {
    const out = await withTx(async (conn) => {
      const ctx = await contexte(conn, id, uid);
      if (ctx.notFound || ctx.role !== "jauge") return { forbidden: true };
      if (ctx.s.statut !== "RESULTATS_EN_REVISION") return { locked: true };
      let evalRow;
      if (cote === "REFERENCE") {
        [[evalRow]] = await conn.query(
          "SELECT id FROM b_cal_evaluation WHERE id_session=? AND id_transaction=? AND est_reference=1", [id, id_transaction]
        );
      } else {
        if (!id_participant) return { badReq: true };
        [[evalRow]] = await conn.query(
          "SELECT id FROM b_cal_evaluation WHERE id_session=? AND id_transaction=? AND id_evaluateur=? AND est_reference=0",
          [id, id_transaction, id_participant]
        );
      }
      if (!evalRow) return { notFound: true };
      const [r] = await conn.query(
        "UPDATE b_cal_evaluation_erreur SET coche=?, modifie_par=?, date_modif=NOW() WHERE id_cal_evaluation=? AND id_erreur_origine=?",
        [coche ? 1 : 0, uid, evalRow.id, id_erreur_origine]
      );
      if (r.affectedRows === 0) return { notFound: true };
      // Après publication : notifier le(s) évaluateur(s) dont le résultat change.
      if (ctx.s.resultat_publie) {
        let destinataires = [];
        if (cote === "PARTICIPANT") {
          destinataires = [Number(id_participant)];
        } else {
          // une modification de la référence impacte tous les participants
          const [ps] = await conn.query("SELECT id_evaluateur FROM b_cal_participant WHERE id_session=?", [id]);
          destinataires = ps.map((p) => p.id_evaluateur);
        }
        for (const dest of destinataires) {
          if (!dest) continue;
          await emit(conn, {
            id_utilisateur: dest,
            titre: "Résultat de calibrage modifié",
            message: `Le résultat de la session « ${ctx.s.nom} » a été ajusté par le jauge.`,
            type: "CALIBRAGE", nature_objet: "CALIBRAGE", id_objet: id,
            url: `/mon-espace/calibrage/resultats/${id}`,
          });
        }
      }
      return { ok: true };
    });
    if (out.forbidden) return res.status(403).json({ message: "Réservé au jauge." });
    if (out.locked) return res.status(409).json({ message: "Modifiable uniquement pendant la révision." });
    if (out.badReq) return res.status(400).json({ message: "Participant requis pour ce côté." });
    if (out.notFound) return res.status(404).json({ message: "Erreur introuvable." });
    return res.status(200).json({ message: "Constat mis à jour." });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur." }); }
};

// PUT appréciation du jauge sur une erreur de la référence (pas de recalcul)
const setAppreciation = async (req, res) => {
  const id = req.params.id;
  const uid = req.auth.userId;
  const { id_transaction, id_erreur_origine, appreciation } = req.body;
  try {
    const ctx = await contexte(db, id, uid);
    if (ctx.notFound || ctx.role !== "jauge") return res.status(403).json({ message: "Réservé au jauge." });
    if (ctx.s.statut === "CLOTUREE") return res.status(409).json({ message: "Session clôturée." });
    const [[refEval]] = await db.query(
      "SELECT id FROM b_cal_evaluation WHERE id_session=? AND id_transaction=? AND est_reference=1", [id, id_transaction]
    );
    if (!refEval) return res.status(404).json({ message: "Référence introuvable." });
    await db.query(
      "UPDATE b_cal_evaluation_erreur SET appreciation_jauge=? WHERE id_cal_evaluation=? AND id_erreur_origine=?",
      [appreciation || null, refEval.id, id_erreur_origine]
    );
    return res.status(200).json({ message: "Appréciation enregistrée." });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur." }); }
};

// PUT commentaire du jauge sur une erreur de SA référence (révision) — le jauge
// ne peut modifier QUE ses propres commentaires (jamais ceux des participants).
const setCommentaireJauge = async (req, res) => {
  const id = req.params.id;
  const uid = req.auth.userId;
  const { id_transaction, id_erreur_origine, commentaire } = req.body;
  if (!id_transaction || id_erreur_origine == null) {
    return res.status(400).json({ message: "Paramètres invalides." });
  }
  try {
    const ctx = await contexte(db, id, uid);
    if (ctx.notFound || ctx.role !== "jauge") return res.status(403).json({ message: "Réservé au jauge." });
    if (ctx.s.statut === "CLOTUREE") return res.status(409).json({ message: "Session clôturée." });
    const [[refEval]] = await db.query(
      "SELECT id FROM b_cal_evaluation WHERE id_session=? AND id_transaction=? AND est_reference=1", [id, id_transaction]
    );
    if (!refEval) return res.status(404).json({ message: "Référence introuvable." });
    const [r] = await db.query(
      "UPDATE b_cal_evaluation_erreur SET commentaire=? WHERE id_cal_evaluation=? AND id_erreur_origine=?",
      [commentaire !== undefined ? commentaire : null, refEval.id, id_erreur_origine]
    );
    if (r.affectedRows === 0) return res.status(404).json({ message: "Erreur introuvable." });
    return res.status(200).json({ message: "Commentaire enregistré." });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur." }); }
};

// PUT conclusions de session (jauge)
const setConclusions = async (req, res) => {
  const id = req.params.id;
  const uid = req.auth.userId;
  const { conclusions } = req.body;
  try {
    const ctx = await contexte(db, id, uid);
    if (ctx.notFound || ctx.role !== "jauge") return res.status(403).json({ message: "Réservé au jauge." });
    if (ctx.s.statut === "CLOTUREE") return res.status(409).json({ message: "Session clôturée." });
    await db.query("UPDATE b_cal_session SET conclusions=?, dateModification=NOW() WHERE id=?", [conclusions || null, id]);
    return res.status(200).json({ message: "Conclusions enregistrées." });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur." }); }
};

// POST validation du résultat (jauge) — publie le résultat SANS figer :
// le jauge peut continuer à modifier ; les participants le voient si la
// visibilité est activée. Notifie les participants.
const validerSession = async (req, res) => {
  const id = req.params.id;
  const uid = req.auth.userId;
  try {
    const out = await withTx(async (conn) => {
      const ctx = await contexte(conn, id, uid);
      if (ctx.notFound || ctx.role !== "jauge") return { forbidden: true };
      if (ctx.s.statut !== "RESULTATS_EN_REVISION") return { mauvaisStatut: true };
      await conn.query("UPDATE b_cal_session SET resultat_publie=1, dateModification=NOW() WHERE id=?", [id]);
      const [parts] = await conn.query("SELECT id_evaluateur FROM b_cal_participant WHERE id_session=?", [id]);
      for (const p of parts) {
        await emit(conn, {
          id_utilisateur: p.id_evaluateur,
          titre: "Résultats de calibrage disponibles",
          message: `Les résultats de la session « ${ctx.s.nom} » sont validés et consultables.`,
          type: "CALIBRAGE", nature_objet: "CALIBRAGE", id_objet: id,
          url: `/mon-espace/calibrage/resultats/${id}`,
        });
      }
      return { ok: true };
    });
    if (out.forbidden) return res.status(403).json({ message: "Réservé au jauge." });
    if (out.mauvaisStatut) return res.status(409).json({ message: "La session doit être en révision pour être validée." });
    return res.status(200).json({ message: "Résultat validé : visible par les participants (si visibilité activée). Vous pouvez encore l'ajuster." });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors de la validation." }); }
};

// POST figer le résultat (jauge) — verrouillage définitif : plus aucune action
// possible sur le résultat après cette opération.
const figerSession = async (req, res) => {
  const id = req.params.id;
  const uid = req.auth.userId;
  try {
    const out = await withTx(async (conn) => {
      const ctx = await contexte(conn, id, uid);
      if (ctx.notFound || ctx.role !== "jauge") return { forbidden: true };
      if (ctx.s.statut === "CLOTUREE") return { deja: true };
      if (ctx.s.statut !== "RESULTATS_EN_REVISION") return { mauvaisStatut: true };
      await conn.query(
        "UPDATE b_cal_session SET statut='CLOTUREE', resultat_publie=1, dateCloture=NOW(), dateModification=NOW() WHERE id=?", [id]
      );
      const [parts] = await conn.query("SELECT id_evaluateur FROM b_cal_participant WHERE id_session=?", [id]);
      for (const p of parts) {
        await emit(conn, {
          id_utilisateur: p.id_evaluateur,
          titre: "Résultats de calibrage figés",
          message: `Le résultat de la session « ${ctx.s.nom} » est désormais définitif.`,
          type: "CALIBRAGE", nature_objet: "CALIBRAGE", id_objet: id,
          url: `/mon-espace/calibrage/resultats/${id}`,
        });
      }
      return { ok: true };
    });
    if (out.forbidden) return res.status(403).json({ message: "Réservé au jauge." });
    if (out.deja) return res.status(409).json({ message: "Le résultat est déjà figé." });
    if (out.mauvaisStatut) return res.status(409).json({ message: "La session doit être en révision." });
    return res.status(200).json({ message: "Résultat figé : plus aucune modification possible." });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors du figement." }); }
};

module.exports = {
  getResultats, getConfrontation, modifierCote, setAppreciation, setCommentaireJauge, setConclusions, validerSession, figerSession,
};
