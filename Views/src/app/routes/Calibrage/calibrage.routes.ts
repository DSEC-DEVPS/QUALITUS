import { Routes } from '@angular/router';
import { ListeSessionsComponent } from './liste-sessions/liste-sessions.component';
import { CreerSessionComponent } from './creer-session/creer-session.component';
import { PreparerSessionComponent } from './preparer-session/preparer-session.component';
import { SessionComponent } from './session/session.component';
import { ResultatsComponent } from './resultats/resultats.component';
import { canMatchPermission } from '../../core/authorization/permission.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'sessions', pathMatch: 'full' },
  { path: 'sessions', component: ListeSessionsComponent },
  { path: 'creer', component: CreerSessionComponent, canMatch: [canMatchPermission('calibrage.organiser')] },
  { path: 'preparer/:id', component: PreparerSessionComponent, canMatch: [canMatchPermission('calibrage.organiser')] },
  { path: 'session/:id', component: SessionComponent, canMatch: [canMatchPermission('calibrage.lire')] },
  { path: 'resultats/:id', component: ResultatsComponent, canMatch: [canMatchPermission('calibrage.lire')] },
];
