// =====================================================================
// Module ÉVALUATION QUALITÉ (cahier) — Grilles (Phase 1, F.37bis + F.37ter D)
// Grille -> catégorie d'erreur -> sous-catégorie d'erreur -> erreur.
// Moteur de pondération (auto/manuel), contrôles de cohérence (±0,01),
// activation/désactivation, archivage. Schéma b_eval_*.
// =====================================================================
const db = require("../config/db");

const TOLERANCE = 0.01;
const num = (v) => (v === null || v === undefined ? 0 : Number(v));
const applied = (mode, row) =>
  mode === "AUTO" ? num(row.poids_calcule) : num(row.poids_saisi);

// --- résolution de la grille parente ---------------------------------
const grilleIdFromCategorie = async (conn, id) => {
  const [r] = await conn.query(
    `SELECT id_grille FROM b_eval_categorie_erreur WHERE id=?`,
    [id]
  );
  return r.length ? r[0].id_grille : null;
};
const grilleIdFromSousCat = async (conn, id) => {
  const [r] = await conn.query(
    `SELECT c.id_grille FROM b_eval_sous_categorie_erreur sc
     JOIN b_eval_categorie_erreur c ON sc.id_categorie_erreur=c.id WHERE sc.id=?`,
    [id]
  );
  return r.length ? r[0].id_grille : null;
};
const grilleIdFromErreur = async (conn, id) => {
  const [r] = await conn.query(
    `SELECT c.id_grille FROM b_eval_erreur e
     JOIN b_eval_sous_categorie_erreur sc ON e.id_sous_categorie_erreur=sc.id
     JOIN b_eval_categorie_erreur c ON sc.id_categorie_erreur=c.id WHERE e.id=?`,
    [id]
  );
  return r.length ? r[0].id_grille : null;
};

// --- usage d'un élément par une évaluation (snapshot) — F.37ter D -----
const usedBy = async (conn, table, col, id) => {
  const [r] = await conn.query(
    `SELECT 1 FROM ${table} WHERE ${col}=? LIMIT 1`,
    [id]
  );
  return r.length > 0;
};
const categorieUsed = async (conn, id) =>
  (await usedBy(conn, "b_evaluation_categorie", "id_categorie_origine", id)) ||
  (await usedBy(conn, "b_eval_contre_categorie", "id_categorie_origine", id));
const sousCatUsed = async (conn, id) =>
  (await usedBy(conn, "b_evaluation_erreur", "id_sous_categorie_origine", id)) ||
  (await usedBy(conn, "b_eval_contre_erreur", "id_sous_categorie_origine", id));
const erreurUsed = async (conn, id) =>
  (await usedBy(conn, "b_evaluation_erreur", "id_erreur_origine", id)) ||
  (await usedBy(conn, "b_eval_contre_erreur", "id_erreur_origine", id));

// --- moteur pondération mode AUTO (F.37bis B) ------------------------
const recomputeAutoWeights = async (conn, grilleId) => {
  const [cats] = await conn.query(
    `SELECT id FROM b_eval_categorie_erreur WHERE id_grille=? AND etat='ACTIF'`,
    [grilleId]
  );
  for (const cat of cats) {
    const [tot] = await conn.query(
      `SELECT COUNT(*) AS n FROM b_eval_erreur e
       JOIN b_eval_sous_categorie_erreur sc ON e.id_sous_categorie_erreur=sc.id
       WHERE sc.id_categorie_erreur=? AND sc.etat='ACTIF' AND e.etat='ACTIF'`,
      [cat.id]
    );
    const totalErr = tot[0].n;
    const [sousCats] = await conn.query(
      `SELECT id FROM b_eval_sous_categorie_erreur WHERE id_categorie_erreur=? AND etat='ACTIF'`,
      [cat.id]
    );
    for (const sc of sousCats) {
      const [c] = await conn.query(
        `SELECT COUNT(*) AS n FROM b_eval_erreur WHERE id_sous_categorie_erreur=? AND etat='ACTIF'`,
        [sc.id]
      );
      const nbErr = c[0].n;
      const poidsSC = totalErr > 0 ? (100 * nbErr) / totalErr : 0;
      await conn.query(
        `UPDATE b_eval_sous_categorie_erreur SET poids_calcule=? WHERE id=?`,
        [poidsSC, sc.id]
      );
      const poidsErr = nbErr > 0 ? poidsSC / nbErr : 0;
      await conn.query(
        `UPDATE b_eval_erreur SET poids_calcule=? WHERE id_sous_categorie_erreur=? AND etat='ACTIF'`,
        [poidsErr, sc.id]
      );
    }
  }
};

