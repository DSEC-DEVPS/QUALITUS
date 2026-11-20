import { inject } from '@angular/core';
import { Routes } from '@angular/router';
import { canMatchPermission } from '../../core/authorization/permission.guard';
import { PermissionsService } from '../../core/authorization/permissions.service';
import { MatriceComponent } from './matrice/matrice.component';
import { DroitsUtilisateurComponent } from './droits-utilisateur/droits-utilisateur.component';
import { UtilisateursSpeciauxComponent } from './utilisateurs-speciaux/utilisateurs-speciaux.component';
import { MenageNotificationsComponent } from './menage-notifications/menage-notifications.component';

export const routes: Routes = [
  { path: 'matrice', component: MatriceComponent, canMatch: [canMatchPermission('habilitation.lire')] },
  { path: 'droits-utilisateur', component: DroitsUtilisateurComponent, canMatch: [canMatchPermission('habilitation.lire')] },
  { path: 'utilisateurs-speciaux', component: UtilisateursSpeciauxComponent, canMatch: [canMatchPermission('habilitation.lire')] },
  {
    path: 'menage-notifications',
    component: MenageNotificationsComponent,
    canMatch: [canMatchPermission('notification.supprimer')],
  },
  // Sans sous-route : matrice si habilitation.lire, sinon le ménage des notifications.
  { path: '', pathMatch: 'full', redirectTo: () => (inject(PermissionsService).can('habilitation.lire') ? 'matrice' : 'menage-notifications') },
];
