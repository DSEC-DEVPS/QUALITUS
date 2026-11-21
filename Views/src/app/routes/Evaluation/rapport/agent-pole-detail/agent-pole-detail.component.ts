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
import { finalize } from 'rxjs';
import { ChargementComponent } from '@shared/components/chargement/chargement.component';

/**
 * Détail d'un agent en pôle : évaluations déclenchantes, critères, infos agent +
 * superviseur, et plan d'action éditable par évaluation (si évaluateur/superviseur).
 */
@Component({
  selector: 'app-agent-pole-detail',
  standalone: true,
  imports: [ChargementComponent, CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatChipsModule, MatExpansionModule, PlanActionSectionComponent],
  template: `
    <div class="cal-page">
      <button mat-button (click)="retour()"><mat-icon>arrow_back</mat-icon> Retour</button>

      @if (chargement) { <app-chargement /> } @else if (data) {
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
                  <mat-expansion-panel-header class="ep-tete">
                    <mat-panel-title>
                      <div class="ep-titre">
                        <span class="ep-date">{{ e.date_appel ? (e.date_appel | date: 'dd/MM/yyyy') : '—' }}</span>
                        <span class="ep-sous">Évaluation #{{ e.id }}@if (e.identifiant_appel) { · appel {{ e.identifiant_appel }} }@if (e.evaluateur) { · par {{ e.evaluateur }} }</span>
                      </div>
                    </mat-panel-title>
                    <mat-panel-description class="ep-desc">
                      @if (e.nb_categories) {
                        <span class="ep-cat" [class.ko]="(e.categories_echec?.length || 0) > 0">
                          {{ e.categories_echec?.length || 0 }} / {{ e.nb_categories }} catégorie(s) en échec
                        </span>
                      }
                      @if (e.critiques_decochees > 0) {
                        <span class="tag" [class.fort]="e.critiques_decochees >= 3">{{ e.critiques_decochees }} erreur(s) critique(s)</span>
                      }
                      @if (e.plan_action) {
                        <span class="ep-pa" [attr.data-etat]="e.plan_action.etat">
                          <mat-icon>{{ e.plan_action.etat === 'TERMINE' ? 'task_alt' : e.plan_action.etat === 'EN_COURS' ? 'pending_actions' : 'playlist_add' }}</mat-icon>
                          @switch (e.plan_action.etat) {
                            @case ('AUCUN') { Aucun plan d'action }
                            @case ('TERMINE') { Plan d'action terminé }
                            @default { Plan d'action : {{ e.plan_action.realisees }} / {{ e.plan_action.nb }} }
                          }
                        </span>
                      }
                    </mat-panel-description>
                  </mat-expansion-panel-header>

                  @if (e.categories_echec?.length) {
                    <div class="ep-echecs">
                      @for (c of e.categories_echec; track c.libelle) {
                        <div class="ep-echec">
                          <span class="ep-lib">{{ c.libelle }}@if (c.critique) { <span class="crit-mini">critique</span> }</span>
                          <span class="ep-barre"><span [style.width.%]="c.score > 100 ? 100 : c.score"></span><i [style.left.%]="c.seuil"></i></span>
                          <span class="ep-score">{{ c.score | number: '1.0-1' }} % <small>/ seuil {{ c.seuil }} %</small></span>
                        </div>
                      }
                    </div>
                  }

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
    .info-carte dt { color: var(--qx-texte-2, #666); font-size: 12px; }
    .titre-evals { margin: 8px 0; }
    .eval-actions { display: flex; align-items: center; gap: 16px; margin-bottom: 12px; }
    .eval-actions .lecture { color: var(--qx-texte-3, #888); display: inline-flex; align-items: center; gap: 4px; font-size: 12px; }
    .tag { background: var(--qx-orange-pale, #ffe0b2); padding: 2px 8px; border-radius: 10px; font-size: 12px; white-space: nowrap; }
    .tag.fort { background: var(--qx-rouge-pale, #ffcdd2); color: var(--qx-rouge, #b71c1c); font-weight: 600; }
    ::ng-deep .ep-tete.mat-expansion-panel-header { height: auto !important; min-height: 58px; padding-top: 8px; padding-bottom: 8px; }
    .ep-titre { display: flex; flex-direction: column; line-height: 1.25; }
    .ep-date { font-weight: 600; color: var(--qx-texte, #2b2b2b); }
    .ep-sous { font-size: 12px; color: var(--qx-texte-2, #777); }
    .ep-desc { display: flex; flex-wrap: wrap; justify-content: flex-end; align-items: center; gap: 8px; }
    .ep-cat { font-size: 12px; padding: 2px 8px; border-radius: 10px; background: var(--qx-vert-pale, #e8f5e9); color: var(--qx-vert, #2e7d32); white-space: nowrap; }
    .ep-cat.ko { background: var(--qx-rouge-pale, #fdecea); color: var(--qx-rouge, #c62828); }
    .ep-pa { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; color: var(--qx-texte-2, #777); white-space: nowrap;
      mat-icon { font-size: 16px; width: 16px; height: 16px; } }
    .ep-pa[data-etat='TERMINE'] { color: var(--qx-vert, #2e7d32); }
    .ep-pa[data-etat='EN_COURS'] { color: var(--qx-orange-texte, #e65100); }
    .ep-echecs { border: 1px solid #f5d6d3; background: var(--qx-rouge-pale, #fffafa); border-radius: 8px; padding: 8px 12px; margin-bottom: 12px; }
    .ep-echec { display: grid; grid-template-columns: minmax(160px, 1fr) 2fr 150px; align-items: center; gap: 12px; padding: 4px 0; font-size: 13px; }
    .ep-lib { font-weight: 500; }
    .crit-mini { margin-left: 6px; font-size: 10.5px; color: var(--qx-rouge, #b71c1c); background: var(--qx-rouge-pale, #ffcdd2); padding: 0 6px; border-radius: 8px; }
    .ep-barre { position: relative; height: 8px; background: var(--qx-surface-3, #eee); border-radius: 4px;
      span { position: absolute; left: 0; top: 0; bottom: 0; background: #e53935; border-radius: 4px; }
      i { position: absolute; top: -3px; bottom: -3px; width: 2px; background: #2b2b2b; } }
    .ep-score { text-align: right; font-weight: 600; color: var(--qx-rouge, #c62828); small { font-weight: 400; color: var(--qx-texte-3, #888); } }
  `,
})
export class AgentPoleDetailComponent implements OnInit {
  chargement = true;
  private readonly service = inject(EvalRapportService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly toastr = inject(ToastrService);

  data?: AgentPoleDetail;

  ngOnInit(): void {
    this.chargement = true;
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.service.getAgentDetail(id).pipe(finalize(() => (this.chargement = false))).subscribe({
      next: d => (this.data = d),
      error: err => this.toastr.error(err?.error?.message || 'Détail indisponible.'),
    });
  }

  ouvrirEval(id: number): void { this.router.navigate(['/mon-espace/evaluation/executer', id]); }
  retour(): void { this.location.back(); }
}
