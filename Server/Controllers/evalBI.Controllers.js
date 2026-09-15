// =====================================================================
// Module ÉVALUATION QUALITÉ (cahier) — Business Intelligence (Phase 3b, F.39ter)
// Arbre des 5 pourquoi par couple grille/site, cascade pendant l'évaluation,
// proposition d'option manquante (EN_ATTENTE) + validation/rejet.
// Tables b_eval_bi_arborescence / b_eval_bi_option / b_evaluation_bi.
// =====================================================================
const db = require("../config/db");
const { emit } = require("../utils/notify");

const withTx = async (fn) => {
  const conn = await db.getConnection();
  try { await conn.beginTransaction(); const r = await fn(conn); await conn.commit(); return r; }
  catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
};

// Notifie les utilisateurs habilités à valider les options (rôles RO / Admin / AQ).
const notifierValidateurs = async (conn, message, idEvaluation) => {
  const [users] = await conn.query(
    `SELECT u.id FROM b_utilisateur u JOIN b_fonction f ON u.id_Fonction=f.id
     WHERE u.status='ACTIF' AND f.Role_Associe IN ('R_RO','R_ADMI','R_AQ')`
  );
  for (const u of users) {
    await emit(conn, {
      id_utilisateur: u.id, titre: "Validation d'option BI", message, type: "OPTION_BI",
      nature_objet: "OPTION_BI", id_objet: idEvaluation || null,
      url: idEvaluation ? "/mon-espace/evaluation/bi/validation" : null,
    });
  }
};

