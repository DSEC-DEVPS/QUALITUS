import { Routes } from '@angular/router';
import { ListeSondageComponent } from './liste-sondage/liste-sondage.component';
import { EditeurSondageComponent } from './editeur-sondage/editeur-sondage.component';
import { CibleSondageComponent } from './cible-sondage/cible-sondage.component';
import { RapportSondageComponent } from './rapport-sondage/rapport-sondage.component';
import { PassationSondageComponent } from './passation/passation-sondage.component';

export const routes: Routes = [
  { path: '', redirectTo: 'gestion', pathMatch: 'full' },
  { path: 'gestion', component: ListeSondageComponent },
  { path: 'creer', component: EditeurSondageComponent },
  { path: 'editer/:id', component: EditeurSondageComponent },
  { path: 'cible/:id', component: CibleSondageComponent },
  { path: 'rapport/:id', component: RapportSondageComponent },
  // Sondage obligatoire : rendu DANS la coquille de l'app (mon-espace)
  { path: 'obligatoire/:id', component: PassationSondageComponent },
];
