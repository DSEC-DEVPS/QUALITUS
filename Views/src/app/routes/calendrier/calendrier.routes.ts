import { Routes } from '@angular/router';
import { CalendrierComponent } from './calendrier.component';
import { CalendrierPoliciesComponent } from './calendrier-policies/calendrier-policies.component';

export const routes: Routes = [
  { path: 'listeCalendars', component: CalendrierComponent },
  { path: 'listeCalendarsPolicies', component: CalendrierPoliciesComponent },
];
