// =====================================================================
// Module ÉVALUATION QUALITÉ (cahier) — Calendrier & périodes (Phase 6a, F.38quater)
// Un calendrier de 12 mois par site + une politique de fermeture par site.
// Tables b_eval_calendrier_mois / b_eval_politique_fermeture.
// =====================================================================
const db = require("../config/db");

const MOIS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

const withTx = async (fn) => {
  const conn = await db.getConnection();
  try { await conn.beginTransaction(); const r = await fn(conn); await conn.commit(); return r; }
  catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
};

// Réévalue les états d'ouverture d'un site selon sa politique + le mois courant
const recompute = async (conn, idSite) => {
  const [[pol]] = await conn.query(`SELECT politique FROM b_eval_politique_fermeture WHERE id_site=?`, [idSite]);
  const politique = pol ? pol.politique : "MOIS_COURANT";
  const now = new Date();
  const moisCourant = now.getMonth() + 1;
  const anneeCourante = now.getFullYear();
  const finSemestre = moisCourant <= 6 ? 6 : 12;
  const debutSemestre = moisCourant <= 6 ? 1 : 7;

  const [mois] = await conn.query(`SELECT id, mois, annee FROM b_eval_calendrier_mois WHERE id_site=?`, [idSite]);
  for (const m of mois) {
    let ouvert = false;
    if (politique === "TOUS") {
      ouvert = true;
    } else if (m.annee === anneeCourante) {
      if (politique === "MOIS_COURANT") ouvert = m.mois === moisCourant;
      else if (politique === "MOIS_COURANT_ET_POSTERIEURS") ouvert = m.mois >= moisCourant && m.mois <= finSemestre;
    }
    await conn.query(`UPDATE b_eval_calendrier_mois SET etat=?, dateModification=NOW() WHERE id=?`, [ouvert ? "OUVERT" : "FERME", m.id]);
  }
  return { politique, moisCourant, anneeCourante, debutSemestre, finSemestre };
};

// GET calendrier d'un site (+ politique)
const getCalendrier = async (req, res) => {
  const idSite = req.params.idSite;
  try {
    const [mois] = await db.query(
      `SELECT id, id_site, mois, libelle, annee, etat FROM b_eval_calendrier_mois WHERE id_site=? ORDER BY annee, mois`, [idSite]
    );
    const [[pol]] = await db.query(`SELECT politique FROM b_eval_politique_fermeture WHERE id_site=?`, [idSite]);
    return res.status(200).json({ mois, politique: pol ? pol.politique : null });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors du chargement." }); }
};

// Génère les 12 mois de l'année (courante par défaut) pour un site + réévalue
const genererCalendrier = async (req, res) => {
  const { id_site, annee } = req.body;
  if (!id_site) return res.status(400).json({ message: "Site obligatoire." });
  const an = annee || new Date().getFullYear();
  try {
    await withTx(async (conn) => {
      for (let m = 1; m <= 12; m++) {
        await conn.query(
          `INSERT IGNORE INTO b_eval_calendrier_mois (id_site, mois, libelle, annee, etat, dateModification)
           VALUES (?, ?, ?, ?, 'FERME', NOW())`, [id_site, m, MOIS[m - 1], an]
        );
      }
      await recompute(conn, id_site);
    });
    return res.status(201).json({ message: `Calendrier ${an} généré.` });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors de la génération." }); }
};

// Modifie l'état d'un mois (dérogation ponctuelle)
const setEtatMois = async (req, res) => {
  const { etat } = req.body;
  if (etat !== "OUVERT" && etat !== "FERME") return res.status(400).json({ message: "État invalide." });
  try {
    await db.query(`UPDATE b_eval_calendrier_mois SET etat=?, dateModification=NOW() WHERE id=?`, [etat, req.params.id]);
    return res.status(200).json({ message: "Mois mis à jour." });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur." }); }
};

const getPolitique = async (req, res) => {
  try {
    const [[pol]] = await db.query(`SELECT politique FROM b_eval_politique_fermeture WHERE id_site=?`, [req.params.idSite]);
    return res.status(200).json({ politique: pol ? pol.politique : null });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur." }); }
};

// Définit/modifie la politique + réévalue immédiatement
const setPolitique = async (req, res) => {
  const idSite = req.params.idSite;
  const { politique } = req.body;
  const valides = ["MOIS_COURANT", "MOIS_COURANT_ET_POSTERIEURS", "TOUS"];
  if (!valides.includes(politique)) return res.status(400).json({ message: "Politique invalide." });
  try {
    await withTx(async (conn) => {
      const [[ex]] = await conn.query(`SELECT id FROM b_eval_politique_fermeture WHERE id_site=?`, [idSite]);
      if (ex) await conn.query(`UPDATE b_eval_politique_fermeture SET politique=?, dateModification=NOW() WHERE id_site=?`, [politique, idSite]);
      else await conn.query(`INSERT INTO b_eval_politique_fermeture (id_site, politique, dateModification) VALUES (?, ?, NOW())`, [idSite, politique]);
      await recompute(conn, idSite);
    });
    return res.status(200).json({ message: "Politique appliquée et calendrier réévalué." });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur." }); }
};

module.exports = { getCalendrier, genererCalendrier, setEtatMois, getPolitique, setPolitique };
