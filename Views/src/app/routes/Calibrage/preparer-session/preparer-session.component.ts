import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatTableModule } from '@angular/material/table';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { ToastrService } from 'ngx-toastr';
import { UserService } from '@shared/services/user.service';
import { CalibrageService, CalSession, CalParticipant, CalTransaction, EvaluateurDispo, CalSessionListe } from '../calibrage.service';

@Component({
  selector: 'app-cal-preparer-session',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatDatepickerModule,
    MatTableModule, MatCheckboxModule, MatTooltipModule, MatExpansionModule, MatAutocompleteModule,
  ],
  templateUrl: './preparer-session.component.html',
  styleUrl: './preparer-session.component.scss',
})
export class PreparerSessionComponent implements OnInit {
  private readonly service = inject(CalibrageService);
  private readonly userService = inject(UserService);
  private readonly toastr = inject(ToastrService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  id!: number;
  session: CalSession | null = null;
  participants: CalParticipant[] = [];
  transactions: CalTransaction[] = [];
  disponibles: EvaluateurDispo[] = [];
  autresSessions: CalSessionListe[] = [];
  sites: any[] = [];
  grilles: any[] = [];

  selection = new Set<number>();          // id_evaluateur sélectionnés
  sourceDup: number | null = null;
  colonnesTx = ['ordre', 'identifiant', 'agent', 'descriptif', 'date', 'actions'];

  txForm: any = this.txVide();
  txEditId: number | null = null;

  // Recherche participants (liste déroulante à cases + recherche nom/prénom)
  rechercheParticipant = '';
  // Agents (autocomplete du champ Agent de la transaction) + recherche
  agents: any[] = [];
  agentRecherche = '';

  get brouillon(): boolean { return this.session?.statut === 'BROUILLON'; }
  get ordresPossibles(): number[] {
    const n = Number(this.session?.nombre_transactions) || 0;
    return Array.from({ length: n }, (_, i) => i + 1);
  }
  get capAtteint(): boolean {
    const n = Number(this.session?.nombre_transactions) || 0;
    return n > 0 && this.transactions.length >= n;
  }
  get disponiblesFiltres(): EvaluateurDispo[] {
    const q = (this.rechercheParticipant || '').trim().toLowerCase();
    if (!q) return this.disponibles;
    return this.disponibles.filter(e => `${e.nom} ${e.prenom}`.toLowerCase().includes(q));
  }
  // Le champ Agent ne propose que les utilisateurs du SITE de la session
  // (liste des évaluateurs disponibles, résolue sur session.id_site).
  agentsFiltres(): any[] {
    const q = (this.agentRecherche || '').trim().toLowerCase();
    const base = q ? this.disponibles.filter(a => `${a.nom} ${a.prenom}`.toLowerCase().includes(q)) : this.disponibles;
    return base.slice(0, 20);
  }
  choisirAgentTx(a: any): void {
    this.txForm.id_agent = a.id;
    this.agentRecherche = `${a.nom} ${a.prenom} (${a.nom_utilisateur})`;
  }

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.userService.getAllSite().subscribe({ next: s => (this.sites = s || []) });
    this.userService.getEvalGrillesActives().subscribe({ next: g => (this.grilles = g || []) });
    this.charger();
  }

  charger(): void {
    this.service.getSession(this.id).subscribe({
      next: d => {
        this.session = d.session;
        this.participants = d.participants;
        this.selection = new Set(d.participants.map(p => p.id_evaluateur));
        this.chargerDisponibles();
      },
      error: () => this.toastr.error('Session introuvable.'),
    });
    this.service.getTransactions(this.id).subscribe({ next: t => (this.transactions = t) });
    this.service.getSessions({}).subscribe({ next: s => (this.autresSessions = s.filter(x => x.id !== this.id)) });
  }

  chargerDisponibles(): void {
    this.service.getEvaluateursDisponibles(this.id).subscribe({ next: e => (this.disponibles = e), error: () => {} });
  }

  // --- Paramètres ---
  enregistrerParams(): void {
    if (!this.session) return;
    this.service.updateSession(this.id, {
      nom: this.session.nom, description: this.session.description, date_calibrage: this.session.date_calibrage,
      id_site: this.session.id_site, id_grille: this.session.id_grille,
      nombre_transactions: this.session.nombre_transactions, duree_minutes: this.session.duree_minutes,
    }).subscribe({
      next: () => { this.toastr.success('Paramètres enregistrés.'); this.chargerDisponibles(); },
      error: err => this.toastr.error(err?.error?.message || 'Erreur.'),
    });
  }

