import { Routes } from '@angular/router';
import { canMatchPermission } from '../../core/authorization/permission.guard';
import { ListeEvaluationsComponent } from './consultation/liste-evaluations/liste-evaluations.component';
import { MesEvaluationsComponent } from './mes-evaluations/mes-evaluations.component';
import { RapportPoleComponent } from './rapport/rapport-pole/rapport-pole.component';
import { ContreListeComponent } from './contre/contre-liste/contre-liste.component';
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
  { path: 'evaluations', component: ListeEvaluationsComponent },
  { path: 'mes-evaluations', component: MesEvaluationsComponent },
  { path: 'grilles', component: ListeGrillesComponent },
  { path: 'grilles/editeur/:id', component: EditeurGrilleComponent, canMatch: [canMatchPermission('grille.modifier')] },
  { path: 'creation/unitaire', component: CreerEvaluationCahierComponent, canMatch: [canMatchPermission('evaluation.creer')] },
  { path: 'creation/masse', component: CreerMasseCahierComponent, canMatch: [canMatchPermission('evaluation.creer')] },
  { path: 'executer/:id', component: ExecuterEvaluationComponent },
  { path: 'bi/arborescences', component: ArborescenceAdminComponent },
  { path: 'bi/validation', component: ValidationOptionsComponent },
  { path: 'coaching/arbre', component: CoachingArbreComponent },
  { path: 'calendrier', component: CalendrierComponent },
  { path: 'contre-evaluation', component: ContreListeComponent, canMatch: [canMatchPermission('evaluation.contre_evaluer')] },
  { path: 'contre-executer/:id', component: ContreExecuterComponent },
  { path: 'notifications', component: NotificationsEvalComponent },
  { path: 'referentiels', component: ReferentielsComponent, canMatch: [canMatchPermission('referentiel.lire')] },
  { path: 'agents-pole', component: RapportPoleComponent },
];
