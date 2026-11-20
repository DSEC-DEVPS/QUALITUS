import { Routes } from '@angular/router';
import { canMatchPermission } from '../../core/authorization/permission.guard';
import { AssignationComponent } from './assignation/assignation.component';
import { RenitialisationComponent } from './renitialisation/renitialisation.component';

export const routes: Routes = [
  { path: 'renitialisation-password', component: RenitialisationComponent, canMatch: [canMatchPermission('compte.gerer')] },
  { path: 'assignation-agents', component: AssignationComponent, canMatch: [canMatchPermission('assignation.gerer')] },
];
