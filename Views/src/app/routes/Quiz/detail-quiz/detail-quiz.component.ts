import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabChangeEvent, MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import {
  AppearanceAnimation,
  ConfirmBoxInitializer,
  DialogLayoutDisplay,
  DisappearanceAnimation,
} from '@costlydeveloper/ngx-awesome-popup';
import * as XLSX from 'xlsx';
import { QuizService } from '@shared/services/quiz.service';
import { PermissionsService } from '@core/authorization/permissions.service';
import {
  Question,
  Quiz,
  QuizIp,
  QuizIpDemande,
  RapportParticipant,
  QuestionRatee,
  OptionRatee,
  SiteOption,
} from '../interfaces';
import {
  QuestionDialogComponent,
  QuestionDialogData,
  QuestionDialogResult,
} from '../question-dialog/question-dialog.component';
import {
  actionModification,
  confirmerImpact,
  exporterTentativesQuiz,
  MSG_QUIZ_FERME,
  pointsLabel,
  quizDejaPasse,
} from '../question-dialog/questions-impact';
import { TentativeDetailDialogComponent } from './tentative-detail-dialog.component';
import { MatPaginatorModule } from '@angular/material/paginator';
import { Pagination } from '@shared/utils/pagination';
import { finalize } from 'rxjs';
import { ChargementComponent } from '@shared/components/chargement/chargement.component';

/**
 * Page "Detail" d'un quiz : en-tete (parametres + PIN) + onglets
 * Questions / Rapports / Autorisations IP. Ouverte depuis la liste des quiz.
 */