  // --- Participants ---
  bascule(idEval: number, coche: boolean): void {
    if (coche) this.selection.add(idEval); else this.selection.delete(idEval);
  }
  estSelectionne(idEval: number): boolean { return this.selection.has(idEval); }

  enregistrerParticipants(): void {
    this.service.setParticipants(this.id, Array.from(this.selection)).subscribe({
      next: () => { this.toastr.success('Participants enregistrés.'); this.charger(); },
      error: err => this.toastr.error(err?.error?.message || 'Erreur.'),
    });
  }
  retirer(p: CalParticipant): void {
    if (!confirm(`Retirer ${p.prenom} ${p.nom} ?`)) return;
    this.service.removeParticipant(this.id, p.id).subscribe({
      next: () => { this.toastr.success('Participant retiré.'); this.charger(); },
      error: err => this.toastr.error(err?.error?.message || 'Retrait impossible.'),
    });
  }
  inviterTous(): void {
    this.service.inviter(this.id).subscribe({
      next: (r: any) => { this.toastr.success(r.message); this.charger(); },
      error: err => this.toastr.error(err?.error?.message || 'Erreur.'),
    });
  }
  relancer(p: CalParticipant): void {
    this.service.inviter(this.id, [p.id]).subscribe({
      next: (r: any) => { this.toastr.success(r.message); this.charger(); },
      error: err => this.toastr.error(err?.error?.message || 'Erreur.'),
    });
  }

  // --- Transactions ---
  txVide() {
    return { identifiant_appel: '', descriptif: '', numero_case: '', numero_appel: '', id_agent: null as any, date_appel: null as any, motif_appel: '', ordre_passage: null as any };
  }
  editerTx(t: any): void {
    this.txEditId = t.id;
    this.txForm = { ...t };
    this.agentRecherche = t.id_agent ? `${t.agent_nom || ''} ${t.agent_prenom || ''} (${t.agent_login || ''})` : '';
  }
  annulerTx(): void { this.txEditId = null; this.txForm = this.txVide(); this.agentRecherche = ''; }
  enregistrerTx(): void {
    if (!this.txForm.identifiant_appel?.trim() || !this.txForm.descriptif?.trim() || this.txForm.ordre_passage == null) {
      this.toastr.warning('Identifiant, descriptif et ordre de passage sont obligatoires.'); return;
    }
    const obs = this.txEditId
      ? this.service.updateTransaction(this.txEditId, this.txForm)
      : this.service.addTransaction(this.id, this.txForm);
    obs.subscribe({
      next: () => { this.toastr.success(this.txEditId ? 'Transaction modifiée.' : 'Transaction ajoutée.'); this.annulerTx(); this.rechargerTx(); },
      error: err => this.toastr.error(err?.error?.message || 'Erreur.'),
    });
  }
  supprimerTx(t: CalTransaction): void {
    if (!confirm('Supprimer cette transaction ?')) return;
    this.service.deleteTransaction(t.id).subscribe({
      next: () => { this.toastr.success('Transaction supprimée.'); this.rechargerTx(); },
      error: err => this.toastr.error(err?.error?.message || 'Erreur.'),
    });
  }
  dupliquer(): void {
    if (!this.sourceDup) { this.toastr.warning('Choisissez une session source.'); return; }
    this.service.dupliquerTransactions(this.id, this.sourceDup).subscribe({
      next: (r: any) => { this.toastr.success(r.message); this.rechargerTx(); },
      error: err => this.toastr.error(err?.error?.message || 'Erreur.'),
    });
  }
  private rechargerTx(): void { this.service.getTransactions(this.id).subscribe({ next: t => (this.transactions = t) }); }

  // --- Ouverture ---
  ouvrir(): void {
    this.service.ouvrir(this.id).subscribe({
      next: () => { this.toastr.success('Session ouverte.'); this.charger(); },
      error: err => this.toastr.error(err?.error?.message || 'Ouverture impossible.'),
    });
  }

  retour(): void { this.router.navigate(['/mon-espace/calibrage/sessions']); }
}
