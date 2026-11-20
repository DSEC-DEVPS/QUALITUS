/** Texte comparable : minuscules, sans accents. */
export const normaliserRecherche = (v: unknown): string =>
  (v ?? '').toString().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Vrai si chaque mot de la recherche apparaît dans au moins un des champs
 * (insensible à la casse et aux accents). Une recherche vide correspond à tout.
 */
export const correspondRecherche = (recherche: string, champs: unknown[]): boolean => {
  const mots = normaliserRecherche(recherche).split(/\s+/).filter(m => m);
  if (!mots.length) return true;
  const textes = champs.map(normaliserRecherche);
  return mots.every(m => textes.some(t => t.includes(m)));
};
