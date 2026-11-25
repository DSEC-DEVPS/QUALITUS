import { Component, Input, OnChanges, OnInit, SimpleChanges, inject } from '@angular/core';
import { toYMD } from '@shared/date-utils';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatChipsModule } from '@angular/material/chips';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ToastrService } from 'ngx-toastr';
import { EvalSuitesService, LignePlanAction, RE_STATUT_CLOS, UtilisateurAssignable } from '../../eval-suites.service';
import { RefItem } from '../../eval-admin.service';

import { MatDatepickerModule } from '@angular/material/datepicker';
import { ConfirmationService } from '@shared/services/confirmation.service';
import { finalize } from 'rxjs';
import { ChargementComponent } from '@shared/components/chargement/chargement.component';
@Component({
  selector: 'app-plan-action-section',
  standalone: true,
  imports: [ChargementComponent, MatDatepickerModule, MatTooltipModule,
    CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatAutocompleteModule, MatChipsModule, MatTableModule,
  ],
  templateUrl: './plan-action-section.component.html',
  styleUrl: './plan-action-section.component.scss',
})
export class PlanActionSectionComponent implements OnInit, OnChanges {
  chargement = true;
  private readonly confirmation = inject(ConfirmationService);
  private readonly service = inject(EvalSuitesService);
  private readonly toastr = inject(ToastrService);

  @Input() idEvaluation!: number;
  @Input() lectureSeule = false;

  lignes: LignePlanAction[] = [];
  statuts: RefItem[] = [];
  /** Porteurs / contributeurs proposables (son site + site à vision globale, ou tous les sites). */
  users: UtilisateurAssignable[] = [];
  /** Dernières valeurs enregistrées, par ligne : rien n'est envoyé sans changement réel. */
  private readonly enregistre = new Map<number, { synthese: string; id_statut: number | null }>();
  colonnes = ['action', 'porteur', 'echeance', 'statut', 'synthese', 'kpi', 'actions'];
  get colonnesAff(): string[] {
    return this.lectureSeule ? this.colonnes.filter(c => c !== 'actions') : this.colonnes;
  }

  afficherForm = false;
  nouvelle: any = this.vide();

  // Recherche à la saisie (même comportement que le champ Agent)
  porteurRecherche = '';
  contribRecherche = '';

  ngOnInit(): void {
    this.charger();
    this.service.getStatuts().subscribe({ next: s => (this.statuts = s as any) });
    this.chargerUtilisateurs();
  }

  /**
   * Porteurs / contributeurs proposables : seulement en saisie (la route demande
   * evaluation.coacher). En lecture seule (ex. téléconseiller sur sa propre
   * évaluation en échec) on ne l'appelle pas : un refus 403 sur un GET ouvrirait
   * la page d'erreur et empêcherait d'ouvrir l'évaluation.
   */
  ngOnChanges(ch: SimpleChanges): void {
    if (ch['lectureSeule'] && !ch['lectureSeule'].firstChange) this.chargerUtilisateurs();
  }
  private chargerUtilisateurs(): void {
    if (this.lectureSeule || this.users.length) return;
    this.service.getUtilisateurs().subscribe({ next: u => (this.users = u || []) });
  }

  private vide() {
    return { action: '', id_porteur: null, date_debut: null as any, date_attendue: null as any, date_realisation: '', id_statut: null, kpi: '', commentaire: '', synthese: '', contributeurs: [] as number[] };
  }

  charger(): void {
    this.chargement = true;
    this.service.getPlanAction(this.idEvaluation).pipe(finalize(() => (this.chargement = false))).subscribe({
      next: l => {
        this.lignes = l;
        this.enregistre.clear();
        for (const x of l) this.enregistre.set(x.id, { synthese: x.synthese || '', id_statut: x.id_statut ?? null });
      },
      error: () => this.toastr.error('Impossible de charger le plan d’action.'),
    });
  }

  // --- Autocomplete utilisateurs (Porteur / Contributeurs) ---
  usersFiltres(q: string): UtilisateurAssignable[] {
    const t = (q || '').trim().toLowerCase();
    const base = t ? this.users.filter(u => `${u.nom} ${u.prenom} ${u.login || ''}`.toLowerCase().includes(t)) : this.users;
    return base.slice(0, 20);
  }
  choisirPorteur(u: UtilisateurAssignable): void {
    this.nouvelle.id_porteur = u.id;
    this.porteurRecherche = `${u.nom} ${u.prenom}`;
  }
  ajouterContributeur(u: UtilisateurAssignable): void {
    if (!this.nouvelle.contributeurs.includes(u.id)) this.nouvelle.contributeurs.push(u.id);
    this.contribRecherche = '';
  }
  retirerContributeur(id: number): void {
    this.nouvelle.contributeurs = this.nouvelle.contributeurs.filter((x: number) => x !== id);
  }

