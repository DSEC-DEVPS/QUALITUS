import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ToastrService } from 'ngx-toastr';
import { EvalAdminService, RefItem, RefType } from '../eval-admin.service';

@Component({
  selector: 'app-referentiels',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatButtonToggleModule, MatSlideToggleModule, MatTableModule, MatTooltipModule,
  ],
  templateUrl: './referentiels.component.html',
  styleUrl: './referentiels.component.scss',
})
export class ReferentielsComponent implements OnInit {
  private readonly service = inject(EvalAdminService);
  private readonly toastr = inject(ToastrService);

  types: { key: RefType; label: string }[] = [
    { key: 'contexte', label: 'Contextes' },
    { key: 'nature', label: 'Natures de ressource' },
    { key: 'action', label: 'Actions (plan d’action)' },
    { key: 'statut', label: 'Statuts (plan d’action)' },
    { key: 'kpi', label: 'KPI' },
    { key: 'statut_evaluation', label: 'Statuts après évaluation' },
  ];
  typeActif: RefType = 'contexte';
  items: RefItem[] = [];
  colonnes = ['libelle', 'description', 'ordre', 'etat', 'actions'];
  nouveau = { libelle: '', description: '', ordre: 0 };

  ngOnInit(): void { this.charger(); }

  charger(): void {
    this.service.getRef(this.typeActif).subscribe({
      next: i => (this.items = i),
      error: () => this.toastr.error('Impossible de charger le référentiel.'),
    });
  }

  changerType(t: RefType): void { this.typeActif = t; this.nouveau = { libelle: '', description: '', ordre: 0 }; this.charger(); }

  ajouter(): void {
    if (!this.nouveau.libelle.trim()) { this.toastr.warning('Libellé obligatoire.'); return; }
    this.service.addRef(this.typeActif, { libelle: this.nouveau.libelle.trim(), description: this.nouveau.description, ordre: this.nouveau.ordre }).subscribe({
      next: () => { this.toastr.success('Ajouté.'); this.nouveau = { libelle: '', description: '', ordre: 0 }; this.charger(); },
      error: err => this.toastr.error(err?.error?.message || 'Erreur.'),
    });
  }

  enregistrer(it: RefItem): void {
    if (!it.libelle.trim()) { this.toastr.warning('Libellé obligatoire.'); return; }
    this.service.updateRef(this.typeActif, it.id, { libelle: it.libelle.trim(), description: it.description, etat: it.etat, ordre: it.ordre }).subscribe({
      next: () => this.toastr.success('Modifié.'),
      error: err => this.toastr.error(err?.error?.message || 'Erreur.'),
    });
  }

  basculerEtat(it: RefItem): void {
    it.etat = it.etat === 'ACTIF' ? 'INACTIF' : 'ACTIF';
    this.enregistrer(it);
  }

  supprimer(it: RefItem): void {
    if (!confirm(`Supprimer « ${it.libelle} » ?`)) return;
    this.service.deleteRef(this.typeActif, it.id).subscribe({
      next: () => { this.toastr.success('Supprimé.'); this.charger(); },
      error: err => this.toastr.error(err?.error?.message || 'Suppression impossible.'),
    });
  }
}
