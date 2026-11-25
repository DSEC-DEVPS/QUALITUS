import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ToastrService } from 'ngx-toastr';
import { AgentAssignable, UserService } from '@shared/services/user.service';
import { ConfirmationService } from '@shared/services/confirmation.service';
import { PermissionsService } from '@core/authorization/permissions.service';

interface SuperviseurAssign {
  id: number; nom_utilisateur: string; nom: string; prenom: string; nb_agents: number;
  id_site?: number | null; site?: string | null;
}

/**
 * Assignation des agents de son site à un superviseur : recherche d'agents
 * existants (sans doublon), choix du superviseur avec son équipe actuelle,
 * récapitulatif des changements avant validation.
 * Administrateur : agents et superviseurs de tous les sites (site affiché,
 * superviseurs regroupés par site, rattachements inter-sites signalés).
 */
@Component({
  selector: 'app-assignation',
  standalone: true,
  templateUrl: './assignation.component.html',
  styleUrl: './assignation.component.scss',
  imports: [FormsModule, MatAutocompleteModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatIconModule, MatButtonModule],
})
export class AssignationComponent implements OnInit {
  private readonly userService = inject(UserService);
  private readonly toast = inject(ToastrService);
  private readonly confirmation = inject(ConfirmationService);
  /** Administrateur : tous les sites. */
  readonly admin = inject(PermissionsService).isAdmin();

  agents: AgentAssignable[] = [];
  superviseurs: SuperviseurAssign[] = [];
  choisis: AgentAssignable[] = [];
  idSuperviseur: number | null = null;
  recherche: any = '';
  equipe: AgentAssignable[] = [];
  envoi = false;

  ngOnInit(): void { this.charger(); }

  charger(): void {
    this.userService.getAgentsAssignables().subscribe({ next: a => { this.agents = a || []; this.majEquipe(); }, error: () => {} });
    this.userService.getAllSuperviseurByRo().subscribe({ next: s => (this.superviseurs = s || []), error: () => {} });
  }

  /** Suggestions : agents non encore choisis correspondant à la saisie. */
  get suggestions(): AgentAssignable[] {
    const q = typeof this.recherche === 'string' ? this.recherche.trim().toLowerCase() : '';
    const pris = new Set(this.choisis.map(a => a.id));
    return this.agents
      .filter(a => !pris.has(a.id))
      .filter(a => !q || `${a.prenom} ${a.nom} ${a.nom} ${a.prenom} ${a.login} ${this.admin ? a.site || '' : ''}`.toLowerCase().includes(q))
      .slice(0, 50);
  }
  ajouter(a: AgentAssignable): void {
    if (a && !this.choisis.some(x => x.id === a.id)) this.choisis = [...this.choisis, a];
  }
  retirer(a: AgentAssignable): void { this.choisis = this.choisis.filter(x => x.id !== a.id); }

  get superviseurChoisi(): SuperviseurAssign | undefined { return this.superviseurs.find(s => s.id === this.idSuperviseur); }
  majEquipe(): void { this.equipe = this.agents.filter(a => this.idSuperviseur && a.id_superviseur === this.idSuperviseur); }
  /** Agents choisis qui quittent un autre superviseur. */
  get changements(): AgentAssignable[] {
    return this.choisis.filter(a => a.id_superviseur && a.id_superviseur !== this.idSuperviseur);
  }
  get dejaDansEquipe(): AgentAssignable[] { return this.choisis.filter(a => a.id_superviseur === this.idSuperviseur); }

  /** Superviseurs regroupés par site (affichage administrateur). */
  get superviseursParSite(): { site: string; liste: SuperviseurAssign[] }[] {
    const groupes = new Map<string, SuperviseurAssign[]>();
    for (const s of this.superviseurs) {
      const cle = s.site || 'Sans site';
      groupes.set(cle, [...(groupes.get(cle) || []), s]);
    }
    return [...groupes.entries()].map(([site, liste]) => ({ site, liste }));
  }
  /** Agents choisis d'un autre site que le superviseur choisi (administrateur). */
  get interSites(): AgentAssignable[] {
    const sup = this.superviseurChoisi;
    if (!this.admin || !sup) return [];
    return this.choisis.filter(a => (a.id_site ?? null) !== (sup.id_site ?? null));
  }

  async assigner(): Promise<void> {
    const sup = this.superviseurChoisi;
    if (!this.choisis.length || !sup) return;
    const chg = this.changements.length;
    if (!(await this.confirmation.confirmer({
      titre: 'Confirmer l’assignation',
      message: `${this.choisis.length} agent(s) seront rattachés à ${sup.prenom} ${sup.nom}`
        + (chg ? ` (dont ${chg} qui changent de superviseur).` : '.')
        + (this.interSites.length ? ` Attention : ${this.interSites.length} agent(s) d'un autre site que celui du superviseur.` : ''),
      type: 'attention',
      oui: 'Assigner',
    }))) return;
    this.envoi = true;
    this.userService.assigne_agent({ id_SUPERVISEUR: sup.id, liste_agents: this.choisis.map(a => a.login) }).subscribe({
      next: r => { this.toast.success(r.message); this.envoi = false; this.choisis = []; this.charger(); },
      error: () => { this.envoi = false; },
    });
  }
  reinitialiser(): void { this.choisis = []; this.idSuperviseur = null; this.recherche = ''; this.equipe = []; }
}
