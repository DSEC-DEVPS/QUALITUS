import { Routes } from '@angular/router';
import { ListeModelesComponent } from './liste-modeles/liste-modeles.component';
import { EditeurGrilleComponent } from './editeur-grille/editeur-grille.component';

export const routes: Routes = [
  { path: '', redirectTo: 'modeles', pathMatch: 'full' },
  { path: 'modeles', component: ListeModelesComponent },
  { path: 'editeur/:id', component: EditeurGrilleComponent },
];
