// =====================================================================
// Module ÉVALUATION QUALITÉ — Référentiels paramétrables (socle S4)
// CRUD générique { id, libelle, description, etat, ordre } avec cycle de vie
// conforme au socle : entrée Actif/Inactif, suppression refusée si utilisée
// (orienter vers la désactivation), tri par ordre puis libellé.
// =====================================================================
const db = require("../config/db");

// Liste blanche type -> { table, usages:[{table,col}] } (évite l'injection)
const REF = {
  contexte: { table: "b_eval_ref_contexte", usages: [["b_evaluation", "id_contexte"]] },
  nature: { table: "b_eval_ref_nature_ressource", usages: [["b_evaluation", "id_nature_ressource"]] },
  action: { table: "b_eval_ref_action_pa", usages: [["b_eval_plan_action_ligne", "id_action"]] },
  statut: { table: "b_eval_ref_statut_pa", usages: [["b_eval_plan_action_ligne", "id_statut"]] },
  kpi: { table: "b_eval_ref_kpi", usages: [["b_eval_plan_action_ligne", "id_kpi"]] },
};

const getAll = async (req, res) => {
  const def = REF[req.params.type];
  if (!def) return res.status(400).json({ message: "Référentiel inconnu." });
  try {
    const [rows] = await db.query(
      `SELECT id, libelle, description, etat, ordre, dateCreation FROM ${def.table} ORDER BY ordre, libelle`
    );
    return res.status(200).json(rows);
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors du chargement." }); }
};

const add = async (req, res) => {
  const def = REF[req.params.type];
  if (!def) return res.status(400).json({ message: "Référentiel inconnu." });
  const { libelle, description, ordre } = req.body;
  if (!libelle || !libelle.trim()) return res.status(400).json({ message: "Le libellé est obligatoire." });
  try {
    // libellé unique au sein du référentiel (S4 A)
    const [[dup]] = await db.query(`SELECT id FROM ${def.table} WHERE libelle=? AND etat<>'SUPPRIME' LIMIT 1`, [libelle.trim()]);
    if (dup) return res.status(409).json({ message: "Ce libellé existe déjà dans ce référentiel." });
    const [r] = await db.query(
      `INSERT INTO ${def.table} (libelle, description, etat, ordre, dateCreation) VALUES (?, ?, 'ACTIF', ?, NOW())`,
      [libelle.trim(), description || null, Number(ordre) || 0]
    );
    return res.status(201).json({ id: r.insertId, message: "Ajouté." });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors de l'ajout." }); }
};

const update = async (req, res) => {
  const def = REF[req.params.type];
  if (!def) return res.status(400).json({ message: "Référentiel inconnu." });
  const { libelle, description, etat, ordre } = req.body;
  if (!libelle || !libelle.trim()) return res.status(400).json({ message: "Le libellé est obligatoire." });
  try {
    await db.query(
      `UPDATE ${def.table} SET libelle=?, description=?, etat=?, ordre=? WHERE id=?`,
      [libelle.trim(), description || null, etat === "INACTIF" ? "INACTIF" : "ACTIF", Number(ordre) || 0, req.params.id]
    );
    return res.status(200).json({ message: "Modifié." });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors de la modification." }); }
};

// nb d'enregistrements utilisant l'entrée
const compterUsages = async (def, id) => {
  let total = 0;
  for (const [t, col] of def.usages) {
    const [[r]] = await db.query(`SELECT COUNT(*) AS n FROM ${t} WHERE ${col}=?`, [id]);
    total += r.n;
  }
  return total;
};

// Suppression refusée si utilisée -> orienter vers la désactivation (S4 B)
const remove = async (req, res) => {
  const def = REF[req.params.type];
  if (!def) return res.status(400).json({ message: "Référentiel inconnu." });
  try {
    const n = await compterUsages(def, req.params.id);
    if (n > 0) {
      return res.status(409).json({
        message: `Suppression impossible : ${n} enregistrement(s) utilisent cette entrée. Désactivez-la plutôt (elle reste sur l'historique).`,
        usages: n,
      });
    }
    await db.query(`DELETE FROM ${def.table} WHERE id=?`, [req.params.id]);
    return res.status(200).json({ message: "Supprimé." });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors de la suppression." }); }
};

module.exports = { getAll, add, update, remove, REF };
