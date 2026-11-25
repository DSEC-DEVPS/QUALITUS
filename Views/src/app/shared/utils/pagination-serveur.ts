import { PageEvent } from '@angular/material/paginator';

/**
 * Pagination côté serveur : seule la page affichée est chargée.
 * - `params()` donne { page, taille } à envoyer à l'API ;
 * - `recevoir()` range la réponse { lignes, total } ;
 * - `changer()` met à jour la page demandée (l'appelant recharge ensuite) ;
 * - `premiere()` revient à la première page (à chaque changement de filtre).
 */
export class PaginationServeur<T> {
  static readonly TAILLES = [10, 25, 50, 100];
  readonly tailles = PaginationServeur.TAILLES;
  pageIndex = 0;
  pageSize = 10;
  page: T[] = [];
  length = 0;

  params(): { page: number; taille: number } { return { page: this.pageIndex + 1, taille: this.pageSize }; }

  recevoir(r: { lignes: T[]; total: number } | null | undefined): void {
    this.page = r?.lignes || [];
    this.length = Number(r?.total) || 0;
  }

  changer(e: PageEvent): void {
    if (e.pageSize !== this.pageSize) { this.pageSize = e.pageSize; this.pageIndex = 0; }
    else this.pageIndex = e.pageIndex;
  }

  premiere(): void { this.pageIndex = 0; }

  /** Après une suppression qui vide la dernière page : reculer d'une page. */
  get pageVideApresRetrait(): boolean { return this.page.length === 0 && this.pageIndex > 0; }
}

/** Réponse paginée de l'API : { lignes, total, page, taille }. */
export interface PageServeur<T> { lignes: T[]; total: number; page: number; taille: number; }

/** Paramètres HTTP d'une requête paginée (valeurs vides ignorées). */
export const paramsPage = (filtres: Record<string, any>, page?: { page: number; taille: number } | null): Record<string, string> => {
  const r: Record<string, string> = {};
  for (const [k, v] of Object.entries<any>({ ...filtres, ...(page || {}) })) {
    if (v !== null && v !== undefined && v !== '' && v !== false) r[k] = String(v);
  }
  return r;
};

/** Période par défaut des listes d'historique : les 3 derniers mois ({ du, au: null }, 'AAAA-MM-JJ'). */
export const periodeParDefaut = (): { du: string | null; au: string | null } => {
  const d = debutPeriodeParDefaut();
  const p = (n: number) => String(n).padStart(2, '0');
  return { du: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`, au: null };
};

/** Date de début par défaut des listes d'évaluations : il y a 3 mois. */
export const debutPeriodeParDefaut = (): Date => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setMonth(d.getMonth() - 3);
  return d;
};
