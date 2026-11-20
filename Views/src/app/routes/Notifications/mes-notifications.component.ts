import { Component, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ToastrService } from 'ngx-toastr';
import { Periode } from '@shared/periode';
import { FiltrePeriodeComponent } from '../Quiz/filtre-periode/filtre-periode.component';
import { UserService } from '@theme/widgets/notification.service';
import { Notification } from '@theme/widgets/notification.interface';
import { iconeNotification } from '@theme/widgets/notification-icon';
import { finalize } from 'rxjs';
import { ChargementComponent } from '@shared/components/chargement/chargement.component';

/** Libellés des catégories de notification (filtre et colonne). */
export const CATEGORIES_NOTIFICATION: { code: string; libelle: string }[] = [
  { code: 'FICHE', libelle: 'Fiches' },
  { code: 'EVALUATION', libelle: 'Évaluations' },
  { code: 'CALIBRAGE', libelle: 'Calibrage' },
  { code: 'COACHING', libelle: 'Coaching' },
  { code: 'BI', libelle: 'Options BI' },
  { code: 'QUIZ', libelle: 'Quiz' },
  { code: 'AUTRE', libelle: 'Autres' },
];

/**
 * Historique complet des notifications de l'utilisateur (lien « Voir toutes mes
 * notifications » de la cloche) : filtres, pagination, ouverture, lecture.
 */
@Component({
  selector: 'app-mes-notifications',
  standalone: true,
  imports: [ChargementComponent,
    FormsModule,
    DatePipe,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatPaginatorModule,
    MatSelectModule,
    MatTableModule,
    MatTooltipModule,
    FiltrePeriodeComponent,
  ],
  template: `
    <mat-card>
      <mat-card-content>
        <div class="entete">
          <h5 class="m-0">Mes notifications</h5>
        </div>

        <div class="filtres">
          <mat-form-field appearance="outline" subscriptSizing="dynamic" class="champ">
            <mat-label>Statut</mat-label>
            <mat-select [(ngModel)]="statut" (selectionChange)="filtrer()">
              <mat-option value="">Toutes</mat-option>
              <mat-option value="non_lues">Non lues</mat-option>
              <mat-option value="lues">Lues</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" subscriptSizing="dynamic" class="champ">
            <mat-label>Type</mat-label>
            <mat-select [(ngModel)]="categorie" (selectionChange)="filtrer()">
              <mat-option value="">Tous</mat-option>
              @for (c of categories; track c.code) {
                <mat-option [value]="c.code">{{ c.libelle }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <app-filtre-periode [valeur]="periode" (periodeChange)="changerPeriode($event)" />
        </div>

        @if (chargement) { <app-chargement /> }
        <table [style.display]="chargement ? 'none' : null" mat-table [dataSource]="items" class="w-100">
          <ng-container matColumnDef="icone">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let n">
              <mat-icon [style.color]="n.isRead ? '#9e9e9e' : '#ff8e36'">{{ icone(n) }}</mat-icon>
            </td>
          </ng-container>
          <ng-container matColumnDef="notification">
            <th mat-header-cell *matHeaderCellDef>Notification</th>
            <td mat-cell *matCellDef="let n" [class.non-lue]="!n.isRead">
              <div class="titre">{{ n.titre }}</div>
              @if (n.message) {
                <div class="message">{{ n.message }}</div>
              }
            </td>
          </ng-container>
          <ng-container matColumnDef="categorie">
            <th mat-header-cell *matHeaderCellDef>Type</th>
            <td mat-cell *matCellDef="let n">{{ libelleCategorie(n.categorie) }}</td>
          </ng-container>
          <ng-container matColumnDef="date">
            <th mat-header-cell *matHeaderCellDef>Reçue le</th>
            <td mat-cell *matCellDef="let n">{{ n.createdAt | date: 'dd/MM/yyyy HH:mm' }}</td>
          </ng-container>
          <ng-container matColumnDef="statut">
            <th mat-header-cell *matHeaderCellDef>Statut</th>
            <td mat-cell *matCellDef="let n">
              @if (n.isRead) {
                <span class="lue">Lue{{ n.readAt ? ' le ' + (n.readAt | date: 'dd/MM/yyyy') : '' }}</span>
              } @else {
                <span class="pastille">Non lue</span>
              }
            </td>
          </ng-container>
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let n" class="actions">
              @if (n.url || n.id_FICHE) {
                <mat-icon class="ouvrir" matTooltip="Ouvrir">open_in_new</mat-icon>
              }
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="colonnes"></tr>
          <tr mat-row *matRowDef="let row; columns: colonnes" class="ligne" (click)="ouvrir(row)"></tr>
          <tr class="mat-row" *matNoDataRow>
            <td class="mat-cell text-center p-16" [attr.colspan]="colonnes.length">Aucune notification.</td>
          </tr>
        </table>
        <mat-paginator
          [length]="total"
          [pageIndex]="page - 1"
          [pageSize]="taille"
          [pageSizeOptions]="[10, 20, 50]"
          showFirstLastButtons
          (page)="changerPage($event)"
        />
      </mat-card-content>
    </mat-card>
  `,
  styles: [
    `
      .entete { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
      .filtres { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; margin-bottom: 12px; }
      .champ { width: 170px; }
      .titre { font-weight: 500; }
      .message { font-size: 12px; color: #616161; }
      .non-lue .titre { font-weight: 700; }
      .pastille { background: #ffebee; color: #c62828; border-radius: 10px; padding: 2px 8px; font-size: 12px; }
      .lue { color: #9e9e9e; font-size: 12px; }
      .actions { white-space: nowrap; text-align: right; color: #757575; }
      .ligne { cursor: pointer; }
      .ligne:hover { background: rgba(0, 0, 0, 0.03); }
      .w-100 { width: 100%; }
    `,
  ],
})
export class MesNotificationsComponent implements OnInit {
  chargement = true;
  private readonly srv = inject(UserService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastrService);

