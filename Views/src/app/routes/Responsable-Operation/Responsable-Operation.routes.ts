import { Routes } from '@angular/router';
import { AssignationComponent } from './assignation/assignation.component';
import { RenitialisationComponent } from './renitialisation/renitialisation.component';

export const routes: Routes = [
  { path: 'renitialisation-password', component: RenitialisationComponent },
  { path: 'assignation-agents', component: AssignationComponent },
];