// ===================== ARBORESCENCE (admin) ==========================
const getArborescences = async (req, res) => {
  try {
    const { id_grille, id_site } = req.query;
    const clauses = [], params = [];
    if (id_grille) { clauses.push("a.id_grille=?"); params.push(id_grille); }
    if (id_site) { clauses.push("a.id_site=?"); params.push(id_site); }
    const where = clauses.length ? "WHERE " + clauses.join(" AND ") : "";
    const [rows] = await db.query(
      `SELECT a.*, g.nom AS grille, s.nom AS site
       FROM b_eval_bi_arborescence a
       LEFT JOIN b_eval_grille g ON a.id_grille=g.id
       LEFT JOIN b_site s ON a.id_site=s.id
       ${where} ORDER BY g.nom, s.nom`, params
    );
    return res.status(200).json(rows);
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors du chargement." }); }
};

const addArborescence = async (req, res) => {
  const { id_grille, id_site, point_depart_libelle } = req.body;
  if (!id_grille || !id_site || !point_depart_libelle) {
    return res.status(400).json({ message: "Grille, site et point de départ obligatoires." });
  }
  try {
    const [r] = await db.query(
      `INSERT INTO b_eval_bi_arborescence (id_grille, id_site, point_depart_libelle, dateCreation) VALUES (?, ?, ?, NOW())`,
      [id_grille, id_site, point_depart_libelle]
    );
    return res.status(201).json({ id: r.insertId, message: "Arborescence créée." });
  } catch (e) {
    if (e.code === "ER_DUP_ENTRY") return res.status(409).json({ message: "Une arborescence existe déjà pour ce couple grille/site." });
    console.log(e); return res.status(500).json({ message: "Erreur lors de la création." });
  }
};

// Arbre complet des options ACTIVES d'une arborescence
const getArbreOptions = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, id_parent, niveau, libelle, etat FROM b_eval_bi_option
       WHERE id_arborescence=? AND etat='ACTIF' ORDER BY niveau, libelle`, [req.params.id]
    );
    return res.status(200).json(rows);
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors du chargement." }); }
};

const addOption = async (req, res) => {
  const { id_arborescence, id_parent, niveau, libelle } = req.body;
  if (!id_arborescence || !niveau || !libelle || !libelle.trim()) {
    return res.status(400).json({ message: "Arborescence, niveau et libellé obligatoires." });
  }
  try {
    const [r] = await db.query(
      `INSERT INTO b_eval_bi_option (id_arborescence, id_parent, niveau, libelle, etat, dateCreation)
       VALUES (?, ?, ?, ?, 'ACTIF', NOW())`,
      [id_arborescence, id_parent || null, niveau, libelle.trim()]
    );
    return res.status(201).json({ id: r.insertId, message: "Option ajoutée." });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors de l'ajout." }); }
};

const updateOption = async (req, res) => {
  const { libelle } = req.body;
  if (!libelle || !libelle.trim()) return res.status(400).json({ message: "Le libellé est obligatoire." });
  try {
    await db.query(`UPDATE b_eval_bi_option SET libelle=? WHERE id=?`, [libelle.trim(), req.params.id]);
    return res.status(200).json({ message: "Option modifiée." });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur." }); }
};

// Suppression en cascade des options dépendantes
const deleteOptionCascade = async (conn, id) => {
  const [enfants] = await conn.query(`SELECT id FROM b_eval_bi_option WHERE id_parent=?`, [id]);
  for (const e of enfants) await deleteOptionCascade(conn, e.id);
  await conn.query(`DELETE FROM b_eval_bi_option WHERE id=?`, [id]);
};
const deleteOption = async (req, res) => {
  try {
    await withTx((conn) => deleteOptionCascade(conn, req.params.id));
    return res.status(200).json({ message: "Option (et dépendantes) supprimée." });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors de la suppression." }); }
};

// ===================== USAGE PENDANT L'ÉVALUATION ====================
// Arborescence applicable à une évaluation (couple grille/site) + choix enregistrés
const getEvaluationBI = async (req, res) => {
  const idEval = req.params.id;
  try {
    const [[e]] = await db.query(
      `SELECT id, id_grille_origine, id_site, statut, resolution FROM b_evaluation WHERE id=?`, [idEval]
    );
    if (!e) return res.status(404).json({ message: "Évaluation introuvable." });
    const [[arbo]] = await db.query(
      `SELECT * FROM b_eval_bi_arborescence WHERE id_grille=? AND id_site=?`,
      [e.id_grille_origine, e.id_site]
    );
    const [choix] = await db.query(
      `SELECT niveau, id_option, libelle FROM b_evaluation_bi WHERE id_evaluation=? ORDER BY niveau`, [idEval]
    );
    const [[pending]] = await db.query(
      `SELECT COUNT(*) AS n FROM b_eval_bi_option WHERE id_evaluation_origine=? AND etat='EN_ATTENTE'`, [idEval]
    );
    return res.status(200).json({
      arborescence: arbo || null,
      choix,
      en_attente_validation: pending.n > 0,
      resolution: e.resolution,
    });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors du chargement." }); }
};

// Options enfants d'un niveau (cascade) : ACTIVES + EN_ATTENTE proposées pour cette éval
const getOptionsEnfants = async (req, res) => {
  const { id_arborescence, id_parent, niveau, id_evaluation } = req.query;
  if (!id_arborescence || !niveau) return res.status(400).json({ message: "Paramètres manquants." });
  try {
    const parentCond = id_parent ? "id_parent=?" : "id_parent IS NULL";
    const params = [id_arborescence, niveau];
    if (id_parent) params.push(id_parent);
    params.push(id_evaluation || 0);
    const [rows] = await db.query(
      `SELECT id, id_parent, niveau, libelle, etat FROM b_eval_bi_option
       WHERE id_arborescence=? AND niveau=? AND ${parentCond}
         AND (etat='ACTIF' OR (etat='EN_ATTENTE' AND id_evaluation_origine=?))
       ORDER BY libelle`, params
    );
    return res.status(200).json(rows);
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors du chargement." }); }
};

// Enregistre les choix BI (recopie libellés) et met à jour le statut de l'éval
const saveEvaluationBI = async (req, res) => {
  const idEval = req.params.id;
  const choix = Array.isArray(req.body.choix) ? req.body.choix : [];
  try {
    const out = await withTx(async (conn) => {
      const [[e]] = await conn.query(`SELECT statut FROM b_evaluation WHERE id=?`, [idEval]);
      if (!e) return { notFound: true };
      if (e.statut === "TERMINE") return { locked: true };
      await conn.query(`DELETE FROM b_evaluation_bi WHERE id_evaluation=?`, [idEval]);
      for (const ch of choix) {
        if (!ch.libelle) continue;
        await conn.query(
          `INSERT INTO b_evaluation_bi (id_evaluation, niveau, id_option, libelle) VALUES (?, ?, ?, ?)`,
          [idEval, ch.niveau, ch.id_option || null, ch.libelle]
        );
      }
      // statut : EN_ATTENTE_VALIDATION_OPTION si une proposition est en attente
      const [[pending]] = await conn.query(
        `SELECT COUNT(*) AS n FROM b_eval_bi_option WHERE id_evaluation_origine=? AND etat='EN_ATTENTE'`, [idEval]
      );
      const statut = pending.n > 0 ? "EN_ATTENTE_VALIDATION_OPTION" : "NON_TERMINE";
      await conn.query(`UPDATE b_evaluation SET statut=? WHERE id=? AND statut<>'TERMINE'`, [statut, idEval]);
      return { statut };
    });
    if (out.notFound) return res.status(404).json({ message: "Évaluation introuvable." });
    if (out.locked) return res.status(409).json({ message: "Évaluation terminée : non modifiable." });
    return res.status(200).json({ message: "Analyse enregistrée.", statut: out.statut });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur." }); }
};

// Proposer une option manquante (F.39ter C)
const proposerOption = async (req, res) => {
  const { id_arborescence, id_parent, niveau, libelle, id_evaluation } = req.body;
  const proposePar = req.auth.userId;
  if (!id_arborescence || !niveau || !libelle || !libelle.trim() || !id_evaluation) {
    return res.status(400).json({ message: "Paramètres manquants." });
  }
  try {
    const result = await withTx(async (conn) => {
      const [r] = await conn.query(
        `INSERT INTO b_eval_bi_option (id_arborescence, id_parent, niveau, libelle, etat, propose_par, id_evaluation_origine, dateCreation)
         VALUES (?, ?, ?, ?, 'EN_ATTENTE', ?, ?, NOW())`,
        [id_arborescence, id_parent || null, niveau, libelle.trim(), proposePar, id_evaluation]
      );
      await notifierValidateurs(conn, `Nouvelle option proposée (niveau ${niveau}) : « ${libelle.trim()} »`, id_evaluation);
      return r.insertId;
    });
    return res.status(201).json({ id: result, etat: "EN_ATTENTE", message: "Option proposée (en attente de validation)." });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors de la proposition." }); }
};

// ===================== VALIDATION (F.39ter E) ========================
const getOptionsEnAttente = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT o.id, o.niveau, o.libelle, o.id_evaluation_origine, o.dateCreation,
              g.nom AS grille, s.nom AS site,
              u.nom AS proposeur_nom, u.prenom AS proposeur_prenom,
              parent.libelle AS parent_libelle
       FROM b_eval_bi_option o
       JOIN b_eval_bi_arborescence a ON o.id_arborescence=a.id
       LEFT JOIN b_eval_grille g ON a.id_grille=g.id
       LEFT JOIN b_site s ON a.id_site=s.id
       LEFT JOIN b_utilisateur u ON o.propose_par=u.id
       LEFT JOIN b_eval_bi_option parent ON o.id_parent=parent.id
       WHERE o.etat='EN_ATTENTE' ORDER BY o.dateCreation DESC`
    );
    return res.status(200).json(rows);
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors du chargement." }); }
};

