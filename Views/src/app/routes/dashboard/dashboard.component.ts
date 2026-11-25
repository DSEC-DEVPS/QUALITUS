import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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
interface OptionProgramme { id: number; nom: string; utilisateurs: number; }
/** Chargement encore dans son délai (à relancer) ou parmi les moins lus. */
export interface FicheARelancer {
  id: number; titre: string; jour_pub: string; destinataires: number; lus: number; taux: number | null;
  jour_j_en_cours: boolean; jours_restants_j2: number;
}
export interface FicheMoinsLue {
  id: number; titre: string; jour_pub: string; archive: boolean; destinataires: number; lus: number;
  taux: number | null; taux_j2: number | null;
}
interface LigneSite {
  id: number; nom: string;
  lecture?: Ratio; evaluations?: number; reussite_evaluations?: Ratio; reussite_quiz?: Ratio;
}
export interface TableauDeBord {
  periode: { du: string; au: string };
  perimetre: { code: string; libelle: string; type: 'global' | 'site' | 'equipe' } | null;
  options_perimetre: OptionPerimetre[];
  options_programme?: OptionProgramme[];
  programme?: { id: number; nom: string } | null;
  vision_globale: boolean;
  auteur_fiches: boolean;
  mes_fiches?: boolean;
  blocs: {
    baseco?: {
      fiches_publiees: number; lecture: Ratio; lecture_j: Ratio; lecture_j2: Ratio;
      utilite: Ratio; exactitude: Ratio; ponctualite: Ratio | null;
      maitrise_premier_essai: Ratio; reussite_apres_retest: Ratio;
      en_delai_j?: number; en_delai_j2?: number;
      a_relancer?: FicheARelancer[]; moins_lues?: FicheMoinsLue[];
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
    calibrage?: { perimetre_site: boolean; programme_non_applique?: boolean; en_preparation: number; en_cours: number; cloturees: number; participation: Ratio };
    coaching?: { a_faire: number; en_cours: number; termines: number };
    plans_actions?: { en_cours: number; en_retard: number; echeance_proche: number; realisees: number };
  };
  par_site?: LigneSite[] | null;
  /** Période de comparaison et valeurs des indicateurs qui dépendent de la période (out130). */
  comparaison?: { du: string; au: string; court: string; libelle: string; valeurs: Record<string, number | null> };
  /** Date et heure du calcul (ISO) ; depuis_cache : résultat mémorisé par le serveur. */
  calcule_le?: string;
  depuis_cache?: boolean;
}

type Preset = 'mois' | 'mois_precedent' | 'trimestre' | 'annee' | 'perso';
export type Onglet = 'baseco' | 'evaluations' | 'plans' | 'quiz' | 'calibrage' | 'sites';
/** Niveau d'un indicateur : bon (vert), moyen (orange), mauvais (rouge), neutre (sans seuil ou sans donnée). */
export type Niveau = 'bon' | 'moyen' | 'mauvais' | 'neutre';
/** Écart avec la période de comparaison, prêt à afficher. */
export interface Ecart { texte: string; classe: 'hausse-bonne' | 'baisse-mauvaise' | 'baisse-bonne' | 'hausse-mauvaise' | 'stable'; titre: string; }
export interface Essentiel { cle: string; libelle: string; valeur: string; niveau: Niveau; barre: number | null; detail: string; onglet: Onglet; ecart: Ecart | null; }

/** Seuils des taux (out130) : vert à partir de 80 %, orange de 50 à 80 %, rouge en dessous de 50 %. */
export const SEUIL_BON = 80;
export const SEUIL_MOYEN = 50;
const LIBELLE_NIVEAU: Record<Niveau, string> = { bon: 'Bon', moyen: 'À surveiller', mauvais: 'À traiter', neutre: '' };

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
    RouterLink,
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
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  /** Onglet affiché (gardé dans l'adresse : ?onglet=…). */
  onglet: Onglet = 'baseco';
  onglets: { id: Onglet; libelle: string; badge: number }[] = [];
  essentiel: Essentiel[] = [];
  /** Écarts par indicateur (« baseco.lecture »…) ; absent = pas de comparaison possible. */
  ecarts: Record<string, Ecart> = {};
  /** Libellés des indicateurs sans donnée, regroupés sur une ligne grise par onglet. */
  sansDonnee: Partial<Record<Onglet, string[]>> = {};
  readonly libelleNiveau = LIBELLE_NIVEAU;
  /** Nombre de tuiles Baseco affichées : 5 ou 6 -> 3 colonnes (2 lignes pleines au lieu d'un trou). */
  nbTuilesBaseco = 0;

