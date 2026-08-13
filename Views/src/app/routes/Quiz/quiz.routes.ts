import { Routes } from '@angular/router';
import { QuizEnEchecsComponent } from './quiz-en-echecs/quiz-en-echecs.component';
import { QuizEnResetComponent } from './quiz-en-reset/quiz-en-reset.component';
<<<<<<< HEAD

export const routes: Routes = [
  { path: 'quiz-en-echecs', component: QuizEnEchecsComponent },
  { path: 'Quiz-en-reset', component: QuizEnResetComponent },
=======
import { ListeQuizComponent } from './liste-quiz/liste-quiz.component';
import { EditeurQuizComponent } from './editeur-quiz/editeur-quiz.component';
import { ParticiperListeComponent } from './participer-liste/participer-liste.component';
import { ParticiperQuizComponent } from './participer-quiz/participer-quiz.component';
import { MesScoresComponent } from './mes-scores/mes-scores.component';
import { NouveautesComponent } from './nouveautes/nouveautes.component';
import { RapportsComponent } from './rapports/rapports.component';
import { RetestsComponent } from './retests/retests.component';

export const routes: Routes = [
  // Flux apprenant legacy (inchange)
  { path: 'quiz-en-echecs', component: QuizEnEchecsComponent },
  { path: 'Quiz-en-reset', component: QuizEnResetComponent },
  // Nouveau generateur de quiz (creation / gestion)
  { path: 'gestion', component: ListeQuizComponent },
  { path: 'creer', component: EditeurQuizComponent },
  { path: 'editer/:id', component: EditeurQuizComponent },
  // Participation (Phase 2)
  { path: 'participer', component: ParticiperListeComponent },
  { path: 'participer/:id', component: ParticiperQuizComponent },
  { path: 'mes-scores', component: MesScoresComponent },
  // Phase 3 : nouveautes (notifications) + rapports
  { path: 'nouveautes', component: NouveautesComponent },
  { path: 'rapports', component: RapportsComponent },
  // Superviseur : autorisation des retests
  { path: 'retests', component: RetestsComponent },
>>>>>>> ea2e7f6 (Mohamed CISSE 13082026)
];
