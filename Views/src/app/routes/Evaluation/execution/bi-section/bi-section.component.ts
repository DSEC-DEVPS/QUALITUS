import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ToastrService } from 'ngx-toastr';
import { EvalBiService, Arborescence, BiOption } from '../../eval-bi.service';

/**
 * Section Business Intelligence (F.39ter) affichée dans le détail d'une
 * évaluation. Si résolution = Non, propose les 5 « pourquoi » en cascade
 * selon l'arborescence du couple grille/site, avec proposition d'option.
 */
@Component({
  selector: 'app-bi-section',
  standalone: true,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatIconModule],
  templateUrl: './bi-section.component.html',
  styleUrl: './bi-section.component.scss',
})
export class BiSectionComponent implements OnChanges {
  private readonly service = inject(EvalBiService);
  private readonly toastr = inject(ToastrService);

  @Input() idEvaluation!: number;
  @Input() resolution: string | null = null;
  @Input() terminee = false;
  @Output() changed = new EventEmitter<void>();

  arbo: Arborescence | null = null;
  chargee = false;
  niveaux = [1, 2, 3, 4, 5];
  options: Record<number, BiOption[]> = {};
  selection: Record<number, number | null> = {};
  propositionOuverte: Record<number, boolean> = {};
  nouvelleOption: Record<number, string> = {};

  ngOnChanges(ch: SimpleChanges): void {
    if ((ch['idEvaluation'] || ch['resolution']) && this.idEvaluation) {
      this.charger();
    }
  }

  private charger(): void {
    this.service.getEvaluationBi(this.idEvaluation).subscribe({
      next: async d => {
        this.arbo = d.arborescence;
        this.chargee = true;
        this.options = {}; this.selection = {};
        if (!this.arbo || this.resolution !== 'NON') return;
        // charge niveau 1 puis rejoue les choix existants
        await this.loadNiveau(1);
        for (const ch of d.choix.sort((a, b) => a.niveau - b.niveau)) {
          this.selection[ch.niveau] = ch.id_option;
          if (ch.niveau < 5 && ch.id_option) await this.loadNiveau(ch.niveau + 1);
        }
      },
      error: () => this.toastr.error('Impossible de charger l’analyse BI.'),
    });
  }

  private parentId(niveau: number): number | null {
    return niveau === 1 ? null : this.selection[niveau - 1] || null;
  }

  private loadNiveau(niveau: number): Promise<void> {
    if (!this.arbo) return Promise.resolve();
    if (niveau > 1 && !this.selection[niveau - 1]) { this.options[niveau] = []; return Promise.resolve(); }
    return new Promise(resolve => {
      this.service.getOptionsEnfants({
        id_arborescence: this.arbo!.id, id_parent: this.parentId(niveau), niveau, id_evaluation: this.idEvaluation,
      }).subscribe({
        next: opts => { this.options[niveau] = opts; resolve(); },
        error: () => { this.options[niveau] = []; resolve(); },
      });
    });
  }

  onSelect(niveau: number): void {
    for (let k = niveau + 1; k <= 5; k++) { this.selection[k] = null; this.options[k] = []; }
    if (niveau < 5) this.loadNiveau(niveau + 1);
  }

  ouvrirProposition(niveau: number): void {
    if (niveau > 1 && !this.selection[niveau - 1]) {
      this.toastr.warning('Sélectionnez d’abord le niveau précédent.');
      return;
    }
    this.propositionOuverte[niveau] = true;
  }

  proposer(niveau: number): void {
    const libelle = (this.nouvelleOption[niveau] || '').trim();
    if (!libelle) { this.toastr.warning('Saisissez un libellé.'); return; }
    this.service.proposerOption({
      id_arborescence: this.arbo!.id, id_parent: this.parentId(niveau), niveau, libelle, id_evaluation: this.idEvaluation,
    }).subscribe({
      next: async res => {
        this.toastr.success('Option proposée (en attente de validation).');
        this.propositionOuverte[niveau] = false;
        this.nouvelleOption[niveau] = '';
        await this.loadNiveau(niveau);
        this.selection[niveau] = res.id;
        this.onSelect(niveau);
      },
      error: err => this.toastr.error(err?.error?.message || 'Erreur.'),
    });
  }

  private libelleDe(niveau: number): string {
    const opt = (this.options[niveau] || []).find(o => o.id === this.selection[niveau]);
    return opt ? opt.libelle : '';
  }

  enregistrer(): void {
    const choix = this.niveaux
      .filter(n => this.selection[n])
      .map(n => ({ niveau: n, id_option: this.selection[n], libelle: this.libelleDe(n) }));
    this.service.saveEvaluationBi(this.idEvaluation, choix).subscribe({
      next: r => {
        this.toastr.success('Analyse enregistrée.');
        if (r.statut === 'EN_ATTENTE_VALIDATION_OPTION') {
          this.toastr.info('Une option est en attente de validation : la clôture est bloquée jusqu’à décision.');
        }
        this.changed.emit();
      },
      error: err => this.toastr.error(err?.error?.message || 'Erreur.'),
    });
  }

  estEnAttente(niveau: number): boolean {
    const opt = (this.options[niveau] || []).find(o => o.id === this.selection[niveau]);
    return !!opt && opt.etat === 'EN_ATTENTE';
  }
}
