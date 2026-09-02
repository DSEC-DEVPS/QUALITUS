// =====================================================================
// Controllers Evaluation - Phase 1 : fondations
//  Contexte (liste de valeurs), Evaluateurs, Agents a evaluer (+ import)
// =====================================================================
const db = require("../config/db");
const XLSX = require("xlsx");

/* ------------------------------------------------------------------ */
/* CONTEXTE (liste de valeurs parametrable)                            */
/* ------------------------------------------------------------------ */

const getAllContexte = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT id, libelle, Etat, dateCreation FROM B_EV_CONTEXTE ORDER BY libelle`
    );
    return res.status(200).send(rows);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

const addContexte = async (req, res, next) => {
  const { libelle } = req.body;
  if (!libelle) {
    return res.status(403).json({ message: "Merci de bien renseigner les parametres" });
  }
  try {
    const [r] = await db.query(
      `INSERT INTO B_EV_CONTEXTE (libelle, Etat, dateCreation) VALUES (?,?,?)`,
      [libelle, "ACTIF", new Date()]
    );
    return res.status(201).json({ message: "Contexte ajoute", id: r.insertId });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

const updateContexte = async (req, res, next) => {
  const { id } = req.params;
  const { libelle, Etat } = req.body;
  if (!id || !libelle) {
    return res.status(403).json({ message: "Merci de bien renseigner les parametres" });
  }
  try {
    await db.query(
      `UPDATE B_EV_CONTEXTE SET libelle=?, Etat=?, dateModification=? WHERE id=?`,
      [libelle, Etat || "ACTIF", new Date(), id]
    );
    return res.status(201).json({ message: "Contexte modifie" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

const deleteContexte = async (req, res, next) => {
  const { id } = req.params;
  if (!id) {
    return res.status(403).json({ message: "Merci de bien renseigner les parametres" });
  }
  try {
    await db.query(`DELETE FROM B_EV_CONTEXTE WHERE id=?`, [id]);
    return res.status(201).json({ message: "Contexte supprime" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

/* ------------------------------------------------------------------ */
/* EVALUATEURS                                                         */
/* ------------------------------------------------------------------ */

const getAllEvaluateur = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT e.id, e.nom, e.prenom, e.email, e.login, e.id_Site,
              s.nom AS site_nom, e.Etat, e.dateCreation
       FROM B_EV_EVALUATEUR e
       LEFT JOIN B_SITE s ON s.id = e.id_Site
       ORDER BY e.id DESC`
    );
    return res.status(200).send(rows);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

