// Pagination « en mémoire » des listes dont la règle métier est appliquée en JavaScript
// après la requête (catalogues : quiz, sondages, sessions de calibrage, scores, rapport) :
// la requête reste celle d'avant, mais seule la page affichée est envoyée au navigateur,
// avec les filtres et le tri appliqués à l'identique de ce que faisait l'écran.

/** Paramètres de pagination : ?page=1&taille=10 (taille bornée 5..100). Null sans « page ». */
const lirePage = (q) => {
  if (!q || q.page === undefined) return null;
  return {
    page: Math.max(1, parseInt(q.page, 10) || 1),
    taille: Math.min(100, Math.max(5, parseInt(q.taille, 10) || 10)),
  };
};

/** Une page de la liste : { lignes, total, page, taille }. */
const decouper = (lignes, p) => ({
  lignes: lignes.slice((p.page - 1) * p.taille, p.page * p.taille),
  total: lignes.length,
  page: p.page,
  taille: p.taille,
});

/** Texte comparable : minuscules, sans accents. */
const normaliser = (v) => String(v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/** Vrai si chaque mot de la recherche apparaît dans au moins un des champs (comme l'écran). */
const correspondRecherche = (recherche, champs) => {
  const mots = normaliser(recherche).split(/\s+/).filter(Boolean);
  if (!mots.length) return true;
  const textes = champs.map(normaliser);
  return mots.every((m) => textes.some((t) => t.includes(m)));
};

/** Tri identique à celui des tableaux Angular Material (MatTableDataSource.sortData). */
const estNombre = (v) => !isNaN(parseFloat(v)) && !isNaN(Number(v));
const trierCommeMaterial = (lignes, champ, sens) => {
  if (!champ || (sens !== "asc" && sens !== "desc")) return lignes;
  const val = (d) => { const v = d[champ]; return estNombre(v) ? Number(v) : v; };
  return lignes.slice().sort((a, b) => {
    let va = val(a), vb = val(b);
    const ta = typeof va, tb = typeof vb;
    if (ta !== tb) { if (ta === "number") va += ""; if (tb === "number") vb += ""; }
    let r = 0;
    if (va != null && vb != null) { if (va > vb) r = 1; else if (va < vb) r = -1; }
    else if (va != null) r = 1;
    else if (vb != null) r = -1;
    return r * (sens === "asc" ? 1 : -1);
  });
};

module.exports = { lirePage, decouper, normaliser, correspondRecherche, trierCommeMaterial };
