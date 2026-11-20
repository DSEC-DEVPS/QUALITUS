import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { toYMD } from '@shared/date-utils';
import { ToastrService } from 'ngx-toastr';
import { EvalContreService, ContreListe } from '../../eval-contre.service';
import { CanDirective } from '@core/authorization/can.directive';
import { PermissionsService } from '@core/authorization/permissions.service';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatPaginatorModule } from '@angular/material/paginator';
import { Pagination } from '@shared/utils/pagination';
import { ConfirmationService } from '@shared/services/confirmation.service';

@Component({
  selector: 'app-contre-liste',
  standalone: true,
  imports: [MatPaginatorModule, CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule, MatTableModule, MatChipsModule, MatFormFieldModule, MatSelectModule, MatInputModule, MatDatepickerModule, MatButtonToggleModule, CanDirective],
  templateUrl: './contre-liste.component.html',
  styleUrl: './contre-liste.component.scss',
})
export class ContreListeComponent implements OnInit {
  private readonly confirmation = inject(ConfirmationService);
  private readonly service = inject(EvalContreService);
  private readonly router = inject(Router);
  private readonly toastr = inject(ToastrService);
  private readonly perms = inject(PermissionsService);

  readonly pag = new Pagination<ContreListe>();
  get liste(): ContreListe[] { return this.pag.donnees; }
  set liste(v: ContreListe[]) { this.pag.definir(v); }
  /** « Créées par moi » ou, avec contre_evaluation.voir_tous, « Toutes » (périmètre de site). */
  portee: 'miennes' | 'toutes' = 'miennes';
  voirTous = false;
  get colonnes(): string[] {
    const c = ['evaluateur', 'agent', 'appel', 'statut', 'conclusion', 'visibilite'];
    return this.portee === 'toutes' ? [...c, 'responsable', 'actions'] : [...c, 'actions'];
  }
  dateDebut: any = null;
  dateFin: any = null;

  // assistant de création
  afficherAssistant = false;
  sites: { id: number; nom: string }[] = [];
  evaluateurs: any[] = [];
  evaluations: any[] = [];
  idSite: number | null = null;
  idEvaluateur: number | null = null;
  idEvaluation: number | null = null;
  // Recherche dans les listes déroulantes (mot par mot, sans casse ni accents)
  rechercheEvaluateur = '';
  rechercheEvaluation = '';
  private static normaliser(v: any): string {
    return (v ?? '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }
  private static filtrer<T extends { id: number }>(liste: T[], recherche: string, champs: (x: T) => any[], selection: number | null): T[] {
    const mots = ContreListeComponent.normaliser(recherche).split(/\s+/).filter(m => m);
    if (!mots.length) return liste;
    return liste.filter(x => x.id === selection ||
      mots.every(m => champs(x).some(c => ContreListeComponent.normaliser(c).includes(m))));
  }
  get evaluateursFiltres(): any[] {
    return ContreListeComponent.filtrer(this.evaluateurs, this.rechercheEvaluateur, e => [e.nom, e.prenom, e.login], this.idEvaluateur);
  }
  /** Recherche : n° de case, identifiant d'appel, agent évalué (nom, prénom, login). */
  get evaluationsFiltrees(): any[] {
    return ContreListeComponent.filtrer(this.evaluations, this.rechercheEvaluation,
      e => [e.numero_case, e.identifiant_appel, e.agent_nom, e.agent_prenom, e.agent_login], this.idEvaluation);
  }
  /** À l'ouverture : focus sur la recherche ; à la fermeture : on la vide. */
  ouverture(ouvert: boolean, champ: HTMLInputElement, liste: 'evaluateur' | 'evaluation'): void {
    if (ouvert) { setTimeout(() => champ.focus()); return; }
    if (liste === 'evaluateur') this.rechercheEvaluateur = ''; else this.rechercheEvaluation = '';
  }

  ngOnInit(): void {
    this.charger();
    this.service.getContexte().subscribe({
      next: c => {
        this.sites = c.sites || [];
        this.voirTous = c.voir_tous;
        // Hors site à vision globale : son site est imposé.
        if (!c.vision_globale && this.sites.length === 1) { this.idSite = this.sites[0].id; this.onSite(); }
      },
    });
  }

  charger(): void {
    this.service.getAll({ date_debut: toYMD(this.dateDebut), date_fin: toYMD(this.dateFin), portee: this.portee })
      .subscribe({ next: l => (this.liste = l), error: () => this.toastr.error('Erreur de chargement.') });
  }
  reinitialiserFiltres(): void { this.dateDebut = null; this.dateFin = null; this.charger(); }

  onSite(): void {
    this.idEvaluateur = null; this.idEvaluation = null; this.evaluateurs = []; this.evaluations = [];
    if (this.idSite) this.service.getEvaluateurs(this.idSite).subscribe({ next: e => (this.evaluateurs = e) });
  }
  onEvaluateur(): void {
    this.idEvaluation = null; this.evaluations = [];
    if (this.idEvaluateur) this.service.getEvaluations(this.idEvaluateur).subscribe({ next: e => (this.evaluations = e) });
  }

  creer(): void {
    if (!this.idEvaluation) { this.toastr.warning('Sélectionnez une évaluation.'); return; }
    this.service.creer(this.idEvaluation).subscribe({
      next: r => { this.toastr.success('Contre-évaluation créée.'); this.router.navigate(['/mon-espace/evaluation/contre-executer', r.id]); },
      error: err => this.toastr.error(err?.error?.message || 'Erreur.'),
    });
  }

  /** Créateur : tant que la contre-évaluation n'est pas terminée ; sinon la permission dédiée. */
  peut(c: ContreListe, code: string): boolean {
    return this.perms.can(code) || (!!Number(c.est_createur) && c.statut !== 'TERMINE');
  }

  ouvrir(c: ContreListe): void { this.router.navigate(['/mon-espace/evaluation/contre-executer', c.id]); }

  desactiver(c: ContreListe, ev: Event): void {
    ev.stopPropagation();
    this.service.setActif(c.id, false).subscribe({ next: () => { this.toastr.success('Désactivée.'); this.charger(); }, error: (e: any) => this.toastr.error(e?.error?.message || 'Erreur.') });
  }

  async supprimer(c: ContreListe, ev: Event): Promise<void> {
    ev.stopPropagation();
    if (!(await this.confirmation.confirmer({ titre: 'Supprimer la contre-évaluation', message: 'Supprimer définitivement cette contre-évaluation ?', type: 'danger' }))) return;
    this.service.supprimer(c.id).subscribe({
      next: () => { this.toastr.success('Contre-évaluation supprimée.'); this.charger(); },
      error: (e: any) => this.toastr.error(e?.error?.message || 'Suppression impossible.'),
    });
  }
}
