import { Component, OnInit, inject } from '@angular/core';
import { toYMD } from '@shared/date-utils';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ToastrService } from 'ngx-toastr';
import { EvalInstanceService, EvaluationListe, FiltresEvaluation, RefItem } from '../../eval-instance.service';
import { PermissionsService } from '@core/authorization/permissions.service';
import { CanDirective } from '@core/authorization/can.directive';

import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatPaginatorModule } from '@angular/material/paginator';
import { Pagination } from '@shared/utils/pagination';
import { ConfirmationService } from '@shared/services/confirmation.service';
import { ChargementComponent } from '@shared/components/chargement/chargement.component';
@Component({
  selector: 'app-liste-evaluations-cahier',
  standalone: true,
  imports: [ChargementComponent, MatPaginatorModule, MatDatepickerModule,
    CommonModule, FormsModule, RouterLink, MatCardModule, MatButtonModule, MatIconModule,
    MatTableModule, MatChipsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatCheckboxModule, CanDirective,
  ],
  templateUrl: './liste-evaluations.component.html',
  styleUrl: './liste-evaluations.component.scss',
})
export class ListeEvaluationsComponent implements OnInit {
  private readonly confirmation = inject(ConfirmationService);
  private readonly service = inject(EvalInstanceService);
  private readonly router = inject(Router);
  private readonly toastr = inject(ToastrService);
  private readonly perms = inject(PermissionsService);

  readonly pag = new Pagination<EvaluationListe>();
  get evaluations(): EvaluationListe[] { return this.pag.donnees; }
  set evaluations(v: EvaluationListe[]) { this.pag.definir(v); }
  chargement = false;
  colonnes = ['select', 'type', 'agent', 'grille', 'date_appel', 'type_evaluation', 'statut', 'conclusion', 'actions'];

  contextes: RefItem[] = [];
  filtres: FiltresEvaluation = {};
  afficherFiltres = false;
  selection = new Set<number>();

  ngOnInit(): void {
    this.charger();
    this.service.getContextes().subscribe({ next: c => (this.contextes = c) });
  }

  charger(): void {
    this.chargement = true;
    this.selection.clear();
    const f: any = { ...this.filtres, portee: 'creees' };
    if (this.filtres.date_debut) f.date_debut = toYMD(this.filtres.date_debut);
    if (this.filtres.date_fin) f.date_fin = toYMD(this.filtres.date_fin);
    this.service.getEvaluations(f).subscribe({
      next: e => { this.evaluations = e; this.chargement = false; },
      error: () => { this.toastr.error('Impossible de charger les évaluations.'); this.chargement = false; },
    });
  }

  reinitialiser(): void { this.filtres = {}; this.charger(); }

  ouvrir(e: EvaluationListe): void {
    this.router.navigate(['/mon-espace/evaluation/executer', e.id]);
  }

  agent(e: EvaluationListe): string {
    if (e.type_ressource === 'AUTOMATISEE') return '—';
    return [e.agent_nom, e.agent_prenom].filter(Boolean).join(' ') || '—';
  }

  toggleSel(id: number, checked: boolean): void {
    if (checked) this.selection.add(id); else this.selection.delete(id);
  }

  // Cette liste ne contient que les évaluations créées par l'utilisateur.
  /** (Dés)activer : libre avant la fin ; une fois terminée, permission Désactiver. */
  peutDesactiver(e: EvaluationListe): boolean {
    return e.statut !== 'TERMINE' || this.perms.can('evaluation.desactiver');
  }
  /** Supprimer : permission Supprimer, et jamais une évaluation contre-évaluée. */
  peutSupprimer(e: EvaluationListe): boolean {
    return this.perms.can('evaluation.supprimer') && !e.contre_evaluee;
  }

  setActif(e: EvaluationListe, actif: boolean, ev: Event): void {
    ev.stopPropagation();
    this.service.setActif(e.id, actif).subscribe({
      next: () => { this.toastr.success(actif ? 'Réactivée.' : 'Désactivée.'); this.charger(); },
      error: err => this.toastr.error(err?.error?.message || 'Erreur.'),
    });
  }

  async supprimer(e: EvaluationListe, ev: Event): Promise<void> {
    ev.stopPropagation();
    const texte = e.statut === 'TERMINE'
      ? 'Supprimer définitivement cette évaluation TERMINÉE ? Ses résultats, son analyse BI, son coaching, son plan d\'actions et ses évaluations supplémentaires seront supprimés. L\'agent évalué et son superviseur en seront informés.'
      : 'Supprimer définitivement cette évaluation ? L\'agent évalué et son superviseur en seront informés.';
    if (!(await this.confirmation.confirmer({ titre: 'Supprimer l\'évaluation', message: texte, type: 'danger' }))) return;
    this.service.deleteEvaluation(e.id).subscribe({
      next: () => { this.toastr.success('Supprimée.'); this.charger(); },
      error: err => this.toastr.error(err?.error?.message || 'Suppression impossible.'),
    });
  }

  desactiverSelection(): void {
    if (this.selection.size === 0) return;
    this.service.desactiverMasse([...this.selection]).subscribe({
      next: (r: any) => { this.toastr.success(r.message || 'Désactivées.'); this.charger(); },
      error: () => this.toastr.error('Erreur.'),
    });
  }

}
