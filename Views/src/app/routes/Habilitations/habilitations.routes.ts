import { Routes } from '@angular/router';
import { canMatchPermission } from '../../core/authorization/permission.guard';
import { MatriceComponent } from './matrice/matrice.component';
import { DroitsUtilisateurComponent } from './droits-utilisateur/droits-utilisateur.component';
import { UtilisateursSpeciauxComponent } from './utilisateurs-speciaux/utilisateurs-speciaux.component';

export const routes: Routes = [
  { path: '', redirectTo: 'matrice', pathMatch: 'full' },
  { path: 'matrice', component: MatriceComponent, canMatch: [canMatchPermission('habilitation.lire')] },
  { path: 'droits-utilisateur', component: DroitsUtilisateurComponent, canMatch: [canMatchPermission('habilitation.lire')] },
  { path: 'utilisateurs-speciaux', component: UtilisateursSpeciauxComponent, canMatch: [canMatchPermission('habilitation.lire')] },
];
