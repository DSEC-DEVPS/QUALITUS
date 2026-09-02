import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule, MAT_DATE_LOCALE } from '@angular/material/core';
import { ToastrService } from 'ngx-toastr';
import { QuizService } from '@shared/services/quiz.service';
import { QuizPublic } from '../interfaces';

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
  private readonly toast = inject(ToastrService);

  pin = '';
  envoi = false;
  enAttente = false;
  quizEnAttente = '';
  // Le champ PIN est masque par defaut quand des quiz publics existent ;
  // un bouton permet de l'afficher.
  afficherPin = false;

  // Quiz PUBLICS visibles selon le site (accessibles sans code PIN)
  publics: QuizPublic[] = [];
  private publicsChargeAt = 0; // ms : instant de reception (pour un chrono vivant)
  private tickId: ReturnType<typeof setInterval> | null = null;

  // Filtres par date de creation (via datepicker Material)
  dateDebut: Date | null = null;
  dateFin: Date | null = null;

  private toYmd(d: Date | null): string {
    if (!d) {
      return '';
    }
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const j = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${j}`;
  }

  get publicsFiltres(): QuizPublic[] {
    const deb = this.toYmd(this.dateDebut);
    const fin = this.toYmd(this.dateFin);
    return this.publics.filter(q => {
      const d = (q.dateCreation || '').slice(0, 10);
      if (deb && (!d || d < deb)) {
        return false;
      }
      if (fin && (!d || d > fin)) {
        return false;
      }
      return true;
    });
  }

  reinitDates() {
    this.dateDebut = null;
    this.dateFin = null;
  }

  ngOnInit(): void {
    this.chargerPublics();
    // Rafraichit l'affichage du temps restant chaque seconde
    this.tickId = setInterval(() => {}, 1000);
  }

  ngOnDestroy(): void {
    if (this.tickId) {
      clearInterval(this.tickId);
      this.tickId = null;
    }
  }

  chargerPublics() {
    this.quizSrv.getQuizPublics().subscribe({
      next: p => {
        this.publics = p;
        this.publicsChargeAt = Date.now();
      },
      error: () => {},
    });
  }

  /** Une tentative est-elle en cours (demarree, non soumise) pour ce quiz ? */
  enCours(q: QuizPublic): boolean {
    return q.temps_ecoule_secondes != null && !!q.duree;
  }

  /** Secondes restantes (chrono vivant : deduit le temps ecoule depuis le chargement). */
  tempsRestant(q: QuizPublic): number {
    if (!this.enCours(q)) {
      return 0;
    }
    const depuisChargement = Math.floor((Date.now() - this.publicsChargeAt) / 1000);
    return Math.max(0, (q.duree as number) * 60 - (q.temps_ecoule_secondes as number) - depuisChargement);
  }

  tempsRestantLabel(q: QuizPublic): string {
    const r = this.tempsRestant(q);
    const m = Math.floor(r / 60);
    const s = r % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  ouvrir(q: QuizPublic) {
    this.router.navigate(['/mon-espace/quiz/participer', q.id]);
  }

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
            this.router.navigate(['/mon-espace/quiz/participer', q.id]);
            break;
          case 'EN_ATTENTE':
            // Machine non encore autorisee
            this.enAttente = true;
            this.quizEnAttente = q.titre || '';
            break;
          case 'PROFIL_EXCLU':
            this.toast.error('Ce profil ne participe pas aux quiz.');
            break;
          case 'INDISPONIBLE':
            this.toast.error("Ce quiz n'est pas disponible");
            break;
          case 'HORS_SITE':
            this.toast.error("Ce quiz n'est pas destiné à votre site.");
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
