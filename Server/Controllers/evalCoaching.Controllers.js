// =====================================================================
// Module ÉVALUATION QUALITÉ (cahier) — Coaching (Phase 4b, F.39quinquies A)
// Arbre UNIQUE des 5 pourquoi (indépendant grille/site), cascade,
// proposition/validation d'options. Tables b_eval_coaching(_option|_niveau).
// =====================================================================
const db = require("../config/db");
const { emit, emitEvaluation, utilisateursAvecPermission } = require("../utils/notify");

// Notifie {créateur, superviseur, agent} d'une modif coaching/plan si l'éval est TERMINÉE.
const notifierSiEvalTerminee = async (executor, idEval, { titre, message, exclure }) => {
  const [[e]] = await executor.query(
    `SELECT id, id_evaluateur, id_agent, statut FROM b_evaluation WHERE id=?`, [idEval]
  );
  if (e && e.statut === "TERMINE") {
    await emitEvaluation(executor, e, { titre, message, exclure });
  }
};

const withTx = async (fn) => {
  const conn = await db.getConnection();
  try { await conn.beginTransaction(); const r = await fn(conn); await conn.commit(); return r; }
  catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
};

const notifierValidateurs = async (conn, message, idEvaluation) => {
  // Destinataires : les utilisateurs qui peuvent réellement valider (evaluation.valider).
  const users = (await utilisateursAvecPermission(conn, "evaluation.valider")).map((id) => ({ id }));
  for (const u of users) {
    await emit(conn, {
      id_utilisateur: u.id, titre: "Validation d'option (coaching)", message, type: "OPTION_COACHING",
      nature_objet: "OPTION_COACHING", id_objet: idEvaluation || null,
      url: idEvaluation ? "/mon-espace/evaluation/bi/validation" : null,
    });
  }
};

