import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { ToastrService } from 'ngx-toastr';
import { EvalRapportService, AgentPoleDetail } from '../../eval-rapport.service';
import { PlanActionSectionComponent } from '../../execution/plan-action-section/plan-action-section.component';

/**
 * Détail d'un agent en pôle : évaluations déclenchantes, critères, infos agent +
 * superviseur, et plan d'action éditable par évaluation (si évaluateur/superviseur).
 */
@Component({
  selector: 'app-agent-pole-detail',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatChipsModule, MatExpansionModule, PlanActionSectionComponent],
  template: `
    <div class="cal-page">
      <button mat-button (click)="retour()"><mat-icon>arrow_back</mat-icon> Retour</button>

      @if (data) {
        <mat-card class="cal-panel">
          <mat-card-header class="cal-band">
            <span class="cal-band-title"><mat-icon>trending_down</mat-icon>
              Agent en pôle — {{ data.agent.nom }} {{ data.agent.prenom }}</span>
          </mat-card-header>
          <mat-card-content>
            <!-- Critères déclencheurs -->
            <div class="criteres">
              <strong>Critère(s) qui ont mis l'agent en pôle :</strong>
              @for (c of data.agent.criteres; track c) { <mat-chip class="crit">{{ c }}</mat-chip> }
            </div>

            <!-- Infos agent + superviseur -->
            <div class="cartes-infos">
              <mat-card class="info-carte">
                <mat-card-content>
                  <h4><mat-icon>person</mat-icon> Agent</h4>
                  <dl>
                    <dt>Nom</dt><dd>{{ data.infos_agent?.nom }} {{ data.infos_agent?.prenom }}</dd>
                    <dt>Login</dt><dd>{{ data.infos_agent?.login || '—' }}</dd>
                    <dt>Email</dt><dd>{{ data.infos_agent?.email || '—' }}</dd>
                    <dt>Téléphone</dt><dd>{{ data.infos_agent?.telephone || '—' }}</dd>
                    <dt>Site</dt><dd>{{ data.infos_agent?.site || '—' }}</dd>
                    <dt>Programme</dt><dd>{{ data.infos_agent?.programme || '—' }}</dd>
                  </dl>
                </mat-card-content>
              </mat-card>
              <mat-card class="info-carte">
                <mat-card-content>
                  <h4><mat-icon>supervisor_account</mat-icon> Superviseur</h4>
                  @if (data.superviseur) {
                    <dl>
                      <dt>Nom</dt><dd>{{ data.superviseur.nom }} {{ data.superviseur.prenom }}</dd>
                      <dt>Login</dt><dd>{{ data.superviseur.login || '—' }}</dd>
                      <dt>Email</dt><dd>{{ data.superviseur.email || '—' }}</dd>
                      <dt>Téléphone</dt><dd>{{ data.superviseur.telephone || '—' }}</dd>
                    </dl>
                  } @else { <p class="muted">Aucun superviseur rattaché.</p> }
                </mat-card-content>
              </mat-card>
            </div>

            <!-- Évaluations déclenchantes + plan d'action -->
            <h3 class="titre-evals">Évaluations qui l'ont conduit en pôle ({{ data.agent.evaluations.length }})</h3>
            <mat-accordion multi>
              @for (e of data.agent.evaluations; track e.id) {
                <mat-expansion-panel>
                  <mat-expansion-panel-header>
                    <mat-panel-title>
                      Évaluation #{{ e.id }} — {{ e.date_appel ? (e.date_appel | date: 'dd/MM/yyyy') : '' }}
                    </mat-panel-title>
                    <mat-panel-description>
                      @if (e.critiques_decochees >= 3) { <span class="tag">{{ e.critiques_decochees }} erreurs critiques</span> }
                    </mat-panel-description>
                  </mat-expansion-panel-header>

                  <div class="eval-actions">
                    <button mat-stroked-button color="primary" (click)="ouvrirEval(e.id)">
                      <mat-icon>open_in_new</mat-icon> Ouvrir l'évaluation
                    </button>
                    <span class="lecture" *ngIf="!e.peut_plan"><mat-icon>visibility</mat-icon> Plan d'action en lecture seule</span>
                  </div>
                  <!-- Plan d'action : éditable si évaluateur de l'éval ou superviseur de l'agent -->
                  <app-plan-action-section [idEvaluation]="e.id" [lectureSeule]="!e.peut_plan" />
                </mat-expansion-panel>
              }
            </mat-accordion>
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
  styles: `
    .criteres { margin: 8px 0 16px; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    .cartes-infos { display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 16px; }
    .info-carte { flex: 1 1 320px; }
    .info-carte h4 { display: flex; align-items: center; gap: 6px; margin: 0 0 8px; }
    .info-carte dl { display: grid; grid-template-columns: 130px 1fr; gap: 4px 12px; margin: 0; }
    .info-carte dt { color: #666; font-size: 12px; }
    .titre-evals { margin: 8px 0; }
    .eval-actions { display: flex; align-items: center; gap: 16px; margin-bottom: 12px; }
    .eval-actions .lecture { color: #888; display: inline-flex; align-items: center; gap: 4px; font-size: 12px; }
    .tag { background: #ffe0b2; padding: 2px 8px; border-radius: 10px; font-size: 12px; }
  `,
})
export class AgentPoleDetailComponent implements OnInit {
  private readonly service = inject(EvalRapportService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly toastr = inject(ToastrService);

  data?: AgentPoleDetail;

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.service.getAgentDetail(id).subscribe({
      next: d => (this.data = d),
      error: err => this.toastr.error(err?.error?.message || 'Détail indisponible.'),
    });
  }

  ouvrirEval(id: number): void { this.router.navigate(['/mon-espace/evaluation/executer', id]); }
  retour(): void { this.location.back(); }
}
