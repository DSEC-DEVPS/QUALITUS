import { Injectable } from '@angular/core';
import { MatPaginatorIntl } from '@angular/material/paginator';

/**
 * Libellés français des paginations (MatPaginator) de toute l'application.
 *
 * Ils sont définis ici directement : le chargement des fichiers de traduction
 * (ngx-translate) est désactivé au démarrage et il n'existe pas de fichier
 * français, ce qui faisait afficher les clés brutes
 * (« paginator.items_per_page_label », « paginator.range_page_label_2 »).
 */
@Injectable({
  providedIn: 'root',
})
export class PaginatorI18nService {
  paginatorIntl = new MatPaginatorIntl();

  getPaginatorIntl() {
    this.paginatorIntl.itemsPerPageLabel = 'Éléments par page :';
    this.paginatorIntl.previousPageLabel = 'Page précédente';
    this.paginatorIntl.nextPageLabel = 'Page suivante';
    this.paginatorIntl.firstPageLabel = 'Première page';
    this.paginatorIntl.lastPageLabel = 'Dernière page';
    this.paginatorIntl.getRangeLabel = this.getRangeLabel.bind(this);

    this.paginatorIntl.changes.next();

    return this.paginatorIntl;
  }

  private getRangeLabel(page: number, pageSize: number, length: number): string {
    if (length === 0 || pageSize === 0) {
      return 'Aucun élément';
    }
    length = Math.max(length, 0);

    const startIndex = page * pageSize;
    // Si l'index de départ dépasse la longueur, on ne borne pas l'index de fin.
    const endIndex =
      startIndex < length ? Math.min(startIndex + pageSize, length) : startIndex + pageSize;

    return `${startIndex + 1} – ${endIndex} sur ${length}`;
  }
}
