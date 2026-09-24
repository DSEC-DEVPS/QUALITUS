import { Component, OnInit, inject } from '@angular/core';
import { toYMD } from '@shared/date-utils';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { EvalExecutionService } from '../../eval-execution.service';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ToastrService } from 'ngx-toastr';
import {
  EvalInstanceService, AgentEvaluable, ResolutionGrilleAgent, RefItem,
} from '../../eval-instance.service';
import { EvalGrilleService, Grille } from '../../eval-grille.service';

import { MatDatepickerModule } from '@angular/material/datepicker';
@Component({
  selector: 'app-creer-evaluation-cahier',
  standalone: true,
  imports: [MatDatepickerModule, 
    CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatAutocompleteModule, MatRadioModule, MatCheckboxModule,
  ],
  templateUrl: './creer-evaluation.component.html',
  styleUrl: './creer-evaluation.component.scss',
})
export class CreerEvaluationComponent implements OnInit {
  private readonly service = inject(EvalInstanceService);
  private readonly grilleService = inject(EvalGrilleService);
  private readonly execService = inject(EvalExecutionService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly toastr = inject(ToastrService);

  // Création d'une évaluation supplémentaire (liée à un parent en échec)
  idParent: number | null = null;
  agentVerrouille = false;

  agents: AgentEvaluable[] = [];
  grillesAuto: Grille[] = [];
  contextes: RefItem[] = [];
  natures: RefItem[] = [];
  resolution?: ResolutionGrilleAgent;
  envoi = false;
  loginSaisi = '';
  agentTrouve?: AgentEvaluable;
  agentRecherche = '';

  model = {
    type_ressource: 'HUMAINE' as 'HUMAINE' | 'AUTOMATISEE',
    id_agent: null as number | null,
    id_grille: null as number | null,
    id_nature_ressource: null as number | null,
    id_contexte: null as number | null,
    identifiant_appel: '',
    numero_case: '',
    numero_appel: '',
    motif_appel: '',
    date_appel: null as any,
    dmt_h: 0, dmt_m: 0, dmt_s: 0,
    afficher_grille: false,
  };

  ngOnInit(): void {
    this.service.getAgentsEvaluables().subscribe({
      next: a => { this.agents = a; if (this.idParent) this.prefillParent(); },
      error: () => this.toastr.error('Impossible de charger les agents.'),
    });
    this.service.getContextes().subscribe({ next: c => (this.contextes = c) });
    this.service.getNatures().subscribe({ next: n => (this.natures = n) });
    this.grilleService.getGrilles({ statut: 'ACTIVE', type_ressource_cible: 'AUTOMATISEE' }).subscribe({ next: g => (this.grillesAuto = g) });
    const p = Number(this.route.snapshot.queryParamMap.get('parent'));
    if (p) { this.idParent = p; this.prefillParent(); }
  }

  // Évaluation supplémentaire : même agent que le parent, verrouillé.
  private prefillParent(): void {
    if (!this.idParent || !this.agents.length) return;
    this.execService.getDetail(this.idParent).subscribe({
      next: d => {
        const idAgent = (d.evaluation as any).id_agent;
        if (idAgent) {
          this.model.type_ressource = 'HUMAINE';
          this.model.id_agent = idAgent;
          const a = this.agents.find(x => x.id === idAgent);
          if (a) this.agentRecherche = `${a.nom} ${a.prenom} (${a.login})`;
          this.agentVerrouille = true;
          this.onAgentChange();
        }
      },
      error: () => {},
    });
  }

  get agentsFiltres(): AgentEvaluable[] {
    const q = (this.agentRecherche || '').trim().toLowerCase();
    if (!q) return this.agents;
    return this.agents.filter(a => (`${a.nom} ${a.prenom} ${a.login}`).toLowerCase().includes(q));
  }

  selectionAgent(a: AgentEvaluable): void {
    this.model.id_agent = a.id;
    this.agentRecherche = `${a.nom} ${a.prenom} (${a.login})`;
    this.onAgentChange();
  }

  // Si le texte ne correspond plus à l'agent sélectionné, on invalide la sélection
  onAgentTexteChange(): void {
    if (this.agentTrouve) {
      const label = `${this.agentTrouve.nom} ${this.agentTrouve.prenom} (${this.agentTrouve.login})`;
      if (this.agentRecherche !== label) { this.model.id_agent = null; this.resolution = undefined; this.agentTrouve = undefined; }
    }
  }

  onTypeChange(): void {
    this.model.id_agent = null;
    this.agentRecherche = '';
    this.model.id_grille = null;
    this.model.id_nature_ressource = null;
    this.resolution = undefined;
    this.loginSaisi = '';
    this.agentTrouve = undefined;
  }

  onAgentChange(): void {
    this.resolution = undefined;
    this.agentTrouve = this.agents.find(a => a.id === this.model.id_agent);
    if (!this.model.id_agent) return;
    this.service.getGrilleForAgent(this.model.id_agent).subscribe({
      next: r => (this.resolution = r),
      error: () => this.toastr.error('Erreur lors de la résolution de la grille.'),
    });
  }

  // S1 : désignation d'un agent par saisie directe de son login (+ confirmation)
  resoudreLogin(): void {
    const login = (this.loginSaisi || '').trim().toLowerCase();
    if (!login) return;
    const a = this.agents.find(x => (x.login || '').toLowerCase() === login);
    if (!a) { this.agentTrouve = undefined; this.model.id_agent = null; this.resolution = undefined; this.toastr.warning('Aucun agent évaluable avec ce login.'); return; }
    this.model.id_agent = a.id;
    this.onAgentChange();
  }

  get peutSoumettre(): boolean {
    if (!this.model.date_appel) return false;
    if (this.model.type_ressource === 'HUMAINE') return !!this.model.id_agent && !!this.resolution?.ok;
    return !!this.model.id_grille && !!this.model.id_nature_ressource;
  }

  private dmtSecondes(): number {
    return Number(this.model.dmt_h || 0) * 3600 + Number(this.model.dmt_m || 0) * 60 + Number(this.model.dmt_s || 0);
  }

  soumettre(): void {
    if (!this.peutSoumettre) { this.toastr.warning('Veuillez compléter les champs obligatoires.'); return; }
    const body: any = {
      type_ressource: this.model.type_ressource,
      id_contexte: this.model.id_contexte,
      identifiant_appel: this.model.identifiant_appel,
      numero_case: this.model.numero_case,
      numero_appel: this.model.numero_appel,
      motif_appel: this.model.motif_appel,
      date_appel: toYMD(this.model.date_appel),
      dmt: this.dmtSecondes(),
      afficher_grille: this.model.afficher_grille,
    };
    if (this.model.type_ressource === 'HUMAINE') body.id_agent = this.model.id_agent;
    else { body.id_grille = this.model.id_grille; body.id_nature_ressource = this.model.id_nature_ressource; }
    if (this.idParent) body.id_evaluation_parente = this.idParent;

    this.envoi = true;
    this.service.createEvaluation(body).subscribe({
      next: res => {
        this.envoi = false;
        this.toastr.success(this.idParent ? 'Évaluation supplémentaire créée.' : 'Évaluation créée.');
        // Supplémentaire : on exécute directement la nouvelle évaluation.
        if (this.idParent || res.afficher_grille) {
          this.router.navigate(['/mon-espace/evaluation/executer', res.id]);
        } else {
          this.router.navigate(['/mon-espace/evaluation/evaluations']);
        }
      },
      error: err => { this.envoi = false; this.toastr.error(err?.error?.message || 'Erreur lors de la création.'); },
    });
  }

  retour(): void { this.location.back(); }
}