  ajouter(): void {
    this.service.addLigne({
      id_evaluation: this.idEvaluation, ...this.nouvelle,
      date_debut: toYMD(this.nouvelle.date_debut), date_attendue: toYMD(this.nouvelle.date_attendue),
    }).subscribe({
      next: () => { this.toastr.success('Ligne ajoutée.'); this.afficherForm = false; this.nouvelle = this.vide(); this.porteurRecherche = ''; this.charger(); },
      error: err => this.toastr.error(err?.error?.message || 'Erreur.'),
    });
  }

  // Statut « Réalisé » → la synthèse de clôture devient pertinente
  statutEstRealise(l: LignePlanAction): boolean {
    const s = this.statuts.find(x => x.id === l.id_statut);
    return !!s && /r[ée]alis/i.test(s.libelle || '');
  }

  /** Comparaison sans tenir compte des espaces en trop (même règle que le serveur). */
  private static cle(v: string | null | undefined): string {
    return String(v ?? '').replace(/\s+/g, ' ').trim();
  }

  /** Le statut choisi clôt l'action (Réalisé, Abandonné, Annulé…). */
  statutClot(id: number | null | undefined): boolean {
    const s = this.statuts.find(x => x.id === id);
    return !!s && RE_STATUT_CLOS.test((s.libelle || '').trim());
  }

  /**
   * Statut : envoyé seulement s'il change réellement. Clore l'action demande une
   * synthèse enregistrée et une confirmation : une action close est figée.
   */
  async changerStatut(l: LignePlanAction): Promise<void> {
    const avant = this.enregistre.get(l.id);
    if (avant && (avant.id_statut ?? null) === (l.id_statut ?? null)) return;
    const retablir = () => { if (avant) l.id_statut = avant.id_statut; };
    if (this.statutClot(l.id_statut)) {
      if (!PlanActionSectionComponent.cle(avant?.synthese)) {
        this.toastr.warning('Renseignez et enregistrez d’abord la synthèse pour clore l’action.');
        retablir();
        return;
      }
      const ok = await this.confirmation.confirmer({
        titre: 'Clore l\'action', type: 'attention', oui: 'Clore',
        message: 'Une fois close, l\'action ne pourra plus être modifiée ni supprimée. Continuer ?',
      });
      if (!ok) { retablir(); return; }
    }
    this.envoyer(l, { id_statut: l.id_statut }, () => {
      if (avant) avant.id_statut = l.id_statut ?? null;
      if (this.statutClot(l.id_statut)) l.close = true;
    }, retablir);
  }

  /**
   * Synthèse (à la sortie du champ) : rien n'est envoyé si le texte n'a pas
   * réellement changé ; une synthèse déjà saisie ne peut pas être vidée.
   */
  enregistrerSynthese(l: LignePlanAction): void {
    const avant = this.enregistre.get(l.id) || { synthese: '', id_statut: l.id_statut ?? null };
    const nouvelle = PlanActionSectionComponent.cle(l.synthese);
    if (nouvelle === PlanActionSectionComponent.cle(avant.synthese)) {
      l.synthese = avant.synthese;
      return;
    }
    if (!nouvelle) {
      l.synthese = avant.synthese;
      this.toastr.warning('La synthèse ne peut pas être vide.');
      return;
    }
    this.envoyer(l, { synthese: l.synthese }, r => {
      const propre = r?.ligne?.synthese ?? (l.synthese || '').trim();
      l.synthese = propre;
      avant.synthese = propre;
      this.enregistre.set(l.id, avant);
    }, () => { l.synthese = avant.synthese; });
  }

  /** Envoie uniquement les champs modifiés ; le serveur ne fait rien s'ils sont identiques. */
  private envoyer(l: LignePlanAction, champs: Record<string, any>, ok: (r: any) => void, ko: () => void): void {
    this.service.updateLigne(l.id, champs).subscribe({
      next: (r: any) => { ok(r); if (!r?.inchange) this.toastr.success('Mis à jour.'); },
      error: err => { ko(); this.toastr.error(err?.error?.message || 'Erreur.'); },
    });
  }

  async supprimer(l: LignePlanAction): Promise<void> {
    if (!(await this.confirmation.confirmer({ titre: 'Supprimer l\'action', message: 'Supprimer cette ligne ?', type: 'danger' }))) return;
    this.service.deleteLigne(l.id).subscribe({
      next: () => { this.toastr.success('Supprimée.'); this.charger(); },
      error: () => this.toastr.error('Erreur.'),
    });
  }

  nomUser(id: number | null): string {
    if (!id) return '—';
    const u = this.users.find(x => x.id === id);
    return u ? `${u.nom} ${u.prenom}` : `#${id}`;
  }
}
