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

/**
 * « Mes contre-évaluations » — les contre-évaluations qui portent sur les
 * évaluations de l'utilisateur connecté (en tant qu'évaluateur), consultables
 * une fois terminées et la date de visibilité atteinte (lecture seule).
 */
@Component({
  selector: 'app-mes-contre',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule, MatTableModule, MatChipsModule, MatFormFieldModule, MatInputModule, MatDatepickerModule],
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
          <mat-card>
            <mat-card-content>
              @if (liste.length === 0) {
                <p class="vide">Aucune contre-évaluation visible pour le moment.</p>
              } @else {
                <table mat-table [dataSource]="liste" class="table">
                  <ng-container matColumnDef="responsable">
                    <th mat-header-cell *matHeaderCellDef>Responsable</th>
                    <td mat-cell *matCellDef="let c">{{ c.responsable_nom }} {{ c.responsable_prenom }}</td>
                  </ng-container>
                  <ng-container matColumnDef="appel">
                    <th mat-header-cell *matHeaderCellDef>Éval. #</th>
                    <td mat-cell *matCellDef="let c">#{{ c.id_evaluation_initiale }}</td>
                  </ng-container>
                  <ng-container matColumnDef="conclusion">
                    <th mat-header-cell *matHeaderCellDef>Conclusion</th>
                    <td mat-cell *matCellDef="let c">
                      @if (c.conclusion === 'SUCCES') { <mat-chip class="chip-succes">Succès</mat-chip> }
                      @else if (c.conclusion === 'ECHEC') { <mat-chip class="chip-echec">Échec</mat-chip> }
                      @else { — }
                    </td>
                  </ng-container>
                  <ng-container matColumnDef="visibilite">
                    <th mat-header-cell *matHeaderCellDef>Visible depuis</th>
                    <td mat-cell *matCellDef="let c">{{ c.date_visibilite ? (c.date_visibilite | date: 'dd/MM/yyyy') : '—' }}</td>
                  </ng-container>
                  <tr mat-header-row *matHeaderRowDef="colonnes"></tr>
                  <tr mat-row *matRowDef="let row; columns: colonnes" class="ligne" (click)="ouvrir(row)"></tr>
                </table>
              }
            </mat-card-content>
          </mat-card>
        </mat-card-content>
      </mat-card>
    </div>
  `,
})
export class MesContreComponent implements OnInit {
  private readonly service = inject(EvalContreService);
  private readonly router = inject(Router);
  private readonly toastr = inject(ToastrService);

  liste: ContreListe[] = [];
  colonnes = ['responsable', 'appel', 'conclusion', 'visibilite'];
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
