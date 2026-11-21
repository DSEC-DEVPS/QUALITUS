import { Routes } from '@angular/router';
import { canMatchPermission } from '@core/authorization/permission.guard';
import { QuizEnEchecsComponent } from './quiz-en-echecs/quiz-en-echecs.component';
import { QuizEnResetComponent } from './quiz-en-reset/quiz-en-reset.component';
import { ListeQuizComponent } from './liste-quiz/liste-quiz.component';
import { EditeurQuizComponent } from './editeur-quiz/editeur-quiz.component';
import { DetailQuizComponent } from './detail-quiz/detail-quiz.component';
import { ParticiperListeComponent } from './participer-liste/participer-liste.component';
import { ParticiperQuizComponent } from './participer-quiz/participer-quiz.component';
import { MesScoresComponent } from './mes-scores/mes-scores.component';
import { NouveautesComponent } from './nouveautes/nouveautes.component';
import { RapportsComponent } from './rapports/rapports.component';
import { RetestsComponent } from './retests/retests.component';

export const routes: Routes = [
  // Chaque écran exige la même permission que son entrée de menu (accès direct à
  // l'URL compris) ; sans elle, l'utilisateur est renvoyé vers sa page d'arrivée.
  // Flux Baseco (quiz de fiche)
  { path: 'quiz-en-echecs', component: QuizEnEchecsComponent, canMatch: [canMatchPermission('quiz.baseco')] },
  { path: 'Quiz-en-reset', component: QuizEnResetComponent, canMatch: [canMatchPermission('quiz.baseco')] },
  // Générateur de quiz (création / gestion)
  { path: 'gestion', component: ListeQuizComponent, canMatch: [canMatchPermission('quiz.lire')] },
  { path: 'creer', component: EditeurQuizComponent, canMatch: [canMatchPermission('quiz.creer')] },
  { path: 'editer/:id', component: EditeurQuizComponent, canMatch: [canMatchPermission('quiz.modifier')] },
  { path: 'detail/:id', component: DetailQuizComponent, canMatch: [canMatchPermission('quiz.lire')] },
  // Participation
  { path: 'participer', component: ParticiperListeComponent, canMatch: [canMatchPermission('quiz.participer')] },
  { path: 'participer/:id', component: ParticiperQuizComponent, canMatch: [canMatchPermission('quiz.participer')] },
  { path: 'mes-scores', component: MesScoresComponent, canMatch: [canMatchPermission('quiz.participer')] },
  // Phase 3 : nouveautes (notifications) + rapports
  // Nouveautés : quiz.participer ou quiz.lire (accès direct à l'URL compris)
  {
    path: 'nouveautes',
    component: NouveautesComponent,
    canMatch: [canMatchPermission(['quiz.participer', 'quiz.lire'])],
  },
  { path: 'rapports', component: RapportsComponent, canMatch: [canMatchPermission('quiz.lire')] },
  // Superviseur : autorisation des retests
  { path: 'retests', component: RetestsComponent, canMatch: [canMatchPermission('quiz.modifier')] },
];