// ===================== ARBRE (admin) =================================
const getArbre = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, id_parent, niveau, libelle, etat FROM b_eval_coaching_option WHERE etat='ACTIF' ORDER BY niveau, libelle`
    );
    return res.status(200).json(rows);
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors du chargement." }); }
};

const addOption = async (req, res) => {
  const { id_parent, niveau, libelle } = req.body;
  if (!niveau || !libelle || !libelle.trim()) return res.status(400).json({ message: "Niveau et libellé obligatoires." });
  try {
    const [r] = await db.query(
      `INSERT INTO b_eval_coaching_option (id_parent, niveau, libelle, etat, dateCreation) VALUES (?, ?, ?, 'ACTIF', NOW())`,
      [id_parent || null, niveau, libelle.trim()]
    );
    return res.status(201).json({ id: r.insertId, message: "Option ajoutée." });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors de l'ajout." }); }
};

// Déplacement d'une option sous un autre parent (glisser-déposer de l'arbre).
const deplacerOptionArbre = async (req, res) => {
  const { deplacerOption } = require("../utils/deplacerOption");
  const idParent = req.body.id_parent === null || req.body.id_parent === undefined || req.body.id_parent === "" ? null : Number(req.body.id_parent);
  try {
    const r = await withTx((conn) => deplacerOption(conn, "b_eval_coaching_option", Number(req.params.id), idParent, null));
    return res.status(200).json({ message: r.inchange ? "Option inchangée." : "Option déplacée.", ...r });
  } catch (e) {
    if (e.status) return res.status(e.status).json({ message: e.message });
    console.log(e); return res.status(500).json({ message: "Erreur lors du déplacement." });
  }
};

const updateOption = async (req, res) => {
  const { libelle } = req.body;
  if (!libelle || !libelle.trim()) return res.status(400).json({ message: "Le libellé est obligatoire." });
  try {
    await db.query(`UPDATE b_eval_coaching_option SET libelle=? WHERE id=?`, [libelle.trim(), req.params.id]);
    return res.status(200).json({ message: "Option modifiée." });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur." }); }
};

const deleteCascade = async (conn, id) => {
  const [enfants] = await conn.query(`SELECT id FROM b_eval_coaching_option WHERE id_parent=?`, [id]);
  for (const e of enfants) await deleteCascade(conn, e.id);
  await conn.query(`DELETE FROM b_eval_coaching_option WHERE id=?`, [id]);
};
const deleteOption = async (req, res) => {
  try {
    await withTx((conn) => deleteCascade(conn, req.params.id));
    return res.status(200).json({ message: "Option (et dépendantes) supprimée." });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors de la suppression." }); }
};

// ===================== COACHING PAR ÉVALUATION ======================
const ensureCoaching = async (conn, idEval, superviseurId) => {
  const [[c]] = await conn.query(`SELECT * FROM b_eval_coaching WHERE id_evaluation=?`, [idEval]);
  if (c) return c.id;
  const [r] = await conn.query(
    `INSERT INTO b_eval_coaching (id_evaluation, id_superviseur, statut, dateCreation) VALUES (?, ?, 'NON_TERMINE', NOW())`,
    [idEval, superviseurId]
  );
  return r.insertId;
};

const getEvaluationCoaching = async (req, res) => {
  const idEval = req.params.id;
  try {
    const [[e]] = await db.query(`SELECT id, conclusion, statut FROM b_evaluation WHERE id=?`, [idEval]);
    if (!e) return res.status(404).json({ message: "Évaluation introuvable." });
    const [[coaching]] = await db.query(`SELECT * FROM b_eval_coaching WHERE id_evaluation=?`, [idEval]);
    let choix = [];
    let enAttente = false;
    if (coaching) {
      [choix] = await db.query(`SELECT niveau, id_option, libelle FROM b_eval_coaching_niveau WHERE id_coaching=? ORDER BY niveau`, [coaching.id]);
      const [[p]] = await db.query(`SELECT COUNT(*) AS n FROM b_eval_coaching_option WHERE id_coaching_origine=? AND etat='EN_ATTENTE'`, [coaching.id]);
      enAttente = p.n > 0;
    }
    // Propositions rejetées pour ce coaching, avec leur motif
    let rejetees = [];
    if (coaching) {
      [rejetees] = await db.query(
        `SELECT o.niveau, o.libelle, o.motif_rejet, o.dateDecision,
                TRIM(CONCAT(COALESCE(u.prenom, ''), ' ', COALESCE(u.nom, ''))) AS propose_par_nom
           FROM b_eval_coaching_option o LEFT JOIN b_utilisateur u ON u.id = o.propose_par
          WHERE o.id_coaching_origine=? AND o.etat='REJETE' AND o.motif_rejet IS NOT NULL
          ORDER BY o.dateDecision DESC`, [coaching.id]
      );
    }
    return res.status(200).json({ coaching: coaching || null, choix, rejetees, en_attente_validation: enAttente, eligible: e.conclusion === "ECHEC" });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors du chargement." }); }
};

const getOptionsEnfants = async (req, res) => {
  const { id_parent, niveau, id_coaching } = req.query;
  if (!niveau) return res.status(400).json({ message: "Niveau manquant." });
  try {
    const parentCond = id_parent ? "id_parent=?" : "id_parent IS NULL";
    const params = [niveau];
    if (id_parent) params.push(id_parent);
    params.push(id_coaching || 0);
    const [rows] = await db.query(
      `SELECT id, id_parent, niveau, libelle, etat FROM b_eval_coaching_option
       WHERE niveau=? AND ${parentCond}
         AND (etat='ACTIF' OR (etat='EN_ATTENTE' AND id_coaching_origine=?))
       ORDER BY libelle`, params
    );
    return res.status(200).json(rows);
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors du chargement." }); }
};

const saveCoaching = async (req, res) => {
  const idEval = req.params.id;
  const superviseurId = req.auth.userId;
  const choix = Array.isArray(req.body.choix) ? req.body.choix : [];
  try {
    const out = await withTx(async (conn) => {
      const idCoaching = await ensureCoaching(conn, idEval, superviseurId);
      await conn.query(`DELETE FROM b_eval_coaching_niveau WHERE id_coaching=?`, [idCoaching]);
      for (const ch of choix) {
        if (!ch.libelle) continue;
        await conn.query(
          `INSERT INTO b_eval_coaching_niveau (id_coaching, niveau, id_option, libelle) VALUES (?, ?, ?, ?)`,
          [idCoaching, ch.niveau, ch.id_option || null, ch.libelle]
        );
      }
      const [[p]] = await conn.query(`SELECT COUNT(*) AS n FROM b_eval_coaching_option WHERE id_coaching_origine=? AND etat='EN_ATTENTE'`, [idCoaching]);
      const statut = p.n > 0 ? "EN_ATTENTE_VALIDATION_OPTION" : "NON_TERMINE";
      await conn.query(`UPDATE b_eval_coaching SET statut=? WHERE id=? AND statut<>'TERMINE'`, [statut, idCoaching]);
      return { idCoaching, statut };
    });
    await notifierSiEvalTerminee(db, idEval, {
      titre: "Coaching mis à jour", message: "Le coaching de l'évaluation a été modifié.", exclure: superviseurId,
    });
    return res.status(200).json({ message: "Coaching enregistré.", ...out });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur." }); }
};

const terminerCoaching = async (req, res) => {
  const idEval = req.params.id;
  try {
    const out = await withTx(async (conn) => {
      const [[c]] = await conn.query(`SELECT * FROM b_eval_coaching WHERE id_evaluation=?`, [idEval]);
      if (!c) return { notFound: true };
      const [[p]] = await conn.query(`SELECT COUNT(*) AS n FROM b_eval_coaching_option WHERE id_coaching_origine=? AND etat='EN_ATTENTE'`, [c.id]);
      if (p.n > 0) return { pending: true };
      await conn.query(`UPDATE b_eval_coaching SET statut='TERMINE', dateCloture=NOW() WHERE id=?`, [c.id]);
      return { ok: true };
    });
    if (out.notFound) return res.status(404).json({ message: "Coaching introuvable." });
    if (out.pending) return res.status(409).json({ message: "Une option est en attente de validation : clôture du coaching impossible." });
    await notifierSiEvalTerminee(db, idEval, {
      titre: "Coaching terminé", message: "Le coaching de l'évaluation a été terminé.", exclure: req.auth.userId,
    });
    return res.status(200).json({ message: "Coaching terminé." });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur." }); }
};

const proposerOption = async (req, res) => {
  const { id_parent, niveau, libelle, id_coaching, id_evaluation } = req.body;
  const proposePar = req.auth.userId;
  if (!niveau || !libelle || !libelle.trim() || !id_coaching) return res.status(400).json({ message: "Paramètres manquants." });
  try {
    const result = await withTx(async (conn) => {
      const [r] = await conn.query(
        `INSERT INTO b_eval_coaching_option (id_parent, niveau, libelle, etat, propose_par, id_coaching_origine, dateCreation)
         VALUES (?, ?, ?, 'EN_ATTENTE', ?, ?, NOW())`,
        [id_parent || null, niveau, libelle.trim(), proposePar, id_coaching]
      );
      await notifierValidateurs(conn, `Option de coaching proposée (niveau ${niveau}) : « ${libelle.trim()} »`, id_evaluation);
      return r.insertId;
    });
    return res.status(201).json({ id: result, etat: "EN_ATTENTE", message: "Option proposée (en attente de validation)." });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors de la proposition." }); }
};

// ===================== VALIDATION ===================================
const getOptionsEnAttente = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT o.id, o.niveau, o.libelle, o.id_coaching_origine, o.dateCreation,
              co.id_evaluation, o.propose_par, u.nom AS proposeur_nom, u.prenom AS proposeur_prenom, parent.libelle AS parent_libelle,
              ag.nom AS agent_nom, ag.prenom AS agent_prenom, ev.date_appel, s.nom AS site
       FROM b_eval_coaching_option o
       JOIN b_eval_coaching co ON o.id_coaching_origine=co.id
       LEFT JOIN b_utilisateur u ON o.propose_par=u.id
       LEFT JOIN b_eval_coaching_option parent ON o.id_parent=parent.id
       LEFT JOIN b_evaluation ev ON ev.id=co.id_evaluation
       LEFT JOIN b_utilisateur ag ON ag.id=ev.id_agent
       LEFT JOIN b_site s ON s.id=ev.id_site
       WHERE o.etat='EN_ATTENTE' ORDER BY o.dateCreation DESC`
    );
    return res.status(200).json(rows);
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors du chargement." }); }
};

