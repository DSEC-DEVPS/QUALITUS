import { Routes } from '@angular/router';
import { ListeUtilisateurComponent } from './liste-utilisateur/liste-utilisateur.component';
// Détail d'un utilisateur : même fiche que « Mes agents » (indicateurs, badges quiz,
// consultations et commentaires). La grille d'évaluation se gère depuis la liste.
import { SingleAgentComponent } from '../Mes-agents/single-agent/single-agent.component';

export const routes: Routes = [
  { path: 'Liste', component: ListeUtilisateurComponent },
  { path: 'details/:id', component: SingleAgentComponent },
];
