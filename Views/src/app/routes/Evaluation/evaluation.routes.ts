import { Routes } from '@angular/router';
import { canMatchPermission } from '../../core/authorization/permission.guard';
import { ListeEvaluationsComponent } from './consultation/liste-evaluations/liste-evaluations.component';
import { MesEvaluationsComponent } from './mes-evaluations/mes-evaluations.component';
import { MesAgentsEvalsComponent } from './supervision/mes-agents-evals.component';
import { MesCoachingComponent } from './supervision/mes-coaching.component';
import { RapportPoleComponent } from './rapport/rapport-pole/rapport-pole.component';
import { AgentPoleDetailComponent } from './rapport/agent-pole-detail/agent-pole-detail.component';
import { ContreListeComponent } from './contre/contre-liste/contre-liste.component';
import { MesContreComponent } from './contre/mes-contre/mes-contre.component';
import { ContreExecuterComponent } from './contre/contre-executer/contre-executer.component';
import { ListeGrillesComponent } from './grilles/liste-grilles/liste-grilles.component';
import { EditeurGrilleComponent } from './grilles/editeur-grille/editeur-grille.component';
import { CreerEvaluationComponent as CreerEvaluationCahierComponent } from './creation/creer-evaluation/creer-evaluation.component';
import { CreerMasseComponent as CreerMasseCahierComponent } from './creation/creer-masse/creer-masse.component';
import { ExecuterEvaluationComponent } from './execution/executer-evaluation/executer-evaluation.component';
import { ArborescenceAdminComponent } from './bi/arborescence-admin/arborescence-admin.component';
import { ValidationOptionsComponent } from './bi/validation-options/validation-options.component';
import { NotificationsEvalComponent } from './notifications-eval/notifications-eval.component';
import { ReferentielsComponent } from './referentiels/referentiels.component';
import { CoachingArbreComponent } from './coaching/coaching-arbre/coaching-arbre.component';
import { CalendrierComponent } from './calendrier/calendrier.component';

export const routes: Routes = [
  { path: '', redirectTo: 'evaluations', pathMatch: 'full' },
  { path: 'evaluations', component: ListeEvaluationsComponent, canMatch: [canMatchPermission('evaluation.lire')] },
  { path: 'mes-evaluations', component: MesEvaluationsComponent, canMatch: [canMatchPermission('evaluation.lire')] },
  { path: 'mes-agents-evaluations', component: MesAgentsEvalsComponent, canMatch: [canMatchPermission('evaluation.lire')] },
  { path: 'mes-coaching', component: MesCoachingComponent, canMatch: [canMatchPermission('evaluation.lire')] },
  { path: 'grilles', component: ListeGrillesComponent, canMatch: [canMatchPermission('grille.lire')] },
  { path: 'grilles/editeur/:id', component: EditeurGrilleComponent, canMatch: [canMatchPermission('grille.modifier')] },
  { path: 'creation/unitaire', component: CreerEvaluationCahierComponent, canMatch: [canMatchPermission('evaluation.creer')] },
  { path: 'creation/masse', component: CreerMasseCahierComponent, canMatch: [canMatchPermission('evaluation.creer')] },
  { path: 'executer/:id', component: ExecuterEvaluationComponent, canMatch: [canMatchPermission('evaluation.lire')] },
  { path: 'bi/arborescences', component: ArborescenceAdminComponent, canMatch: [canMatchPermission('evaluation.lire')] },
  { path: 'bi/validation', component: ValidationOptionsComponent, canMatch: [canMatchPermission('evaluation.valider')] },
  { path: 'coaching/arbre', component: CoachingArbreComponent, canMatch: [canMatchPermission('evaluation.lire')] },
  { path: 'calendrier', component: CalendrierComponent, canMatch: [canMatchPermission('evaluation.lire')] },
  { path: 'contre-evaluation', component: ContreListeComponent, canMatch: [canMatchPermission('contre_evaluation.lire')] },
  { path: 'mes-contre-evaluations', component: MesContreComponent, canMatch: [canMatchPermission('contre_evaluation.lire')] },
  { path: 'contre-executer/:id', component: ContreExecuterComponent, canMatch: [canMatchPermission('contre_evaluation.lire')] },
  { path: 'notifications', component: NotificationsEvalComponent, canMatch: [canMatchPermission('notification.lire')] },
  { path: 'referentiels', component: ReferentielsComponent, canMatch: [canMatchPermission('referentiel.lire')] },
  { path: 'agents-pole', component: RapportPoleComponent, canMatch: [canMatchPermission('agent_pole.lire')] },
  { path: 'agents-pole/:id', component: AgentPoleDetailComponent, canMatch: [canMatchPermission('agent_pole.lire')] },
];
