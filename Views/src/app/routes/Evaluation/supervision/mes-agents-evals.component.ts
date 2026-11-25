import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSelectModule } from '@angular/material/select';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { PaginationServeur, debutPeriodeParDefaut } from '@shared/utils/pagination-serveur';
import { toYMD } from '@shared/date-utils';
import { ToastrService } from 'ngx-toastr';
import { EvalInstanceService, EvaluationListe } from '../eval-instance.service';
import { ChargementComponent } from '@shared/components/chargement/chargement.component';

/**
 * « Évaluations de mes agents » (superviseur) : évaluations TERMINÉES qui
 * concernent ses agents et dont il n'est PAS l'évaluateur. Filtres : période
 * (3 derniers mois par défaut), conclusion, type d'évaluation et recherche agent,
 * tous appliqués par le serveur ; seule la page affichée est chargée.
 */
@Component({
  selector: 'app-mes-agents-evals',
  standalone: true,
  imports: [ChargementComponent, CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule, MatTableModule,
    MatFormFieldModule, MatInputModule, MatDatepickerModule, MatSelectModule, MatPaginatorModule],
  template: `
    <div class="cal-page qx-liste">
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
            <button mat-flat-button color="primary" (click)="appliquer()"><mat-icon>search</mat-icon> Filtrer</button>
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
              <input matInput [(ngModel)]="recherche" (ngModelChange)="rechercher()" name="rech" placeholder="Login, nom ou prénom" autocomplete="off" />
            </mat-form-field>
            <button mat-button (click)="reinitialiser()">Réinitialiser</button>
          </div>
              @if (chargement) { <app-chargement /> }
              @else if (pag.length === 0) { <p class="vide">{{ filtreActif ? 'Aucune évaluation ne correspond aux filtres.' : 'Aucune évaluation.' }}</p> }
              @else {
                <p class="compteur">{{ pag.length }} évaluation{{ pag.length > 1 ? 's' : '' }}{{ dateDebut ? ' depuis le ' + (dateDebut | date: 'dd/MM/yyyy') : '' }}</p>
                <div class="table-cadre">
                <table mat-table [dataSource]="pag.page" class="table">
                  <ng-container matColumnDef="agent">
                    <th mat-header-cell *matHeaderCellDef>Agent</th>
                    <td mat-cell *matCellDef="let e"><span class="fort">{{ e.agent_nom }} {{ e.agent_prenom }}</span>@if (e.agent_login) { <span class="login">({{ e.agent_login }})</span> }</td>
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
                    <td mat-cell *matCellDef="let e">{{ e.statut === 'TERMINE' ? 'Terminée' : e.statut }}</td>
                  </ng-container>
                  <ng-container matColumnDef="conclusion">
                    <th mat-header-cell *matHeaderCellDef>Conclusion</th>
                    <td mat-cell *matCellDef="let e">
                      @if (e.conclusion === 'SUCCES') { <span class="pastille succes"><mat-icon>check_circle</mat-icon> Succès</span> }
                      @else if (e.conclusion === 'ECHEC') { <span class="pastille echec"><mat-icon>cancel</mat-icon> Échec</span> }
                      @else { — }
                    </td>
                  </ng-container>
                  <ng-container matColumnDef="ouvrir">
                    <th mat-header-cell *matHeaderCellDef></th>
                    <td mat-cell *matCellDef="let e" class="col-ouvrir"><mat-icon>chevron_right</mat-icon></td>
                  </ng-container>
                  <tr mat-header-row *matHeaderRowDef="colonnes"></tr>
                  <tr mat-row *matRowDef="let row; columns: colonnes" class="ligne" (click)="ouvrir(row)" title="Ouvrir l'évaluation"></tr>
                </table>
                </div>
                <mat-paginator [length]="pag.length" [pageIndex]="pag.pageIndex" [pageSize]="pag.pageSize"
                               [pageSizeOptions]="pag.tailles" showFirstLastButtons (page)="changerPage($event)" />
              }
        </mat-card-content>
      </mat-card>
    </div>
  `,
})
export class MesAgentsEvalsComponent implements OnInit, OnDestroy {
  private readonly service = inject(EvalInstanceService);
  private readonly router = inject(Router);
  private readonly toastr = inject(ToastrService);

  /** Pagination côté serveur : seule la page affichée est chargée. */
  readonly pag = new PaginationServeur<EvaluationListe>();
  chargement = false;
  colonnes = ['agent', 'type', 'evaluateur', 'date', 'statut', 'conclusion', 'ouvrir'];
  conclusion = '';
  typeEvaluation = '';
  recherche = '';
  /** Par défaut : les 3 derniers mois. */
  dateDebut: any = debutPeriodeParDefaut();
  dateFin: any = null;
  private minuterie: any = null;
  /** Numéro de la dernière requête : une réponse plus ancienne est ignorée. */
  private requete = 0;

  get filtreActif(): boolean { return !!(this.conclusion || this.typeEvaluation || this.recherche.trim()); }

  ngOnInit(): void { this.charger(); }
  ngOnDestroy(): void { clearTimeout(this.minuterie); }

  charger(): void {
    this.chargement = true;
    const f: any = { portee: 'mes-agents' };
    if (this.dateDebut) f.date_debut = toYMD(this.dateDebut);
    if (this.dateFin) f.date_fin = toYMD(this.dateFin);
    if (this.conclusion) f.conclusion = this.conclusion;
    if (this.typeEvaluation) f.type_evaluation = this.typeEvaluation;
    if (this.recherche.trim()) f.q = this.recherche.trim();
    const n = ++this.requete;
    this.service.getEvaluationsPage(f, this.pag.params()).subscribe({
      next: r => { if (n !== this.requete) return; this.pag.recevoir(r); this.chargement = false; },
      error: () => { if (n !== this.requete) return; this.toastr.error('Impossible de charger les évaluations.'); this.chargement = false; },
    });
  }
  /** Changement d'un filtre : première page, rechargement. */
  appliquer(): void { clearTimeout(this.minuterie); this.pag.premiere(); this.charger(); }
  /** Recherche agent (login, nom, prénom) : envoyée au serveur après une courte pause de frappe. */
  rechercher(): void { clearTimeout(this.minuterie); this.minuterie = setTimeout(() => this.appliquer(), 350); }
  changerPage(e: PageEvent): void { this.pag.changer(e); this.charger(); }
  reinitialiser(): void {
    this.dateDebut = debutPeriodeParDefaut(); this.dateFin = null;
    this.conclusion = ''; this.typeEvaluation = ''; this.recherche = '';
    this.appliquer();
  }
  ouvrir(e: EvaluationListe): void { this.router.navigate(['/mon-espace/evaluation/executer', e.id]); }
}
