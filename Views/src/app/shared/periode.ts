// Période de filtrage ?du=&au= partagée par les sous-menus Quiz
// (Liste, Rapports, Mes scores, Retests) et le service QuizService.

/** Période sélectionnée : dates 'AAAA-MM-JJ' (bornes incluses), null = non bornée. */
export interface Periode {
  du: string | null;
  au: string | null;
}

/** Libellé lisible d'une période, ex. « du 01/01/2026 au 31/03/2026 ». */
export function libellePeriode(p: Periode): string {
  const fr = (s: string) => s.split('-').reverse().join('/');
  if (p.du && p.au) return `du ${fr(p.du)} au ${fr(p.au)}`;
  if (p.du) return `à partir du ${fr(p.du)}`;
  if (p.au) return `jusqu'au ${fr(p.au)}`;
  return 'toutes les dates';
}

/** Suffixe de nom de fichier, ex. « 2026-01-01_au_2026-03-31 » ou « tout ». */
export function suffixePeriode(p: Periode): string {
  if (p.du && p.au) return `${p.du}_au_${p.au}`;
  if (p.du) return `depuis_${p.du}`;
  if (p.au) return `jusqu_au_${p.au}`;
  return 'tout';
}

/** Paramètres HTTP ?du=&au= (seulement les bornes renseignées). */
export function paramsPeriode(p?: Periode | null): Record<string, string> {
  const r: Record<string, string> = {};
  if (p?.du) r['du'] = p.du;
  if (p?.au) r['au'] = p.au;
  return r;
}
