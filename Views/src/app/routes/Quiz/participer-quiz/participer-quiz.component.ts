import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ToastrService } from 'ngx-toastr';
import { QuizService } from '@shared/services/quiz.service';
import { QuestionAPasser, QuizAPasser, ResultatSoumission } from '../interfaces';

@Component({
  selector: 'app-participer-quiz',
  standalone: true,
  imports: [
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatRadioModule,
    MatCheckboxModule,
    MatProgressBarModule,
  ],
  templateUrl: './participer-quiz.component.html',
  styleUrl: './participer-quiz.component.scss',
})
export class ParticiperQuizComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly quizSrv = inject(QuizService);
  private readonly toast = inject(ToastrService);

  quizId!: number;
  quiz?: QuizAPasser;
  choix: Record<number, number[]> = {}; // id_Question -> id_Option[] (1 pour QCU/VF, n pour QCM)
  resultat: ResultatSoumission | null = null;
  chargement = true;
  envoiEnCours = false;
  bloque = false; // deja tente + pas d'autorisation de retest

  // Chrono (regle 1) + cloture automatique (regle 3)
  tempsRestant = 0; // secondes
  tempsEcoule = false;
  private chronoId: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.quizId = Number(this.route.snapshot.paramMap.get('id'));
    this.charger();
  }

  ngOnDestroy(): void {
    this.arreterChrono();
  }

  charger() {
    this.chargement = true;
    this.resultat = null;
    this.choix = {};
    this.tempsEcoule = false;
    this.arreterChrono();
    this.quizSrv.getQuizAPasser(this.quizId).subscribe({
      next: q => {
        this.quiz = q;
        this.bloque = q.peut_participer === false;
        this.chargement = false;
        // Chrono base sur l'heure de debut serveur : temps restant = duree - deja ecoule.
        // Resiste au rechargement (le serveur ne reinitialise pas le debut).
        if (!this.bloque && q.duree && q.duree > 0) {
          const restant = q.duree * 60 - (q.temps_ecoule_secondes || 0);
          if (restant <= 0) {
            // Le temps est deja epuise cote serveur -> cloture immediate
            this.tempsRestant = 0;
            this.tempsEcoule = true;
            this.toast.info('Temps écoulé : le quiz est clôturé automatiquement.');
            this.soumettre(true);
          } else {
            this.demarrerChrono(restant);
          }
        }
      },
      error: () => {
        this.toast.error('Quiz introuvable');
        this.chargement = false;
      },
    });
  }

  // --- Chrono ---
  private demarrerChrono(secondes: number) {
    this.arreterChrono();
    this.tempsRestant = secondes;
    this.chronoId = setInterval(() => {
      this.tempsRestant--;
      if (this.tempsRestant <= 0) {
        this.tempsRestant = 0;
        this.arreterChrono();
        this.tempsEcoule = true;
        this.toast.info('Temps écoulé : le quiz est clôturé automatiquement.');
        this.soumettre(true); // regle 3 : cloture forcee
      }
    }, 1000);
  }
  private arreterChrono() {
    if (this.chronoId) {
      clearInterval(this.chronoId);
      this.chronoId = null;
    }
  }
  get chronoLabel(): string {
    const m = Math.floor(this.tempsRestant / 60);
    const s = this.tempsRestant % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  // --- Progression (regle 2) ---
  get nbRepondues(): number {
    if (!this.quiz) {
      return 0;
    }
    return this.quiz.questions.filter(q => (this.choix[q.id] || []).length > 0).length;
  }
  get totalQuestions(): number {
    return this.quiz ? this.quiz.questions.length : 0;
  }

  estQCM(q: QuestionAPasser): boolean {
    return q.type === 'QCM';
  }

  // --- Reponse unique (Vrai/Faux, QCU) : liee au radio ---
  choixUnique(q: QuestionAPasser): number | null {
    const arr = this.choix[q.id];
    return arr && arr.length ? arr[0] : null;
  }
  setChoixUnique(q: QuestionAPasser, idOption: number) {
    this.choix[q.id] = [idOption];
  }

  // --- QCM : cases a cocher ---
  estCoche(q: QuestionAPasser, idOption: number): boolean {
    return (this.choix[q.id] || []).includes(idOption);
  }
  basculerQCM(q: QuestionAPasser, idOption: number, checked: boolean) {
    const arr = this.choix[q.id] || [];
    this.choix[q.id] = checked
      ? [...arr, idOption]
      : arr.filter(x => x !== idOption);
  }

  get toutesRepondues(): boolean {
    if (!this.quiz) {
      return false;
    }
    return this.quiz.questions.every(q => (this.choix[q.id] || []).length > 0);
  }

  soumettre(forcer = false) {
    if (!this.quiz || this.envoiEnCours || this.resultat) {
      return;
    }
    // Regle 4 : soumission manuelle refusee si toutes les questions ne sont pas repondues.
    // (forcer = true lors de la cloture automatique par le chrono, regle 3.)
    if (!forcer && !this.toutesRepondues) {
      this.toast.error('Vous devez répondre à toutes les questions avant de soumettre.');
      return;
    }
    const reponses = this.quiz.questions.map(q => ({
      id_Question: q.id,
      id_Options: this.choix[q.id] || [],
    }));
    this.envoiEnCours = true;
    this.arreterChrono();
    this.quizSrv.soumettre(this.quizId, reponses).subscribe({
      next: r => {
        this.resultat = r;
        this.envoiEnCours = false;
        (r.nouveaux_badges || []).forEach(b =>
          this.toast.success(`Badge debloque : ${b.nom}`, 'Felicitations !')
        );
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      error: () => {
        this.toast.error("Une erreur s'est produite");
        this.envoiEnCours = false;
      },
    });
  }

  retourListe() {
    this.router.navigate(['/mon-espace/quiz/participer']);
  }

  mesScores() {
    this.router.navigate(['/mon-espace/quiz/mes-scores']);
  }
}
