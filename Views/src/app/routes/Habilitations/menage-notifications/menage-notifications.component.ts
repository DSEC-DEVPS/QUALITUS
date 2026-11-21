import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatTableModule } from '@angular/material/table';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import {
  AppearanceAnimation,
  ConfirmBoxInitializer,
  DialogLayoutDisplay,
  DisappearanceAnimation,
} from '@costlydeveloper/ngx-awesome-popup';
import { UserService } from '@theme/widgets/notification.service';
import { ApercuMenage, CriteresMenage } from '@theme/widgets/notification.interface';
import { CATEGORIES_NOTIFICATION } from '../../Notifications/mes-notifications.component';

type Utilisateur = { id: number; nom: string; prenom: string; login: string };

/**
 * Habilitations › Ménage des notifications (permission notification.supprimer).
 * L'admin choisit l'ancienneté (lues / non lues depuis plus de N jours) et la
 * portée (tous ou un utilisateur), affiche un aperçu puis supprime après confirmation.
 */
@Component({
  selector: 'app-menage-notifications',
  standalone: true,
  imports: [
    FormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatRadioModule,
    MatTableModule,
  ],
  template: `
    <mat-card>
      <mat-card-content>
        <h5 class="mt-0">Ménage des notifications</h5>
        <p class="aide">Les notifications supprimées ne peuvent pas être récupérées.</p>

        <div class="ligne">
          <mat-form-field appearance="outline" subscriptSizing="dynamic" class="jours">
            <mat-label>Lues depuis plus de (jours)</mat-label>
            <input matInput type="number" min="1" max="3650" [(ngModel)]="luesJours" (ngModelChange)="apercu = null" />
          </mat-form-field>
          <mat-form-field appearance="outline" subscriptSizing="dynamic" class="jours">
            <mat-label>Non lues depuis plus de (jours)</mat-label>
            <input matInput type="number" min="1" max="3650" [(ngModel)]="nonLuesJours" (ngModelChange)="apercu = null" />
          </mat-form-field>
        </div>
        <p class="aide">Renseignez au moins un des deux champs.</p>

        <div class="ligne">
          <mat-radio-group [(ngModel)]="portee" (change)="apercu = null">
            <mat-radio-button value="tous">Tous les utilisateurs</mat-radio-button>
            <mat-radio-button value="un">Un utilisateur</mat-radio-button>
          </mat-radio-group>
          @if (portee === 'un') {
            <mat-form-field appearance="outline" subscriptSizing="dynamic" class="utilisateur">
              <mat-label>Utilisateur (login, nom ou prénom)</mat-label>
              <input
                matInput
                [(ngModel)]="saisie"
                (ngModelChange)="rechercher($event)"
                [matAutocomplete]="auto"
              />
              <mat-autocomplete #auto="matAutocomplete" [displayWith]="afficher" (optionSelected)="choisir($event.option.value)">
                @for (u of suggestions; track u.id) {
                  <mat-option [value]="u">{{ u.prenom }} {{ u.nom }} ({{ u.login }})</mat-option>
                }
              </mat-autocomplete>
            </mat-form-field>
          }
        </div>

        <div class="ligne">
          <button mat-stroked-button color="primary" (click)="voirApercu()" [disabled]="!criteresValides()">
            <mat-icon>visibility</mat-icon> Aperçu
          </button>
          <button mat-flat-button color="warn" (click)="supprimer()" [disabled]="!apercu || !apercu.total">
            <mat-icon>delete_sweep</mat-icon> Supprimer
          </button>
        </div>

        @if (apercu) {
          @if (apercu.total) {
            <table mat-table [dataSource]="apercu.par_categorie" class="apercu">
              <ng-container matColumnDef="categorie">
                <th mat-header-cell *matHeaderCellDef>Type</th>
                <td mat-cell *matCellDef="let l">{{ libelle(l.categorie) }}</td>
                <td mat-footer-cell *matFooterCellDef><b>Total</b></td>
              </ng-container>
              <ng-container matColumnDef="lues">
                <th mat-header-cell *matHeaderCellDef>Lues</th>
                <td mat-cell *matCellDef="let l">{{ l.lues }}</td>
                <td mat-footer-cell *matFooterCellDef>{{ somme('lues') }}</td>
              </ng-container>
              <ng-container matColumnDef="non_lues">
                <th mat-header-cell *matHeaderCellDef>Non lues</th>
                <td mat-cell *matCellDef="let l">{{ l.non_lues }}</td>
                <td mat-footer-cell *matFooterCellDef>{{ somme('non_lues') }}</td>
              </ng-container>
              <ng-container matColumnDef="total">
                <th mat-header-cell *matHeaderCellDef>Total</th>
                <td mat-cell *matCellDef="let l">{{ l.total }}</td>
                <td mat-footer-cell *matFooterCellDef><b>{{ apercu.total }}</b></td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="colonnes"></tr>
              <tr mat-row *matRowDef="let row; columns: colonnes"></tr>
              <tr mat-footer-row *matFooterRowDef="colonnes"></tr>
            </table>
          } @else {
            <p class="vide">Aucune notification ne correspond à ces critères.</p>
          }
        }
      </mat-card-content>
    </mat-card>
  `,
  styles: [
    `
      .ligne { display: flex; gap: 16px; flex-wrap: wrap; align-items: center; margin-bottom: 12px; }
      .aide { font-size: 12px; color: var(--qx-texte-2, #757575); margin: 0 0 12px; }
      .utilisateur { width: 320px; }
      .jours { width: 280px; }
      mat-radio-button { margin-right: 12px; }
      .apercu { max-width: 560px; margin-top: 8px; }
      .vide { color: var(--qx-texte-2, #757575); margin-top: 8px; }
    `,
  ],
})
export class MenageNotificationsComponent {
  private readonly srv = inject(UserService);
  private readonly toast = inject(ToastrService);

