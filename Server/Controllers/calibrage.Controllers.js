// =====================================================================
// Controllers Calibrage : modele de grille d'evaluation hierarchique
// Niveaux : Categorie d'erreur > Erreur > Item > Sous-Item (+ Referentiel)
// + Categories de ressources evaluees et leur association au modele
// =====================================================================
const db = require("../config/db");
const XLSX = require("xlsx");

/* ------------------------------------------------------------------ */
/* MODELE DE GRILLE                                                    */
/* ------------------------------------------------------------------ */

const getAllModeleGrille = async (req, res, next) => {
  try {
    const Query = `SELECT id, nom, description, Etat, dateCreation, dateModification
                   FROM B_MODELE_GRILLE ORDER BY id DESC`;
    const [resultat] = await db.query(Query);
    return res.status(200).send(resultat);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

// Renvoie le modele + son arbre complet imbrique + les categories de ressources associees
const getOneModeleGrille = async (req, res, next) => {
  const { id } = req.params;
  try {
    const [modeleRows] = await db.query(
      `SELECT id, nom, description, Etat, dateCreation, dateModification
       FROM B_MODELE_GRILLE WHERE id=?`,
      [id]
    );
    if (!modeleRows.length) {
      return res.status(404).json({ message: "Modele de grille introuvable" });
    }
    const modele = modeleRows[0];

    const [categories] = await db.query(
      `SELECT id, nom, poids, ordre FROM B_MG_CATEGORIE_ERREUR
       WHERE id_ModeleGrille=? ORDER BY ordre, id`,
      [id]
    );
    const [erreurs] = await db.query(
      `SELECT e.id, e.id_CategorieErreur, e.nom, e.poids, e.ordre
       FROM B_MG_ERREUR e
       JOIN B_MG_CATEGORIE_ERREUR c ON c.id = e.id_CategorieErreur
       WHERE c.id_ModeleGrille=? ORDER BY e.ordre, e.id`,
      [id]
    );
    const [items] = await db.query(
      `SELECT i.id, i.id_Erreur, i.nom, i.poids, i.ordre
       FROM B_MG_ITEM i
       JOIN B_MG_ERREUR e ON e.id = i.id_Erreur
       JOIN B_MG_CATEGORIE_ERREUR c ON c.id = e.id_CategorieErreur
       WHERE c.id_ModeleGrille=? ORDER BY i.ordre, i.id`,
      [id]
    );
    const [sousItems] = await db.query(
      `SELECT s.id, s.id_Item, s.nom, s.referentiel, s.poids, s.ordre
       FROM B_MG_SOUS_ITEM s
       JOIN B_MG_ITEM i ON i.id = s.id_Item
       JOIN B_MG_ERREUR e ON e.id = i.id_Erreur
       JOIN B_MG_CATEGORIE_ERREUR c ON c.id = e.id_CategorieErreur
       WHERE c.id_ModeleGrille=? ORDER BY s.ordre, s.id`,
      [id]
    );

    // Regroupement en memoire pour construire l'arbre
    const sousItemsByItem = {};
    for (const s of sousItems) {
      (sousItemsByItem[s.id_Item] = sousItemsByItem[s.id_Item] || []).push(s);
    }
    const itemsByErreur = {};
    for (const it of items) {
      it.sousItems = sousItemsByItem[it.id] || [];
      (itemsByErreur[it.id_Erreur] = itemsByErreur[it.id_Erreur] || []).push(it);
    }
    const erreursByCategorie = {};
    for (const e of erreurs) {
      e.items = itemsByErreur[e.id] || [];
      (erreursByCategorie[e.id_CategorieErreur] =
        erreursByCategorie[e.id_CategorieErreur] || []).push(e);
    }
    for (const c of categories) {
      c.erreurs = erreursByCategorie[c.id] || [];
    }
    modele.categories = categories;

    const [ressources] = await db.query(
      `SELECT cr.id, cr.nom, cr.est_robot
       FROM B_MG_CATEGORIE_RESSOURCE mcr
       JOIN B_CATEGORIE_RESSOURCE cr ON cr.id = mcr.id_CategorieRessource
       WHERE mcr.id_ModeleGrille=?`,
      [id]
    );
    modele.categoriesRessources = ressources;

    return res.status(200).send(modele);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

const addModeleGrille = async (req, res, next) => {
  const { nom, description } = req.body;
  if (!nom) {
    return res
      .status(403)
      .json({ message: "Merci de bien renseigner les parametres" });
  }
  try {
    const [resultat] = await db.query(
      `INSERT INTO B_MODELE_GRILLE (nom, description, Etat, dateCreation)
       VALUES (?,?,?,?)`,
      [nom, description || null, "ACTIF", new Date()]
    );
    return res.status(201).json({
      message: "Modele de grille cree avec succes",
      id: resultat.insertId,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

const updateModeleGrille = async (req, res, next) => {
  const { id } = req.params;
  const { nom, description, Etat } = req.body;
  if (!id || !nom) {
    return res
      .status(403)
      .json({ message: "Merci de bien renseigner les parametres" });
  }
  try {
    await db.query(
      `UPDATE B_MODELE_GRILLE
       SET nom=?, description=?, Etat=?, dateModification=? WHERE id=?`,
      [nom, description || null, Etat || "ACTIF", new Date(), id]
    );
    return res.status(201).json({ message: "Modele de grille modifie" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

const deleteModeleGrille = async (req, res, next) => {
  const { id } = req.params;
  if (!id) {
    return res
      .status(403)
      .json({ message: "Merci de bien renseigner les parametres" });
  }
  try {
    // Les FK ON DELETE CASCADE suppriment tout l'arbre + associations
    await db.query(`DELETE FROM B_MODELE_GRILLE WHERE id=?`, [id]);
    return res
      .status(201)
      .json({ message: "Modele de grille supprime avec succes" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

/* ------------------------------------------------------------------ */
/* NIVEAU 1 : CATEGORIE D'ERREUR                                       */
/* ------------------------------------------------------------------ */

const addCategorieErreur = async (req, res, next) => {
  const { id_ModeleGrille, nom, poids, ordre } = req.body;
  if (!id_ModeleGrille || !nom) {
    return res
      .status(403)
      .json({ message: "Merci de bien renseigner les parametres" });
  }
  try {
    const [resultat] = await db.query(
      `INSERT INTO B_MG_CATEGORIE_ERREUR (id_ModeleGrille, nom, poids, ordre, dateCreation)
       VALUES (?,?,?,?,?)`,
      [id_ModeleGrille, nom, poids || 0, ordre || 0, new Date()]
    );
    return res
      .status(201)
      .json({ message: "Categorie d'erreur ajoutee", id: resultat.insertId });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

const updateCategorieErreur = async (req, res, next) => {
  const { id } = req.params;
  const { nom, poids, ordre } = req.body;
  if (!id || !nom) {
    return res
      .status(403)
      .json({ message: "Merci de bien renseigner les parametres" });
  }
  try {
    await db.query(
      `UPDATE B_MG_CATEGORIE_ERREUR SET nom=?, poids=?, ordre=?, dateModification=? WHERE id=?`,
      [nom, poids || 0, ordre || 0, new Date(), id]
    );
    return res.status(201).json({ message: "Categorie d'erreur modifiee" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

const deleteCategorieErreur = async (req, res, next) => {
  const { id } = req.params;
  if (!id) {
    return res
      .status(403)
      .json({ message: "Merci de bien renseigner les parametres" });
  }
  try {
    await db.query(`DELETE FROM B_MG_CATEGORIE_ERREUR WHERE id=?`, [id]);
    return res.status(201).json({ message: "Categorie d'erreur supprimee" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

/* ------------------------------------------------------------------ */
/* NIVEAU 2 : ERREUR                                                   */
/* ------------------------------------------------------------------ */

const addErreur = async (req, res, next) => {
  const { id_CategorieErreur, nom, poids, ordre } = req.body;
  if (!id_CategorieErreur || !nom) {
    return res
      .status(403)
      .json({ message: "Merci de bien renseigner les parametres" });
  }
  try {
    const [resultat] = await db.query(
      `INSERT INTO B_MG_ERREUR (id_CategorieErreur, nom, poids, ordre, dateCreation)
       VALUES (?,?,?,?,?)`,
      [id_CategorieErreur, nom, poids || 0, ordre || 0, new Date()]
    );
    return res
      .status(201)
      .json({ message: "Erreur ajoutee", id: resultat.insertId });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

const updateErreur = async (req, res, next) => {
  const { id } = req.params;
  const { nom, poids, ordre } = req.body;
  if (!id || !nom) {
    return res
      .status(403)
      .json({ message: "Merci de bien renseigner les parametres" });
  }
  try {
    await db.query(
      `UPDATE B_MG_ERREUR SET nom=?, poids=?, ordre=?, dateModification=? WHERE id=?`,
      [nom, poids || 0, ordre || 0, new Date(), id]
    );
    return res.status(201).json({ message: "Erreur modifiee" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

const deleteErreur = async (req, res, next) => {
  const { id } = req.params;
  if (!id) {
    return res
      .status(403)
      .json({ message: "Merci de bien renseigner les parametres" });
  }
  try {
    await db.query(`DELETE FROM B_MG_ERREUR WHERE id=?`, [id]);
    return res.status(201).json({ message: "Erreur supprimee" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

/* ------------------------------------------------------------------ */
/* NIVEAU 3 : ITEM                                                     */
/* ------------------------------------------------------------------ */

const addItem = async (req, res, next) => {
  const { id_Erreur, nom, poids, ordre } = req.body;
  if (!id_Erreur || !nom) {
    return res
      .status(403)
      .json({ message: "Merci de bien renseigner les parametres" });
  }
  try {
    const [resultat] = await db.query(
      `INSERT INTO B_MG_ITEM (id_Erreur, nom, poids, ordre, dateCreation)
       VALUES (?,?,?,?,?)`,
      [id_Erreur, nom, poids || 0, ordre || 0, new Date()]
    );
    return res
      .status(201)
      .json({ message: "Item ajoute", id: resultat.insertId });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

const updateItem = async (req, res, next) => {
  const { id } = req.params;
  const { nom, poids, ordre } = req.body;
  if (!id || !nom) {
    return res
      .status(403)
      .json({ message: "Merci de bien renseigner les parametres" });
  }
  try {
    await db.query(
      `UPDATE B_MG_ITEM SET nom=?, poids=?, ordre=?, dateModification=? WHERE id=?`,
      [nom, poids || 0, ordre || 0, new Date(), id]
    );
    return res.status(201).json({ message: "Item modifie" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

const deleteItem = async (req, res, next) => {
  const { id } = req.params;
  if (!id) {
    return res
      .status(403)
      .json({ message: "Merci de bien renseigner les parametres" });
  }
  try {
    await db.query(`DELETE FROM B_MG_ITEM WHERE id=?`, [id]);
    return res.status(201).json({ message: "Item supprime" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

/* ------------------------------------------------------------------ */
/* NIVEAU 4 : SOUS-ITEM (+ Referentiel)                                */
/* ------------------------------------------------------------------ */

const addSousItem = async (req, res, next) => {
  const { id_Item, nom, referentiel, poids, ordre } = req.body;
  if (!id_Item || !nom) {
    return res
      .status(403)
      .json({ message: "Merci de bien renseigner les parametres" });
  }
  try {
    const [resultat] = await db.query(
      `INSERT INTO B_MG_SOUS_ITEM (id_Item, nom, referentiel, poids, ordre, dateCreation)
       VALUES (?,?,?,?,?,?)`,
      [id_Item, nom, referentiel || null, poids || 0, ordre || 0, new Date()]
    );
    return res
      .status(201)
      .json({ message: "Sous-item ajoute", id: resultat.insertId });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

const updateSousItem = async (req, res, next) => {
  const { id } = req.params;
  const { nom, referentiel, poids, ordre } = req.body;
  if (!id || !nom) {
    return res
      .status(403)
      .json({ message: "Merci de bien renseigner les parametres" });
  }
  try {
    await db.query(
      `UPDATE B_MG_SOUS_ITEM SET nom=?, referentiel=?, poids=?, ordre=?, dateModification=? WHERE id=?`,
      [nom, referentiel || null, poids || 0, ordre || 0, new Date(), id]
    );
    return res.status(201).json({ message: "Sous-item modifie" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

const deleteSousItem = async (req, res, next) => {
  const { id } = req.params;
  if (!id) {
    return res
      .status(403)
      .json({ message: "Merci de bien renseigner les parametres" });
  }
  try {
    await db.query(`DELETE FROM B_MG_SOUS_ITEM WHERE id=?`, [id]);
    return res.status(201).json({ message: "Sous-item supprime" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

/* ------------------------------------------------------------------ */
/* CATEGORIES DE RESSOURCES + ASSOCIATION                              */
/* ------------------------------------------------------------------ */

const getAllCategorieRessource = async (req, res, next) => {
  try {
    const [resultat] = await db.query(
      `SELECT id, nom, est_robot, Etat FROM B_CATEGORIE_RESSOURCE
       WHERE Etat='ACTIF' ORDER BY nom`
    );
    return res.status(200).send(resultat);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

// Remplace l'ensemble des associations d'un modele
const setCategoriesRessourcesModele = async (req, res, next) => {
  const { id } = req.params;
  const { categories } = req.body; // tableau d'ids de categories de ressources
  if (!id || !Array.isArray(categories)) {
    return res
      .status(403)
      .json({ message: "Merci de bien renseigner les parametres" });
  }
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query(
      `DELETE FROM B_MG_CATEGORIE_RESSOURCE WHERE id_ModeleGrille=?`,
      [id]
    );
    for (const idCat of categories) {
      await connection.query(
        `INSERT INTO B_MG_CATEGORIE_RESSOURCE (id_ModeleGrille, id_CategorieRessource, dateCreation)
         VALUES (?,?,?)`,
        [id, idCat, new Date()]
      );
    }
    await connection.commit();
    return res.status(201).json({ message: "Associations mises a jour" });
  } catch (error) {
    await connection.rollback();
    console.log(error);
    res.status(500).json({ message: "Error request" });
  } finally {
    connection.release();
  }
};

/* ------------------------------------------------------------------ */
/* PHASE 2 - IMPORT EXCEL (feuilles GRILLE + REGLES)                   */
/* ------------------------------------------------------------------ */

// Retrouve une feuille par nom (insensible a la casse / aux espaces)
const findSheet = (workbook, name) => {
  const target = name.toLowerCase().replace(/\s+/g, "");
  const found = workbook.SheetNames.find(
    (n) => n.toLowerCase().replace(/\s+/g, "") === target
  );
  return found ? workbook.Sheets[found] : null;
};

const toNumber = (v) => {
  if (v === null || v === undefined || v === "") return 0;
  const n = parseFloat(String(v).replace(",", "."));
  return isNaN(n) ? 0 : n;
};

// Parse un objectif type "> 85%" ou "> 99,5%" -> { operateur, valeur }
const parseObjectif = (txt) => {
  if (!txt) return { operateur: ">", valeur: null };
  const m = String(txt).match(/(<=|>=|<|>|=)?\s*([\d.,]+)/);
  if (!m) return { operateur: ">", valeur: null };
  return {
    operateur: m[1] || ">",
    valeur: parseFloat(m[2].replace(",", ".")),
  };
};

const importModeleFromExcel = async (req, res, next) => {
  if (!req.file) {
    return res.status(403).json({ message: "Aucun fichier Excel fourni" });
  }
  const { nom, description } = req.body;
  if (!nom) {
    return res
      .status(403)
      .json({ message: "Merci de renseigner le nom du modele" });
  }

  let workbook;
  try {
    workbook = XLSX.read(req.file.buffer, { type: "buffer" });
  } catch (e) {
    return res.status(400).json({ message: "Fichier Excel illisible" });
  }

  const grilleSheet = findSheet(workbook, "GRILLE");
  if (!grilleSheet) {
    return res
      .status(400)
      .json({ message: "Feuille 'GRILLE' introuvable dans le fichier" });
  }
  const rows = XLSX.utils.sheet_to_json(grilleSheet, {
    header: 1,
    defval: "",
    blankrows: false,
  });

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const now = new Date();

    const [mod] = await connection.query(
      `INSERT INTO B_MODELE_GRILLE (nom, description, Etat, dateCreation) VALUES (?,?,?,?)`,
      [nom, description || null, "ACTIF", now]
    );
    const modeleId = mod.insertId;

    // Colonnes de la feuille GRILLE :
    // 0 Poids Cat.Erreur | 1 Cat.Erreurs | 2 Poids Erreurs | 3 Erreurs
    // 4 Poids Items | 5 Items | 6 Sous-Items | 7 SCORE% | 8 Score/20 | 9 Referentiel
    const catMap = new Map(); // catNom -> id
    const errMap = new Map(); // catId|errNom -> id
    const itemMap = new Map(); // errId|itemNom -> id
    let nbSousItems = 0;

    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      const catNom = String(r[1] || "").trim();
      const errNom = String(r[3] || "").trim();
      const itemNom = String(r[5] || "").trim();
      const sousItemNom = String(r[6] || "").trim();
      if (!catNom && !errNom && !itemNom && !sousItemNom) continue;

      let catId = catMap.get(catNom);
      if (catNom && !catId) {
        const [c] = await connection.query(
          `INSERT INTO B_MG_CATEGORIE_ERREUR (id_ModeleGrille, nom, poids, ordre, dateCreation) VALUES (?,?,?,?,?)`,
          [modeleId, catNom, toNumber(r[0]), catMap.size + 1, now]
        );
        catId = c.insertId;
        catMap.set(catNom, catId);
      }

      const errKey = catId + "|" + errNom;
      let errId = errMap.get(errKey);
      if (errNom && !errId) {
        const [e] = await connection.query(
          `INSERT INTO B_MG_ERREUR (id_CategorieErreur, nom, poids, ordre, dateCreation) VALUES (?,?,?,?,?)`,
          [catId, errNom, toNumber(r[2]), errMap.size + 1, now]
        );
        errId = e.insertId;
        errMap.set(errKey, errId);
      }

      const itemKey = errId + "|" + itemNom;
      let itemId = itemMap.get(itemKey);
      if (itemNom && !itemId) {
        const [it] = await connection.query(
          `INSERT INTO B_MG_ITEM (id_Erreur, nom, poids, ordre, dateCreation) VALUES (?,?,?,?,?)`,
          [errId, itemNom, toNumber(r[4]), itemMap.size + 1, now]
        );
        itemId = it.insertId;
        itemMap.set(itemKey, itemId);
      }

      if (sousItemNom && itemId) {
        await connection.query(
          `INSERT INTO B_MG_SOUS_ITEM (id_Item, nom, referentiel, poids, ordre, dateCreation) VALUES (?,?,?,?,?,?)`,
          [itemId, sousItemNom, String(r[9] || "").trim() || null, toNumber(r[7]), nbSousItems + 1, now]
        );
        nbSousItems++;
      }
    }

    // Feuille REGLES (facultative) : criteres de reussite / echec
    const reglesSheet = findSheet(workbook, "REGLES");
    let nbRegles = 0;
    if (reglesSheet) {
      const rr = XLSX.utils.sheet_to_json(reglesSheet, {
        header: 1,
        defval: "",
        blankrows: false,
      });
      for (let i = 1; i < rr.length; i++) {
        const typeEcart = String(rr[i][0] || "").trim();
        if (!typeEcart) continue;
        const { operateur, valeur } = parseObjectif(rr[i][1]);
        await connection.query(
          `INSERT INTO B_MG_CRITERE_REGLE
            (id_ModeleGrille, type_ecart, operateur, valeur_objectif, libelle_echec, libelle_reussite, ordre, dateCreation)
           VALUES (?,?,?,?,?,?,?,?)`,
          [
            modeleId,
            typeEcart,
            operateur,
            valeur,
            String(rr[i][2] || "").trim() || null,
            String(rr[i][3] || "").trim() || null,
            nbRegles + 1,
            now,
          ]
        );
        nbRegles++;
      }
    }

    await connection.commit();
    return res.status(201).json({
      message: "Import reussi",
      id: modeleId,
      resume: {
        categories: catMap.size,
        erreurs: errMap.size,
        items: itemMap.size,
        sousItems: nbSousItems,
        regles: nbRegles,
      },
    });
  } catch (error) {
    await connection.rollback();
    console.log(error);
    res.status(500).json({ message: "Echec de l'import Excel" });
  } finally {
    connection.release();
  }
};

/* ------------------------------------------------------------------ */
/* PHASE 2 - CRITERES DE REUSSITE / ECHEC (feuille REGLES)             */
/* ------------------------------------------------------------------ */

const getCriteresByModele = async (req, res, next) => {
  const { id } = req.params;
  try {
    const [resultat] = await db.query(
      `SELECT id, id_ModeleGrille, type_ecart, operateur, valeur_objectif,
              libelle_echec, libelle_reussite, ordre
       FROM B_MG_CRITERE_REGLE WHERE id_ModeleGrille=? ORDER BY ordre, id`,
      [id]
    );
    return res.status(200).send(resultat);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

const addCritereRegle = async (req, res, next) => {
  const {
    id_ModeleGrille,
    type_ecart,
    operateur,
    valeur_objectif,
    libelle_echec,
    libelle_reussite,
    ordre,
  } = req.body;
  if (!id_ModeleGrille || !type_ecart) {
    return res
      .status(403)
      .json({ message: "Merci de bien renseigner les parametres" });
  }
  try {
    const [r] = await db.query(
      `INSERT INTO B_MG_CRITERE_REGLE
        (id_ModeleGrille, type_ecart, operateur, valeur_objectif, libelle_echec, libelle_reussite, ordre, dateCreation)
       VALUES (?,?,?,?,?,?,?,?)`,
      [
        id_ModeleGrille,
        type_ecart,
        operateur || ">",
        valeur_objectif ?? null,
        libelle_echec || null,
        libelle_reussite || null,
        ordre || 0,
        new Date(),
      ]
    );
    return res.status(201).json({ message: "Critere ajoute", id: r.insertId });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

const updateCritereRegle = async (req, res, next) => {
  const { id } = req.params;
  const {
    type_ecart,
    operateur,
    valeur_objectif,
    libelle_echec,
    libelle_reussite,
    ordre,
  } = req.body;
  if (!id || !type_ecart) {
    return res
      .status(403)
      .json({ message: "Merci de bien renseigner les parametres" });
  }
  try {
    await db.query(
      `UPDATE B_MG_CRITERE_REGLE
       SET type_ecart=?, operateur=?, valeur_objectif=?, libelle_echec=?, libelle_reussite=?, ordre=?, dateModification=?
       WHERE id=?`,
      [
        type_ecart,
        operateur || ">",
        valeur_objectif ?? null,
        libelle_echec || null,
        libelle_reussite || null,
        ordre || 0,
        new Date(),
        id,
      ]
    );
    return res.status(201).json({ message: "Critere modifie" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

const deleteCritereRegle = async (req, res, next) => {
  const { id } = req.params;
  if (!id) {
    return res
      .status(403)
      .json({ message: "Merci de bien renseigner les parametres" });
  }
  try {
    await db.query(`DELETE FROM B_MG_CRITERE_REGLE WHERE id=?`, [id]);
    return res.status(201).json({ message: "Critere supprime" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

/* ------------------------------------------------------------------ */
/* PHASE 2 - BUSINESS INTELLIGENCE : 5 POURQUOI (cascade)              */
/* ------------------------------------------------------------------ */

// Renvoie toutes les valeurs Pourquoi d'un modele, en arbre (par id_parent)
const getPourquoiByModele = async (req, res, next) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query(
      `SELECT id, id_ModeleGrille, niveau, libelle, id_parent, ordre
       FROM B_MG_POURQUOI WHERE id_ModeleGrille=? ORDER BY niveau, ordre, id`,
      [id]
    );
    // Construction de l'arbre
    const byId = new Map();
    rows.forEach((n) => {
      n.enfants = [];
      byId.set(n.id, n);
    });
    const racines = [];
    rows.forEach((n) => {
      if (n.id_parent && byId.has(n.id_parent)) {
        byId.get(n.id_parent).enfants.push(n);
      } else {
        racines.push(n);
      }
    });
    return res.status(200).send(racines);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

const addPourquoi = async (req, res, next) => {
  const { id_ModeleGrille, niveau, libelle, id_parent, ordre } = req.body;
  if (!id_ModeleGrille || !niveau || !libelle) {
    return res
      .status(403)
      .json({ message: "Merci de bien renseigner les parametres" });
  }
  if (niveau < 1 || niveau > 5) {
    return res.status(403).json({ message: "Le niveau doit etre entre 1 et 5" });
  }
  try {
    const [r] = await db.query(
      `INSERT INTO B_MG_POURQUOI (id_ModeleGrille, niveau, libelle, id_parent, ordre, dateCreation)
       VALUES (?,?,?,?,?,?)`,
      [id_ModeleGrille, niveau, libelle, id_parent || null, ordre || 0, new Date()]
    );
    return res.status(201).json({ message: "Valeur ajoutee", id: r.insertId });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

const updatePourquoi = async (req, res, next) => {
  const { id } = req.params;
  const { libelle, ordre } = req.body;
  if (!id || !libelle) {
    return res
      .status(403)
      .json({ message: "Merci de bien renseigner les parametres" });
  }
  try {
    await db.query(`UPDATE B_MG_POURQUOI SET libelle=?, ordre=? WHERE id=?`, [
      libelle,
      ordre || 0,
      id,
    ]);
    return res.status(201).json({ message: "Valeur modifiee" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

const deletePourquoi = async (req, res, next) => {
  const { id } = req.params;
  if (!id) {
    return res
      .status(403)
      .json({ message: "Merci de bien renseigner les parametres" });
  }
  try {
    // La FK auto-referente ON DELETE CASCADE supprime les enfants du sous-arbre
    await db.query(`DELETE FROM B_MG_POURQUOI WHERE id=?`, [id]);
    return res.status(201).json({ message: "Valeur supprimee" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error request" });
  }
};

module.exports = {
  // Modele
  getAllModeleGrille,
  getOneModeleGrille,
  addModeleGrille,
  updateModeleGrille,
  deleteModeleGrille,
  // Categorie d'erreur
  addCategorieErreur,
  updateCategorieErreur,
  deleteCategorieErreur,
  // Erreur
  addErreur,
  updateErreur,
  deleteErreur,
  // Item
  addItem,
  updateItem,
  deleteItem,
  // Sous-item
  addSousItem,
  updateSousItem,
  deleteSousItem,
  // Categories de ressources
  getAllCategorieRessource,
  setCategoriesRessourcesModele,
  // Phase 2 - Import Excel
  importModeleFromExcel,
  // Phase 2 - Criteres de reussite / echec
  getCriteresByModele,
  addCritereRegle,
  updateCritereRegle,
  deleteCritereRegle,
  // Phase 2 - 5 Pourquoi
  getPourquoiByModele,
  addPourquoi,
  updatePourquoi,
  deletePourquoi,
};
