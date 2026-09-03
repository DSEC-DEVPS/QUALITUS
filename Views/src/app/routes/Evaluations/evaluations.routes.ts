import { Routes } from '@angular/router';
import { EvaluationsEnCoursComponent } from './evaluations-en-cours/evaluations-en-cours.component';
import { CompletionEvaluationsComponent } from './completion-evaluations/completion-evaluations.component';
import { CompletionSupplementairesComponent } from './completion-supplementaires/completion-supplementaires.component';
export const routes: Routes = [
  { path: 'mesEvaluations', component: EvaluationsEnCoursComponent },
  { path: 'Completion/:id', component: CompletionEvaluationsComponent },
  { path: 'Supplementaire/Completion/:id', component: CompletionSupplementairesComponent },
];
