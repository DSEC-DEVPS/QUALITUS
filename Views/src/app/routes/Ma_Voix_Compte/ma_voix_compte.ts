import { Routes } from '@angular/router';
import { canMatchPermission } from '../../core/authorization/permission.guard';
import { AjouterMaVoixCompteComponent } from './ajouter-ma-voix-compte/ajouter-ma-voix-compte.component';
import { MotifMaVoixCompteComponent } from './motif-ma-voix-compte/motif-ma-voix-compte.component';

export const routes: Routes = [
  { path: 'ajouter', component: AjouterMaVoixCompteComponent, canMatch: [canMatchPermission('ma_voix.ajouter')] },
  {
    path: 'motif',
    component: MotifMaVoixCompteComponent,
    canMatch: [canMatchPermission('ma_voix.motif')],
  },
];
