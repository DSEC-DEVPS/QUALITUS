import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule, MAT_DATE_LOCALE } from '@angular/material/core';
import { ToastrService } from 'ngx-toastr';
import { QuizService } from '@shared/services/quiz.service';
import { QuizParticiper, QuizPublic } from '../interfaces';

@Component({
  selector: 'app-participer-liste',
  standalone: true,
  imports: [
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatChipsModule,
    MatTooltipModule,
    MatPaginatorModule,
    NgTemplateOutlet,
    DatePipe,
    MatDatepickerModule,
    MatNativeDateModule,
  ],
  providers: [{ provide: MAT_DATE_LOCALE, useValue: 'fr-FR' }],
  templateUrl: './participer-liste.component.html',
  styleUrl: './participer-liste.component.scss',
})
export class ParticiperListeComponent implements OnInit, OnDestroy {
  private readonly quizSrv = inject(QuizService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastrService);

  pin = '';
  envoi = false;
  enAttente = false;
  quizEnAttente = '';
  /** Panneau de saisie du code PIN (déplié à la demande). */
  afficherPin = false;

  /** Quiz commencés et non soumis (privés et publics) : reprise sans code PIN. */
  enCoursListe: QuizPublic[] = [];
  private enCoursChargeAt = 0; // ms : instant de réception (chrono vivant)
  private tickId: ReturnType<typeof setInterval> | null = null;

  /** Quiz disponibles : publics + privés déverrouillés, jamais tentés ou retest autorisé. */
  disponibles: QuizParticiper[] = [];
  /** Quiz terminés (tout type), y compris les quiz depuis fermés. */
  termines: QuizParticiper[] = [];
  charge = false;

  // Filtre par date de création (commun aux deux sections)
  dateDebut: Date | null = null;
  dateFin: Date | null = null;

  // Filtres et pagination : Quiz disponibles
  rechercheDispo = '';
  typeDispo: '' | 'PUBLIC' | 'PRIVATE' = '';
  pageDispo = 0;
  tailleDispo = 5;

  // Filtres et pagination : Quiz terminés
  rechercheTermines = '';
  typeTermines: '' | 'PUBLIC' | 'PRIVATE' = '';
  resultatTermines: '' | 'REUSSI' | 'ECHEC' | 'NON_PASSE' = '';
  pageTermines = 0;
  tailleTermines = 5;

  readonly TAILLES_PAGE = [5, 10, 20];

  ngOnInit(): void {
    // ?pin=saisir (notification d'un quiz privé, depuis la cloche ou « Nouveautés ») :
    // ouvre directement la saisie du PIN et indique à l'utilisateur quoi faire.
    const params = this.route.snapshot.queryParamMap;
    if (params.get('pin') === 'saisir') {
      this.afficherPin = true;
      const titre = params.get('quiz') ? `« ${params.get('quiz')} »` : 'Ce quiz';
      this.toast.info(
        `${titre} est un quiz privé : saisissez le code PIN qui vous a été communiqué pour y accéder.`,
        '',
        { timeOut: 8000 }
      );
    }
    this.chargerEnCours();
    this.chargerMesQuiz();
    // Rafraîchit l'affichage du temps restant chaque seconde
    this.tickId = setInterval(() => {}, 1000);
  }

  ngOnDestroy(): void {
    if (this.tickId) {
      clearInterval(this.tickId);
      this.tickId = null;
    }
  }

  chargerEnCours() {
    this.quizSrv.getQuizEnCours().subscribe({
      next: l => {
        this.enCoursListe = l;
        this.enCoursChargeAt = Date.now();
      },
      error: () => {},
    });
  }

  chargerMesQuiz() {
    this.quizSrv.getMesQuiz().subscribe({
      next: r => {
        this.disponibles = r.disponibles || [];
        this.termines = r.termines || [];
        this.charge = true;
      },
      error: () => (this.charge = true),
    });
  }

  /* ----- Filtres ----- */

