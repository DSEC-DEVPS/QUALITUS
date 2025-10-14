import { Routes } from '@angular/router';
import { authGuard } from '@core';
import { AdminLayoutComponent } from '@theme/admin-layout/admin-layout.component';
import { AuthLayoutComponent } from '@theme/auth-layout/auth-layout.component';
import { DashboardComponent } from './routes/dashboard/dashboard.component';
import { LoginComponent } from './routes/sessions/login/login.component';
import { HomePageComponent } from './routes/home-page/home-page.component';
import { ListeGrilleComponent } from './routes/liste-grille/liste-grille.component';
import { LectureFicheComponent } from './routes/Fiche/lecture-fiche/lecture-fiche.component';
import { ExporterComponent } from './routes/exportation/exporter/exporter.component';
import { ChangedPasswordComponent } from './routes/sessions/changed-password/changed-password.component';

export const routes: Routes = [
  {
    path: '',
    component: HomePageComponent,
    canActivate: [authGuard],
    canActivateChild: [authGuard],
  },

  {
    path: 'mon-espace',
    component: AdminLayoutComponent,
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },
      {
        path: 'Utilisateurs',
        loadChildren: () => import('./routes/Utilisateurs/Utilisateurs.routes').then(m => m.routes),
      },
      {
        path: 'mes-agents',
        loadChildren: () => import('./routes/Mes-agents/mes-agents.routes').then(m => m.routes),
      },

      { path: 'export', component: ExporterComponent },

      {
        path: 'Fonction',
        loadChildren: () => import('./routes/Fonction/fonction-routes').then(m => m.routes),
      },
      {
        path: 'Site',
        loadChildren: () => import('./routes/Site/site.routes').then(m => m.routes),
      },
      {
        path: 'Programme',
        loadChildren: () => import('./routes/Programme/programme.routes').then(m => m.routes),
      },
      {
        path: 'Fiche',
        loadChildren: () => import('./routes/Fiche/fiche.routes').then(m => m.routes),
      },
      {
        path: 'profile',
        loadChildren: () => import('./routes/profile/profile.routes').then(m => m.routes),
      },

      {
        path: 'MaVoixCompte',
        loadChildren: () => import('./routes/Ma_Voix_Compte/ma_voix_compte').then(m => m.routes),
      },
      {
        path: 'RO',
        loadChildren: () =>
          import('./routes/Responsable-Operation/Responsable-Operation.routes').then(m => m.routes),
      },
      { path: 'quiz', loadChildren: () => import('./routes/Quiz/quiz.routes').then(m => m.routes) },
      {
        path: 'grille',
        component: ListeGrilleComponent,
      },
    ],
  },
  { path: 'lecture-fiche/:id', component: LectureFicheComponent },
  {
    path: 'auth',
    component: AuthLayoutComponent,
    children: [
      { path: 'login', component: LoginComponent },
      { path: 'change-password', component: ChangedPasswordComponent },
    ],
  },
  { path: '**', redirectTo: 'mon-espace/dashboard' },
];
