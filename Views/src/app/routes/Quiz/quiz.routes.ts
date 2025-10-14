import { Routes } from '@angular/router';
import { QuizEnEchecsComponent } from './quiz-en-echecs/quiz-en-echecs.component';
import { QuizEnResetComponent } from './quiz-en-reset/quiz-en-reset.component';

export const routes: Routes = [
  { path: 'quiz-en-echecs', component: QuizEnEchecsComponent },
  { path: 'Quiz-en-reset', component: QuizEnResetComponent },
];