  readonly categories = CATEGORIES_NOTIFICATION;
  readonly colonnes = ['icone', 'notification', 'categorie', 'date', 'statut', 'actions'];
  items: Notification[] = [];
  total = 0;
  page = 1;
  taille = 20;
  statut = '';
  categorie = '';
  periode: Periode = { du: null, au: null };

  ngOnInit(): void {
    this.charger();
  }

  charger() {
    this.chargement = true;
    this.srv
      .getHistorique({
        page: this.page,
        taille: this.taille,
        statut: this.statut,
        categorie: this.categorie,
        du: this.periode.du,
        au: this.periode.au,
      })
      .pipe(finalize(() => (this.chargement = false))).subscribe({
        next: r => {
          this.items = r.items;
          this.total = r.total;
        },
        error: err => this.toast.error(err?.error?.message || 'Impossible de charger les notifications'),
      });
  }

  filtrer() {
    this.page = 1;
    this.charger();
  }

  changerPeriode(p: Periode) {
    this.periode = p;
    this.filtrer();
  }

  changerPage(e: PageEvent) {
    this.page = e.pageIndex + 1;
    this.taille = e.pageSize;
    this.charger();
  }

  icone(n: Notification): string {
    return iconeNotification(n);
  }

  libelleCategorie(code?: string): string {
    return this.categories.find(c => c.code === code)?.libelle || 'Autres';
  }

  /** Une notification n'est marquée lue qu'à son ouverture (pas de marquage manuel). */
  private marquerLu(n: Notification, puis?: () => void) {
    if (n.isRead) {
      puis?.();
      return;
    }
    this.srv.markNotificationAsRead(n.id, n.source || 'CORE').subscribe({
      next: () => {
        n.isRead = true;
        n.readAt = new Date();
        puis?.();
      },
      error: () => this.toast.error("Une erreur s'est produite"),
    });
  }

  ouvrir(n: Notification) {
    const url = n.url || (n.id_FICHE ? `/lecture-fiche/${n.id_FICHE}` : null);
    this.marquerLu(n, () => {
      if (url) {
        this.router.navigateByUrl(url);
      }
    });
  }

}