@Component({
  selector: 'app-detail-quiz',
  standalone: true,
  imports: [ChargementComponent, MatPaginatorModule,
    DatePipe,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatTableModule,
    MatTooltipModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
  ],
  templateUrl: './detail-quiz.component.html',
  styleUrl: './detail-quiz.component.scss',
})
export class DetailQuizComponent implements OnInit {
  chargement = true;
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly quizSrv = inject(QuizService);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastrService);
  private readonly perms = inject(PermissionsService);

  /** « 10 / 15 » : points obtenus / points du quiz. */
  readonly pointsLabel = pointsLabel;

  quizId!: number;
  quiz?: Quiz;
  questions: Question[] = [];

  // Onglet Rapports > Questions ratée (distribution des réponses)
  questionsRatees: QuestionRatee[] = [];

  // Onglet Rapports > Tous participants
  readonly pagParticipants = new Pagination<RapportParticipant>();
  get participants(): RapportParticipant[] { return this.pagParticipants.donnees; }
  set participants(v: RapportParticipant[]) { this.pagParticipants.definir(v); }
  colsParticipants = ['num', 'nom', 'date_debut', 'date_fin', 'statut', 'point', 'points', 'temps', 'site', 'actions'];
  sitesOptions: SiteOption[] = [];
  filtreAgent = '';
  filtreStatut = '';
  filtreSite = '';

  // Onglet Autorisations IP
  ips: QuizIp[] = [];
  colsIp = ['adresse_ip', 'site', 'libelle', 'agent', 'actions'];
  nouvelleIp = '';
  nouvelleIpLibelle = '';
  /** Site obligatoire : une même IP privée peut exister sur plusieurs sites. */
  nouvelleIpSite: number | null = null;
  envoiIp = false;

  // Demandes d'acces IP en attente
  demandes: QuizIpDemande[] = [];
  colsDemande = ['agent', 'site', 'adresse_ip', 'dateCreation', 'actions'];

  // ----- Onglet Diffusion (désignation des participants, Partie II) -----
  fonctionsOptions: any[] = [];
  programmesOptions: any[] = [];
  diffSites: number[] = [];
  diffPostes: number[] = [];      // « Poste » = fonction du socle commun
  diffProgrammes: number[] = [];
  private _candidats: any[] = [];          // population issue des filtres
  get candidats(): any[] { return this._candidats; }
  set candidats(v: any[]) { this._candidats = v; this.majCandidats(); }
  private _rechercheCandidat: string = '';
  get rechercheCandidat(): string { return this._rechercheCandidat; }
  set rechercheCandidat(v: string) { this._rechercheCandidat = v; this.majCandidats(); }
  selection = new Set<number>();  // ids des participants retenus (nominatif)
  selDetails = new Map<number, any>(); // détails des retenus (pour l'affichage hors filtre)
  private _participantsDiffuses: any[] = [];
  get participantsDiffuses(): any[] { return this._participantsDiffuses; }
  set participantsDiffuses(v: any[]) { this._participantsDiffuses = v; this.majParticipantsDiffuses(); }
  diffusionEnCours = false;

  ngOnInit(): void {
    this.quizId = Number(this.route.snapshot.paramMap.get('id'));
    this.charger();
    this.chargerRapport();
    this.chargerParticipants();
    this.chargerIps();
    this.chargerDemandes();
    this.quizSrv.getSites().subscribe({ next: s => (this.sitesOptions = s), error: () => {} });
    this.quizSrv.getFonctions().subscribe({ next: f => (this.fonctionsOptions = f || []), error: () => {} });
    this.quizSrv.getProgrammes().subscribe({ next: p => (this.programmesOptions = p || []), error: () => {} });
    // Diffusion et utilisateurs autorisés : chargés après le quiz, selon les droits
    // (quiz.modifier ; autorisations réservées au site propriétaire) — voir charger().
  }

  /** Côté propriétaire (admin, créateur, site propriétaire). */
  get coteProprietaire(): boolean {
    return this.quiz?.cote_proprietaire === 1;
  }

  /** Sites proposés dans la Diffusion : son seul site pour un utilisateur autorisé. */
  get sitesDiffusion(): SiteOption[] {
    if (this.coteProprietaire || this.quiz?.mon_site_id == null) return this.sitesOptions;
    return this.sitesOptions.filter(s => Number(s.id) === Number(this.quiz?.mon_site_id));
  }

  // Recherche dans la liste des participants (login, nom, prénom, site ; mot par mot)
  private _rechercheParticipant: string = '';
  get rechercheParticipant(): string { return this._rechercheParticipant; }
  set rechercheParticipant(v: string) { this._rechercheParticipant = v; this.majParticipantsDiffuses(); }
  readonly pagDiffuses = new Pagination<any>();
  majParticipantsDiffuses(): void { this.pagDiffuses.definir(this.participantsFiltres); }
  get participantsFiltres(): any[] {
    const mots = (this.rechercheParticipant || '').toLowerCase().split(/\s+/).filter(m => m);
    if (!mots.length) return this.participantsDiffuses;
    return this.participantsDiffuses.filter(p => {
      const texte = [p.nom_utilisateur, p.nom, p.prenom, p.site]
        .map(v => (v ?? '').toString().toLowerCase())
        .join(' ');
      return mots.every(m => texte.includes(m));
    });
  }

  /** Gestion du quiz (diffusion, autorisations) : permission quiz.modifier de la matrice. */
  get peutGerer(): boolean {
    return this.perms.can('quiz.modifier');
  }

  // Participants déjà diffusés (liste nominative figée).
  chargerParticipantsDiffuses() {
    this.quizSrv.getParticipantsDiffusion(this.quizId).subscribe({
      next: p => (this.participantsDiffuses = p || []),
      error: () => {},
    });
  }

  // Recharge la population selon les filtres. La sélection déjà faite est
  // conservée (un retenu hors périmètre demeure retenu, cf. point 6).
  chargerCandidats() {
    const p = {
      sites: this.diffSites.join(','),
      postes: this.diffPostes.join(','),
      programmes: this.diffProgrammes.join(','),
      quiz: this.quizId, // l'API limite un utilisateur autorisé à son site
    };
    this.quizSrv.rechercherUtilisateursDiffusion(p).subscribe({
      next: u => (this.candidats = u || []),
      error: () => this.toast.error('Impossible de charger les utilisateurs'),
    });
  }

  readonly pagCandidats = new Pagination<any>();
  majCandidats(): void { this.pagCandidats.definir(this.candidatsFiltres()); }
  candidatsFiltres(): any[] {
    const q = (this.rechercheCandidat || '').trim().toLowerCase();
    if (!q) return this.candidats;
    return this.candidats.filter(
      c => `${c.nom} ${c.prenom} ${c.nom_utilisateur}`.toLowerCase().includes(q)
    );
  }

  dejaParticipant(id: number): boolean {
    return this.participantsDiffuses.some(p => p.id_UTILISATEUR === id);
  }
  estSelectionne(id: number): boolean {
    return this.selection.has(id);
  }
  basculer(id: number, coche: boolean) {
    if (coche) {
      this.selection.add(id);
      const c = this.candidats.find(x => x.id === id);
      if (c) this.selDetails.set(id, c);
    } else {
      this.selection.delete(id);
    }
  }
  // Retient en une action toute la population filtrée (point 5) — sans
  // enregistrer le filtre comme règle (liste nominative).
  selectionnerTout() {
    for (const c of this.candidatsFiltres()) {
      if (!this.dejaParticipant(c.id)) { this.selection.add(c.id); this.selDetails.set(c.id, c); }
    }
  }
  retirerTout() {
    this.selection.clear();
  }
  retirerUn(id: number) {
    this.selection.delete(id);
  }
  // Les retenus qui ne sont plus dans la population filtrée — signalés
  // visuellement pour qu'un resserrement de filtre ne les retire pas à l'insu
  // de celui qui diffuse (point 6).
  retenusHorsFiltre(): any[] {
    return [...this.selection]
      .filter(id => !this.candidats.some(c => c.id === id))
      .map(id => this.selDetails.get(id))
      .filter(u => !!u);
  }
  get nbSelection(): number {
    return this.selection.size;
  }

  diffuser() {
    if (this.selection.size === 0) {
      this.toast.warning('Aucun participant retenu : la diffusion est refusée.');
      return;
    }
    this.diffusionEnCours = true;
    this.quizSrv.diffuser(this.quizId, [...this.selection]).subscribe({
      next: r => {
        this.toast.success(r.message);
        this.diffusionEnCours = false;
        this.selection.clear();
        this.chargerParticipantsDiffuses();
        this.charger();
      },
      error: err => {
        this.diffusionEnCours = false;
        this.toast.error(err?.error?.message || "Une erreur s'est produite");
      },
    });
  }

  // ----- Utilisateurs autorisés (Partie IV) -----
  readonly pagAutorises = new Pagination<any>();
  get autorises(): any[] { return this.pagAutorises.donnees; }
  set autorises(v: any[]) { this.pagAutorises.definir(v); }
  private _candidatsAuto: any[] = [];
  get candidatsAuto(): any[] { return this._candidatsAuto; }
  set candidatsAuto(v: any[]) { this._candidatsAuto = v; this.majCandidatsAuto(); }
  autoSites: number[] = [];
  autoPostes: number[] = [];
  autoProgrammes: number[] = [];
  private _rechercheAuto: string = '';
  get rechercheAuto(): string { return this._rechercheAuto; }
  set rechercheAuto(v: string) { this._rechercheAuto = v; this.majCandidatsAuto(); }
  selectionAuto = new Set<number>();
  selAutoDetails = new Map<number, any>();
  autorisationEnCours = false;

  get peutAutoriser(): boolean {
    return this.peutGerer && !!this.quiz && (this.quiz as any).peut_autoriser === 1;
  }

  chargerAutorises() {
    this.quizSrv.getAutorises(this.quizId).subscribe({
      next: a => (this.autorises = a || []),
      error: () => {},
    });
  }
  chargerCandidatsAuto() {
    this.quizSrv
      .candidatsAutorisation(this.quizId, {
        sites: this.autoSites.join(','),
        postes: this.autoPostes.join(','),
        programmes: this.autoProgrammes.join(','),
      })
      .subscribe({
        next: u => (this.candidatsAuto = u || []),
        error: () => {},
      });
  }
  readonly pagCandidatsAuto = new Pagination<any>();
  majCandidatsAuto(): void { this.pagCandidatsAuto.definir(this.candidatsAutoFiltres()); }
  candidatsAutoFiltres(): any[] {
    const q = (this.rechercheAuto || '').trim().toLowerCase();
    if (!q) return this.candidatsAuto;
    return this.candidatsAuto.filter(c => `${c.nom} ${c.prenom} ${c.nom_utilisateur}`.toLowerCase().includes(q));
  }
  dejaAutorise(id: number): boolean {
    return this.autorises.some(a => a.id_UTILISATEUR === id);
  }
  estSelAuto(id: number): boolean { return this.selectionAuto.has(id); }
  basculerAuto(id: number, coche: boolean) {
    if (coche) {
      this.selectionAuto.add(id);
      const c = this.candidatsAuto.find(x => x.id === id);
      if (c) this.selAutoDetails.set(id, c);
    } else {
      this.selectionAuto.delete(id);
    }
  }
  selectionnerToutAuto() {
    for (const c of this.candidatsAutoFiltres()) {
      if (!this.dejaAutorise(c.id)) { this.selectionAuto.add(c.id); this.selAutoDetails.set(c.id, c); }
    }
  }
  retirerToutAuto() { this.selectionAuto.clear(); }
  retirerUnSelAuto(id: number) { this.selectionAuto.delete(id); }
  retenusHorsFiltreAuto(): any[] {
    return [...this.selectionAuto]
      .filter(id => !this.candidatsAuto.some(c => c.id === id))
      .map(id => this.selAutoDetails.get(id))
      .filter(u => !!u);
  }
  get nbSelAuto(): number { return this.selectionAuto.size; }

  autoriser() {
    if (this.selectionAuto.size === 0) {
      this.toast.warning('Aucun utilisateur sélectionné.');
      return;
    }
    this.autorisationEnCours = true;
    this.quizSrv.autoriser(this.quizId, [...this.selectionAuto]).subscribe({
      next: r => {
        this.toast.success(r.message);
        this.autorisationEnCours = false;
        this.selectionAuto.clear();
        this.chargerAutorises();
      },
      error: err => {
        this.autorisationEnCours = false;
        this.toast.error(err?.error?.message || "Une erreur s'est produite");
      },
    });
  }

  retirerAutorise(a: any) {
    const box = new ConfirmBoxInitializer();
    box.setTitle('Retirer l\'autorisation');
    box.setMessage(`Retirer l'autorisation de ${a.prenom} ${a.nom} ?`);
    box.setConfig({
      layoutType: DialogLayoutDisplay.WARNING,
      animationIn: AppearanceAnimation.BOUNCE_IN,
      animationOut: DisappearanceAnimation.BOUNCE_OUT,
      buttonPosition: 'right',
    });
    box.setButtonLabels('OUI', 'NON');
    box.openConfirmBox$().subscribe(resp => {
      if (resp.success) {
        this.quizSrv.retirerAutorisation(this.quizId, a.id_UTILISATEUR).subscribe({
          next: r => { this.toast.success(r.message); this.chargerAutorises(); },
          error: () => this.ko(),
        });
      }
    });
  }

  chargerParticipants() {
    this.quizSrv
      .getRapportParticipants(this.quizId, {
        agent: this.filtreAgent.trim(),
        statut: this.filtreStatut,
        site: this.filtreSite,
      })
      .subscribe({
        next: r => (this.participants = r),
        error: () => this.toast.error('Impossible de charger les participants'),
      });
  }

  /** Réinitialisation d'une participation : site propriétaire + quiz.modifier. */
  get peutReinitialiser(): boolean {
    return this.coteProprietaire && this.perms.can('quiz.modifier');
  }

  demanderReinitialisation(p: RapportParticipant) {
    const box = new ConfirmBoxInitializer();
    box.setTitle('Réinitialiser la participation');
    box.setMessage(
      `Vous allez demander à ${p.prenom} ${p.nom} de réinitialiser sa participation` +
        `${this.quiz?.titre ? ` à « ${this.quiz.titre} »` : ''}. ` +
        `Elle ne sera effective qu'après sa confirmation.`
    );
    box.setConfig({
      layoutType: DialogLayoutDisplay.WARNING,
      animationIn: AppearanceAnimation.BOUNCE_IN,
      animationOut: DisappearanceAnimation.BOUNCE_OUT,
      buttonPosition: 'right',
    });
    box.setButtonLabels('Envoyer', 'Annuler');
    box.openConfirmBox$().subscribe(resp => {
      if (!resp.success) return;
      this.quizSrv.demanderReinitialisation(this.quizId, p.id_UTILISATEUR).subscribe({
        next: r => {
          this.toast.success(r.message);
          this.chargerParticipants();
        },
        error: err => this.toast.error(err?.error?.message || "Une erreur s'est produite"),
      });
    });
  }

  annulerReinitialisation(p: RapportParticipant) {
    if (!p.reinit_id) return;
    this.quizSrv.annulerReinitialisation(p.reinit_id).subscribe({
      next: r => {
        this.toast.success(r.message);
        this.chargerParticipants();
      },
      error: err => this.toast.error(err?.error?.message || "Une erreur s'est produite"),
    });
  }

  /** Rapport limité au site de l'utilisateur (invité : pas côté propriétaire). */
  get rapportLimiteSite(): boolean {
    return !this.coteProprietaire;
  }

  reinitFiltres() {
    this.filtreAgent = '';
    this.filtreStatut = '';
    this.filtreSite = this.rapportLimiteSite && this.quiz?.mon_site_id != null ? String(this.quiz.mon_site_id) : '';
    this.chargerParticipants();
  }

  tempsLabel(sec: number | null | undefined): string {
    if (sec == null) return '—';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m ? `${m} min ${s}s` : `${s}s`;
  }

  voirTentative(p: RapportParticipant) {
    this.quizSrv.getTentativeDetail(p.id).subscribe({
      next: d => {
        this.dialog.open(TentativeDetailDialogComponent, {
          width: 'calc(100% - 30px)',
          maxWidth: '620px',
          data: d,
        });
      },
      error: () => this.toast.error('Détail indisponible'),
    });
  }

  exporterParticipants() {
    if (!this.participants.length) {
      this.toast.warning('Aucun participant à exporter');
      return;
    }
    const data = this.participants.map((p, i) => ({
      '#': i + 1,
      'Prénom - Nom': `${p.prenom} ${p.nom}`,
      'Date début': p.date_debut || '',
      'Date fin': p.date_fin || '',
      Statut: 'Terminé',
      Résultat: p.reussi ? 'Réussi' : p.statut === 'TEMPS_ECOULE' ? 'Temps écoulé' : 'Échec',
      Score: this.scoreLabel(p.score),
      Points: pointsLabel(p.nb_points, p.nb_points_total),
      Temps: this.tempsLabel(p.temps_secondes),
      Site: p.site || '',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Participants');
    XLSX.writeFile(wb, `Rapport_participants_quiz_${this.quizId}.xlsx`);
  }

  /** Score en pourcentage, comme le seuil de réussite : 66.67%, 100%, 0%. */
  scoreLabel(v: number | string | null | undefined): string {
    const n = Number(v);
    return isNaN(n) || v == null ? '—' : `${Number(n.toFixed(2))}%`;
  }

  get totalPoints(): number {
    return this.questions.reduce((total, q) => total + Number(q.points ?? 5), 0);
  }

  charger() {
    this.chargement = true;
    this.quizSrv.getOne(this.quizId).pipe(finalize(() => (this.chargement = false))).subscribe({
      next: q => {
        this.quiz = q;
        this.questions = q.questions || [];
        // Utilisateur autorisé (site invité) : Diffusion limitée à son site
        // (liste « Site » réduite à son site, pré-sélectionné et non modifiable).
        if (!this.coteProprietaire && q.mon_site_id != null) {
          this.diffSites = [q.mon_site_id];
          this.nouvelleIpSite = Number(q.mon_site_id);
          // Rapports : filtre Site imposé (le serveur l'applique dans tous les cas).
          this.filtreSite = String(q.mon_site_id);
        }
        if (this.peutGerer) {
          this.chargerParticipantsDiffuses();
          this.chargerCandidats();
        }
        if (this.peutAutoriser) {
          this.chargerAutorises();
          this.chargerCandidatsAuto();
        }
      },
      error: () => this.toast.error('Quiz introuvable'),
    });
  }

  chargerRapport() {
    this.quizSrv.getQuestionsRatees(this.quizId).subscribe({
      next: r => (this.questionsRatees = r),
      error: () => {},
    });
  }

  /** Lettre d'option (A, B, C…) selon l'index. */
  lettre(i: number): string {
    return String.fromCharCode(65 + i);
  }

  /** Uniquement les mauvaises réponses (barres rouges). */
  optionsFausses(options: OptionRatee[]): OptionRatee[] {
    return (options || []).filter(o => !o.est_correcte);
  }

  /** Plus grand nombre de choix parmi les options (min 1) — pour l'échelle des barres. */
  maxChoix(options: OptionRatee[]): number {
    return Math.max(1, ...options.map(o => o.nb_choix));
  }

  chargerIps() {
    this.quizSrv.getIps(this.quizId).subscribe({
      next: r => (this.ips = r),
      error: () => {},
    });
  }

  chargerDemandes() {
    this.quizSrv.getDemandesIp(this.quizId).subscribe({
      next: r => (this.demandes = r),
      error: () => {},
    });
  }

  traiterDemande(d: QuizIpDemande, decision: 'AUTORISER' | 'REFUSER') {
    this.quizSrv.traiterDemandeIp(d.id, decision).subscribe({
      next: r => {
        this.toast.success(r.message);
        this.chargerDemandes();
        this.chargerIps();
      },
      error: err => this.toast.error(err?.error?.message || "Une erreur s'est produite"),
    });
  }

  retour() {
    this.router.navigate(['/mon-espace/quiz/gestion']);
  }

  editer() {
    this.router.navigate(['/mon-espace/quiz/editer', this.quizId]);
  }

  typeLabel(q: Question): string {
    switch (q.type) {
      case 'QCU':
        return 'QCU';
      case 'QCM':
        return 'QCM';
      default:
        return 'Vrai / Faux';
    }
  }

  private ok(msg: string) {
    this.toast.success(msg);
    this.charger();
    // Les scores ont pu être recalculés ou réinitialisés (modification des questions).
    this.chargerParticipants();
    this.chargerRapport();
  }

  /** Onglet Rapports : données rechargées à chaque ouverture (réinitialisations
   *  confirmées par les agents, passages clôturés, recalculs…). */
  changementOnglet(e: MatTabChangeEvent) {
    if (e.tab?.textLabel === 'Rapports') {
      this.chargerParticipants();
      this.chargerRapport();
    }
  }
  private ko() {
    this.toast.error("Une erreur s'est produite");
  }

  /* --------- Questions --------- */
  ajouterQuestion() {
    if (!this.quizId) {
      return;
    }
    // Quiz déjà passé : l'ajout réinitialise les tentatives -> quiz disponible requis.
    if (quizDejaPasse(this.quiz) && !this.quiz?.disponible) {
      this.toast.warning(MSG_QUIZ_FERME);
      return;
    }
    const data: QuestionDialogData = { mode: 'add' };
    this.dialog
      .open(QuestionDialogComponent, { width: 'calc(100% - 30px)', maxWidth: '640px', data })
      .afterClosed()
      .subscribe(async (r: QuestionDialogResult | undefined) => {
        if (!r || !(await confirmerImpact(this.quiz, 'AJOUT', () => this.exporterAvantModification()))) {
          return;
        }
        this.quizSrv
          .addQuestion({ id_Quiz: this.quizId, ...r })
          .subscribe({ next: res => this.ok(res.message), error: err => this.koMessage(err) });
      });
  }

  modifierQuestion(q: Question) {
    const data: QuestionDialogData = { mode: 'edit', question: q };
    this.dialog
      .open(QuestionDialogComponent, { width: 'calc(100% - 30px)', maxWidth: '640px', data })
      .afterClosed()
      .subscribe(async (r: QuestionDialogResult | undefined) => {
        if (!r) {
          return;
        }
        // Réponses modifiées -> réinitialisation ; points modifiés -> recalcul.
        const action = actionModification(q, r);
        if (action === 'REPONSES' && quizDejaPasse(this.quiz) && !this.quiz?.disponible) {
          this.toast.warning(MSG_QUIZ_FERME);
          return;
        }
        if (action && !(await confirmerImpact(this.quiz, action, () => this.exporterAvantModification()))) {
          return;
        }
        this.quizSrv
          .updateQuestion(q.id, r)
          .subscribe({ next: res => this.ok(res.message), error: err => this.koMessage(err) });
      });
  }

  async supprimerQuestion(q: Question) {
    const supprimer = () =>
      this.quizSrv
        .deleteQuestion(q.id)
        .subscribe({ next: res => this.ok(res.message), error: err => this.koMessage(err) });
    // Quiz déjà passé : la suppression recalcule les scores (avertissement dédié).
    if (quizDejaPasse(this.quiz)) {
      if (await confirmerImpact(this.quiz, 'SUPPRESSION', () => this.exporterAvantModification())) {
        supprimer();
      }
      return;
    }
    const box = new ConfirmBoxInitializer();
    box.setTitle('Suppression !');
    box.setMessage('Supprimer cette question ?');
    box.setConfig({
      layoutType: DialogLayoutDisplay.DANGER,
      animationIn: AppearanceAnimation.BOUNCE_IN,
      animationOut: DisappearanceAnimation.BOUNCE_OUT,
      buttonPosition: 'right',
    });
    box.setButtonLabels('OUI', 'NON');
    box.openConfirmBox$().subscribe(resp => {
      if (resp.success) {
        supprimer();
      }
    });
  }

  /** Export des tentatives avant une réinitialisation (bouton de l'avertissement). */
  private exporterAvantModification() {
    if (this.quiz) {
      exporterTentativesQuiz(this.quizSrv, this.quiz, () => this.ko());
    }
  }

  private koMessage(err: any) {
    this.toast.error(err?.error?.message || "Une erreur s'est produite");
  }

  /* --------- Autorisations IP --------- */
  ajouterIp() {
    const ip = this.nouvelleIp.trim();
    if (!ip) {
      this.toast.warning('Merci de saisir une adresse IP');
      return;
    }
    if (this.nouvelleIpSite == null) {
      this.toast.warning('Merci de choisir le site');
      return;
    }
    this.envoiIp = true;
    const body = { adresse_ip: ip, libelle: this.nouvelleIpLibelle.trim(), id_Site: this.nouvelleIpSite };
    this.quizSrv.addIp(this.quizId, body).subscribe({
      next: () => {
        this.toast.success('Adresse IP ajoutee');
        this.nouvelleIp = '';
        this.nouvelleIpLibelle = '';
        if (this.coteProprietaire) this.nouvelleIpSite = null;
        this.envoiIp = false;
        this.chargerIps();
      },
      error: err => {
        this.envoiIp = false;
        this.toast.error(err?.error?.message || "Une erreur s'est produite");
      },
    });
  }

  supprimerIp(ip: QuizIp) {
    const box = new ConfirmBoxInitializer();
    box.setTitle('Suppression !');
    box.setMessage(`Retirer l'adresse ${ip.adresse_ip} de la liste autorisee ?`);
    box.setConfig({
      layoutType: DialogLayoutDisplay.DANGER,
      animationIn: AppearanceAnimation.BOUNCE_IN,
      animationOut: DisappearanceAnimation.BOUNCE_OUT,
      buttonPosition: 'right',
    });
    box.setButtonLabels('OUI', 'NON');
    box.openConfirmBox$().subscribe(resp => {
      if (resp.success) {
        this.quizSrv.deleteIp(ip.id).subscribe({
          next: () => {
            this.toast.success('Adresse IP supprimee');
            this.chargerIps();
          },
          error: () => this.ko(),
        });
      }
    });
  }
}