  readonly colonnes = ['categorie', 'lues', 'non_lues', 'total'];
  luesJours: number | null = 90;
  nonLuesJours: number | null = null;
  portee: 'tous' | 'un' = 'tous';
  saisie: string | Utilisateur = '';
  utilisateur: Utilisateur | null = null;
  suggestions: Utilisateur[] = [];
  apercu: ApercuMenage | null = null;

  private readonly recherche$ = new Subject<string>();

  constructor() {
    this.recherche$
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap(q => (q.trim().length >= 2 ? this.srv.rechercherUtilisateursMenage(q.trim()) : of([])))
      )
      .subscribe({ next: l => (this.suggestions = l), error: () => (this.suggestions = []) });
  }

  rechercher(v: string | Utilisateur) {
    if (typeof v !== 'string') return;
    this.utilisateur = null;
    this.apercu = null;
    this.recherche$.next(v);
  }

  choisir(u: Utilisateur) {
    this.utilisateur = u;
    this.apercu = null;
  }

  afficher = (u: Utilisateur | string | null): string =>
    !u ? '' : typeof u === 'string' ? u : `${u.prenom} ${u.nom} (${u.login})`;

  private jours(v: number | null): number | null {
    const n = Number(v);
    return v !== null && v !== undefined && String(v) !== '' && Number.isInteger(n) && n >= 1 && n <= 3650 ? n : null;
  }

  private criteres(): CriteresMenage {
    return {
      lues_jours: this.jours(this.luesJours),
      non_lues_jours: this.jours(this.nonLuesJours),
      id_utilisateur: this.portee === 'un' ? this.utilisateur?.id ?? null : null,
    };
  }

  criteresValides(): boolean {
    const c = this.criteres();
    const champsOk =
      (this.luesJours === null || String(this.luesJours) === '' || c.lues_jours !== null) &&
      (this.nonLuesJours === null || String(this.nonLuesJours) === '' || c.non_lues_jours !== null);
    return champsOk && !!(c.lues_jours || c.non_lues_jours) && (this.portee === 'tous' || !!this.utilisateur);
  }

  voirApercu() {
    this.srv.apercuMenage(this.criteres()).subscribe({
      next: a => (this.apercu = a),
      error: err => this.toast.error(err?.error?.message || "Impossible d'afficher l'aperçu"),
    });
  }

  libelle(code: string): string {
    return CATEGORIES_NOTIFICATION.find(c => c.code === code)?.libelle || 'Autres';
  }

  somme(cle: 'lues' | 'non_lues'): number {
    return (this.apercu?.par_categorie || []).reduce((s, l) => s + Number(l[cle] || 0), 0);
  }

  supprimer() {
    if (!this.apercu?.total) return;
    const qui = this.portee === 'un' && this.utilisateur ? ` de ${this.utilisateur.prenom} ${this.utilisateur.nom}` : '';
    const box = new ConfirmBoxInitializer();
    box.setTitle('Supprimer des notifications');
    box.setMessage(`${this.apercu.total} notification(s)${qui} seront supprimées définitivement. Continuer ?`);
    box.setConfig({
      layoutType: DialogLayoutDisplay.DANGER,
      animationIn: AppearanceAnimation.BOUNCE_IN,
      animationOut: DisappearanceAnimation.BOUNCE_OUT,
      buttonPosition: 'right',
    });
    box.setButtonLabels('OUI', 'NON');
    box.openConfirmBox$().subscribe(resp => {
      if (!resp.success) return;
      this.srv.supprimerMenage(this.criteres()).subscribe({
        next: r => {
          this.toast.success(r.message);
          this.voirApercu();
        },
        error: err => this.toast.error(err?.error?.message || 'Suppression impossible'),
      });
    });
  }
}
