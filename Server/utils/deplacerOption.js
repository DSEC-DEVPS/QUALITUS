// Déplacement d'une option d'arbre (BI ou coaching) sous un autre parent, ou à
// la racine (niveau 1). Le niveau de l'option et de toutes ses descendantes est
// recalculé. Refusé si : parent introuvable / d'une autre arborescence, parent
// = l'option ou une de ses descendantes (cycle), ou si une descendante
// dépasserait le niveau maximal. Les évaluations déjà saisies ne sont pas
// touchées (elles conservent leurs libellés et niveaux enregistrés).
const NIVEAU_MAX = 5;

class ErreurDeplacement extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

/**
 * @param conn  connexion en transaction
 * @param table b_eval_bi_option | b_eval_coaching_option
 * @param id    option déplacée
 * @param idParent nouveau parent (null = racine)
 * @param colArbo  colonne d'appartenance à vérifier (ex. "id_arborescence") ou null
 */
const deplacerOption = async (conn, table, id, idParent, colArbo = null) => {
  const cols = `id, id_parent, niveau${colArbo ? ", " + colArbo : ""}`;
  const [[o]] = await conn.query(`SELECT ${cols} FROM ${table} WHERE id=? FOR UPDATE`, [id]);
  if (!o) throw new ErreurDeplacement(404, "Option introuvable.");

  // descendantes (toutes, quel que soit leur état)
  const descendantes = [];
  let niveauCourant = [o.id];
  while (niveauCourant.length) {
    const [rows] = await conn.query(`SELECT id, niveau FROM ${table} WHERE id_parent IN (?)`, [niveauCourant]);
    descendantes.push(...rows);
    niveauCourant = rows.map((r) => r.id);
  }

  let niveauParent = 0;
  if (idParent !== null) {
    if (Number(idParent) === Number(o.id) || descendantes.some((d) => Number(d.id) === Number(idParent))) {
      throw new ErreurDeplacement(400, "Impossible de déplacer une option sous elle-même ou sous une de ses sous-options.");
    }
    const [[p]] = await conn.query(`SELECT ${cols} FROM ${table} WHERE id=?`, [idParent]);
    if (!p || (colArbo && Number(p[colArbo]) !== Number(o[colArbo]))) {
      throw new ErreurDeplacement(400, "Option parente introuvable dans cette arborescence.");
    }
    niveauParent = Number(p.niveau);
  }

  const nouveauNiveau = niveauParent + 1;
  const delta = nouveauNiveau - Number(o.niveau);
  const plusProfond = Math.max(Number(o.niveau), ...descendantes.map((d) => Number(d.niveau)));
  if (plusProfond + delta > NIVEAU_MAX) {
    throw new ErreurDeplacement(400, `Déplacement impossible : une sous-option dépasserait le niveau ${NIVEAU_MAX}.`);
  }
  if (Number(o.id_parent || 0) === Number(idParent || 0)) return { inchange: true };

  await conn.query(`UPDATE ${table} SET id_parent=?, niveau=? WHERE id=?`, [idParent, nouveauNiveau, o.id]);
  if (delta !== 0 && descendantes.length) {
    await conn.query(`UPDATE ${table} SET niveau = niveau + ? WHERE id IN (?)`, [delta, descendantes.map((d) => d.id)]);
  }
  return { niveau: nouveauNiveau, sousOptions: descendantes.length };
};

module.exports = { deplacerOption, ErreurDeplacement, NIVEAU_MAX };
