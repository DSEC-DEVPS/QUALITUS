import { Component, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ToastrService } from 'ngx-toastr';
import { EvalCoachingService, CoachingOption } from '../../eval-coaching.service';

/**
 * Coaching (F.39quinquies A) : 5 pourquoi sur l'arbre UNIQUE, cause racine.
 * Affiché dans le détail d'une évaluation conclue en échec.
 */
@Component({
  selector: 'app-coaching-section',
  standalone: true,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatIconModule],
  templateUrl: './coaching-section.component.html',
  styleUrl: './coaching-section.component.scss',
})
export class CoachingSectionComponent implements OnChanges {
  private readonly service = inject(EvalCoachingService);
  private readonly toastr = inject(ToastrService);

  @Input() idEvaluation!: number;
  @Input() lectureSeule = false;

  eligible = false;
  idCoaching = 0;
  statut = '';
  niveaux = [1, 2, 3, 4, 5];
  options: Record<number, CoachingOption[]> = {};
  selection: Record<number, number | null> = {};
  propositionOuverte: Record<number, boolean> = {};
  nouvelleOption: Record<number, string> = {};

  ngOnChanges(ch: SimpleChanges): void {
    if (ch['idEvaluation'] && this.idEvaluation) this.charger();
  }

  private charger(): void {
    this.service.getEvaluationCoaching(this.idEvaluation).subscribe({
      next: async d => {
        this.eligible = d.eligible;
        this.idCoaching = d.coaching?.id || 0;
        this.statut = d.coaching?.statut || '';
        this.options = {}; this.selection = {};
        if (!this.eligible) return;
        await this.loadNiveau(1);
        for (const ch of d.choix.sort((a, b) => a.niveau - b.niveau)) {
          this.selection[ch.niveau] = ch.id_option;
          if (ch.niveau < 5 && ch.id_option) await this.loadNiveau(ch.niveau + 1);
        }
      },
      error: () => this.toastr.error('Impossible de charger le coaching.'),
    });
  }

  private parentId(n: number): number | null { return n === 1 ? null : this.selection[n - 1] || null; }

  private loadNiveau(n: number): Promise<void> {
    if (n > 1 && !this.selection[n - 1]) { this.options[n] = []; return Promise.resolve(); }
    return new Promise(resolve => {
      this.service.getOptionsEnfants({ id_parent: this.parentId(n), niveau: n, id_coaching: this.idCoaching }).subscribe({
        next: o => { this.options[n] = o; resolve(); },
        error: () => { this.options[n] = []; resolve(); },
      });
    });
  }

  onSelect(n: number): void {
    for (let k = n + 1; k <= 5; k++) { this.selection[k] = null; this.options[k] = []; }
    if (n < 5) this.loadNiveau(n + 1);
  }

  private libelleDe(n: number): string {
    const o = (this.options[n] || []).find(x => x.id === this.selection[n]);
    return o ? o.libelle : '';
  }

  private buildChoix() {
    return this.niveaux.filter(n => this.selection[n]).map(n => ({ niveau: n, id_option: this.selection[n], libelle: this.libelleDe(n) }));
  }

  enregistrer(apresProp?: () => void): void {
    this.service.save(this.idEvaluation, this.buildChoix()).subscribe({
      next: r => {
        this.idCoaching = r.idCoaching; this.statut = r.statut;
        this.toastr.success('Coaching enregistré.');
        if (apresProp) apresProp();
      },
      error: err => this.toastr.error(err?.error?.message || 'Erreur.'),
    });
  }

  ouvrirProposition(n: number): void {
    if (n > 1 && !this.selection[n - 1]) { this.toastr.warning('Sélectionnez d’abord le niveau précédent.'); return; }
    if (!this.idCoaching) { this.enregistrer(() => (this.propositionOuverte[n] = true)); return; }
    this.propositionOuverte[n] = true;
  }

  proposer(n: number): void {
    const libelle = (this.nouvelleOption[n] || '').trim();
    if (!libelle) { this.toastr.warning('Saisissez un libellé.'); return; }
    this.service.proposer({ id_parent: this.parentId(n), niveau: n, libelle, id_coaching: this.idCoaching, id_evaluation: this.idEvaluation }).subscribe({
      next: async res => {
        this.toastr.success('Option proposée (en attente de validation).');
        this.propositionOuverte[n] = false; this.nouvelleOption[n] = '';
        await this.loadNiveau(n);
        this.selection[n] = res.id; this.onSelect(n);
      },
      error: err => this.toastr.error(err?.error?.message || 'Erreur.'),
    });
  }

  terminer(): void {
    this.service.terminer(this.idEvaluation).subscribe({
      next: () => { this.toastr.success('Coaching terminé.'); this.statut = 'TERMINE'; },
      error: err => this.toastr.error(err?.error?.message || 'Clôture impossible.'),
    });
  }

  get estTermine(): boolean { return this.statut === 'TERMINE'; }
}
