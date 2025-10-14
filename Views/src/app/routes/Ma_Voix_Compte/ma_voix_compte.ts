import { Routes } from '@angular/router';
import { AjouterMaVoixCompteComponent } from './ajouter-ma-voix-compte/ajouter-ma-voix-compte.component';
import { MotifMaVoixCompteComponent } from './motif-ma-voix-compte/motif-ma-voix-compte.component';

export const routes: Routes = [
  { path: 'ajouter', component: AjouterMaVoixCompteComponent },
  {
    path: 'motif',
    component: MotifMaVoixCompteComponent,
  },
];