// Valide une option (+ ses ancêtres en attente) — F.39ter E
const validerOption = async (req, res) => {
  const id = req.params.id;
  const { libelle } = req.body; // reformulation éventuelle
  const validePar = req.auth.userId;
  try {
    const out = await withTx(async (conn) => {
      const [[opt]] = await conn.query(`SELECT * FROM b_eval_bi_option WHERE id=?`, [id]);
      if (!opt) return { notFound: true };
      // valider la chaîne d'ancêtres EN_ATTENTE
      let courant = opt, garde = 0;
      while (courant && garde++ < 10) {
        if (courant.etat === "EN_ATTENTE") {
          const nouveauLib = courant.id === opt.id && libelle && libelle.trim() ? libelle.trim() : courant.libelle;
          await conn.query(
            `UPDATE b_eval_bi_option SET etat='ACTIF', libelle=?, valide_par=?, dateDecision=NOW() WHERE id=?`,
            [nouveauLib, validePar, courant.id]
          );
          // répercuter le libellé reformulé sur les évaluations qui l'ont recopié
          await conn.query(
            `UPDATE b_evaluation_bi SET libelle=? WHERE id_option=?`, [nouveauLib, courant.id]
          );
        }
        if (!courant.id_parent) break;
        const [[p]] = await conn.query(`SELECT * FROM b_eval_bi_option WHERE id=?`, [courant.id_parent]);
        courant = p;
      }
      // l'évaluation d'origine repasse à NON_TERMINE si plus de proposition en attente
      if (opt.id_evaluation_origine) {
        const [[pending]] = await conn.query(
          `SELECT COUNT(*) AS n FROM b_eval_bi_option WHERE id_evaluation_origine=? AND etat='EN_ATTENTE'`, [opt.id_evaluation_origine]
        );
        if (pending.n === 0) {
          await conn.query(
            `UPDATE b_evaluation SET statut='NON_TERMINE' WHERE id=? AND statut='EN_ATTENTE_VALIDATION_OPTION'`,
            [opt.id_evaluation_origine]
          );
        }
        const [[evOk]] = await conn.query(`SELECT id_evaluateur FROM b_evaluation WHERE id=?`, [opt.id_evaluation_origine]);
        if (evOk) await emit(conn, {
          id_utilisateur: evOk.id_evaluateur, titre: "Option validée",
          message: "Votre proposition d'option a été validée. Vous pouvez terminer l'évaluation.",
          type: "EVALUATION", nature_objet: "EVALUATION", id_objet: opt.id_evaluation_origine,
          url: `/mon-espace/evaluation/executer/${opt.id_evaluation_origine}`,
        });
      }
      return { ok: true };
    });
    if (out.notFound) return res.status(404).json({ message: "Option introuvable." });
    return res.status(200).json({ message: "Option validée." });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors de la validation." }); }
};

// Rejette une option (motif obligatoire) — F.39ter E
const rejeterOption = async (req, res) => {
  const id = req.params.id;
  const { motif } = req.body;
  const validePar = req.auth.userId;
  if (!motif || !motif.trim()) return res.status(400).json({ message: "Le motif de rejet est obligatoire." });
  try {
    const out = await withTx(async (conn) => {
      const [[opt]] = await conn.query(`SELECT * FROM b_eval_bi_option WHERE id=?`, [id]);
      if (!opt) return { notFound: true };
      // rejet de l'option + de ses dépendantes
      await deleteDependentsSetRejected(conn, opt.id, validePar, motif.trim());
      await conn.query(
        `UPDATE b_eval_bi_option SET etat='REJETE', valide_par=?, motif_rejet=?, dateDecision=NOW() WHERE id=?`,
        [validePar, motif.trim(), id]
      );
      if (opt.id_evaluation_origine) {
        // retirer les choix rejetés (et dépendants) de l'évaluation
        await conn.query(
          `DELETE FROM b_evaluation_bi WHERE id_evaluation=? AND niveau>=?`,
          [opt.id_evaluation_origine, opt.niveau]
        );
        const [[pending]] = await conn.query(
          `SELECT COUNT(*) AS n FROM b_eval_bi_option WHERE id_evaluation_origine=? AND etat='EN_ATTENTE'`, [opt.id_evaluation_origine]
        );
        if (pending.n === 0) {
          await conn.query(
            `UPDATE b_evaluation SET statut='NON_TERMINE' WHERE id=? AND statut='EN_ATTENTE_VALIDATION_OPTION'`,
            [opt.id_evaluation_origine]
          );
        }
        const [[evKo]] = await conn.query(`SELECT id_evaluateur FROM b_evaluation WHERE id=?`, [opt.id_evaluation_origine]);
        if (evKo) await emit(conn, {
          id_utilisateur: evKo.id_evaluateur, titre: "Option rejetée",
          message: `Votre proposition d'option a été rejetée : ${motif.trim()}`,
          type: "EVALUATION", nature_objet: "EVALUATION", id_objet: opt.id_evaluation_origine,
          url: `/mon-espace/evaluation/executer/${opt.id_evaluation_origine}`,
        });
      }
      return { ok: true };
    });
    if (out.notFound) return res.status(404).json({ message: "Option introuvable." });
    return res.status(200).json({ message: "Option rejetée." });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors du rejet." }); }
};

const deleteDependentsSetRejected = async (conn, id, validePar, motif) => {
  const [enfants] = await conn.query(`SELECT id FROM b_eval_bi_option WHERE id_parent=?`, [id]);
  for (const e of enfants) {
    await deleteDependentsSetRejected(conn, e.id, validePar, motif);
    await conn.query(
      `UPDATE b_eval_bi_option SET etat='REJETE', valide_par=?, motif_rejet=?, dateDecision=NOW() WHERE id=?`,
      [validePar, motif, e.id]
    );
  }
};

module.exports = {
  getArborescences, addArborescence, getArbreOptions, addOption, updateOption, deleteOption,
  getEvaluationBI, getOptionsEnfants, saveEvaluationBI, proposerOption,
  getOptionsEnAttente, validerOption, rejeterOption,
};
