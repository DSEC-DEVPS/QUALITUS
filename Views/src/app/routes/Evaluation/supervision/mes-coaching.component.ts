import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatPaginatorModule } from '@angular/material/paginator';
import { Pagination } from '@shared/utils/pagination';
import { correspondRecherche } from '@shared/utils/recherche';
import { toYMD } from '@shared/date-utils';
import { ToastrService } from 'ngx-toastr';
import { EvalInstanceService, EvaluationListe } from '../eval-instance.service';
import { ChargementComponent } from '@shared/components/chargement/chargement.component';

/**
 * « Mes coaching » (superviseur) : évaluations de ses agents nécessitant un
 * coaching (échec), avec filtre période + filtre sur l'état du coaching
 * (serveur) et recherche agent (login, nom, prénom ; à l'écran).
 */
@Component({
  selector: 'app-mes-coaching',
  standalone: true,
  imports: [ChargementComponent,
    CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule, MatTableModule, MatChipsModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatDatepickerModule, MatPaginatorModule,
  ],
  styles: ['.login { color: rgba(0, 0, 0, 0.54); margin-left: 4px; }'],
  template: `
    <div class="cal-page">
      <mat-card class="cal-panel">
        <mat-card-header class="cal-band"><span class="cal-band-title"><mat-icon>psychology</mat-icon> Mes coaching</span></mat-card-header>
        <mat-card-content>
          <p class="cal-desc">Évaluations de vos agents conclues en échec, qui nécessitent un coaching.</p>
          <div class="cal-filtres-row">
            <mat-form-field appearance="outline"><mat-label>Du</mat-label>
              <input matInput [matDatepicker]="pd" [(ngModel)]="dateDebut" name="dd" /><mat-datepicker-toggle matSuffix [for]="pd"></mat-datepicker-toggle><mat-datepicker #pd></mat-datepicker>
            </mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Au</mat-label>
              <input matInput [matDatepicker]="pf" [(ngModel)]="dateFin" name="df" /><mat-datepicker-toggle matSuffix [for]="pf"></mat-datepicker-toggle><mat-datepicker #pf></mat-datepicker>
            </mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Coaching</mat-label>
              <mat-select [(ngModel)]="coachingTermine" name="ct">
                <mat-option [value]="undefined">Tous</mat-option>
                <mat-option value="true">Terminé</mat-option>
                <mat-option value="false">Non terminé</mat-option>
              </mat-select>
            </mat-form-field>
            <button mat-flat-button color="primary" (click)="charger()"><mat-icon>search</mat-icon> Filtrer</button>
            <mat-form-field appearance="outline"><mat-label>Rechercher un agent</mat-label>
              <mat-icon matPrefix>search</mat-icon>
              <input matInput [(ngModel)]="recherche" (ngModelChange)="appliquer()" name="rech" placeholder="Login, nom ou prénom" autocomplete="off" />
            </mat-form-field>
            <button mat-button (click)="reinitialiser()">Réinitialiser</button>
          </div>
          <mat-card>
            <mat-card-content>
              @if (chargement) { <app-chargement /> }
              @else if (toutes.length === 0) { <p class="vide">Aucun coaching à mener.</p> }
              @else if (pag.length === 0) { <p class="vide">Aucun agent ne correspond à la recherche.</p> }
              @else {
                <table mat-table [dataSource]="pag.page" class="table">
                  <ng-container matColumnDef="agent">
                    <th mat-header-cell *matHeaderCellDef>Agent</th>
                    <td mat-cell *matCellDef="let e">{{ e.agent_nom }} {{ e.agent_prenom }}@if (e.agent_login) { <span class="login">({{ e.agent_login }})</span> }</td>
                  </ng-container>
                  <ng-container matColumnDef="evaluateur">
                    <th mat-header-cell *matHeaderCellDef>Évaluateur</th>
                    <td mat-cell *matCellDef="let e">{{ e.evaluateur_nom }} {{ e.evaluateur_prenom }}</td>
                  </ng-container>
                  <ng-container matColumnDef="date">
                    <th mat-header-cell *matHeaderCellDef>Date d'appel</th>
                    <td mat-cell *matCellDef="let e">{{ e.date_appel ? (e.date_appel | date: 'dd/MM/yyyy') : '—' }}</td>
                  </ng-container>
                  <ng-container matColumnDef="coaching">
                    <th mat-header-cell *matHeaderCellDef>Coaching</th>
                    <td mat-cell *matCellDef="let e">
                      @if (e.coaching_statut === 'TERMINE') { <mat-chip class="chip-succes">Terminé</mat-chip> }
                      @else { <mat-chip class="chip-echec">Non terminé</mat-chip> }
                    </td>
                  </ng-container>
                  <tr mat-header-row *matHeaderRowDef="colonnes"></tr>
                  <tr mat-row *matRowDef="let row; columns: colonnes" class="ligne" (click)="ouvrir(row)"></tr>
                </table>
                <mat-paginator [length]="pag.length" [pageIndex]="pag.pageIndex" [pageSize]="pag.pageSize"
                               [pageSizeOptions]="pag.tailles" showFirstLastButtons (page)="pag.changer($event)" />
              }
            </mat-card-content>
          </mat-card>
        </mat-card-content>
      </mat-card>
    </div>
  `,
})
export class MesCoachingComponent implements OnInit {
  private readonly service = inject(EvalInstanceService);
  private readonly router = inject(Router);
  private readonly toastr = inject(ToastrService);

  /** Liste reçue du serveur ; `pag` = liste filtrée par la recherche, paginée. */
  toutes: EvaluationListe[] = [];
  readonly pag = new Pagination<EvaluationListe>();
  recherche = '';
  chargement = false;
  colonnes = ['agent', 'evaluateur', 'date', 'coaching'];
  dateDebut: any = null;
  dateFin: any = null;
  coachingTermine: string | undefined = undefined;

  ngOnInit(): void { this.charger(); }

  charger(): void {
    this.chargement = true;
    const f: any = { portee: 'coaching' };
    if (this.dateDebut) f.date_debut = toYMD(this.dateDebut);
    if (this.dateFin) f.date_fin = toYMD(this.dateFin);
    if (this.coachingTermine) f.coaching_termine = this.coachingTermine;
    this.service.getEvaluations(f).subscribe({
      next: e => { this.toutes = e || []; this.appliquer(); this.chargement = false; },
      error: () => { this.toastr.error('Impossible de charger les coaching.'); this.chargement = false; },
    });
  }
  appliquer(): void {
    this.pag.definir(this.toutes.filter(e => correspondRecherche(this.recherche, [e.agent_login, e.agent_nom, e.agent_prenom])));
  }
  reinitialiser(): void {
    this.dateDebut = null; this.dateFin = null; this.coachingTermine = undefined; this.recherche = '';
    this.charger();
  }
  ouvrir(e: EvaluationListe): void { this.router.navigate(['/mon-espace/evaluation/executer', e.id]); }
}