// --- contrôles de cohérence (F.37bis D) ------------------------------
const checkCoherence = async (conn, grilleId) => {
  const [[grille]] = await conn.query(`SELECT * FROM b_eval_grille WHERE id=?`, [grilleId]);
  const mode = grille.mode_ponderation;
  const ecarts = [];
  const [cats] = await conn.query(
    `SELECT id, libelle, poids FROM b_eval_categorie_erreur WHERE id_grille=? AND etat='ACTIF'`,
    [grilleId]
  );
  const sumCat = cats.reduce((s, c) => s + num(c.poids), 0);
  if (Math.abs(sumCat - 100) > TOLERANCE) {
    ecarts.push({ niveau: "GRILLE", parent: grille.nom, obtenu: Number(sumCat.toFixed(6)), attendu: 100 });
  }
  for (const cat of cats) {
    const [sousCats] = await conn.query(
      `SELECT * FROM b_eval_sous_categorie_erreur WHERE id_categorie_erreur=? AND etat='ACTIF'`,
      [cat.id]
    );
    const sumSC = sousCats.reduce((s, sc) => s + applied(mode, sc), 0);
    if (Math.abs(sumSC - 100) > TOLERANCE) {
      ecarts.push({ niveau: "CATEGORIE", parent: cat.libelle, obtenu: Number(sumSC.toFixed(6)), attendu: 100 });
    }
    for (const sc of sousCats) {
      const [errs] = await conn.query(
        `SELECT * FROM b_eval_erreur WHERE id_sous_categorie_erreur=? AND etat='ACTIF'`,
        [sc.id]
      );
      const sumErr = errs.reduce((s, e) => s + applied(mode, e), 0);
      const cible = applied(mode, sc);
      if (Math.abs(sumErr - cible) > TOLERANCE) {
        ecarts.push({
          niveau: "SOUS_CATEGORIE", parent: sc.libelle,
          obtenu: Number(sumErr.toFixed(6)), attendu: Number(cible.toFixed(6)),
        });
      }
    }
  }
  return { ok: ecarts.length === 0, ecarts };
};

// --- complétude (F.37bis G) ------------------------------------------
const checkCompletude = async (conn, grilleId) => {
  const manques = [];
  const [cats] = await conn.query(
    `SELECT id, libelle FROM b_eval_categorie_erreur WHERE id_grille=? AND etat='ACTIF'`,
    [grilleId]
  );
  if (cats.length === 0) {
    manques.push({ element: "grille", detail: "Aucune catégorie d'erreur." });
    return { ok: false, manques };
  }
  for (const cat of cats) {
    const [sousCats] = await conn.query(
      `SELECT id, libelle FROM b_eval_sous_categorie_erreur WHERE id_categorie_erreur=? AND etat='ACTIF'`,
      [cat.id]
    );
    if (sousCats.length === 0) {
      manques.push({ element: cat.libelle, detail: "Aucune sous-catégorie d'erreur." });
      continue;
    }
    for (const sc of sousCats) {
      const [errs] = await conn.query(
        `SELECT COUNT(*) AS n FROM b_eval_erreur WHERE id_sous_categorie_erreur=? AND etat='ACTIF'`,
        [sc.id]
      );
      if (errs[0].n === 0) manques.push({ element: sc.libelle, detail: "Aucune erreur." });
    }
  }
  return { ok: manques.length === 0, manques };
};

