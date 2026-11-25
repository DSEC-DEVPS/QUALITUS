import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ToastrService } from 'ngx-toastr';
import { toYMD } from '@shared/date-utils';
import { Pagination } from '@shared/utils/pagination';
import { correspondRecherche } from '@shared/utils/recherche';
import { ChargementComponent } from '@shared/components/chargement/chargement.component';
import { PermissionsService } from '@core/authorization/permissions.service';
import { EvalContreService, EvaluationAContreEvaluer } from '../../eval-contre.service';

/**
 * Page « Contre-évaluation » : évaluations TERMINÉES du périmètre, filtrées par
 * site (imposé hors site à vision globale), évaluateur (tous par défaut) et
 * période d'évaluation, avec l'état de leur contre-évaluation. Par ligne :
 * « Contre-évaluer » (crée puis ouvre ; « Ouvrir la contre-évaluation » si elle
 * existe déjà) et « Voir le détail » (évaluation d'origine).
 * Les contre-évaluations créées se gèrent dans « Mes contre-évaluations ».
 */
@Component({
  selector: 'app-contre-liste',
  standalone: true,
  imports: [ChargementComponent, CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule, MatTableModule,
    MatFormFieldModule, MatSelectModule, MatInputModule, MatDatepickerModule, MatPaginatorModule, MatTooltipModule],
  templateUrl: './contre-liste.component.html',
  styleUrl: './contre-liste.component.scss',
})
export class ContreListeComponent implements OnInit {
  private readonly service = inject(EvalContreService);
  private readonly router = inject(Router);
  private readonly toastr = inject(ToastrService);
  private readonly perms = inject(PermissionsService);

  readonly colonnes = ['agent', 'evaluateur', 'appel', 'conclusion', 'contre', 'actions'];
  readonly pag = new Pagination<EvaluationAContreEvaluer>();
  toutes: EvaluationAContreEvaluer[] = [];
  chargement = false;
  readonly peutCreer = this.perms.can('contre_evaluation.creer');

  visionGlobale = false;
  sites: { id: number; nom: string }[] = [];
  evaluateurs: { id: number; nom: string; prenom: string; login: string }[] = [];
  /** 0 = tous les sites (site à vision globale) / tous les évaluateurs. */
  idSite = 0;
  idEvaluateur = 0;
  dateDebut: any = null;
  dateFin: any = null;
  etatContre: '' | 'non' | 'oui' = '';
  recherche = '';
  rechercheEvaluateur = '';
  /** Ligne en cours de création (bouton désactivé le temps de la requête). */
  creation: number | null = null;

  get compteNon(): number { return this.toutes.filter(e => !e.contre_id).length; }

  ngOnInit(): void {
    const auj = new Date();
    this.dateDebut = new Date(auj.getFullYear(), auj.getMonth(), 1);
    this.service.getContexte().subscribe({
      next: c => {
        this.sites = c.sites || [];
        this.visionGlobale = !!c.vision_globale;
        // Hors site à vision globale : son site est imposé.
        if (!this.visionGlobale && this.sites.length) this.idSite = this.sites[0].id;
        this.chargerEvaluateurs();
        this.charger();
      },
      error: () => this.toastr.error('Impossible de charger le contexte.'),
    });
  }

  /** Évaluateurs du site choisi (ayant des évaluations terminées) ; aucun site = tous les sites proposés. */
  chargerEvaluateurs(): void {
    const ids = this.idSite ? [this.idSite] : this.sites.map(s => s.id);
    this.evaluateurs = [];
    for (const id of ids) {
      this.service.getEvaluateurs(id).subscribe({
        next: l => {
          const vus = new Set(this.evaluateurs.map(e => e.id));
          this.evaluateurs = [...this.evaluateurs, ...(l || []).filter((e: any) => !vus.has(e.id))]
            .sort((a, b) => `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`));
        },
      });
    }
  }

  get evaluateursFiltres() {
    return this.evaluateurs.filter(e => e.id === this.idEvaluateur || correspondRecherche(this.rechercheEvaluateur, [e.nom, e.prenom, e.login]));
  }
  ouvertureEvaluateurs(ouvert: boolean, champ: HTMLInputElement): void {
    if (ouvert) setTimeout(() => champ.focus()); else this.rechercheEvaluateur = '';
  }

  changerSite(): void { this.idEvaluateur = 0; this.chargerEvaluateurs(); this.charger(); }

  charger(): void {
    this.chargement = true;
    this.service.getAContreEvaluer({
      id_site: this.idSite || null, id_evaluateur: this.idEvaluateur || null,
      date_debut: toYMD(this.dateDebut), date_fin: toYMD(this.dateFin),
    }).subscribe({
      next: l => { this.toutes = l || []; this.appliquer(); this.chargement = false; },
      error: () => { this.toastr.error('Impossible de charger les évaluations.'); this.chargement = false; },
    });
  }

  appliquer(): void {
    this.pag.definir(this.toutes.filter(e =>
      (this.etatContre !== 'non' || !e.contre_id) && (this.etatContre !== 'oui' || !!e.contre_id) &&
      correspondRecherche(this.recherche, [e.agent_nom, e.agent_prenom, e.agent_login, e.numero_case, e.identifiant_appel, e.evaluateur_nom, e.evaluateur_prenom, e.id])));
  }

  reinitialiser(): void {
    if (this.visionGlobale) this.idSite = 0;
    this.idEvaluateur = 0; this.dateDebut = null; this.dateFin = null; this.etatContre = ''; this.recherche = '';
    this.chargerEvaluateurs();
    this.charger();
  }

  /** Raison pour laquelle « Contre-évaluer » est indisponible ('' si possible). */
  blocage(e: EvaluationAContreEvaluer): string {
    if (e.contre_id) return e.peut_ouvrir_contre ? '' : `Déjà contre-évaluée par ${e.contre_responsable_prenom || ''} ${e.contre_responsable_nom || ''}`.trim();
    if (!this.peutCreer) return 'Vous n\'avez pas le droit de créer une contre-évaluation.';
    if (e.propre) return 'Vous ne pouvez pas contre-évaluer votre propre évaluation.';
    return '';
  }

  contreEvaluer(e: EvaluationAContreEvaluer): void {
    if (e.contre_id) { this.router.navigate(['/mon-espace/evaluation/contre-executer', e.contre_id]); return; }
    this.creation = e.id;
    this.service.creer(e.id).subscribe({
      next: r => { this.toastr.success('Contre-évaluation créée.'); this.router.navigate(['/mon-espace/evaluation/contre-executer', r.id]); },
      error: err => { this.creation = null; this.toastr.error(err?.error?.message || 'Création impossible.'); this.charger(); },
    });
  }

  voirDetail(e: EvaluationAContreEvaluer): void { this.router.navigate(['/mon-espace/evaluation/executer', e.id]); }
}
