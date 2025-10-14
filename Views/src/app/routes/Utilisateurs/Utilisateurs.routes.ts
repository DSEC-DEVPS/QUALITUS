import { Routes } from '@angular/router';
import { ListeUtilisateurComponent } from './liste-utilisateur/liste-utilisateur.component';
import { SingleUtilisateurComponent } from './single-utilisateur/single-utilisateur.component';

export const routes: Routes = [
  { path: 'Liste', component: ListeUtilisateurComponent },
  { path: 'details/:id', component: SingleUtilisateurComponent },
];