// --- bascule de protection ACTIVE -> BROUILLON (F.37bis G) -----------
const maybeAutoDowngrade = async (conn, grilleId) => {
  const [[grille]] = await conn.query(`SELECT statut FROM b_eval_grille WHERE id=?`, [grilleId]);
  if (!grille || grille.statut !== "ACTIVE") return false;
  const coherence = await checkCoherence(conn, grilleId);
  if (!coherence.ok) {
    await conn.query(`UPDATE b_eval_grille SET statut='BROUILLON', dateModification=NOW() WHERE id=?`, [grilleId]);
    return true;
  }
  return false;
};

const syncGrille = async (conn, grilleId) => {
  const [[grille]] = await conn.query(`SELECT mode_ponderation FROM b_eval_grille WHERE id=?`, [grilleId]);
  if (grille && grille.mode_ponderation === "AUTO") await recomputeAutoWeights(conn, grilleId);
  const downgraded = await maybeAutoDowngrade(conn, grilleId);
  return { downgraded };
};

const withTx = async (fn) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const r = await fn(conn);
    await conn.commit();
    return r;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
};

// =====================================================================
// GRILLES
// =====================================================================
const getAllGrilles = async (req, res) => {
  try {
    const { statut, type_ressource_cible } = req.query;
    const clauses = ["etat='ACTIF'"];
    const params = [];
    if (statut) { clauses.push("statut=?"); params.push(statut); }
    if (type_ressource_cible) { clauses.push("type_ressource_cible=?"); params.push(type_ressource_cible); }
    const [rows] = await db.query(
      `SELECT * FROM b_eval_grille WHERE ${clauses.join(" AND ")} ORDER BY nom`, params
    );
    return res.status(200).json(rows);
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors du chargement." }); }
};

const getGrilleDetail = async (req, res) => {
  const grilleId = req.params.id;
  try {
    const [[grille]] = await db.query(`SELECT * FROM b_eval_grille WHERE id=?`, [grilleId]);
    if (!grille) return res.status(404).json({ message: "Grille introuvable." });
    const includeArchives = req.query.archives === "true";
    const etatFilter = includeArchives ? "" : "AND etat='ACTIF'";
    const mode = grille.mode_ponderation;

    const [cats] = await db.query(
      `SELECT * FROM b_eval_categorie_erreur WHERE id_grille=? ${etatFilter} ORDER BY ordre, id`, [grilleId]
    );
    for (const cat of cats) {
      const [sousCats] = await db.query(
        `SELECT * FROM b_eval_sous_categorie_erreur WHERE id_categorie_erreur=? ${etatFilter} ORDER BY id`, [cat.id]
      );
      cat.cumul_sous_categories = 0;
      for (const sc of sousCats) {
        const [errs] = await db.query(
          `SELECT * FROM b_eval_erreur WHERE id_sous_categorie_erreur=? ${etatFilter} ORDER BY id`, [sc.id]
        );
        sc.poids_applique = applied(mode, sc);
        sc.cumul_erreurs = 0;
        for (const e of errs) {
          e.poids_applique = applied(mode, e);
          e.score_pct = Number(((e.poids_applique * num(cat.poids)) / 100).toFixed(6));
          e.score_sur20 = Number(((e.score_pct / 100) * 20).toFixed(6));
          if (e.etat === "ACTIF") sc.cumul_erreurs += e.poids_applique;
        }
        sc.cumul_erreurs = Number(sc.cumul_erreurs.toFixed(6));
        sc.erreurs = errs;
        if (sc.etat === "ACTIF") cat.cumul_sous_categories += sc.poids_applique;
      }
      cat.cumul_sous_categories = Number(cat.cumul_sous_categories.toFixed(6));
      cat.sous_categories = sousCats;
    }
    const cumul_categories = Number(
      cats.filter((c) => c.etat === "ACTIF").reduce((s, c) => s + num(c.poids), 0).toFixed(6)
    );
    const conn = await db.getConnection();
    let coherence, completude;
    try {
      coherence = await checkCoherence(conn, grilleId);
      completude = await checkCompletude(conn, grilleId);
    } finally { conn.release(); }

    return res.status(200).json({
      grille, categories: cats, cumul_categories, coherence, completude,
      activable: coherence.ok && completude.ok,
    });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors du chargement." }); }
};

const addGrille = async (req, res) => {
  const { nom, type_ressource_cible, mode_ponderation } = req.body;
  if (!nom || !nom.trim()) return res.status(400).json({ message: "Le nom est obligatoire." });
  try {
    const [r] = await db.query(
      `INSERT INTO b_eval_grille (nom, mode_ponderation, type_ressource_cible, statut, etat, dateCreation)
       VALUES (?, ?, ?, 'BROUILLON', 'ACTIF', NOW())`,
      [nom.trim(), mode_ponderation === "MANUEL" ? "MANUEL" : "AUTO",
       type_ressource_cible === "AUTOMATISEE" ? "AUTOMATISEE" : "HUMAINE"]
    );
    return res.status(201).json({ id: r.insertId, message: "Grille créée." });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors de la création." }); }
};

const updateGrille = async (req, res) => {
  const grilleId = req.params.id;
  const { nom, type_ressource_cible } = req.body;
  if (!nom || !nom.trim()) return res.status(400).json({ message: "Le nom est obligatoire." });
  try {
    const [used] = await db.query(`SELECT 1 FROM b_evaluation WHERE id_grille_origine=? LIMIT 1`, [grilleId]);
    if (type_ressource_cible && used.length) {
      return res.status(409).json({ message: "Type de ressource cible figé : grille déjà utilisée par une évaluation." });
    }
    if (type_ressource_cible) {
      await db.query(`UPDATE b_eval_grille SET nom=?, type_ressource_cible=?, dateModification=NOW() WHERE id=?`,
        [nom.trim(), type_ressource_cible === "AUTOMATISEE" ? "AUTOMATISEE" : "HUMAINE", grilleId]);
    } else {
      await db.query(`UPDATE b_eval_grille SET nom=?, dateModification=NOW() WHERE id=?`, [nom.trim(), grilleId]);
    }
    return res.status(200).json({ message: "Grille mise à jour." });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors de la mise à jour." }); }
};

const deleteGrille = async (req, res) => {
  const grilleId = req.params.id;
  try {
    const [used] = await db.query(`SELECT 1 FROM b_evaluation WHERE id_grille_origine=? LIMIT 1`, [grilleId]);
    if (used.length) return res.status(409).json({ message: "Grille utilisée par une évaluation : suppression impossible." });
    await withTx(async (conn) => {
      await conn.query(
        `DELETE e FROM b_eval_erreur e
         JOIN b_eval_sous_categorie_erreur sc ON e.id_sous_categorie_erreur=sc.id
         JOIN b_eval_categorie_erreur c ON sc.id_categorie_erreur=c.id WHERE c.id_grille=?`, [grilleId]);
      await conn.query(
        `DELETE sc FROM b_eval_sous_categorie_erreur sc
         JOIN b_eval_categorie_erreur c ON sc.id_categorie_erreur=c.id WHERE c.id_grille=?`, [grilleId]);
      await conn.query(`DELETE FROM b_eval_categorie_erreur WHERE id_grille=?`, [grilleId]);
      await conn.query(`DELETE FROM b_eval_grille WHERE id=?`, [grilleId]);
    });
    return res.status(200).json({ message: "Grille supprimée." });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors de la suppression." }); }
};

const changeMode = async (req, res) => {
  const grilleId = req.params.id;
  const { mode } = req.body;
  if (mode !== "AUTO" && mode !== "MANUEL") return res.status(400).json({ message: "Mode invalide (AUTO ou MANUEL)." });
  try {
    const result = await withTx(async (conn) => {
      if (mode === "MANUEL") {
        await conn.query(
          `UPDATE b_eval_sous_categorie_erreur sc
           JOIN b_eval_categorie_erreur c ON sc.id_categorie_erreur=c.id
           SET sc.poids_saisi=sc.poids_calcule WHERE c.id_grille=? AND sc.poids_saisi IS NULL`, [grilleId]);
        await conn.query(
          `UPDATE b_eval_erreur e
           JOIN b_eval_sous_categorie_erreur sc ON e.id_sous_categorie_erreur=sc.id
           JOIN b_eval_categorie_erreur c ON sc.id_categorie_erreur=c.id
           SET e.poids_saisi=e.poids_calcule WHERE c.id_grille=? AND e.poids_saisi IS NULL`, [grilleId]);
      }
      await conn.query(`UPDATE b_eval_grille SET mode_ponderation=?, dateModification=NOW() WHERE id=?`, [mode, grilleId]);
      return syncGrille(conn, grilleId);
    });
    return res.status(200).json({ message: `Mode ${mode} appliqué.`, downgraded: result.downgraded });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors du changement de mode." }); }
};

const activerGrille = async (req, res) => {
  const grilleId = req.params.id;
  try {
    const response = await withTx(async (conn) => {
      const coherence = await checkCoherence(conn, grilleId);
      const completude = await checkCompletude(conn, grilleId);
      if (!coherence.ok || !completude.ok) return { status: 409, body: { message: "Activation impossible.", coherence, completude } };
      // Garde-fou : un seuil de réussite à 0 rend toute évaluation « toujours en succès ».
      const [seuilsZero] = await conn.query(
        `SELECT libelle FROM b_eval_categorie_erreur WHERE id_grille=? AND etat='ACTIF' AND (seuil_reussite IS NULL OR seuil_reussite<=0)`,
        [grilleId]
      );
      if (seuilsZero.length > 0) {
        return { status: 409, body: {
          message: "Activation impossible : seuil de réussite à 0 sur une ou plusieurs catégories (l'évaluation serait toujours en succès).",
          categories_sans_seuil: seuilsZero.map((c) => c.libelle),
        } };
      }
      await conn.query(`UPDATE b_eval_grille SET statut='ACTIVE', dateModification=NOW() WHERE id=?`, [grilleId]);
      return { status: 200, body: { message: "Grille activée." } };
    });
    return res.status(response.status).json(response.body);
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors de l'activation." }); }
};

const desactiverGrille = async (req, res) => {
  try {
    await db.query(`UPDATE b_eval_grille SET statut='BROUILLON', dateModification=NOW() WHERE id=?`, [req.params.id]);
    return res.status(200).json({ message: "Grille repassée en brouillon." });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors de la désactivation." }); }
};

// =====================================================================
// CATÉGORIES D'ERREUR
// =====================================================================
const addCategorie = async (req, res) => {
  const { id_grille, libelle, poids, seuil_reussite, comparateur, critique, ordre } = req.body;
  if (!id_grille || !libelle || !libelle.trim()) return res.status(400).json({ message: "Grille et libellé obligatoires." });
  try {
    const out = await withTx(async (conn) => {
      const [r] = await conn.query(
        `INSERT INTO b_eval_categorie_erreur (id_grille, libelle, poids, seuil_reussite, comparateur, critique, ordre, etat, dateCreation)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIF', NOW())`,
        [id_grille, libelle.trim(), num(poids), num(seuil_reussite), comparateur === ">=" ? ">=" : ">", critique ? 1 : 0, num(ordre)]
      );
      const sync = await syncGrille(conn, id_grille);
      return { id: r.insertId, ...sync };
    });
    return res.status(201).json({ ...out, message: "Catégorie ajoutée." });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors de l'ajout." }); }
};

const updateCategorie = async (req, res) => {
  const id = req.params.id;
  const { libelle, poids, seuil_reussite, comparateur, critique, ordre } = req.body;
  if (!libelle || !libelle.trim()) return res.status(400).json({ message: "Le libellé est obligatoire." });
  try {
    const out = await withTx(async (conn) => {
      const grilleId = await grilleIdFromCategorie(conn, id);
      if (!grilleId) return null;
      await conn.query(
        `UPDATE b_eval_categorie_erreur SET libelle=?, poids=?, seuil_reussite=?, comparateur=?, critique=?, ordre=?, dateModification=NOW() WHERE id=?`,
        [libelle.trim(), num(poids), num(seuil_reussite), comparateur === ">=" ? ">=" : ">", critique ? 1 : 0, num(ordre), id]
      );
      return syncGrille(conn, grilleId);
    });
    if (!out) return res.status(404).json({ message: "Catégorie introuvable." });
    return res.status(200).json({ ...out, message: "Catégorie mise à jour." });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors de la mise à jour." }); }
};

const deleteCategorie = async (req, res) => {
  const id = req.params.id;
  try {
    const out = await withTx(async (conn) => {
      const grilleId = await grilleIdFromCategorie(conn, id);
      if (!grilleId) return { notFound: true };
      if (await categorieUsed(conn, id)) return { used: true };
      await conn.query(
        `DELETE e FROM b_eval_erreur e JOIN b_eval_sous_categorie_erreur sc ON e.id_sous_categorie_erreur=sc.id WHERE sc.id_categorie_erreur=?`, [id]);
      await conn.query(`DELETE FROM b_eval_sous_categorie_erreur WHERE id_categorie_erreur=?`, [id]);
      await conn.query(`DELETE FROM b_eval_categorie_erreur WHERE id=?`, [id]);
      return syncGrille(conn, grilleId);
    });
    if (out.notFound) return res.status(404).json({ message: "Catégorie introuvable." });
    if (out.used) return res.status(409).json({ message: "Catégorie utilisée par une évaluation : suppression impossible, utilisez l'archivage." });
    return res.status(200).json({ ...out, message: "Catégorie supprimée." });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors de la suppression." }); }
};

const archiverCategorie = async (req, res) => {
  try {
    const out = await withTx(async (conn) => {
      const grilleId = await grilleIdFromCategorie(conn, req.params.id);
      if (!grilleId) return null;
      await conn.query(`UPDATE b_eval_categorie_erreur SET etat='ARCHIVE', dateModification=NOW() WHERE id=?`, [req.params.id]);
      return syncGrille(conn, grilleId);
    });
    if (!out) return res.status(404).json({ message: "Catégorie introuvable." });
    return res.status(200).json({ ...out, message: "Catégorie archivée." });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors de l'archivage." }); }
};

const reactiverCategorie = async (req, res) => {
  try {
    const out = await withTx(async (conn) => {
      const grilleId = await grilleIdFromCategorie(conn, req.params.id);
      if (!grilleId) return null;
      await conn.query(`UPDATE b_eval_categorie_erreur SET etat='ACTIF', dateModification=NOW() WHERE id=?`, [req.params.id]);
      return syncGrille(conn, grilleId);
    });
    if (!out) return res.status(404).json({ message: "Catégorie introuvable." });
    return res.status(200).json({ ...out, message: "Catégorie réactivée." });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors de la réactivation." }); }
};

// =====================================================================
// SOUS-CATÉGORIES D'ERREUR
// =====================================================================
const addSousCategorie = async (req, res) => {
  const { id_categorie_erreur, libelle, poids_saisi } = req.body;
  if (!id_categorie_erreur || !libelle || !libelle.trim()) return res.status(400).json({ message: "Catégorie et libellé obligatoires." });
  try {
    const out = await withTx(async (conn) => {
      const grilleId = await grilleIdFromCategorie(conn, id_categorie_erreur);
      const [r] = await conn.query(
        `INSERT INTO b_eval_sous_categorie_erreur (id_categorie_erreur, libelle, poids_calcule, poids_saisi, etat, dateCreation)
         VALUES (?, ?, 0, ?, 'ACTIF', NOW())`,
        [id_categorie_erreur, libelle.trim(), poids_saisi == null ? null : num(poids_saisi)]
      );
      const sync = await syncGrille(conn, grilleId);
      return { id: r.insertId, ...sync };
    });
    return res.status(201).json({ ...out, message: "Sous-catégorie ajoutée." });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors de l'ajout." }); }
};

const updateSousCategorie = async (req, res) => {
  const id = req.params.id;
  const { libelle, poids_saisi } = req.body;
  if (!libelle || !libelle.trim()) return res.status(400).json({ message: "Le libellé est obligatoire." });
  try {
    const out = await withTx(async (conn) => {
      const grilleId = await grilleIdFromSousCat(conn, id);
      if (!grilleId) return null;
      await conn.query(
        `UPDATE b_eval_sous_categorie_erreur SET libelle=?, poids_saisi=?, dateModification=NOW() WHERE id=?`,
        [libelle.trim(), poids_saisi == null ? null : num(poids_saisi), id]
      );
      return syncGrille(conn, grilleId);
    });
    if (!out) return res.status(404).json({ message: "Sous-catégorie introuvable." });
    return res.status(200).json({ ...out, message: "Sous-catégorie mise à jour." });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors de la mise à jour." }); }
};

const deleteSousCategorie = async (req, res) => {
  const id = req.params.id;
  try {
    const out = await withTx(async (conn) => {
      const grilleId = await grilleIdFromSousCat(conn, id);
      if (!grilleId) return { notFound: true };
      if (await sousCatUsed(conn, id)) return { used: true };
      await conn.query(`DELETE FROM b_eval_erreur WHERE id_sous_categorie_erreur=?`, [id]);
      await conn.query(`DELETE FROM b_eval_sous_categorie_erreur WHERE id=?`, [id]);
      return syncGrille(conn, grilleId);
    });
    if (out.notFound) return res.status(404).json({ message: "Sous-catégorie introuvable." });
    if (out.used) return res.status(409).json({ message: "Sous-catégorie utilisée par une évaluation : suppression impossible, utilisez l'archivage." });
    return res.status(200).json({ ...out, message: "Sous-catégorie supprimée." });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors de la suppression." }); }
};

const archiverSousCategorie = async (req, res) => {
  try {
    const out = await withTx(async (conn) => {
      const grilleId = await grilleIdFromSousCat(conn, req.params.id);
      if (!grilleId) return null;
      await conn.query(`UPDATE b_eval_sous_categorie_erreur SET etat='ARCHIVE', dateModification=NOW() WHERE id=?`, [req.params.id]);
      return syncGrille(conn, grilleId);
    });
    if (!out) return res.status(404).json({ message: "Sous-catégorie introuvable." });
    return res.status(200).json({ ...out, message: "Sous-catégorie archivée." });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors de l'archivage." }); }
};

const reactiverSousCategorie = async (req, res) => {
  try {
    const out = await withTx(async (conn) => {
      const grilleId = await grilleIdFromSousCat(conn, req.params.id);
      if (!grilleId) return null;
      await conn.query(`UPDATE b_eval_sous_categorie_erreur SET etat='ACTIF', dateModification=NOW() WHERE id=?`, [req.params.id]);
      return syncGrille(conn, grilleId);
    });
    if (!out) return res.status(404).json({ message: "Sous-catégorie introuvable." });
    return res.status(200).json({ ...out, message: "Sous-catégorie réactivée." });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors de la réactivation." }); }
};

// =====================================================================
// ERREURS
// =====================================================================
const addErreur = async (req, res) => {
  const { id_sous_categorie_erreur, item, sous_item, referentiel, poids_saisi } = req.body;
  if (!id_sous_categorie_erreur || !item || !item.trim()) return res.status(400).json({ message: "Sous-catégorie et item obligatoires." });
  try {
    const out = await withTx(async (conn) => {
      const grilleId = await grilleIdFromSousCat(conn, id_sous_categorie_erreur);
      const [r] = await conn.query(
        `INSERT INTO b_eval_erreur (id_sous_categorie_erreur, item, sous_item, referentiel, poids_calcule, poids_saisi, etat, dateCreation)
         VALUES (?, ?, ?, ?, 0, ?, 'ACTIF', NOW())`,
        [id_sous_categorie_erreur, item.trim(), sous_item || null, referentiel || null, poids_saisi == null ? null : num(poids_saisi)]
      );
      const sync = await syncGrille(conn, grilleId);
      return { id: r.insertId, ...sync };
    });
    return res.status(201).json({ ...out, message: "Erreur ajoutée." });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors de l'ajout." }); }
};

const updateErreur = async (req, res) => {
  const id = req.params.id;
  const { item, sous_item, referentiel, poids_saisi, id_sous_categorie_erreur } = req.body;
  if (!item || !item.trim()) return res.status(400).json({ message: "L'item est obligatoire." });
  try {
    const out = await withTx(async (conn) => {
      const grilleId = await grilleIdFromErreur(conn, id);
      if (!grilleId) return null;
      if (id_sous_categorie_erreur) {
        await conn.query(`UPDATE b_eval_erreur SET id_sous_categorie_erreur=? WHERE id=?`, [id_sous_categorie_erreur, id]);
      }
      await conn.query(
        `UPDATE b_eval_erreur SET item=?, sous_item=?, referentiel=?, poids_saisi=?, dateModification=NOW() WHERE id=?`,
        [item.trim(), sous_item || null, referentiel || null, poids_saisi == null ? null : num(poids_saisi), id]
      );
      return syncGrille(conn, grilleId);
    });
    if (!out) return res.status(404).json({ message: "Erreur introuvable." });
    return res.status(200).json({ ...out, message: "Erreur mise à jour." });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors de la mise à jour." }); }
};

const deleteErreur = async (req, res) => {
  const id = req.params.id;
  try {
    const out = await withTx(async (conn) => {
      const grilleId = await grilleIdFromErreur(conn, id);
      if (!grilleId) return { notFound: true };
      if (await erreurUsed(conn, id)) return { used: true };
      await conn.query(`DELETE FROM b_eval_erreur WHERE id=?`, [id]);
      return syncGrille(conn, grilleId);
    });
    if (out.notFound) return res.status(404).json({ message: "Erreur introuvable." });
    if (out.used) return res.status(409).json({ message: "Erreur utilisée par une évaluation : suppression impossible, utilisez l'archivage." });
    return res.status(200).json({ ...out, message: "Erreur supprimée." });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors de la suppression." }); }
};

const archiverErreur = async (req, res) => {
  try {
    const out = await withTx(async (conn) => {
      const grilleId = await grilleIdFromErreur(conn, req.params.id);
      if (!grilleId) return null;
      await conn.query(`UPDATE b_eval_erreur SET etat='ARCHIVE', dateModification=NOW() WHERE id=?`, [req.params.id]);
      return syncGrille(conn, grilleId);
    });
    if (!out) return res.status(404).json({ message: "Erreur introuvable." });
    return res.status(200).json({ ...out, message: "Erreur archivée." });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors de l'archivage." }); }
};

const reactiverErreur = async (req, res) => {
  try {
    const out = await withTx(async (conn) => {
      const grilleId = await grilleIdFromErreur(conn, req.params.id);
      if (!grilleId) return null;
      await conn.query(`UPDATE b_eval_erreur SET etat='ACTIF', dateModification=NOW() WHERE id=?`, [req.params.id]);
      return syncGrille(conn, grilleId);
    });
    if (!out) return res.status(404).json({ message: "Erreur introuvable." });
    return res.status(200).json({ ...out, message: "Erreur réactivée." });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors de la réactivation." }); }
};

module.exports = {
  getAllGrilles, getGrilleDetail, addGrille, updateGrille, deleteGrille, changeMode, activerGrille, desactiverGrille,
  addCategorie, updateCategorie, deleteCategorie, archiverCategorie, reactiverCategorie,
  addSousCategorie, updateSousCategorie, deleteSousCategorie, archiverSousCategorie, reactiverSousCategorie,
  addErreur, updateErreur, deleteErreur, archiverErreur, reactiverErreur,
};