const validerOption = async (req, res) => {
  const id = req.params.id;
  const { libelle } = req.body;
  const validePar = req.auth.userId;
  try {
    const out = await withTx(async (conn) => {
      const [[opt]] = await conn.query(`SELECT * FROM b_eval_coaching_option WHERE id=?`, [id]);
      if (!opt) return { notFound: true };
      let courant = opt, garde = 0;
      while (courant && garde++ < 10) {
        if (courant.etat === "EN_ATTENTE") {
          const nouveauLib = courant.id === opt.id && libelle && libelle.trim() ? libelle.trim() : courant.libelle;
          await conn.query(`UPDATE b_eval_coaching_option SET etat='ACTIF', libelle=?, valide_par=?, dateDecision=NOW() WHERE id=?`, [nouveauLib, validePar, courant.id]);
          await conn.query(`UPDATE b_eval_coaching_niveau SET libelle=? WHERE id_option=?`, [nouveauLib, courant.id]);
        }
        if (!courant.id_parent) break;
        const [[p]] = await conn.query(`SELECT * FROM b_eval_coaching_option WHERE id=?`, [courant.id_parent]);
        courant = p;
      }
      if (opt.id_coaching_origine) {
        const [[pending]] = await conn.query(`SELECT COUNT(*) AS n FROM b_eval_coaching_option WHERE id_coaching_origine=? AND etat='EN_ATTENTE'`, [opt.id_coaching_origine]);
        if (pending.n === 0) {
          await conn.query(`UPDATE b_eval_coaching SET statut='NON_TERMINE' WHERE id=? AND statut='EN_ATTENTE_VALIDATION_OPTION'`, [opt.id_coaching_origine]);
        }
        const [[coOk]] = await conn.query(`SELECT id_evaluation, id_superviseur FROM b_eval_coaching WHERE id=?`, [opt.id_coaching_origine]);
        if (coOk) await emit(conn, {
          id_utilisateur: coOk.id_superviseur, titre: "Option de coaching validée",
          message: "Votre proposition d'option de coaching a été validée.",
          type: "EVALUATION", nature_objet: "EVALUATION", id_objet: coOk.id_evaluation,
          url: `/mon-espace/evaluation/executer/${coOk.id_evaluation}`,
        });
      }
      return { ok: true };
    });
    if (out.notFound) return res.status(404).json({ message: "Option introuvable." });
    return res.status(200).json({ message: "Option validée." });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors de la validation." }); }
};

const rejeterCascade = async (conn, id, validePar, motif) => {
  const [enfants] = await conn.query(`SELECT id FROM b_eval_coaching_option WHERE id_parent=?`, [id]);
  for (const e of enfants) {
    await rejeterCascade(conn, e.id, validePar, motif);
    await conn.query(`UPDATE b_eval_coaching_option SET etat='REJETE', valide_par=?, motif_rejet=?, dateDecision=NOW() WHERE id=?`, [validePar, motif, e.id]);
  }
};
const rejeterOption = async (req, res) => {
  const id = req.params.id;
  const { motif } = req.body;
  const validePar = req.auth.userId;
  if (!motif || !motif.trim()) return res.status(400).json({ message: "Le motif de rejet est obligatoire." });
  try {
    const out = await withTx(async (conn) => {
      const [[opt]] = await conn.query(`SELECT * FROM b_eval_coaching_option WHERE id=?`, [id]);
      if (!opt) return { notFound: true };
      await rejeterCascade(conn, opt.id, validePar, motif.trim());
      await conn.query(`UPDATE b_eval_coaching_option SET etat='REJETE', valide_par=?, motif_rejet=?, dateDecision=NOW() WHERE id=?`, [validePar, motif.trim(), id]);
      if (opt.id_coaching_origine) {
        await conn.query(`DELETE FROM b_eval_coaching_niveau WHERE id_coaching=? AND niveau>=?`, [opt.id_coaching_origine, opt.niveau]);
        const [[pending]] = await conn.query(`SELECT COUNT(*) AS n FROM b_eval_coaching_option WHERE id_coaching_origine=? AND etat='EN_ATTENTE'`, [opt.id_coaching_origine]);
        if (pending.n === 0) {
          await conn.query(`UPDATE b_eval_coaching SET statut='NON_TERMINE' WHERE id=? AND statut='EN_ATTENTE_VALIDATION_OPTION'`, [opt.id_coaching_origine]);
        }
        // Notifier le proposeur (et le superviseur du coaching s'il est une autre
        // personne), avec le libellé de l'option et le motif du rejet.
        const [[coKo]] = await conn.query(`SELECT id_evaluation, id_superviseur FROM b_eval_coaching WHERE id=?`, [opt.id_coaching_origine]);
        if (coKo) {
          const dest = new Set([opt.propose_par, coKo.id_superviseur].filter(Boolean).map(Number));
          for (const uid of dest) {
            await emit(conn, {
              id_utilisateur: uid, titre: `Option de coaching rejetée : « ${String(opt.libelle).slice(0, 60)} »`,
              message: `Motif : ${motif.trim()}`,
              type: "EVALUATION", nature_objet: "EVALUATION", id_objet: coKo.id_evaluation,
              url: `/mon-espace/evaluation/executer/${coKo.id_evaluation}`,
            });
          }
        }
      }
      return { ok: true };
    });
    if (out.notFound) return res.status(404).json({ message: "Option introuvable." });
    return res.status(200).json({ message: "Option rejetée." });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors du rejet." }); }
};

module.exports = {
  getArbre, addOption, updateOption, deplacerOptionArbre, deleteOption,
  getEvaluationCoaching, getOptionsEnfants, saveCoaching, terminerCoaching, proposerOption,
  getOptionsEnAttente, validerOption, rejeterOption,
};
