import { PageEvent } from '@angular/material/paginator';

/**
 * Pagination côté client d'une liste déjà filtrée.
 * - `donnees` garde toutes les lignes (exports, compteurs) ;
 * - `page` ne contient que les lignes affichées (à passer au tableau) ;
 * - chaque nouvelle liste ramène à la première page.
 */
export class Pagination<T> {
  static readonly TAILLES = [10, 25, 50, 100];
  readonly tailles = Pagination.TAILLES;
  pageIndex = 0;
  pageSize = 10;
  page: T[] = [];
  private _donnees: T[] = [];

  get donnees(): T[] { return this._donnees; }
  get length(): number { return this._donnees.length; }

  /** Remplace la liste ; revient à la première page sauf si `garderPage`. */
  definir(donnees: T[] | null | undefined, garderPage = false): void {
    this._donnees = donnees || [];
    if (!garderPage) this.pageIndex = 0;
    const derniere = Math.max(0, Math.ceil(this._donnees.length / this.pageSize) - 1);
    if (this.pageIndex > derniere) this.pageIndex = derniere;
    this.decouper();
  }

  /** À appeler après une modification sur place (ajout / retrait d'une ligne). */
  rafraichir(): void { this.definir(this._donnees, true); }

  changer(e: PageEvent): void {
    this.pageIndex = e.pageIndex;
    this.pageSize = e.pageSize;
    this.decouper();
  }

  private decouper(): void {
    const debut = this.pageIndex * this.pageSize;
    this.page = this._donnees.slice(debut, debut + this.pageSize);
  }
}
