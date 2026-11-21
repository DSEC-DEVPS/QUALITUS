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
import { toYMD } from '@shared/date-utils';
import { ToastrService } from 'ngx-toastr';
import { EvalContreService, ContreListe } from '../../eval-contre.service';
import { MatPaginatorModule } from '@angular/material/paginator';
import { Pagination } from '@shared/utils/pagination';

/**
 * « Mes contre-évaluations » — les contre-évaluations qui portent sur les
 * évaluations de l'utilisateur connecté (en tant qu'évaluateur), consultables
 * une fois terminées et la date de visibilité atteinte (lecture seule).
 */
@Component({
  selector: 'app-mes-contre',
  standalone: true,
  imports: [MatPaginatorModule, CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule, MatTableModule, MatChipsModule, MatFormFieldModule, MatInputModule, MatDatepickerModule],
  template: `
    <div class="contre-liste">
      <mat-card class="cal-panel">
        <mat-card-header class="cal-band">
          <span class="cal-band-title"><mat-icon>compare_arrows</mat-icon> Mes contre-évaluations</span>
        </mat-card-header>
        <mat-card-content>
          <p class="cal-desc">Contre-évaluations portant sur vos évaluations, visibles après la date fixée par le responsable.</p>
          <div class="cal-filtres-row">
            <mat-form-field appearance="outline"><mat-label>Du</mat-label>
              <input matInput [matDatepicker]="pd" [(ngModel)]="dateDebut" name="dd" /><mat-datepicker-toggle matSuffix [for]="pd"></mat-datepicker-toggle><mat-datepicker #pd></mat-datepicker>
            </mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Au</mat-label>
              <input matInput [matDatepicker]="pf" [(ngModel)]="dateFin" name="df" /><mat-datepicker-toggle matSuffix [for]="pf"></mat-datepicker-toggle><mat-datepicker #pf></mat-datepicker>
            </mat-form-field>
            <button mat-flat-button color="primary" (click)="charger()"><mat-icon>search</mat-icon> Filtrer</button>
            <button mat-button (click)="reinitialiserFiltres()">Réinitialiser</button>
          </div>
          @if (liste.length === 0) {
            <p class="vide">Aucune contre-évaluation visible pour le moment.</p>
          } @else {
            <div class="table-cadre">
              <table mat-table [dataSource]="pag.page" class="table">
                <ng-container matColumnDef="agent">
                  <th mat-header-cell *matHeaderCellDef>Agent</th>
                  <td mat-cell *matCellDef="let c"><span class="fort">{{ c.agent_prenom }} {{ c.agent_nom }}</span></td>
                </ng-container>
                <ng-container matColumnDef="appel">
                  <th mat-header-cell *matHeaderCellDef>Appel</th>
                  <td mat-cell *matCellDef="let c">{{ c.identifiant_appel || '—' }}</td>
                </ng-container>
                <ng-container matColumnDef="evaluation">
                  <th mat-header-cell *matHeaderCellDef>Évaluation d'origine</th>
                  <td mat-cell *matCellDef="let c"><span class="num">#{{ c.id_evaluation_initiale }}</span></td>
                </ng-container>
                <ng-container matColumnDef="responsable">
                  <th mat-header-cell *matHeaderCellDef>Contre-évaluée par</th>
                  <td mat-cell *matCellDef="let c">{{ c.responsable_prenom }} {{ c.responsable_nom }}</td>
                </ng-container>
                <ng-container matColumnDef="conclusion">
                  <th mat-header-cell *matHeaderCellDef>Conclusion</th>
                  <td mat-cell *matCellDef="let c">
                    @if (c.conclusion === 'SUCCES') { <span class="pastille succes"><mat-icon>check_circle</mat-icon> Succès</span> }
                    @else if (c.conclusion === 'ECHEC') { <span class="pastille echec"><mat-icon>cancel</mat-icon> Échec</span> }
                    @else { — }
                  </td>
                </ng-container>
                <ng-container matColumnDef="visibilite">
                  <th mat-header-cell *matHeaderCellDef>Visible depuis</th>
                  <td mat-cell *matCellDef="let c">{{ c.date_visibilite ? (c.date_visibilite | date: 'dd/MM/yyyy') : '—' }}</td>
                </ng-container>
                <ng-container matColumnDef="ouvrir">
                  <th mat-header-cell *matHeaderCellDef></th>
                  <td mat-cell *matCellDef="let c" class="col-ouvrir"><mat-icon>chevron_right</mat-icon></td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="colonnes"></tr>
                <tr mat-row *matRowDef="let row; columns: colonnes" class="ligne" (click)="ouvrir(row)" title="Ouvrir la contre-évaluation"></tr>
              </table>
              @if (pag.length) {
                <mat-paginator [length]="pag.length" [pageIndex]="pag.pageIndex" [pageSize]="pag.pageSize"
                               [pageSizeOptions]="pag.tailles" showFirstLastButtons (page)="pag.changer($event)" />
              }
            </div>
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: `
    .contre-liste { padding: 16px; }
    .vide { color: rgba(0, 0, 0, .6); padding: 8px 0; }
    .table-cadre { border: 1px solid #ece7e1; border-radius: 8px; overflow: hidden; background: #fff; }
    .table { width: 100%; }
    .ligne { cursor: pointer; transition: background .12s; }
    .ligne:hover { background: #fff6ee; }
    .ligne:hover .col-ouvrir mat-icon { color: var(--orange, #f57c00); transform: translateX(2px); }
    .fort { font-weight: 600; color: #2b2b2b; }
    .num { font-family: monospace; color: #666; }
    .col-ouvrir { width: 40px; text-align: right; mat-icon { color: #bbb; transition: transform .12s; } }
    .pastille { display: inline-flex; align-items: center; gap: 4px; padding: 2px 10px 2px 6px; border-radius: 12px; font-size: 12.5px; font-weight: 600;
      mat-icon { font-size: 16px; width: 16px; height: 16px; } }
    .pastille.succes { background: #e8f5e9; color: #2e7d32; }
    .pastille.echec { background: #fdecea; color: #c62828; }
  `,
})
export class MesContreComponent implements OnInit {
  private readonly service = inject(EvalContreService);
  private readonly router = inject(Router);
  private readonly toastr = inject(ToastrService);

  readonly pag = new Pagination<ContreListe>();
  get liste(): ContreListe[] { return this.pag.donnees; }
  set liste(v: ContreListe[]) { this.pag.definir(v); }
  colonnes = ['agent', 'appel', 'evaluation', 'responsable', 'conclusion', 'visibilite', 'ouvrir'];
  dateDebut: any = null;
  dateFin: any = null;

  ngOnInit(): void { this.charger(); }

  charger(): void {
    this.service.getMes({ date_debut: toYMD(this.dateDebut), date_fin: toYMD(this.dateFin) }).subscribe({
      next: l => (this.liste = l),
      error: () => this.toastr.error('Erreur de chargement.'),
    });
  }
  reinitialiserFiltres(): void { this.dateDebut = null; this.dateFin = null; this.charger(); }

  ouvrir(c: ContreListe): void {
    this.router.navigate(['/mon-espace/evaluation/contre-executer', c.id]);
  }
}
