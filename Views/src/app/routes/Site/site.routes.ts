import { Routes } from '@angular/router';
import { ListeSiteComponent } from './liste-site/liste-site.component';
import { DetailsSiteComponent } from './details-site/details-site.component';

export const routes: Routes = [
  { path: 'Liste', component: ListeSiteComponent },
  {
    path: 'Details/:id',
    component: DetailsSiteComponent,
  },
];
