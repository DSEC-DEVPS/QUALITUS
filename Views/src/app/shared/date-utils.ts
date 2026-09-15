/**
 * Normalise une valeur de date (objet Moment, Date, ou chaîne) vers 'YYYY-MM-DD'.
 * Utilisé pour envoyer au backend une date sans composante horaire/fuseau,
 * quel que soit l'adaptateur du datepicker (l'app utilise Moment).
 */
export function toYMD(v: any): string | null {
  if (v === null || v === undefined || v === '') return null;
  // Objet Moment (a une méthode format)
  if (typeof v === 'object' && typeof v.format === 'function') return v.format('YYYY-MM-DD');
  // Objet Date natif
  if (v instanceof Date && !isNaN(v.getTime())) {
    const p = (n: number) => String(n).padStart(2, '0');
    return `${v.getFullYear()}-${p(v.getMonth() + 1)}-${p(v.getDate())}`;
  }
  // Chaîne : on garde la partie date (au cas où ce serait un ISO)
  if (typeof v === 'string') return v.length >= 10 ? v.slice(0, 10) : v;
  return null;
}