  donnees: TableauDeBord | null = null;
  chargement = true;
  erreur = false;

  preset: Preset = 'mois';
  du = '';
  au = '';
  perimetre = '';
  /** Programme choisi (out124) ; null = tous les programmes. */
  programme: number | null = null;
  mesFiches = false;

  /** Réponses déjà reçues pendant la visite (clé = filtres) : revenir sur un filtre est immédiat. */
  private readonly memoire = new Map<string, TableauDeBord>();
  private requeteEnCours?: { unsubscribe(): void };

  ngOnInit(): void {
    const o = this.route.snapshot.queryParamMap.get('onglet') as Onglet | null;
    if (o) this.onglet = o;
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
    const cle = [this.du, this.au, this.perimetre, this.programme ?? '', this.mesFiches ? 1 : 0].join('|');
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
    if (this.programme) params = params.set('programme', String(this.programme));
    if (this.mesFiches) params = params.set('mes_fiches', '1');
    if (actualiser) params = params.set('actualiser', '1');
    // Un nouveau filtre annule le calcul précédent encore en cours.
    this.requeteEnCours?.unsubscribe();
    this.requeteEnCours = this.http.get<TableauDeBord>('/api/v1/tableau-de-bord', { params }).subscribe({
      next: d => {
        this.memoire.set(cle, d);
        // Mémorisé aussi sous les filtres effectifs (le serveur peut ajuster le périmètre).
        this.memoire.set([d.periode.du, d.periode.au, d.perimetre?.code || '', d.programme?.id ?? '', d.mes_fiches ? 1 : 0].join('|'), d);
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
    this.programme = d.programme?.id ?? null;
    this.mesFiches = !!d.mes_fiches;
    this.preparer(d);
    this.chargement = false;
    this.erreur = false;
    this.cdr.markForCheck();
  }

  actualiser(): void {
    this.charger(true);
  }

  // -------------------------------------------------------------------
  // Présentation (out130) : onglets, bandeau « L'essentiel », écarts, seuils
  // -------------------------------------------------------------------
  choisirOnglet(o: Onglet): void {
    this.onglet = o;
    this.router.navigate([], { relativeTo: this.route, queryParams: { onglet: o }, queryParamsHandling: 'merge', replaceUrl: true });
    this.cdr.markForCheck();
  }

  /** Niveau d'un taux selon les seuils ; null (aucune donnée) = neutre. */
  niveauTaux(t: number | null | undefined): Niveau {
    if (t === null || t === undefined) return 'neutre';
    return t >= SEUIL_BON ? 'bon' : t >= SEUIL_MOYEN ? 'moyen' : 'mauvais';
  }
  /** Niveau d'un compteur « à traiter » (coachings à faire, actions en retard…) : rouge dès 1. */
  niveauAlerte(v: number | null | undefined): Niveau {
    return (Number(v) || 0) > 0 ? 'mauvais' : 'bon';
  }

  /** Écart affiché sur une tuile : « Stable », « ▲ +5,1 pts vs oct. » ; infobulle avec les deux valeurs. */
  private calculerEcart(cle: string, actuel: number | null | undefined, pct: boolean, hausseBonne: boolean): Ecart | null {
    const c = this.donnees?.comparaison;
    const avant = c?.valeurs?.[cle];
    if (!c || avant === null || avant === undefined || actuel === null || actuel === undefined) return null;
    const ecart = Math.round((actuel - avant) * 10) / 10;
    const f = (v: number) => (pct ? `${String(Math.round(v * 10) / 10).replace('.', ',')} %` : this.n(v));
    const titre = `${c.libelle.charAt(0).toUpperCase() + c.libelle.slice(1)} : ${f(avant)} → période affichée : ${f(actuel)}`;
    if (ecart === 0) return { texte: 'Stable', classe: 'stable', titre };
    const abs = String(Math.abs(ecart)).replace('.', ',');
    const unite = pct ? (Math.abs(ecart) >= 2 ? ' pts' : ' pt') : '';
    const texte = `${ecart > 0 ? '▲ +' : '▼ −'}${abs}${unite} vs ${c.court}`;
    const bonne = ecart > 0 === hausseBonne;
    return { texte, titre, classe: ecart > 0 ? (bonne ? 'hausse-bonne' : 'hausse-mauvaise') : bonne ? 'baisse-bonne' : 'baisse-mauvaise' };
  }

  private preparer(d: TableauDeBord): void {
    const b = d.blocs;
    const e: Record<string, Ecart> = {};
    const ajouter = (cle: string, actuel: number | null | undefined, pct: boolean, hausseBonne = true) => {
      const x = this.calculerEcart(cle, actuel, pct, hausseBonne);
      if (x) e[cle] = x;
    };
    if (b.baseco) {
      ajouter('baseco.fiches_publiees', b.baseco.fiches_publiees, false);
      for (const k of ['lecture', 'lecture_j', 'lecture_j2', 'utilite', 'exactitude', 'maitrise_premier_essai', 'reussite_apres_retest'] as const) {
        ajouter('baseco.' + k, b.baseco[k]?.taux, true);
      }
      ajouter('baseco.ponctualite', b.baseco.ponctualite?.taux, true);
    }
    if (b.evaluations) {
      ajouter('evaluations.terminees', b.evaluations.terminees, false);
      ajouter('evaluations.reussite', b.evaluations.reussite.taux, true);
      ajouter('evaluations.approbation_en_attente', b.evaluations.approbation_en_attente.num, false, false);
      ajouter('evaluations.coaching_a_faire', b.evaluations.coaching_a_faire, false, false);
    }
    if (b.coaching) {
      ajouter('coaching.a_faire', b.coaching.a_faire, false, false);
      ajouter('coaching.termines', b.coaching.termines, false);
    }
    if (b.plans_actions) ajouter('plans_actions.realisees', b.plans_actions.realisees, false);
    if (b.quiz) {
      ajouter('quiz.tentatives', b.quiz.tentatives, false);
      ajouter('quiz.reussite', b.quiz.reussite.taux, true);
      ajouter('quiz.reussite_premier_essai', b.quiz.reussite_premier_essai.taux, true);
    }
    if (b.sondages) ajouter('sondages.reponses_periode', b.sondages.reponses_periode, false);
    if (b.calibrage) ajouter('calibrage.cloturees', b.calibrage.cloturees, false);
    this.ecarts = e;

    // Indicateurs sans donnée : une ligne grise par onglet au lieu de tuiles vides.
    const vides: Partial<Record<Onglet, string[]>> = {};
    const vide = (o: Onglet, libelle: string, r?: Ratio | null) => {
      if (r && !r.den) (vides[o] = vides[o] || []).push(libelle);
    };
    if (b.baseco) {
      vide('baseco', 'Utilité', b.baseco.utilite);
      vide('baseco', 'Exactitude', b.baseco.exactitude);
      vide('baseco', 'Ponctualité (on time)', b.baseco.ponctualite);
      vide('baseco', 'Quiz de fiche réussi du 1er coup', b.baseco.maitrise_premier_essai);
      vide('baseco', 'Réussite après retest', b.baseco.reussite_apres_retest);
    }
    if (b.evaluations) vide('evaluations', 'Taux de réussite des évaluations', b.evaluations.reussite);
    if (b.quiz) {
      vide('quiz', 'Taux de réussite des quiz', b.quiz.reussite);
      vide('quiz', 'Réussite au 1er essai', b.quiz.reussite_premier_essai);
    }
    if (b.sondages) vide('quiz', 'Taux de réponse aux sondages', b.sondages.reponse_cibles);
    if (b.calibrage) vide('calibrage', 'Participation au calibrage', b.calibrage.participation);
    this.sansDonnee = vides;
    this.nbTuilesBaseco = b.baseco ? 8 - (vides.baseco?.length || 0) - (b.baseco.ponctualite ? 0 : 1) : 0;

    // Onglets disponibles selon les droits ; pastille = éléments à traiter.
    const coachingAFaire = b.coaching ? b.coaching.a_faire : b.evaluations ? b.evaluations.coaching_a_faire : 0;
    const onglets: { id: Onglet; libelle: string; badge: number }[] = [];
    if (b.baseco) onglets.push({ id: 'baseco', libelle: 'Baseco', badge: 0 });
    if (b.evaluations || b.coaching) onglets.push({ id: 'evaluations', libelle: 'Évaluations et coaching', badge: coachingAFaire });
    if (b.plans_actions) onglets.push({ id: 'plans', libelle: "Plans d'actions", badge: b.plans_actions.en_retard });
    if (b.quiz || b.sondages) onglets.push({ id: 'quiz', libelle: 'Quiz et sondages', badge: b.quiz ? b.quiz.echecs_sans_retest : 0 });
    if (b.calibrage) onglets.push({ id: 'calibrage', libelle: 'Calibrage', badge: 0 });
    if (d.par_site?.length) onglets.push({ id: 'sites', libelle: 'Par site', badge: 0 });
    this.onglets = onglets;
    if (onglets.length && !onglets.some(o => o.id === this.onglet)) this.onglet = onglets[0].id;

    // Bandeau « L'essentiel » : 8 indicateurs au plus, selon les droits.
    const ess: Essentiel[] = [];
    const t = (r?: Ratio | null) => (r ? r.taux : null);
    if (b.baseco) {
      ess.push({ cle: 'baseco.lecture', libelle: 'Lecture Baseco', valeur: this.taux(b.baseco.lecture), niveau: this.niveauTaux(t(b.baseco.lecture)),
        barre: t(b.baseco.lecture), onglet: 'baseco', ecart: e['baseco.lecture'] || null,
        detail: b.baseco.lecture.den ? `${this.n(b.baseco.lecture.num)} lectures sur ${this.n(b.baseco.lecture.den)} destinataires` : 'Aucun destinataire' });
      ess.push({ cle: 'baseco.lecture_j2', libelle: 'Lecture sous 2 jours', valeur: this.taux(b.baseco.lecture_j2), niveau: this.niveauTaux(t(b.baseco.lecture_j2)),
        barre: t(b.baseco.lecture_j2), onglet: 'baseco', ecart: e['baseco.lecture_j2'] || null,
        detail: b.baseco.en_delai_j2 ? `provisoire : ${b.baseco.en_delai_j2} chargement${b.baseco.en_delai_j2 > 1 ? 's' : ''} dans le délai` : `${this.n(b.baseco.lecture_j2.num)} sur ${this.n(b.baseco.lecture_j2.den)} à la publication` });
    }
    if (b.evaluations) {
      ess.push({ cle: 'evaluations.terminees', libelle: 'Évaluations terminées', valeur: this.n(b.evaluations.terminees), niveau: 'neutre', barre: null,
        onglet: 'evaluations', ecart: e['evaluations.terminees'] || null, detail: `${this.n(b.evaluations.en_cours)} en cours sur la période` });
      ess.push({ cle: 'evaluations.reussite', libelle: 'Réussite évaluations', valeur: this.taux(b.evaluations.reussite), niveau: this.niveauTaux(t(b.evaluations.reussite)),
        barre: t(b.evaluations.reussite), onglet: 'evaluations', ecart: e['evaluations.reussite'] || null,
        detail: b.evaluations.reussite.den ? `${this.n(b.evaluations.reussite.num)} réussies sur ${this.n(b.evaluations.reussite.den)}` : 'Aucune évaluation terminée' });
    }
    if (b.coaching || b.evaluations) {
      const cle = b.coaching ? 'coaching.a_faire' : 'evaluations.coaching_a_faire';
      ess.push({ cle, libelle: 'Coachings à faire', valeur: this.n(coachingAFaire), niveau: this.niveauAlerte(coachingAFaire), barre: null,
        onglet: 'evaluations', ecart: e[cle] || null, detail: 'évaluations en échec à coacher' });
    }
    if (b.plans_actions) {
      ess.push({ cle: 'plans_actions.en_retard', libelle: 'Actions en retard', valeur: this.n(b.plans_actions.en_retard), niveau: this.niveauAlerte(b.plans_actions.en_retard),
        barre: null, onglet: 'plans', ecart: null, detail: 'échéance dépassée (état actuel)' });
    }
    if (b.quiz) {
      ess.push({ cle: 'quiz.reussite', libelle: 'Réussite quiz', valeur: this.taux(b.quiz.reussite), niveau: this.niveauTaux(t(b.quiz.reussite)),
        barre: t(b.quiz.reussite), onglet: 'quiz', ecart: e['quiz.reussite'] || null,
        detail: `${this.n(b.quiz.tentatives)} passage${b.quiz.tentatives > 1 ? 's' : ''} · ${this.n(b.quiz.participants)} participant${b.quiz.participants > 1 ? 's' : ''}` });
    }
    if (b.sondages) {
      ess.push({ cle: 'sondages.reponse_cibles', libelle: 'Réponse aux sondages', valeur: this.taux(b.sondages.reponse_cibles), niveau: this.niveauTaux(t(b.sondages.reponse_cibles)),
        barre: t(b.sondages.reponse_cibles), onglet: 'quiz', ecart: null,
        detail: b.sondages.reponse_cibles.den ? `${this.n(b.sondages.reponse_cibles.num)} sur ${this.n(b.sondages.reponse_cibles.den)} destinataires` : 'Aucun sondage actif' });
    }
    this.essentiel = ess;
  }

  /** Classe de couleur d'une valeur de tuile selon le niveau du taux. */
  classeTaux(r?: Ratio | null): string {
    return 'niv-' + this.niveauTaux(r ? r.taux : null);
  }
  /** Largeur (%) d'une barre « Par site » ; 0 sans donnée. */
  barreSite(r?: Ratio | null): number {
    return r && r.taux !== null ? Math.max(0, Math.min(100, r.taux)) : 0;
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

  /** Paramètres d'URL reprenant le périmètre affiché (site, équipe ; rien pour tous les sites). */
  private perimetreParams(): Record<string, string> {
    const p = this.donnees?.perimetre;
    if (!p) return {};
    const out: Record<string, string> = { perimetre_libelle: p.libelle };
    if (p.type === 'equipe') out['equipe'] = '1';
    else if (p.type === 'site') out['id_site'] = p.code.slice(5);
    const prog = this.donnees?.programme;
    if (prog) { out['id_programme'] = String(prog.id); out['programme_libelle'] = prog.nom; }
    return out;
  }

  /** Lien d'une tuile « Suivi du coaching » vers Mes coaching, filtrée (état, période, périmètre). */
  lienCoaching(etat: 'a_faire' | 'en_cours' | 'termine'): Record<string, string> {
    const p = this.perimetreParams();
    const q: Record<string, string> = { etat, date_sur: 'evaluation', du: this.donnees!.periode.du, au: this.donnees!.periode.au };
    if (!p['equipe']) q['etendue'] = 'perimetre';
    if (p['id_site']) q['id_site'] = p['id_site'];
    if (p['id_programme']) { q['id_programme'] = p['id_programme']; q['programme_libelle'] = p['programme_libelle']; }
    return q;
  }

  /** Lien d'une tuile « Suivi des plans d'actions » vers la page de suivi, filtrée. */
  lienPlans(etat: string): Record<string, string> {
    const q: Record<string, string> = { etat, ...this.perimetreParams() };
    if (etat === 'realisee') { q['periode'] = 'realisation'; q['du'] = this.donnees!.periode.du; q['au'] = this.donnees!.periode.au; }
    return q;
  }

  /** « 24/11 » */
  jourCourt(iso: string): string { const [, m, j] = iso.split('-'); return `${j}/${m}`; }
  /** Délai restant d'un chargement à relancer. */
  delaiRestant(f: FicheARelancer): string {
    if (f.jour_j_en_cours) return 'Jour J en cours';
    if (f.jours_restants_j2 <= 0) return 'Dernier jour (J+2)';
    return `Encore ${f.jours_restants_j2} jour${f.jours_restants_j2 > 1 ? 's' : ''} pour J+2`;
  }
  tauxNombre(t: number | null): string { return t === null ? '—' : `${String(t).replace('.', ',')} %`; }
  /** Ouvre un chargement depuis les tableaux de relance. */
  ouvrirFiche(id: number): void { this.router.navigateByUrl(`/lecture-fiche/${id}`); }

  private iso(d: Date): string {
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }
}
