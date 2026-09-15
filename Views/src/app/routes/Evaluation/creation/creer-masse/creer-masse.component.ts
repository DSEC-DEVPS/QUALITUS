import { Component, OnInit, inject } from '@angular/core';
import { toYMD } from '@shared/date-utils';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Location } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ToastrService } from 'ngx-toastr';
import { EvalInstanceService, AgentEvaluable, RefItem, CompteRenduMasse } from '../../eval-instance.service';

import { MatDatepickerModule } from '@angular/material/datepicker';
@Component({
  selector: 'app-creer-masse-cahier',
  standalone: true,
  imports: [MatDatepickerModule, 
    CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
  ],
  templateUrl: './creer-masse.component.html',
  styleUrl: './creer-masse.component.scss',
})
export class CreerMasseComponent implements OnInit {
  private readonly service = inject(EvalInstanceService);
  private readonly location = inject(Location);
  private readonly toastr = inject(ToastrService);

  agents: AgentEvaluable[] = [];
  contextes: RefItem[] = [];
  envoi = false;
  compteRendu?: CompteRenduMasse;

  commun = { id_contexte: null as number | null, date_appel: null as any, motif_appel: '' };
  agentsSelectionnes: number[] = [];

  ngOnInit(): void {
    this.service.getAgentsEvaluables().subscribe({ next: a => (this.agents = a), error: () => this.toastr.error('Impossible de charger les agents.') });
    this.service.getContextes().subscribe({ next: c => (this.contextes = c) });
  }

  nomAgent(id: number): string {
    const a = this.agents.find(x => x.id === id);
    return a ? `${a.nom} ${a.prenom} (${a.login})` : `#${id}`;
  }

  get peutSoumettre(): boolean {
    return !!this.commun.date_appel && this.agentsSelectionnes.length > 0;
  }

  soumettre(): void {
    if (!this.peutSoumettre) { this.toastr.warning('Sélectionnez au moins un agent et une date d’appel.'); return; }
    const lignes = this.agentsSelectionnes.map(id => ({ type_ressource: 'HUMAINE', id_agent: id }));
    this.envoi = true;
    this.compteRendu = undefined;
    this.service.createEvaluationMasse({ commun: { ...this.commun, date_appel: toYMD(this.commun.date_appel) }, lignes }).subscribe({
      next: cr => { this.envoi = false; this.compteRendu = cr; this.toastr.success(cr.message); },
      error: err => { this.envoi = false; this.toastr.error(err?.error?.message || 'Erreur lors de la création en masse.'); },
    });
  }

  retour(): void { this.location.back(); }
}
