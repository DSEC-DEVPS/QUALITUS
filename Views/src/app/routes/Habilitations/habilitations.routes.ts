import { Routes } from '@angular/router';
import { MatriceComponent } from './matrice/matrice.component';
import { DroitsUtilisateurComponent } from './droits-utilisateur/droits-utilisateur.component';

export const routes: Routes = [
  { path: '', redirectTo: 'matrice', pathMatch: 'full' },
  { path: 'matrice', component: MatriceComponent },
  { path: 'droits-utilisateur', component: DroitsUtilisateurComponent },
];
