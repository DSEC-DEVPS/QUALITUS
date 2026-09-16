import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatExpansionModule } from '@angular/material/expansion';
import { ToastrService } from 'ngx-toastr';
import { EvalCoachingService, CoachingOption } from '../../eval-coaching.service';

@Component({
  selector: 'app-coaching-arbre',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatExpansionModule],
  templateUrl: './coaching-arbre.component.html',
  styleUrl: './coaching-arbre.component.scss',
})
export class CoachingArbreComponent implements OnInit {
  private readonly service = inject(EvalCoachingService);
  private readonly toastr = inject(ToastrService);

  options: CoachingOption[] = [];
  niveaux = [1, 2, 3, 4, 5];
  nouvelle = { niveau: 1, id_parent: null as number | null, libelle: '' };

  ngOnInit(): void { this.charger(); }

  charger(): void {
    this.service.getArbre().subscribe({ next: o => (this.options = o), error: () => this.toastr.error('Erreur de chargement.') });
  }

  optionsDuNiveau(n: number): CoachingOption[] { return this.options.filter(o => o.niveau === n); }
  parentsPossibles(): CoachingOption[] {
    return this.nouvelle.niveau <= 1 ? [] : this.options.filter(o => o.niveau === this.nouvelle.niveau - 1);
  }
  libelleParent(o: CoachingOption): string {
    const p = this.options.find(x => x.id === o.id_parent);
    return p ? p.libelle : '—';
  }

  ajouter(): void {
    if (!this.nouvelle.libelle.trim()) { this.toastr.warning('Libellé obligatoire.'); return; }
    if (this.nouvelle.niveau > 1 && !this.nouvelle.id_parent) { this.toastr.warning('Sélectionnez le parent.'); return; }
    this.service.addOption({ id_parent: this.nouvelle.niveau > 1 ? this.nouvelle.id_parent : null, niveau: this.nouvelle.niveau, libelle: this.nouvelle.libelle.trim() }).subscribe({
      next: () => { this.toastr.success('Option ajoutée.'); this.nouvelle.libelle = ''; this.charger(); },
      error: err => this.toastr.error(err?.error?.message || 'Erreur.'),
    });
  }

  supprimer(o: CoachingOption): void {
    if (!confirm(`Supprimer « ${o.libelle} » et ses dépendantes ?`)) return;
    this.service.deleteOption(o.id).subscribe({
      next: () => { this.toastr.success('Supprimée.'); this.charger(); },
      error: err => this.toastr.error(err?.error?.message || 'Erreur.'),
    });
  }
}