const addEvaluateur = async (req, res, next) => {
  const { nom, prenom, email, login, id_Site } = req.body;
  if (!nom || !id_Site) {
    return res.status(403).json({ message: "Nom et site sont obligatoires" });
  }
  try {
    const [r] = await db.query(
      `INSERT INTO B_EV_EVALUATEUR (nom, prenom, email, login, id_Site, Etat, dateCreation)
       VALUES (?,?,?,?,?,?,?)`,
      [nom, prenom || null, email || null, login || null, id_Site, "ACTIF", new Date()]
    );
    return res.status(201).json({ message: "Evaluateur ajoute", id: r.insertId });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

const updateEvaluateur = async (req, res, next) => {
  const { id } = req.params;
  const { nom, prenom, email, login, id_Site, Etat } = req.body;
  if (!id || !nom || !id_Site) {
    return res.status(403).json({ message: "Nom et site sont obligatoires" });
  }
  try {
    await db.query(
      `UPDATE B_EV_EVALUATEUR SET nom=?, prenom=?, email=?, login=?, id_Site=?, Etat=?, dateModification=? WHERE id=?`,
      [nom, prenom || null, email || null, login || null, id_Site, Etat || "ACTIF", new Date(), id]
    );
    return res.status(201).json({ message: "Evaluateur modifie" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

const deleteEvaluateur = async (req, res, next) => {
  const { id } = req.params;
  if (!id) {
    return res.status(403).json({ message: "Merci de bien renseigner les parametres" });
  }
  try {
    await db.query(`DELETE FROM B_EV_EVALUATEUR WHERE id=?`, [id]);
    return res.status(201).json({ message: "Evaluateur supprime" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

/* ------------------------------------------------------------------ */
/* AGENTS A EVALUER (roster)                                           */
/* ------------------------------------------------------------------ */

const getAllAgent = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT a.id, a.nom, a.prenom, a.login_genesys, a.id_CategorieRessource,
              cr.nom AS type_nom, a.id_Site, s.nom AS site_nom, a.Etat, a.dateCreation
       FROM B_EV_AGENT a
       LEFT JOIN B_CATEGORIE_RESSOURCE cr ON cr.id = a.id_CategorieRessource
       LEFT JOIN B_SITE s ON s.id = a.id_Site
       ORDER BY a.id DESC`
    );
    return res.status(200).send(rows);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

const addAgent = async (req, res, next) => {
  const { nom, prenom, login_genesys, id_CategorieRessource, id_Site } = req.body;
  if (!nom || !login_genesys) {
    return res.status(403).json({ message: "Nom et login genesys sont obligatoires" });
  }
  try {
    const [r] = await db.query(
      `INSERT INTO B_EV_AGENT (nom, prenom, login_genesys, id_CategorieRessource, id_Site, Etat, dateCreation)
       VALUES (?,?,?,?,?,?,?)`,
      [nom, prenom || null, login_genesys, id_CategorieRessource || null, id_Site || null, "ACTIF", new Date()]
    );
    return res.status(201).json({ message: "Agent ajoute", id: r.insertId });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

const updateAgent = async (req, res, next) => {
  const { id } = req.params;
  const { nom, prenom, login_genesys, id_CategorieRessource, id_Site, Etat } = req.body;
  if (!id || !nom || !login_genesys) {
    return res.status(403).json({ message: "Nom et login genesys sont obligatoires" });
  }
  try {
    await db.query(
      `UPDATE B_EV_AGENT SET nom=?, prenom=?, login_genesys=?, id_CategorieRessource=?, id_Site=?, Etat=?, dateModification=? WHERE id=?`,
      [nom, prenom || null, login_genesys, id_CategorieRessource || null, id_Site || null, Etat || "ACTIF", new Date(), id]
    );
    return res.status(201).json({ message: "Agent modifie" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

const deleteAgent = async (req, res, next) => {
  const { id } = req.params;
  if (!id) {
    return res.status(403).json({ message: "Merci de bien renseigner les parametres" });
  }
  try {
    await db.query(`DELETE FROM B_EV_AGENT WHERE id=?`, [id]);
    return res.status(201).json({ message: "Agent supprime" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

// Import Excel d'agents. Colonnes attendues (1ere ligne = entete) :
// Nom | Prenom | Login | Type | Site   (Type/Site rapproches par libelle, insensible casse)
const importAgents = async (req, res, next) => {
  if (!req.file) {
    return res.status(403).json({ message: "Aucun fichier Excel fourni" });
  }
  let workbook;
  try {
    workbook = XLSX.read(req.file.buffer, { type: "buffer" });
  } catch (e) {
    return res.status(400).json({ message: "Fichier Excel illisible" });
  }
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  const connection = await db.getConnection();
  try {
    // Tables de correspondance type / site (par libelle)
    const [cats] = await connection.query(`SELECT id, nom FROM B_CATEGORIE_RESSOURCE`);
    const [sites] = await connection.query(`SELECT id, nom FROM B_SITE`);
    const norm = s => String(s || "").trim().toLowerCase();
    const catMap = new Map(cats.map(c => [norm(c.nom), c.id]));
    const siteMap = new Map(sites.map(s => [norm(s.nom), s.id]));

    await connection.beginTransaction();
    const now = new Date();
    let nb = 0;
    for (const r of rows) {
      const nom = String(r.Nom || r.nom || "").trim();
      const login = String(r.Login || r.login || r["Login genesys"] || "").trim();
      if (!nom || !login) continue;
      const prenom = String(r.Prenom || r["Prénom"] || r.prenom || "").trim() || null;
      const idCat = catMap.get(norm(r.Type || r.type)) || null;
      const idSite = siteMap.get(norm(r.Site || r.site)) || null;
      await connection.query(
        `INSERT INTO B_EV_AGENT (nom, prenom, login_genesys, id_CategorieRessource, id_Site, Etat, dateCreation)
         VALUES (?,?,?,?,?,?,?)`,
        [nom, prenom, login, idCat, idSite, "ACTIF", now]
      );
      nb++;
    }
    await connection.commit();
    return res.status(201).json({ message: `Import reussi : ${nb} agent(s)`, nb });
  } catch (error) {
    await connection.rollback();
    console.log(error);
    res.status(500).json({ message: "Echec de l'import Excel" });
  } finally {
    connection.release();
  }
};

/* ================================================================== */
/* PHASE 2 - CREATION + EXECUTION DES EVALUATIONS                      */
/* ================================================================== */

// Determine la grille (modele Calibrage) associee au type de l'agent.
const resoudreGrilleAgent = async (executor, idAgent) => {
  const [rows] = await executor.query(
    `SELECT mg.id
     FROM B_EV_AGENT a
     JOIN B_MG_CATEGORIE_RESSOURCE mcr ON mcr.id_CategorieRessource = a.id_CategorieRessource
     JOIN B_MODELE_GRILLE mg ON mg.id = mcr.id_ModeleGrille AND mg.Etat = 'ACTIF'
     WHERE a.id = ?
     ORDER BY mg.id DESC
     LIMIT 1`,
    [idAgent]
  );
  return rows.length ? rows[0].id : null;
};

// Charge l'arbre complet d'un modele de grille (categories>erreurs>items>sous-items)
const chargerGrilleTree = async (idModele) => {
  const [categories] = await db.query(
    `SELECT id, nom, poids, ordre FROM B_MG_CATEGORIE_ERREUR WHERE id_ModeleGrille=? ORDER BY ordre, id`,
    [idModele]
  );
  const [erreurs] = await db.query(
    `SELECT e.id, e.id_CategorieErreur, e.nom, e.poids, e.ordre FROM B_MG_ERREUR e
     JOIN B_MG_CATEGORIE_ERREUR c ON c.id=e.id_CategorieErreur WHERE c.id_ModeleGrille=? ORDER BY e.ordre, e.id`,
    [idModele]
  );
  const [items] = await db.query(
    `SELECT i.id, i.id_Erreur, i.nom, i.poids, i.ordre FROM B_MG_ITEM i
     JOIN B_MG_ERREUR e ON e.id=i.id_Erreur JOIN B_MG_CATEGORIE_ERREUR c ON c.id=e.id_CategorieErreur
     WHERE c.id_ModeleGrille=? ORDER BY i.ordre, i.id`,
    [idModele]
  );
  const [sousItems] = await db.query(
    `SELECT s.id, s.id_Item, s.nom, s.referentiel, s.poids, s.ordre FROM B_MG_SOUS_ITEM s
     JOIN B_MG_ITEM i ON i.id=s.id_Item JOIN B_MG_ERREUR e ON e.id=i.id_Erreur
     JOIN B_MG_CATEGORIE_ERREUR c ON c.id=e.id_CategorieErreur WHERE c.id_ModeleGrille=? ORDER BY s.ordre, s.id`,
    [idModele]
  );
  const siByItem = {};
  for (const s of sousItems) (siByItem[s.id_Item] = siByItem[s.id_Item] || []).push(s);
  const itByErr = {};
  for (const it of items) { it.sousItems = siByItem[it.id] || []; (itByErr[it.id_Erreur] = itByErr[it.id_Erreur] || []).push(it); }
  const errByCat = {};
  for (const e of erreurs) { e.items = itByErr[e.id] || []; (errByCat[e.id_CategorieErreur] = errByCat[e.id_CategorieErreur] || []).push(e); }
  for (const c of categories) c.erreurs = errByCat[c.id] || [];
  return categories;
};

const getAllEvaluation = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT ev.id, ev.id_appel, ev.n_case, ev.date_appel, ev.motif_appel,
              ev.statut, ev.conclusion, ev.score_global, ev.resolution, ev.actif, ev.date_creation,
              a.nom AS agent_nom, a.prenom AS agent_prenom, a.login_genesys,
              c.libelle AS contexte, mg.nom AS grille_nom
       FROM B_EV_EVALUATION ev
       LEFT JOIN B_EV_AGENT a ON a.id = ev.id_Agent
       LEFT JOIN B_EV_CONTEXTE c ON c.id = ev.id_Contexte
       LEFT JOIN B_MODELE_GRILLE mg ON mg.id = ev.id_ModeleGrille
       ORDER BY ev.id DESC`
    );
    return res.status(200).send(rows);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

const getOneEvaluation = async (req, res, next) => {
  const { id } = req.params;
  try {
    const [evRows] = await db.query(
      `SELECT ev.*, a.nom AS agent_nom, a.prenom AS agent_prenom, a.login_genesys,
              c.libelle AS contexte, mg.nom AS grille_nom
       FROM B_EV_EVALUATION ev
       LEFT JOIN B_EV_AGENT a ON a.id = ev.id_Agent
       LEFT JOIN B_EV_CONTEXTE c ON c.id = ev.id_Contexte
       LEFT JOIN B_MODELE_GRILLE mg ON mg.id = ev.id_ModeleGrille
       WHERE ev.id = ?`,
      [id]
    );
    if (!evRows.length) {
      return res.status(404).json({ message: "Evaluation introuvable" });
    }
    const evaluation = evRows[0];
    evaluation.grille = evaluation.id_ModeleGrille
      ? await chargerGrilleTree(evaluation.id_ModeleGrille)
      : [];
    const [resultats] = await db.query(
      `SELECT id_SousItem, conforme, commentaire FROM B_EV_RESULTAT WHERE id_Evaluation=?`,
      [id]
    );
    evaluation.resultats = resultats;
    return res.status(200).send(evaluation);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

const addEvaluation = async (req, res, next) => {
  const { id_Contexte, id_Agent, id_Evaluateur, id_appel, n_case, date_appel, dmt, motif_appel } = req.body;
  if (!id_Agent) {
    return res.status(403).json({ message: "L'agent est obligatoire" });
  }
  try {
    const id_ModeleGrille = await resoudreGrilleAgent(db, id_Agent);
    const [r] = await db.query(
      `INSERT INTO B_EV_EVALUATION
        (id_Contexte, id_Agent, id_ModeleGrille, id_appel, n_case, date_appel, dmt, motif_appel,
         statut, actif, id_createur, id_Evaluateur, date_creation)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        id_Contexte || null, id_Agent, id_ModeleGrille,
        id_appel || null, n_case || null, date_appel || null, dmt || null, motif_appel || null,
        "NON_TERMINE", 1, req.auth ? req.auth.userId : null, id_Evaluateur || null, new Date(),
      ]
    );
    return res.status(201).json({
      message: "Evaluation creee",
      id: r.insertId,
      id_ModeleGrille,
      grille_manquante: !id_ModeleGrille,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

// Creation en masse : une evaluation par agent selectionne (memes champs communs)
const addEvaluationMasse = async (req, res, next) => {
  const { agents, id_Contexte, id_appel, n_case, date_appel, dmt, motif_appel } = req.body;
  if (!Array.isArray(agents) || !agents.length) {
    return res.status(403).json({ message: "Aucun agent selectionne" });
  }
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const now = new Date();
    let nb = 0;
    for (const idAgent of agents) {
      const idModele = await resoudreGrilleAgent(connection, idAgent);
      await connection.query(
        `INSERT INTO B_EV_EVALUATION
          (id_Contexte, id_Agent, id_ModeleGrille, id_appel, n_case, date_appel, dmt, motif_appel,
           statut, actif, id_createur, date_creation)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [id_Contexte || null, idAgent, idModele, id_appel || null, n_case || null,
         date_appel || null, dmt || null, motif_appel || null, "NON_TERMINE", 1,
         req.auth ? req.auth.userId : null, now]
      );
      nb++;
    }
    await connection.commit();
    return res.status(201).json({ message: `${nb} evaluation(s) creee(s)`, nb });
  } catch (error) {
    await connection.rollback();
    console.log(error);
    res.status(500).json({ message: "Error request" });
  } finally {
    connection.release();
  }
};

const updateEvaluation = async (req, res, next) => {
  const { id } = req.params;
  const { id_Contexte, id_appel, n_case, date_appel, dmt, motif_appel } = req.body;
  try {
    await db.query(
      `UPDATE B_EV_EVALUATION SET id_Contexte=?, id_appel=?, n_case=?, date_appel=?, dmt=?, motif_appel=?, date_modification=?
       WHERE id=? AND statut='NON_TERMINE'`,
      [id_Contexte || null, id_appel || null, n_case || null, date_appel || null, dmt || null, motif_appel || null, new Date(), id]
    );
    return res.status(201).json({ message: "Evaluation modifiee" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

// Activer / desactiver une ou plusieurs evaluations
const setActifEvaluation = async (req, res, next) => {
  const { ids, actif } = req.body;
  if (!Array.isArray(ids) || !ids.length || (actif !== 0 && actif !== 1)) {
    return res.status(403).json({ message: "Parametres invalides" });
  }
  try {
    const placeholders = ids.map(() => "?").join(",");
    await db.query(
      `UPDATE B_EV_EVALUATION SET actif=?, date_modification=? WHERE id IN (${placeholders})`,
      [actif, new Date(), ...ids]
    );
    return res.status(201).json({ message: actif ? "Evaluation(s) activee(s)" : "Evaluation(s) desactivee(s)" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

const deleteEvaluation = async (req, res, next) => {
  const { id } = req.params;
  try {
    await db.query(`DELETE FROM B_EV_EVALUATION WHERE id=?`, [id]);
    return res.status(201).json({ message: "Evaluation supprimee" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

const compare = (score, op, val) => {
  if (val === null || val === undefined) return true;
  switch (op) {
    case ">=": return score >= val;
    case "<": return score < val;
    case "<=": return score <= val;
    case "=": return score === val;
    case ">":
    default: return score > val;
  }
};

// Terminer l'execution : evalue la conformite, calcule la conclusion Succes/Echec
const terminerEvaluation = async (req, res, next) => {
  const { id } = req.params;
  const { resolution, resultats } = req.body; // resultats: [{id_SousItem, conforme, commentaire}]
  if (!id || !Array.isArray(resultats)) {
    return res.status(403).json({ message: "Parametres invalides" });
  }
  const connection = await db.getConnection();
  try {
    const [evRows] = await connection.query(
      `SELECT id, id_ModeleGrille, id_Agent, id_createur, statut FROM B_EV_EVALUATION WHERE id=?`,
      [id]
    );
    if (!evRows.length) { connection.release(); return res.status(404).json({ message: "Evaluation introuvable" }); }
    const idModele = evRows[0].id_ModeleGrille;
    if (!idModele) { connection.release(); return res.status(400).json({ message: "Aucune grille associee a cette evaluation" }); }

    // Sous-items rattaches a leur categorie
    const [sousItems] = await connection.query(
      `SELECT s.id AS id_sous_item, s.poids AS poids_si, cat.id AS id_cat, cat.nom AS cat_nom, cat.poids AS poids_cat
       FROM B_MG_SOUS_ITEM s
       JOIN B_MG_ITEM it ON it.id=s.id_Item JOIN B_MG_ERREUR e ON e.id=it.id_Erreur
       JOIN B_MG_CATEGORIE_ERREUR cat ON cat.id=e.id_CategorieErreur
       WHERE cat.id_ModeleGrille=?`,
      [idModele]
    );
    const conformeMap = {};
    for (const r of resultats) conformeMap[r.id_SousItem] = r.conforme ? 1 : 0;

    // Agregation par categorie (ponderee par poids sous-item, fallback compte)
    const cats = {};
    for (const si of sousItems) {
      const c = (cats[si.id_cat] = cats[si.id_cat] || {
        nom: si.cat_nom, poids_cat: Number(si.poids_cat) || 0,
        totalP: 0, conformeP: 0, total: 0, conforme: 0,
      });
      const conforme = si.id_sous_item in conformeMap ? conformeMap[si.id_sous_item] : 1;
      const p = Number(si.poids_si) || 0;
      c.totalP += p; c.conformeP += conforme ? p : 0;
      c.total += 1; c.conforme += conforme ? 1 : 0;
    }
    const scoreCat = {};
    for (const idc of Object.keys(cats)) {
      const c = cats[idc];
      scoreCat[idc] = c.totalP > 0 ? (100 * c.conformeP) / c.totalP : (c.total > 0 ? (100 * c.conforme) / c.total : 100);
    }

    // Criteres reussite/echec
    const [criteres] = await connection.query(
      `SELECT type_ecart, operateur, valeur_objectif FROM B_MG_CRITERE_REGLE WHERE id_ModeleGrille=?`,
      [idModele]
    );
    const details = [];
    let conclusion = "SUCCES";
    if (criteres.length) {
      for (const cr of criteres) {
        const entry = Object.entries(cats).find(
          ([, v]) => v.nom.trim().toLowerCase() === String(cr.type_ecart).trim().toLowerCase()
        );
        if (!entry) continue;
        const idc = entry[0];
        const sc = Math.round(scoreCat[idc] * 100) / 100;
        const ok = compare(sc, cr.operateur, cr.valeur_objectif == null ? null : Number(cr.valeur_objectif));
        if (!ok) conclusion = "ECHEC";
        details.push({ categorie: cr.type_ecart, score: sc, operateur: cr.operateur, objectif: cr.valeur_objectif, reussi: ok });
      }
    } else {
      // Pas de criteres : succes si tout est conforme
      const totalNonConforme = Object.values(cats).reduce((n, c) => n + (c.total - c.conforme), 0);
      conclusion = totalNonConforme === 0 ? "SUCCES" : "ECHEC";
      for (const idc of Object.keys(cats)) {
        details.push({ categorie: cats[idc].nom, score: Math.round(scoreCat[idc] * 100) / 100, operateur: null, objectif: null, reussi: cats[idc].conforme === cats[idc].total });
      }
    }

    // Score global pondere par le poids des categories (fallback moyenne)
    let sumP = 0, sumWS = 0, sumS = 0, nC = 0;
    for (const idc of Object.keys(cats)) {
      const c = cats[idc];
      sumP += c.poids_cat; sumWS += c.poids_cat * scoreCat[idc]; sumS += scoreCat[idc]; nC++;
    }
    const scoreGlobal = sumP > 0 ? Math.round((sumWS / sumP) * 100) / 100 : (nC > 0 ? Math.round((sumS / nC) * 100) / 100 : 0);

    await connection.beginTransaction();
    await connection.query(`DELETE FROM B_EV_RESULTAT WHERE id_Evaluation=?`, [id]);
    for (const si of sousItems) {
      const conforme = si.id_sous_item in conformeMap ? conformeMap[si.id_sous_item] : 1;
      const r = resultats.find(x => x.id_SousItem === si.id_sous_item);
      await connection.query(
        `INSERT INTO B_EV_RESULTAT (id_Evaluation, id_SousItem, conforme, commentaire) VALUES (?,?,?,?)`,
        [id, si.id_sous_item, conforme, (r && r.commentaire) || null]
      );
    }
    await connection.query(
      `UPDATE B_EV_EVALUATION SET resolution=?, conclusion=?, score_global=?, statut='TERMINE', date_execution=?, date_modification=? WHERE id=?`,
      [resolution || null, conclusion, scoreGlobal, new Date(), new Date(), id]
    );

    // Notification in-app du resultat : evaluateur + superviseurs.
    // (Point d'accroche : un envoi email pourra etre branche ici plus tard.)
    const [agentRows] = await connection.query(`SELECT nom, prenom FROM B_EV_AGENT WHERE id=?`, [evRows[0].id_Agent]);
    const agentNom = agentRows.length ? `${agentRows[0].nom} ${agentRows[0].prenom || ""}`.trim() : "agent";
    const [sups] = await connection.query(
      `SELECT u.id FROM B_UTILISATEUR u JOIN B_FONCTION f ON u.id_Fonction=f.id WHERE f.Role_Associe='R_SUP' AND u.status='ACTIF'`
    );
    const destinataires = new Set();
    if (evRows[0].id_createur) destinataires.add(evRows[0].id_createur);
    for (const s of sups) destinataires.add(s.id);
    const msgNotif = `Evaluation de ${agentNom} terminee : ${conclusion} (${scoreGlobal}%)`;
    for (const uid of destinataires) {
      await connection.query(
        `INSERT INTO B_EV_NOTIFICATION (id_Evaluation, id_UTILISATEUR, titre, message, lu, dateCreation) VALUES (?,?,?,?,?,?)`,
        [id, uid, "Resultat evaluation", msgNotif, 0, new Date()]
      );
    }

    await connection.commit();

    return res.status(201).json({
      message: "Evaluation terminee",
      conclusion, score_global: scoreGlobal, resolution: resolution || null, details,
    });
  } catch (error) {
    try { await connection.rollback(); } catch (e) {}
    console.log(error);
    res.status(500).json({ message: "Error request" });
  } finally {
    connection.release();
  }
};

/* ================================================================== */
/* PHASE 3 - SUIVI & COACHING                                          */
/* ================================================================== */

/* ----- Coaching (cause racine + 5 pourquoi) ----- */
const getCoaching = async (req, res, next) => {
  const { idEvaluation } = req.params;
  try {
    const [rows] = await db.query(`SELECT * FROM B_EV_COACHING WHERE id_Evaluation=?`, [idEvaluation]);
    return res.status(200).send(rows.length ? rows[0] : null);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

const saveCoaching = async (req, res, next) => {
  const { idEvaluation } = req.params;
  const { cause_racine, pourquoi1, pourquoi2, pourquoi3, pourquoi4, pourquoi5 } = req.body;
  try {
    const now = new Date();
    const [ex] = await db.query(`SELECT id FROM B_EV_COACHING WHERE id_Evaluation=?`, [idEvaluation]);
    if (ex.length) {
      await db.query(
        `UPDATE B_EV_COACHING SET cause_racine=?, pourquoi1=?, pourquoi2=?, pourquoi3=?, pourquoi4=?, pourquoi5=?, dateModification=? WHERE id_Evaluation=?`,
        [cause_racine || null, pourquoi1 || null, pourquoi2 || null, pourquoi3 || null, pourquoi4 || null, pourquoi5 || null, now, idEvaluation]
      );
    } else {
      await db.query(
        `INSERT INTO B_EV_COACHING (id_Evaluation, cause_racine, pourquoi1, pourquoi2, pourquoi3, pourquoi4, pourquoi5, id_createur, dateCreation)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [idEvaluation, cause_racine || null, pourquoi1 || null, pourquoi2 || null, pourquoi3 || null, pourquoi4 || null, pourquoi5 || null, req.auth ? req.auth.userId : null, now]
      );
    }
    return res.status(201).json({ message: "Coaching enregistre" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

/* ----- Types d'action (parametrable) ----- */
const getAllActionType = async (req, res, next) => {
  try {
    const [rows] = await db.query(`SELECT id, libelle, Etat FROM B_EV_ACTION_TYPE ORDER BY libelle`);
    return res.status(200).send(rows);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};
const addActionType = async (req, res, next) => {
  const { libelle } = req.body;
  if (!libelle) return res.status(403).json({ message: "Libelle obligatoire" });
  try {
    const [r] = await db.query(`INSERT INTO B_EV_ACTION_TYPE (libelle, Etat, dateCreation) VALUES (?,?,?)`, [libelle, "ACTIF", new Date()]);
    return res.status(201).json({ message: "Type d'action ajoute", id: r.insertId });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};
const updateActionType = async (req, res, next) => {
  const { id } = req.params;
  const { libelle, Etat } = req.body;
  if (!id || !libelle) return res.status(403).json({ message: "Libelle obligatoire" });
  try {
    await db.query(`UPDATE B_EV_ACTION_TYPE SET libelle=?, Etat=? WHERE id=?`, [libelle, Etat || "ACTIF", id]);
    return res.status(201).json({ message: "Type d'action modifie" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};
const deleteActionType = async (req, res, next) => {
  const { id } = req.params;
  try {
    await db.query(`DELETE FROM B_EV_ACTION_TYPE WHERE id=?`, [id]);
    return res.status(201).json({ message: "Type d'action supprime" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

/* ----- Plan d'action correctif ----- */
const getActionsByEvaluation = async (req, res, next) => {
  const { idEvaluation } = req.params;
  try {
    const [rows] = await db.query(
      `SELECT a.*, t.libelle AS type_libelle FROM B_EV_ACTION a
       LEFT JOIN B_EV_ACTION_TYPE t ON t.id = a.id_ActionType
       WHERE a.id_Evaluation=? ORDER BY a.id`,
      [idEvaluation]
    );
    return res.status(200).send(rows);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};
const addAction = async (req, res, next) => {
  const { id_Evaluation, id_ActionType, action_libelle, porteur, contributeurs, date_debut, date_attendue, date_realisation, statut, kpi, commentaire } = req.body;
  if (!id_Evaluation) return res.status(403).json({ message: "Evaluation obligatoire" });
  try {
    const [r] = await db.query(
      `INSERT INTO B_EV_ACTION (id_Evaluation, id_ActionType, action_libelle, porteur, contributeurs, date_debut, date_attendue, date_realisation, statut, kpi, commentaire, dateCreation)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id_Evaluation, id_ActionType || null, action_libelle || null, porteur || null, contributeurs || null,
       date_debut || null, date_attendue || null, date_realisation || null, statut || "A_FAIRE", kpi || null, commentaire || null, new Date()]
    );
    return res.status(201).json({ message: "Action ajoutee", id: r.insertId });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};
const updateAction = async (req, res, next) => {
  const { id } = req.params;
  const { id_ActionType, action_libelle, porteur, contributeurs, date_debut, date_attendue, date_realisation, statut, kpi, commentaire } = req.body;
  try {
    await db.query(
      `UPDATE B_EV_ACTION SET id_ActionType=?, action_libelle=?, porteur=?, contributeurs=?, date_debut=?, date_attendue=?, date_realisation=?, statut=?, kpi=?, commentaire=?, dateModification=? WHERE id=?`,
      [id_ActionType || null, action_libelle || null, porteur || null, contributeurs || null,
       date_debut || null, date_attendue || null, date_realisation || null, statut || "A_FAIRE", kpi || null, commentaire || null, new Date(), id]
    );
    return res.status(201).json({ message: "Action modifiee" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};
const deleteAction = async (req, res, next) => {
  const { id } = req.params;
  try {
    await db.query(`DELETE FROM B_EV_ACTION WHERE id=?`, [id]);
    return res.status(201).json({ message: "Action supprimee" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

/* ----- Notifications de resultat (in-app) ----- */
const getMesNotificationsEval = async (req, res, next) => {
  const userId = req.auth ? req.auth.userId : null;
  try {
    const [rows] = await db.query(
      `SELECT id, id_Evaluation, titre, message, lu, dateCreation FROM B_EV_NOTIFICATION
       WHERE id_UTILISATEUR=? ORDER BY id DESC`,
      [userId]
    );
    return res.status(200).send(rows);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};
const marquerNotifEvalLu = async (req, res, next) => {
  const { id } = req.params;
  const userId = req.auth ? req.auth.userId : null;
  try {
    await db.query(`UPDATE B_EV_NOTIFICATION SET lu=1 WHERE id=? AND id_UTILISATEUR=?`, [id, userId]);
    return res.status(201).json({ message: "Notification lue" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};
const marquerToutNotifEvalLu = async (req, res, next) => {
  const userId = req.auth ? req.auth.userId : null;
  try {
    await db.query(`UPDATE B_EV_NOTIFICATION SET lu=1 WHERE id_UTILISATEUR=?`, [userId]);
    return res.status(201).json({ message: "Toutes les notifications sont lues" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

/* ----- Rapport "agents en pole" (echecs repetes / erreurs critiques) ----- */
const getRapportAgentsPole = async (req, res, next) => {
  try {
    // Echecs (evaluations terminees, actives, conclusion ECHEC)
    const [echecs] = await db.query(
      `SELECT ev.id, ev.id_Agent, a.nom, a.prenom, a.login_genesys,
              DATE_FORMAT(ev.date_execution, '%Y-%m') AS mois
       FROM B_EV_EVALUATION ev JOIN B_EV_AGENT a ON a.id = ev.id_Agent
       WHERE ev.statut='TERMINE' AND ev.actif=1 AND ev.conclusion='ECHEC' AND ev.date_execution IS NOT NULL`
    );
    // Evaluations avec >=3 erreurs critiques (sous-items non conformes de categories "CRITIQUE")
    const [transCrit] = await db.query(
      `SELECT ev.id, ev.id_Agent, COUNT(*) AS nb_crit
       FROM B_EV_EVALUATION ev
       JOIN B_EV_RESULTAT r ON r.id_Evaluation = ev.id AND r.conforme = 0
       JOIN B_MG_SOUS_ITEM si ON si.id = r.id_SousItem
       JOIN B_MG_ITEM it ON it.id = si.id_Item
       JOIN B_MG_ERREUR e ON e.id = it.id_Erreur
       JOIN B_MG_CATEGORIE_ERREUR cat ON cat.id = e.id_CategorieErreur
       WHERE ev.statut='TERMINE' AND ev.actif=1 AND UPPER(cat.nom) LIKE '%CRITIQUE%'
       GROUP BY ev.id, ev.id_Agent
       HAVING nb_crit >= 3`
    );

    const agents = {};
    const getA = (id, info) => (agents[id] = agents[id] || {
      id_Agent: id, nom: info.nom, prenom: info.prenom, login_genesys: info.login_genesys,
      nb_echecs: 0, mois: new Set(), moisCount: {}, motifs: new Set(), transactions_critiques: 0,
    });

    for (const r of echecs) {
      const a = getA(r.id_Agent, r);
      a.nb_echecs++;
      if (r.mois) { a.mois.add(r.mois); a.moisCount[r.mois] = (a.moisCount[r.mois] || 0) + 1; }
    }
    for (const t of transCrit) {
      const a = agents[t.id_Agent] || getA(t.id_Agent, { nom: "", prenom: "", login_genesys: "" });
      a.transactions_critiques += 1;
      a.motifs.add("3+ erreurs critiques sur une transaction");
    }

    const moisConsecutifs = (moisSet) => {
      const arr = [...moisSet].sort();
      for (let i = 0; i < arr.length - 1; i++) {
        const [y1, m1] = arr[i].split("-").map(Number);
        for (let j = i + 1; j < arr.length; j++) {
          const [y2, m2] = arr[j].split("-").map(Number);
          if (y1 * 12 + m1 + 1 === y2 * 12 + m2) return true;
        }
      }
      return false;
    };

    const resultat = [];
    for (const id of Object.keys(agents)) {
      const a = agents[id];
      if (Object.values(a.moisCount).some(c => c >= 2)) a.motifs.add("2+ echecs sur le meme mois");
      if (moisConsecutifs(a.mois)) a.motifs.add("Echec sur 2 mois consecutifs");
      if (a.motifs.size > 0) {
        resultat.push({
          id_Agent: a.id_Agent, nom: a.nom, prenom: a.prenom, login_genesys: a.login_genesys,
          nb_echecs: a.nb_echecs, transactions_critiques: a.transactions_critiques,
          mois: [...a.mois].sort(), motifs: [...a.motifs],
        });
      }
    }
    resultat.sort((x, y) => y.nb_echecs - x.nb_echecs);
    return res.status(200).send(resultat);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

/* ================================================================== */
/* PHASE 4 - CONTRE-EVALUATIONS                                        */
/* ================================================================== */

// Helper de scoring reutilisable (conclusion Succes/Echec + score global)
// a partir d'une map { id_SousItem: 0|1 } et de la grille (id_ModeleGrille).
const evaluerConformite = async (executor, idModele, conformeMap) => {
  const [sousItems] = await executor.query(
    `SELECT s.id AS id_sous_item, s.poids AS poids_si, cat.id AS id_cat, cat.nom AS cat_nom, cat.poids AS poids_cat
     FROM B_MG_SOUS_ITEM s
     JOIN B_MG_ITEM it ON it.id=s.id_Item JOIN B_MG_ERREUR e ON e.id=it.id_Erreur
     JOIN B_MG_CATEGORIE_ERREUR cat ON cat.id=e.id_CategorieErreur
     WHERE cat.id_ModeleGrille=?`,
    [idModele]
  );
  const cats = {};
  for (const si of sousItems) {
    const c = (cats[si.id_cat] = cats[si.id_cat] || {
      nom: si.cat_nom, poids_cat: Number(si.poids_cat) || 0, totalP: 0, conformeP: 0, total: 0, conforme: 0,
    });
    const conforme = si.id_sous_item in conformeMap ? conformeMap[si.id_sous_item] : 1;
    const p = Number(si.poids_si) || 0;
    c.totalP += p; c.conformeP += conforme ? p : 0;
    c.total += 1; c.conforme += conforme ? 1 : 0;
  }
  const scoreCat = {};
  for (const idc of Object.keys(cats)) {
    const c = cats[idc];
    scoreCat[idc] = c.totalP > 0 ? (100 * c.conformeP) / c.totalP : (c.total > 0 ? (100 * c.conforme) / c.total : 100);
  }
  const [criteres] = await executor.query(
    `SELECT type_ecart, operateur, valeur_objectif FROM B_MG_CRITERE_REGLE WHERE id_ModeleGrille=?`,
    [idModele]
  );
  const details = [];
  let conclusion = "SUCCES";
  if (criteres.length) {
    for (const cr of criteres) {
      const entry = Object.entries(cats).find(([, v]) => v.nom.trim().toLowerCase() === String(cr.type_ecart).trim().toLowerCase());
      if (!entry) continue;
      const sc = Math.round(scoreCat[entry[0]] * 100) / 100;
      const ok = compare(sc, cr.operateur, cr.valeur_objectif == null ? null : Number(cr.valeur_objectif));
      if (!ok) conclusion = "ECHEC";
      details.push({ categorie: cr.type_ecart, score: sc, operateur: cr.operateur, objectif: cr.valeur_objectif, reussi: ok });
    }
  } else {
    const totalNonConforme = Object.values(cats).reduce((n, c) => n + (c.total - c.conforme), 0);
    conclusion = totalNonConforme === 0 ? "SUCCES" : "ECHEC";
  }
  let sumP = 0, sumWS = 0, sumS = 0, nC = 0;
  for (const idc of Object.keys(cats)) {
    sumP += cats[idc].poids_cat; sumWS += cats[idc].poids_cat * scoreCat[idc]; sumS += scoreCat[idc]; nC++;
  }
  const scoreGlobal = sumP > 0 ? Math.round((sumWS / sumP) * 100) / 100 : (nC > 0 ? Math.round((sumS / nC) * 100) / 100 : 0);
  return { conclusion, scoreGlobal, details, sousItems };
};

// Evaluateurs d'un site + nb d'evaluations terminees attribuees
const getEvaluateursBySite = async (req, res, next) => {
  const { idSite } = req.params;
  try {
    const [rows] = await db.query(
      `SELECT e.id, e.nom, e.prenom, e.login, e.id_Site,
              (SELECT COUNT(*) FROM B_EV_EVALUATION ev WHERE ev.id_Evaluateur = e.id AND ev.statut='TERMINE') AS nb_evaluations
       FROM B_EV_EVALUATEUR e WHERE e.id_Site=? AND e.Etat='ACTIF' ORDER BY e.nom`,
      [idSite]
    );
    return res.status(200).send(rows);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

// Evaluations terminees d'un evaluateur (+ indicateur contre-eval existante)
const getEvaluationsByEvaluateur = async (req, res, next) => {
  const { idEvaluateur } = req.params;
  try {
    const [rows] = await db.query(
      `SELECT ev.id, ev.conclusion, ev.score_global, ev.date_execution,
              a.nom AS agent_nom, a.prenom AS agent_prenom, a.login_genesys,
              c.libelle AS contexte,
              (SELECT COUNT(*) FROM B_EV_CONTRE_EVALUATION ce WHERE ce.id_Evaluation = ev.id) AS nb_contre
       FROM B_EV_EVALUATION ev
       LEFT JOIN B_EV_AGENT a ON a.id = ev.id_Agent
       LEFT JOIN B_EV_CONTEXTE c ON c.id = ev.id_Contexte
       WHERE ev.id_Evaluateur=? AND ev.statut='TERMINE'
       ORDER BY ev.id DESC`,
      [idEvaluateur]
    );
    return res.status(200).send(rows);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

// Cree (ou recupere) la contre-evaluation d'une evaluation, puis renvoie son id
const creerContre = async (req, res, next) => {
  const { idEvaluation } = req.params;
  try {
    const [ex] = await db.query(
      `SELECT id FROM B_EV_CONTRE_EVALUATION WHERE id_Evaluation=? AND statut='NON_TERMINE' ORDER BY id DESC LIMIT 1`,
      [idEvaluation]
    );
    if (ex.length) {
      return res.status(200).json({ message: "Contre-evaluation existante", id: ex[0].id });
    }
    const [r] = await db.query(
      `INSERT INTO B_EV_CONTRE_EVALUATION (id_Evaluation, statut, actif, id_createur, date_creation)
       VALUES (?,?,?,?,?)`,
      [idEvaluation, "NON_TERMINE", 1, req.auth ? req.auth.userId : null, new Date()]
    );
    return res.status(201).json({ message: "Contre-evaluation creee", id: r.insertId });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

// Detail d'une contre-evaluation : grille + ancienne conformite (readonly) + nouvelle
const getContre = async (req, res, next) => {
  const { id } = req.params;
  try {
    const [ceRows] = await db.query(
      `SELECT ce.*, ev.id_ModeleGrille, ev.id_Agent, ev.id_appel, ev.dmt,
              a.nom AS agent_nom, a.prenom AS agent_prenom, a.login_genesys,
              mg.nom AS grille_nom
       FROM B_EV_CONTRE_EVALUATION ce
       JOIN B_EV_EVALUATION ev ON ev.id = ce.id_Evaluation
       LEFT JOIN B_EV_AGENT a ON a.id = ev.id_Agent
       LEFT JOIN B_MODELE_GRILLE mg ON mg.id = ev.id_ModeleGrille
       WHERE ce.id=?`,
      [id]
    );
    if (!ceRows.length) return res.status(404).json({ message: "Contre-evaluation introuvable" });
    const contre = ceRows[0];
    contre.grille = contre.id_ModeleGrille ? await chargerGrilleTree(contre.id_ModeleGrille) : [];
    // Ancienne conformite (evaluation initiale)
    const [anciens] = await db.query(`SELECT id_SousItem, conforme FROM B_EV_RESULTAT WHERE id_Evaluation=?`, [contre.id_Evaluation]);
    contre.resultats_anciens = anciens;
    // Nouvelle conformite (contre-eval, si deja saisie)
    const [nouveaux] = await db.query(`SELECT id_SousItem, conforme FROM B_EV_CONTRE_RESULTAT WHERE id_ContreEvaluation=?`, [id]);
    contre.resultats_nouveaux = nouveaux;
    return res.status(200).send(contre);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

// Terminer une contre-evaluation : date de visibilite obligatoire
const terminerContre = async (req, res, next) => {
  const { id } = req.params;
  const { resolution, date_visibilite, resultats } = req.body;
  if (!id || !Array.isArray(resultats)) {
    return res.status(403).json({ message: "Parametres invalides" });
  }
  if (!date_visibilite) {
    return res.status(403).json({ message: "La date de visibilite est obligatoire" });
  }
  const connection = await db.getConnection();
  try {
    const [ceRows] = await connection.query(
      `SELECT ce.id, ev.id_ModeleGrille FROM B_EV_CONTRE_EVALUATION ce
       JOIN B_EV_EVALUATION ev ON ev.id = ce.id_Evaluation WHERE ce.id=?`,
      [id]
    );
    if (!ceRows.length) { connection.release(); return res.status(404).json({ message: "Contre-evaluation introuvable" }); }
    const idModele = ceRows[0].id_ModeleGrille;
    if (!idModele) { connection.release(); return res.status(400).json({ message: "Aucune grille associee" }); }

    const conformeMap = {};
    for (const r of resultats) conformeMap[r.id_SousItem] = r.conforme ? 1 : 0;
    const { conclusion, scoreGlobal, details, sousItems } = await evaluerConformite(connection, idModele, conformeMap);

    await connection.beginTransaction();
    await connection.query(`DELETE FROM B_EV_CONTRE_RESULTAT WHERE id_ContreEvaluation=?`, [id]);
    for (const si of sousItems) {
      const conforme = si.id_sous_item in conformeMap ? conformeMap[si.id_sous_item] : 1;
      await connection.query(
        `INSERT INTO B_EV_CONTRE_RESULTAT (id_ContreEvaluation, id_SousItem, conforme) VALUES (?,?,?)`,
        [id, si.id_sous_item, conforme]
      );
    }
    await connection.query(
      `UPDATE B_EV_CONTRE_EVALUATION SET resolution=?, conclusion=?, score_global=?, date_visibilite=?, statut='TERMINE', date_execution=?, date_modification=? WHERE id=?`,
      [resolution || null, conclusion, scoreGlobal, date_visibilite, new Date(), new Date(), id]
    );
    await connection.commit();
    return res.status(201).json({ message: "Contre-evaluation terminee", conclusion, score_global: scoreGlobal, details });
  } catch (error) {
    try { await connection.rollback(); } catch (e) {}
    console.log(error);
    res.status(500).json({ message: "Error request" });
  } finally {
    connection.release();
  }
};

// Liste des contre-evaluations (pour gestion / desactivation)
const getAllContre = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT ce.id, ce.id_Evaluation, ce.conclusion, ce.score_global, ce.date_visibilite,
              ce.statut, ce.actif, ce.date_creation,
              a.nom AS agent_nom, a.prenom AS agent_prenom, e.nom AS evaluateur_nom, e.prenom AS evaluateur_prenom
       FROM B_EV_CONTRE_EVALUATION ce
       JOIN B_EV_EVALUATION ev ON ev.id = ce.id_Evaluation
       LEFT JOIN B_EV_AGENT a ON a.id = ev.id_Agent
       LEFT JOIN B_EV_EVALUATEUR e ON e.id = ev.id_Evaluateur
       ORDER BY ce.id DESC`
    );
    return res.status(200).send(rows);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

const setActifContre = async (req, res, next) => {
  const { id } = req.params;
  const { actif } = req.body;
  try {
    await db.query(`UPDATE B_EV_CONTRE_EVALUATION SET actif=?, date_modification=? WHERE id=?`, [actif ? 1 : 0, new Date(), id]);
    return res.status(201).json({ message: actif ? "Contre-evaluation activee" : "Contre-evaluation desactivee" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

module.exports = {
  getAllContexte,
  addContexte,
  updateContexte,
  deleteContexte,
  getAllEvaluateur,
  addEvaluateur,
  updateEvaluateur,
  deleteEvaluateur,
  getAllAgent,
  addAgent,
  updateAgent,
  deleteAgent,
  importAgents,
  // Phase 2
  getAllEvaluation,
  getOneEvaluation,
  addEvaluation,
  addEvaluationMasse,
  updateEvaluation,
  setActifEvaluation,
  deleteEvaluation,
  terminerEvaluation,
  // Phase 3
  getCoaching,
  saveCoaching,
  getAllActionType,
  addActionType,
  updateActionType,
  deleteActionType,
  getActionsByEvaluation,
  addAction,
  updateAction,
  deleteAction,
  getMesNotificationsEval,
  marquerNotifEvalLu,
  marquerToutNotifEvalLu,
  getRapportAgentsPole,
  // Phase 4
  getEvaluateursBySite,
  getEvaluationsByEvaluateur,
  creerContre,
  getContre,
  terminerContre,
  getAllContre,
  setActifContre,
};