  private toYmd(d: Date | null): string {
    if (!d) {
      return '';
    }
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const j = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${j}`;
  }

  private normaliser(s: string): string {
    return (s || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  /** Filtre commun : date de création, type, recherche dans le titre. */
  private filtrer(l: QuizParticiper[], recherche: string, type: string): QuizParticiper[] {
    const deb = this.toYmd(this.dateDebut);
    const fin = this.toYmd(this.dateFin);
    const r = this.normaliser(recherche);
    const enCoursIds = new Set(this.enCoursListe.map(q => q.id));
    return l.filter(q => {
      if (enCoursIds.has(q.id)) {
        return false;
      }
      const d = (q.dateCreation || '').slice(0, 10);
      if (deb && (!d || d < deb)) {
        return false;
      }
      if (fin && (!d || d > fin)) {
        return false;
      }
      if (type && (q.acces === 'PUBLIC' ? 'PUBLIC' : 'PRIVATE') !== type) {
        return false;
      }
      return !r || this.normaliser(q.titre).includes(r);
    });
  }

  private page(l: QuizParticiper[], index: number, taille: number): QuizParticiper[] {
    const max = Math.max(0, Math.ceil(l.length / taille) - 1);
    const i = Math.min(index, max);
    return l.slice(i * taille, i * taille + taille);
  }

  get disponiblesFiltres(): QuizParticiper[] {
    return this.filtrer(this.disponibles, this.rechercheDispo, this.typeDispo);
  }

  get disponiblesPage(): QuizParticiper[] {
    return this.page(this.disponiblesFiltres, this.pageDispo, this.tailleDispo);
  }

  get terminesFiltres(): QuizParticiper[] {
    return this.filtrer(this.termines, this.rechercheTermines, this.typeTermines).filter(
      q => !this.resultatTermines || this.resultatTermine(q) === this.resultatTermines
    );
  }

  get terminesPage(): QuizParticiper[] {
    return this.page(this.terminesFiltres, this.pageTermines, this.tailleTermines);
  }

  /** Résultat d'un quiz terminé : réussi, échec, ou jamais passé (quiz arrivé à échéance). */
  resultatTermine(q: QuizParticiper): 'REUSSI' | 'ECHEC' | 'NON_PASSE' {
    return q.etat === 'NON_PASSE' ? 'NON_PASSE' : q.derniere_reussi ? 'REUSSI' : 'ECHEC';
  }

  get nbReussis(): number {
    return this.termines.filter(q => this.resultatTermine(q) === 'REUSSI').length;
  }

  get nbEchecs(): number {
    return this.termines.filter(q => this.resultatTermine(q) === 'ECHEC').length;
  }

  get nbNonPasses(): number {
    return this.termines.filter(q => q.etat === 'NON_PASSE').length;
  }

  /** Un filtre a changé : retour en première page. */
  filtreDispo() {
    this.pageDispo = 0;
  }

  filtreTermines() {
    this.pageTermines = 0;
  }

  filtreDates() {
    this.pageDispo = 0;
    this.pageTermines = 0;
  }

  reinitDates() {
    this.dateDebut = null;
    this.dateFin = null;
    this.filtreDates();
  }

  get filtresTerminesActifs(): boolean {
    return !!(this.rechercheTermines || this.typeTermines || this.resultatTermines);
  }

  reinitFiltresTermines() {
    this.rechercheTermines = '';
    this.typeTermines = '';
    this.resultatTermines = '';
    this.filtreTermines();
  }

  changerPageDispo(e: PageEvent) {
    this.pageDispo = e.pageIndex;
    this.tailleDispo = e.pageSize;
  }

  changerPageTermines(e: PageEvent) {
    this.pageTermines = e.pageIndex;
    this.tailleTermines = e.pageSize;
  }

  /* ----- Libellés ----- */

  etatLabel(q: QuizParticiper): string {
    if (q.etat === 'A_COMMENCER') {
      return 'À commencer';
    }
    if (q.etat === 'RETEST') {
      return 'Retest autorisé';
    }
    if (q.etat === 'NON_PASSE') {
      return 'Non passé';
    }
    return q.derniere_reussi ? 'Réussi' : 'Échec';
  }

  scoreLabel(q: QuizParticiper): string {
    const n = Number(q.dernier_score);
    return q.nb_essais && Number.isFinite(n)
      ? `${n.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %`
      : '';
  }

  /* ----- Quiz en cours ----- */

  /** Chrono affiché seulement pour un quiz à durée limitée. */
  avecChrono(q: QuizPublic): boolean {
    return q.temps_ecoule_secondes != null && !!q.duree;
  }

  /** Secondes restantes (chrono vivant : déduit le temps écoulé depuis le chargement). */
  tempsRestant(q: QuizPublic): number {
    if (!this.avecChrono(q)) {
      return 0;
    }
    const depuisChargement = Math.floor((Date.now() - this.enCoursChargeAt) / 1000);
    return Math.max(0, (q.duree as number) * 60 - (q.temps_ecoule_secondes as number) - depuisChargement);
  }

  tempsRestantLabel(q: QuizPublic): string {
    const r = this.tempsRestant(q);
    const m = Math.floor(r / 60);
    const s = r % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  /** Ouvre l'écran d'accueil du quiz (privé : PIN déjà validé, rien à ressaisir). */
  ouvrir(q: { id: number }) {
    this.router.navigate(['/mon-espace/quiz/participer', q.id]);
  }

  /* ----- Code PIN ----- */

  acceder() {
    const code = (this.pin || '').trim();
    if (!code) {
      this.toast.warning('Saisissez le code PIN du quiz');
      return;
    }
    this.envoi = true;
    this.enAttente = false;
    this.quizSrv.getByPin(code).subscribe({
      next: q => {
        this.envoi = false;
        switch (q.etat) {
          case 'OK':
            // Quiz privé : le PIN accompagne l'ouverture (contrôlé côté serveur).
            this.router.navigate(['/mon-espace/quiz/participer', q.id], { queryParams: { pin: code } });
            break;
          case 'EN_ATTENTE':
            // Machine non encore autorisée
            this.enAttente = true;
            this.quizEnAttente = q.titre || '';
            break;
          case 'NON_PARTICIPANT':
            this.toast.error("Vous n'êtes pas participant à ce quiz.");
            break;
          case 'INDISPONIBLE':
            this.toast.error((q as any).message || "Ce quiz n'est pas disponible");
            break;
          default:
            this.toast.error('Code PIN invalide');
        }
      },
      error: () => {
        this.envoi = false;
        this.toast.error('Une erreur est survenue');
      },
    });
  }

  reessayer() {
    this.enAttente = false;
    this.acceder();
  }
}
