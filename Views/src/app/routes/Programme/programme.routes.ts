import { Routes } from '@angular/router';
import { ListeProgrammeComponent } from './liste-programme/liste-programme.component';
import { DetailsProgrammeComponent } from './details-programme/details-programme.component';

export const routes: Routes = [
  { path: 'Liste', component: ListeProgrammeComponent },
  { path: 'details/:id', component: DetailsProgrammeComponent },
];
