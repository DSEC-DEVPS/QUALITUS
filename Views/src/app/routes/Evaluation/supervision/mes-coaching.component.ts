import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { ToastrService } from 'ngx-toastr';
import { EvalInstanceService, EvaluationListe } from '../eval-instance.service';

/**
 * « Mes coaching » (superviseur) : évaluations de ses agents nécessitant un
 * coaching (conclusion échec), quel que soit l'évaluateur.
 */
@Component({
  selector: 'app-mes-coaching',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatTableModule, MatChipsModule],
  template: `
    <div class="cal-page">
      <mat-card class="cal-panel">
        <mat-card-header class="cal-band"><span class="cal-band-title"><mat-icon>psychology</mat-icon> Mes coaching</span></mat-card-header>
        <mat-card-content>
          <p class="cal-desc">Évaluations de vos agents conclues en échec, qui nécessitent un coaching.</p>
          <mat-card>
            <mat-card-content>
              @if (chargement) { <p>Chargement…</p> }
              @else if (evaluations.length === 0) { <p class="vide">Aucun coaching à mener.</p> }
              @else {
                <table mat-table [dataSource]="evaluations" class="table">
                  <ng-container matColumnDef="agent">
                    <th mat-header-cell *matHeaderCellDef>Agent</th>
                    <td mat-cell *matCellDef="let e">{{ e.agent_nom }} {{ e.agent_prenom }}</td>
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
export class MesCoachingComponent implements OnInit {
  private readonly service = inject(EvalInstanceService);
  private readonly router = inject(Router);
  private readonly toastr = inject(ToastrService);

  evaluations: EvaluationListe[] = [];
  chargement = false;
  colonnes = ['agent', 'evaluateur', 'date', 'statut'];

  ngOnInit(): void {
    this.chargement = true;
    this.service.getEvaluations({ portee: 'coaching' }).subscribe({
      next: e => { this.evaluations = e; this.chargement = false; },
      error: () => { this.toastr.error('Impossible de charger les coaching.'); this.chargement = false; },
    });
  }
  ouvrir(e: EvaluationListe): void { this.router.navigate(['/mon-espace/evaluation/executer', e.id]); }
}
