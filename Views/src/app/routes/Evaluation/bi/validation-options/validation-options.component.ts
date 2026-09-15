import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { forkJoin } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { EvalBiService } from '../../eval-bi.service';
import { EvalCoachingService } from '../../eval-coaching.service';

interface OptionUnifiee {
  source: 'BI' | 'COACHING';
  id: number;
  niveau: number;
  libelle: string;
  id_evaluation: number;
  contexte: string;
  proposeur: string;
  parent_libelle: string | null;
  dateCreation: string;
}

@Component({
  selector: 'app-validation-options',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule],
  templateUrl: './validation-options.component.html',
  styleUrl: './validation-options.component.scss',
})
export class ValidationOptionsComponent implements OnInit {
  private readonly bi = inject(EvalBiService);
  private readonly coaching = inject(EvalCoachingService);
  private readonly toastr = inject(ToastrService);

  options: OptionUnifiee[] = [];
  chargement = false;
  reformulation: Record<string, string> = {};
  motifRejet: Record<string, string> = {};
  rejetOuvert: Record<string, boolean> = {};

  ngOnInit(): void { this.charger(); }

  private cle(o: OptionUnifiee): string { return `${o.source}-${o.id}`; }

  charger(): void {
    this.chargement = true;
    forkJoin({ bi: this.bi.getOptionsEnAttente(), co: this.coaching.getOptionsEnAttente() }).subscribe({
      next: ({ bi, co }) => {
        const l1: OptionUnifiee[] = bi.map(o => ({
          source: 'BI', id: o.id, niveau: o.niveau, libelle: o.libelle, id_evaluation: o.id_evaluation_origine,
          contexte: `${o.grille} / ${o.site}`, proposeur: `${o.proposeur_nom} ${o.proposeur_prenom}`,
          parent_libelle: o.parent_libelle, dateCreation: o.dateCreation,
        }));
        const l2: OptionUnifiee[] = co.map(o => ({
          source: 'COACHING', id: o.id, niveau: o.niveau, libelle: o.libelle, id_evaluation: o.id_evaluation,
          contexte: 'Arbre coaching', proposeur: `${o.proposeur_nom} ${o.proposeur_prenom}`,
          parent_libelle: o.parent_libelle, dateCreation: o.dateCreation,
        }));
        this.options = [...l1, ...l2].sort((a, b) => (a.dateCreation < b.dateCreation ? 1 : -1));
        this.chargement = false;
      },
      error: () => { this.toastr.error('Impossible de charger les options.'); this.chargement = false; },
    });
  }

  valider(o: OptionUnifiee): void {
    const lib = (this.reformulation[this.cle(o)] || '').trim() || undefined;
    const obs = o.source === 'BI' ? this.bi.validerOption(o.id, lib) : this.coaching.valider(o.id, lib);
    obs.subscribe({ next: () => { this.toastr.success('Option validée.'); this.charger(); }, error: err => this.toastr.error(err?.error?.message || 'Erreur.') });
  }

  rejeter(o: OptionUnifiee): void {
    const motif = (this.motifRejet[this.cle(o)] || '').trim();
    if (!motif) { this.toastr.warning('Le motif de rejet est obligatoire.'); return; }
    const obs = o.source === 'BI' ? this.bi.rejeterOption(o.id, motif) : this.coaching.rejeter(o.id, motif);
    obs.subscribe({ next: () => { this.toastr.success('Option rejetée.'); this.charger(); }, error: err => this.toastr.error(err?.error?.message || 'Erreur.') });
  }

  k(o: OptionUnifiee): string { return this.cle(o); }
}
