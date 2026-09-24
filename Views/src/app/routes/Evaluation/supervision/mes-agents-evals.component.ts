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
 * « Évaluations de mes agents » (superviseur) : évaluations qui concernent
 * ses agents et dont il n'est PAS l'évaluateur.
 */
@Component({
  selector: 'app-mes-agents-evals',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatTableModule, MatChipsModule],
  template: `
    <div class="cal-page">
      <mat-card class="cal-panel">
        <mat-card-header class="cal-band"><span class="cal-band-title"><mat-icon>groups</mat-icon> Évaluations de mes agents</span></mat-card-header>
        <mat-card-content>
          <mat-card>
            <mat-card-content>
              @if (chargement) { <p>Chargement…</p> }
              @else if (evaluations.length === 0) { <p class="vide">Aucune évaluation.</p> }
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

  evaluations: EvaluationListe[] = [];
  chargement = false;
  colonnes = ['agent', 'evaluateur', 'date', 'statut', 'conclusion'];

  ngOnInit(): void {
    this.chargement = true;
    this.service.getEvaluations({ portee: 'mes-agents' }).subscribe({
      next: e => { this.evaluations = e; this.chargement = false; },
      error: () => { this.toastr.error('Impossible de charger les évaluations.'); this.chargement = false; },
    });
  }
  ouvrir(e: EvaluationListe): void { this.router.navigate(['/mon-espace/evaluation/executer', e.id]); }
}
