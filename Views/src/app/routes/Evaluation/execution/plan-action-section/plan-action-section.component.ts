import { Component, Input, OnInit, inject } from '@angular/core';
import { toYMD } from '@shared/date-utils';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { ToastrService } from 'ngx-toastr';
import { EvalSuitesService, LignePlanAction } from '../../eval-suites.service';
import { EvalAdminService, RefItem } from '../../eval-admin.service';

import { MatDatepickerModule } from '@angular/material/datepicker';
@Component({
  selector: 'app-plan-action-section',
  standalone: true,
  imports: [MatDatepickerModule, 
    CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatTableModule,
  ],
  templateUrl: './plan-action-section.component.html',
  styleUrl: './plan-action-section.component.scss',
})
export class PlanActionSectionComponent implements OnInit {
  private readonly service = inject(EvalSuitesService);
  private readonly admin = inject(EvalAdminService);
  private readonly toastr = inject(ToastrService);

  @Input() idEvaluation!: number;
  @Input() lectureSeule = false;

  lignes: LignePlanAction[] = [];
  actions: RefItem[] = [];
  statuts: RefItem[] = [];
  kpis: RefItem[] = [];
  users: { id: number; nom: string; prenom: string }[] = [];
  colonnes = ['action', 'porteur', 'echeance', 'statut', 'kpi', 'actions'];
  get colonnesAff(): string[] {
    return this.lectureSeule ? this.colonnes.filter(c => c !== 'actions') : this.colonnes;
  }

  afficherForm = false;
  nouvelle: any = this.vide();

  ngOnInit(): void {
    this.charger();
    this.admin.getRef('action').subscribe({ next: a => (this.actions = a) });
    this.admin.getRef('statut').subscribe({ next: s => (this.statuts = s) });
    this.admin.getRef('kpi').subscribe({ next: k => (this.kpis = k) });
    this.service.getUtilisateurs().subscribe({ next: u => (this.users = u || []) });
  }

  private vide() {
    return { id_action: null, id_porteur: null, date_debut: null as any, date_attendue: null as any, date_realisation: '', id_statut: null, id_kpi: null, commentaire: '', contributeurs: [] };
  }

  charger(): void {
    this.service.getPlanAction(this.idEvaluation).subscribe({
      next: l => (this.lignes = l),
      error: () => this.toastr.error('Impossible de charger le plan d’action.'),
    });
  }

  ajouter(): void {
    this.service.addLigne({ id_evaluation: this.idEvaluation, ...this.nouvelle, date_debut: toYMD(this.nouvelle.date_debut), date_attendue: toYMD(this.nouvelle.date_attendue) }).subscribe({
      next: () => { this.toastr.success('Ligne ajoutée.'); this.afficherForm = false; this.nouvelle = this.vide(); this.charger(); },
      error: err => this.toastr.error(err?.error?.message || 'Erreur.'),
    });
  }

  changerStatut(l: LignePlanAction): void {
    this.service.updateLigne(l.id, {
      id_action: l.id_action, id_porteur: l.id_porteur, date_debut: l.date_debut, date_attendue: l.date_attendue,
      date_realisation: l.date_realisation, id_statut: l.id_statut, id_kpi: l.id_kpi, commentaire: l.commentaire,
    }).subscribe({ next: () => this.toastr.success('Mis à jour.'), error: () => this.toastr.error('Erreur.') });
  }

  supprimer(l: LignePlanAction): void {
    if (!confirm('Supprimer cette ligne ?')) return;
    this.service.deleteLigne(l.id).subscribe({
      next: () => { this.toastr.success('Supprimée.'); this.charger(); },
      error: () => this.toastr.error('Erreur.'),
    });
  }

  nomUser(id: number | null): string {
    if (!id) return '—';
    const u = this.users.find(x => x.id === id);
    return u ? `${u.nom} ${u.prenom}` : `#${id}`;
  }
}
