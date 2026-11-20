import { Routes } from '@angular/router';
import { canMatchPermission } from '../../core/authorization/permission.guard';
import { AjouterFicheComponent } from './ajouter-fiche/ajouter-fiche.component';
import { ListeCategorieComponent } from './liste-categorie/liste-categorie.component';
import { ListeSlaComponent } from './liste-sla/liste-sla.component';
import { ListeSousCategorieComponent } from './liste-sous-categorie/liste-sous-categorie.component';
import { LectureFicheComponent } from './lecture-fiche/lecture-fiche.component';
import { ListeArchiveComponent } from './liste-archive/liste-archive.component';
import { ChargementsComponent } from './chargements/chargements.component';
import { DetailFicheComponent } from './detail-fiche/detail-fiche.component';
import { UpdateFicheComponent } from './update-fiche/update-fiche.component';
import { VerificationComponent } from './verification/verification.component';
export const routes: Routes = [
  { path: 'Liste', component: ChargementsComponent, canMatch: [canMatchPermission('fiche.lire')] },
  { path: 'ListeCategorie', component: ListeCategorieComponent, canMatch: [canMatchPermission('fiche.lire')] },
  { path: 'ListeSla', component: ListeSlaComponent, canMatch: [canMatchPermission('fiche.lire')] },
  { path: 'ListeSousCategorie', component: ListeSousCategorieComponent, canMatch: [canMatchPermission('fiche.lire')] },
  { path: 'lecture-fiche/:id', component: LectureFicheComponent, canMatch: [canMatchPermission('fiche.lire')] },
  { path: 'archives', component: ListeArchiveComponent, canMatch: [canMatchPermission('fiche.lire')] },
  { path: 'Ajouter', component: AjouterFicheComponent, canMatch: [canMatchPermission('fiche.creer')] },
  { path: 'details/:id', component: DetailFicheComponent, canMatch: [canMatchPermission('fiche.lire')] },
  { path: 'update/:id', component: UpdateFicheComponent, canMatch: [canMatchPermission('fiche.modifier')] },
  // Gestion Chargements : permission dédiée (accessible sans fiche.lire)
  { path: 'ge-chargement', component: VerificationComponent, canMatch: [canMatchPermission('chargement.verifier')] },
];
