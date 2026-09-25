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

import { MatDatepickerModule } from '@angular/material/datepicker';
@Component({
  selector: 'app-liste-evaluations-cahier',
  standalone: true,
  imports: [MatDatepickerModule, 
    CommonModule, FormsModule, RouterLink, MatCardModule, MatButtonModule, MatIconModule,
    MatTableModule, MatChipsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatCheckboxModule,
  ],
  templateUrl: './liste-evaluations.component.html',
  styleUrl: './liste-evaluations.component.scss',
})
export class ListeEvaluationsComponent implements OnInit {
  private readonly service = inject(EvalInstanceService);
  private readonly router = inject(Router);
  private readonly toastr = inject(ToastrService);

  evaluations: EvaluationListe[] = [];
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

  setActif(e: EvaluationListe, actif: boolean, ev: Event): void {
    ev.stopPropagation();
    this.service.setActif(e.id, actif).subscribe({
      next: () => { this.toastr.success(actif ? 'Réactivée.' : 'Désactivée.'); this.charger(); },
      error: () => this.toastr.error('Erreur.'),
    });
  }

  supprimer(e: EvaluationListe, ev: Event): void {
    ev.stopPropagation();
    if (!confirm('Supprimer définitivement cette évaluation (non terminée) ?')) return;
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
