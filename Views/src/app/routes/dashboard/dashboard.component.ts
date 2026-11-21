import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ChargementComponent } from '@shared/components/chargement/chargement.component';

/** Indicateur : numérateur / dénominateur ; taux null quand il n'y a aucune donnée. */
export interface Ratio { num: number; den: number; taux: number | null; }
interface OptionPerimetre { code: string; libelle: string; }
interface LigneSite {
  id: number; nom: string;
  lecture?: Ratio; evaluations?: number; reussite_evaluations?: Ratio; reussite_quiz?: Ratio;
}
export interface TableauDeBord {
  periode: { du: string; au: string };
  perimetre: { code: string; libelle: string; type: 'global' | 'site' | 'equipe' } | null;
  options_perimetre: OptionPerimetre[];
  vision_globale: boolean;
  auteur_fiches: boolean;
  mes_fiches?: boolean;
  blocs: {
    baseco?: {
      fiches_publiees: number; lecture: Ratio; lecture_j: Ratio; lecture_j2: Ratio;
      utilite: Ratio; exactitude: Ratio; ponctualite: Ratio | null;
      maitrise_premier_essai: Ratio; reussite_apres_retest: Ratio;
    };
    evaluations?: {
      terminees: number; en_cours: number;
      reussite: Ratio; approbation_en_attente: Ratio; coaching_a_faire: number;
    };
    quiz?: {
      quiz_ouverts: number; tentatives: number; participants: number;
      reussite: Ratio; reussite_premier_essai: Ratio; echecs_sans_retest: number;
    };
    sondages?: { sondages_actifs: number; reponse_cibles: Ratio; reponses_periode: number };
    calibrage?: { perimetre_site: boolean; en_preparation: number; en_cours: number; cloturees: number; participation: Ratio };
  };
  par_site?: LigneSite[] | null;
  /** Date et heure du calcul (ISO) ; depuis_cache : résultat mémorisé par le serveur. */
  calcule_le?: string;
  depuis_cache?: boolean;
}

type Preset = 'mois' | 'mois_precedent' | 'trimestre' | 'annee' | 'perso';

/**
 * Tableau de bord : indicateurs Baseco, évaluations, quiz, sondages et calibrage,
 * calculés sur une période et un périmètre (son site ; tous les sites pour le site
 * à vision globale et l'administrateur ; son équipe pour un superviseur).
 * Chaque bloc n'apparaît que si l'utilisateur a les droits du module.
 */
@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatTooltipModule,
    ChargementComponent,
  ],
})
export class DashboardComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly cdr = inject(ChangeDetectorRef);

  donnees: TableauDeBord | null = null;
  chargement = true;
  erreur = false;

  preset: Preset = 'mois';
  du = '';
  au = '';
  perimetre = '';
  mesFiches = false;

  /** Réponses déjà reçues pendant la visite (clé = filtres) : revenir sur un filtre est immédiat. */
  private readonly memoire = new Map<string, TableauDeBord>();
  private requeteEnCours?: { unsubscribe(): void };

  ngOnInit(): void {
    this.appliquerPreset('mois', false);
    this.charger();
  }

  /** Période prédéfinie -> dates « du / au ». */
  appliquerPreset(p: Preset, recharger = true): void {
    this.preset = p;
    const auj = new Date();
    const y = auj.getFullYear();
    const m = auj.getMonth();
    if (p === 'mois') { this.du = this.iso(new Date(y, m, 1)); this.au = this.iso(auj); }
    else if (p === 'mois_precedent') { this.du = this.iso(new Date(y, m - 1, 1)); this.au = this.iso(new Date(y, m, 0)); }
    else if (p === 'trimestre') { this.du = this.iso(new Date(y, m - 2, 1)); this.au = this.iso(auj); }
    else if (p === 'annee') { this.du = this.iso(new Date(y, 0, 1)); this.au = this.iso(auj); }
    if (recharger && p !== 'perso') this.charger();
  }

  datesModifiees(): void {
    this.preset = 'perso';
    if (this.du && this.au) this.charger();
  }

  /** Recharge les indicateurs ; actualiser = true force un nouveau calcul côté serveur. */
  charger(actualiser = false): void {
    const cle = [this.du, this.au, this.perimetre, this.mesFiches ? 1 : 0].join('|');
    const connu = !actualiser ? this.memoire.get(cle) : undefined;
    if (connu) {
      this.requeteEnCours?.unsubscribe();
      this.afficher(connu);
      return;
    }
    this.chargement = true;
    this.erreur = false;
    let params = new HttpParams().set('du', this.du).set('au', this.au);
    if (this.perimetre) params = params.set('perimetre', this.perimetre);
    if (this.mesFiches) params = params.set('mes_fiches', '1');
    if (actualiser) params = params.set('actualiser', '1');
    // Un nouveau filtre annule le calcul précédent encore en cours.
    this.requeteEnCours?.unsubscribe();
    this.requeteEnCours = this.http.get<TableauDeBord>('/api/v1/tableau-de-bord', { params }).subscribe({
      next: d => {
        this.memoire.set(cle, d);
        // Mémorisé aussi sous les filtres effectifs (le serveur peut ajuster le périmètre).
        this.memoire.set([d.periode.du, d.periode.au, d.perimetre?.code || '', d.mes_fiches ? 1 : 0].join('|'), d);
        this.afficher(d);
      },
      error: () => {
        this.erreur = true;
        this.chargement = false;
        this.cdr.markForCheck();
      },
    });
  }

  private afficher(d: TableauDeBord): void {
    this.donnees = d;
    this.perimetre = d.perimetre?.code || '';
    this.mesFiches = !!d.mes_fiches;
    this.chargement = false;
    this.erreur = false;
    this.cdr.markForCheck();
  }

  actualiser(): void {
    this.charger(true);
  }

  /** « Calculé à 06 h 42 » (ou le jour s'il ne s'agit pas d'aujourd'hui). */
  get libelleCalcul(): string {
    const iso = this.donnees?.calcule_le;
    if (!iso) return '';
    const d = new Date(iso);
    const p = (n: number) => String(n).padStart(2, '0');
    const heure = `${p(d.getHours())} h ${p(d.getMinutes())}`;
    return d.toDateString() === new Date().toDateString() ? `Calculé à ${heure}` : `Calculé le ${p(d.getDate())}/${p(d.getMonth() + 1)} à ${heure}`;
  }

  get aucunBloc(): boolean {
    return !!this.donnees && !Object.keys(this.donnees.blocs || {}).length;
  }

  get libellePeriode(): string {
    if (!this.donnees) return '';
    const f = (s: string) => s.split('-').reverse().join('/');
    return `du ${f(this.donnees.periode.du)} au ${f(this.donnees.periode.au)}`;
  }

  /** « 42,5 % » ou « — » s'il n'y a aucune donnée. */
  taux(r?: Ratio | null): string {
    return r && r.taux !== null ? `${String(r.taux).replace('.', ',')} %` : '—';
  }
  /** Nombre avec séparateur de milliers (« 324 001 »). */
  n(v?: number | null): string {
    return (Number(v) || 0).toLocaleString('fr-FR');
  }
  largeur(r?: Ratio | null): number {
    return r && r.taux !== null ? Math.max(0, Math.min(100, r.taux)) : 0;
  }

  private iso(d: Date): string {
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }
}
