import { Routes } from '@angular/router';
import { ContextesComponent } from './contextes/contextes.component';
import { EvaluateursComponent } from './evaluateurs/evaluateurs.component';
import { AgentsComponent } from './agents/agents.component';
import { ListeEvaluationsComponent } from './liste-evaluations/liste-evaluations.component';
import { CreerEvaluationComponent } from './creer-evaluation/creer-evaluation.component';
import { ExecuterEvaluationComponent } from './executer-evaluation/executer-evaluation.component';
import { EvNotificationsComponent } from './notifications/notifications.component';
import { RapportPoleComponent } from './rapport-pole/rapport-pole.component';
import { TypesActionComponent } from './types-action/types-action.component';
import { ContreEvaluationComponent } from './contre-evaluation/contre-evaluation.component';
import { ContreExecuterComponent } from './contre-executer/contre-executer.component';

export const routes: Routes = [
  { path: '', redirectTo: 'evaluations', pathMatch: 'full' },
  { path: 'evaluations', component: ListeEvaluationsComponent },
  { path: 'creer', component: CreerEvaluationComponent },
  { path: 'executer/:id', component: ExecuterEvaluationComponent },
  { path: 'contre-evaluation', component: ContreEvaluationComponent },
  { path: 'contre-executer/:id', component: ContreExecuterComponent },
  { path: 'notifications', component: EvNotificationsComponent },
  { path: 'agents-pole', component: RapportPoleComponent },
  { path: 'types-action', component: TypesActionComponent },
  { path: 'evaluateurs', component: EvaluateursComponent },
  { path: 'agents', component: AgentsComponent },
  { path: 'contextes', component: ContextesComponent },
];
