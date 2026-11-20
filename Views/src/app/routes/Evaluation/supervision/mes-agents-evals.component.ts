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
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSelectModule } from '@angular/material/select';
import { MatPaginatorModule } from '@angular/material/paginator';
import { Pagination } from '@shared/utils/pagination';
import { correspondRecherche } from '@shared/utils/recherche';
import { toYMD } from '@shared/date-utils';
import { ToastrService } from 'ngx-toastr';
import { EvalInstanceService, EvaluationListe } from '../eval-instance.service';
import { ChargementComponent } from '@shared/components/chargement/chargement.component';

/**
 * « Évaluations de mes agents » (superviseur) : évaluations TERMINÉES qui
 * concernent ses agents et dont il n'est PAS l'évaluateur. Filtres : période
 * (serveur), conclusion, type d'évaluation et recherche agent (à l'écran).
 */
@Component({
  selector: 'app-mes-agents-evals',
  standalone: true,
  imports: [ChargementComponent, CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule, MatTableModule, MatChipsModule,
    MatFormFieldModule, MatInputModule, MatDatepickerModule, MatSelectModule, MatPaginatorModule],
  styles: ['.login { color: rgba(0, 0, 0, 0.54); margin-left: 4px; }'],
  template: `
    <div class="cal-page">
      <mat-card class="cal-panel">
        <mat-card-header class="cal-band"><span class="cal-band-title"><mat-icon>groups</mat-icon> Évaluations de mes agents</span></mat-card-header>
        <mat-card-content>
          <div class="cal-filtres-row">
            <mat-form-field appearance="outline"><mat-label>Du</mat-label>
              <input matInput [matDatepicker]="pd" [(ngModel)]="dateDebut" name="dd" /><mat-datepicker-toggle matSuffix [for]="pd"></mat-datepicker-toggle><mat-datepicker #pd></mat-datepicker>
            </mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Au</mat-label>
              <input matInput [matDatepicker]="pf" [(ngModel)]="dateFin" name="df" /><mat-datepicker-toggle matSuffix [for]="pf"></mat-datepicker-toggle><mat-datepicker #pf></mat-datepicker>
            </mat-form-field>
            <button mat-flat-button color="primary" (click)="charger()"><mat-icon>search</mat-icon> Filtrer</button>
            <mat-form-field appearance="outline"><mat-label>Conclusion</mat-label>
              <mat-select [(ngModel)]="conclusion" (selectionChange)="appliquer()" name="concl">
                <mat-option value="">Toutes</mat-option>
                <mat-option value="SUCCES">Succès</mat-option>
                <mat-option value="ECHEC">Échec</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Type d'évaluation</mat-label>
              <mat-select [(ngModel)]="typeEvaluation" (selectionChange)="appliquer()" name="type">
                <mat-option value="">Tous</mat-option>
                <mat-option value="EVALUATION">Évaluation</mat-option>
                <mat-option value="EVALUATION_SUPPLEMENTAIRE">Évaluation supplémentaire</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Rechercher un agent</mat-label>
              <mat-icon matPrefix>search</mat-icon>
              <input matInput [(ngModel)]="recherche" (ngModelChange)="appliquer()" name="rech" placeholder="Login, nom ou prénom" autocomplete="off" />
            </mat-form-field>
            <button mat-button (click)="reinitialiser()">Réinitialiser</button>
          </div>
          <mat-card>
            <mat-card-content>
              @if (chargement) { <app-chargement /> }
              @else if (toutes.length === 0) { <p class="vide">Aucune évaluation.</p> }
              @else if (pag.length === 0) { <p class="vide">Aucune évaluation ne correspond aux filtres.</p> }
              @else {
                <table mat-table [dataSource]="pag.page" class="table">
                  <ng-container matColumnDef="agent">
                    <th mat-header-cell *matHeaderCellDef>Agent</th>
                    <td mat-cell *matCellDef="let e">{{ e.agent_nom }} {{ e.agent_prenom }}@if (e.agent_login) { <span class="login">({{ e.agent_login }})</span> }</td>
                  </ng-container>
                  <ng-container matColumnDef="type">
                    <th mat-header-cell *matHeaderCellDef>Type</th>
                    <td mat-cell *matCellDef="let e">{{ e.type_code === 'EVALUATION_SUPPLEMENTAIRE' ? 'Évaluation supplémentaire' : 'Évaluation' }}</td>
                  </ng-container>
                  <ng-container matColumnDef="evaluateur">
                    <th mat-header-cell *matHeaderCellDef>Évaluateur</th>
                    <td mat-cell *matCellDef="let e">{{ e.evaluateur_nom }} {{ e.evaluateur_prenom }}</td>
                  </ng-container>
                  <ng-container matColumnDef="date">
                    <th mat-header-cell *matHeaderCellDef>Date d'appel</th>
                    <td mat-cell *matCellDef="let e">{{ e.date_appel ? (e.date_appel | date: 'dd/MM/yyyy') : '—' }}</td>
                  </ng-container>
                  <ng-container matColumnDef="statut">
                    <th mat-header-cell *matHeaderCellDef>Statut</th>
                    <td mat-cell *matCellDef="let e">{{ e.statut }}</td>
                  </ng-container>
                  <ng-container matColumnDef="conclusion">
                    <th mat-header-cell *matHeaderCellDef>Conclusion</th>
                    <td mat-cell *matCellDef="let e">
                      @if (e.conclusion === 'SUCCES') { <mat-chip class="chip-succes">Succès</mat-chip> }
                      @else if (e.conclusion === 'ECHEC') { <mat-chip class="chip-echec">Échec</mat-chip> }
                      @else { — }
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
export class MesAgentsEvalsComponent implements OnInit {
  private readonly service = inject(EvalInstanceService);
  private readonly router = inject(Router);
  private readonly toastr = inject(ToastrService);

  /** Liste reçue du serveur (période) ; `pag` = liste filtrée à l'écran, paginée. */
  toutes: EvaluationListe[] = [];
  readonly pag = new Pagination<EvaluationListe>();
  chargement = false;
  colonnes = ['agent', 'type', 'evaluateur', 'date', 'statut', 'conclusion'];
  conclusion = '';
  typeEvaluation = '';
  recherche = '';
  dateDebut: any = null;
  dateFin: any = null;

  ngOnInit(): void { this.charger(); }

  charger(): void {
    this.chargement = true;
    const f: any = { portee: 'mes-agents' };
    if (this.dateDebut) f.date_debut = toYMD(this.dateDebut);
    if (this.dateFin) f.date_fin = toYMD(this.dateFin);
    this.service.getEvaluations(f).subscribe({
      next: e => { this.toutes = e || []; this.appliquer(); this.chargement = false; },
      error: () => { this.toastr.error('Impossible de charger les évaluations.'); this.chargement = false; },
    });
  }
  /** Filtres d'écran : conclusion, type d'évaluation, recherche (login, nom, prénom). */
  appliquer(): void {
    this.pag.definir(this.toutes.filter(e =>
      (!this.conclusion || e.conclusion === this.conclusion) &&
      (!this.typeEvaluation || (e.type_code || 'EVALUATION') === this.typeEvaluation) &&
      correspondRecherche(this.recherche, [e.agent_login, e.agent_nom, e.agent_prenom])
    ));
  }
  reinitialiser(): void {
    this.dateDebut = null; this.dateFin = null;
    this.conclusion = ''; this.typeEvaluation = ''; this.recherche = '';
    this.charger();
  }
  ouvrir(e: EvaluationListe): void { this.router.navigate(['/mon-espace/evaluation/executer', e.id]); }
}
