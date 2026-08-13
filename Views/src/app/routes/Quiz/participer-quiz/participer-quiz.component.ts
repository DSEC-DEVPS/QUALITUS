import { Component, OnInit, inject } from '@angular/core';
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
export class ParticiperQuizComponent implements OnInit {
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

  ngOnInit(): void {
    this.quizId = Number(this.route.snapshot.paramMap.get('id'));
    this.charger();
  }

  charger() {
    this.chargement = true;
    this.resultat = null;
    this.choix = {};
    this.quizSrv.getQuizAPasser(this.quizId).subscribe({
      next: q => {
        this.quiz = q;
        this.bloque = q.peut_participer === false;
        this.chargement = false;
      },
      error: () => {
        this.toast.error('Quiz introuvable');
        this.chargement = false;
      },
    });
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

  soumettre() {
    if (!this.quiz || !this.toutesRepondues) {
      this.toast.warning('Merci de repondre a toutes les questions');
      return;
    }
    const reponses = this.quiz.questions.map(q => ({
      id_Question: q.id,
      id_Options: this.choix[q.id] || [],
    }));
    this.envoiEnCours = true;
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
