import { Routes } from '@angular/router';
import { canMatchPermission } from './core/authorization/permission.guard';
import { dashboardGuard, versPageAccueilGuard } from './core/authorization/page-accueil.service';
import { authGuard } from '@core';
import { sondageObligatoireGuard } from './routes/Sondage/sondage-obligatoire.guard';
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
    canActivate: [authGuard, sondageObligatoireGuard],
    canActivateChild: [authGuard, sondageObligatoireGuard],
  },

  // Ancienne adresse du sondage obligatoire (liens existants) -> page plein écran.
  { path: 'mon-espace/sondage/obligatoire/:id', redirectTo: 'sondage-obligatoire/:id' },
  {
    path: 'mon-espace',
    component: AdminLayoutComponent,
    canActivate: [authGuard],
    canActivateChild: [authGuard, sondageObligatoireGuard],
    children: [
      // Page d'arrivée calculée selon ce que l'utilisateur voit dans le menu
      { path: '', pathMatch: 'full', canActivate: [versPageAccueilGuard], children: [] },
      { path: 'dashboard', component: DashboardComponent, canActivate: [dashboardGuard] },
      {
        path: 'notifications',
        canMatch: [canMatchPermission('notification.lire')],
        loadComponent: () =>
          import('./routes/Notifications/mes-notifications.component').then(m => m.MesNotificationsComponent),
      },
      {
        path: 'Utilisateurs',
        canMatch: [canMatchPermission('utilisateur.lire')],
        loadChildren: () => import('./routes/Utilisateurs/Utilisateurs.routes').then(m => m.routes),
      },
      {
        path: 'mes-agents',
        loadChildren: () => import('./routes/Mes-agents/mes-agents.routes').then(m => m.routes),
      },

      { path: 'export', component: ExporterComponent, canMatch: [canMatchPermission('reporting.lire')] },

      {
        path: 'Fonction',
        canMatch: [canMatchPermission('fonction.lire')],
        loadChildren: () => import('./routes/Fonction/fonction-routes').then(m => m.routes),
      },
      {
        path: 'Site',
        canMatch: [canMatchPermission('site.lire')],
        loadChildren: () => import('./routes/Site/site.routes').then(m => m.routes),
      },
      {
        path: 'Programme',
        canMatch: [canMatchPermission('programme.lire')],
        loadChildren: () => import('./routes/Programme/programme.routes').then(m => m.routes),
      },
      {
        path: 'Fiche',
        canMatch: [canMatchPermission(['fiche.lire', 'chargement.verifier'])],
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
      {
        path: 'quiz',
        // Mêmes droits que le menu Quiz : consulter, participer (tout profil) ou Baseco.
        canMatch: [canMatchPermission(['quiz.lire', 'quiz.participer', 'quiz.baseco'])],
        loadChildren: () => import('./routes/Quiz/quiz.routes').then(m => m.routes),
      },
      {
        path: 'evaluation',
        loadChildren: () => import('./routes/Evaluation/evaluation.routes').then(m => m.routes),
      },
      {
        path: 'sondage',
        canMatch: [canMatchPermission('sondage.lire')],
        loadChildren: () => import('./routes/Sondage/sondage.routes').then(m => m.routes),
      },
      {
        path: 'grille',
        component: ListeGrilleComponent,
        canMatch: [canMatchPermission('grille.lire')],
      },
      {
        path: 'habilitations',
        canMatch: [canMatchPermission(['habilitation.lire', 'notification.supprimer'])],
        loadChildren: () => import('./routes/Habilitations/habilitations.routes').then(m => m.routes),
      },
      {
        path: 'calibrage',
        canMatch: [canMatchPermission('calibrage.lire')],
        loadChildren: () => import('./routes/Calibrage/calibrage.routes').then(m => m.routes),
      },
    ],
  },
  { path: 'lecture-fiche/:id', component: LectureFicheComponent },
  // Sondage obligatoire : plein écran (sans menu ni barre), seul écran accessible
  // tant que l'utilisateur ciblé ne l'a pas soumis (cf. sondageObligatoireGuard).
  {
    path: 'sondage-obligatoire/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./routes/Sondage/passation/passation-sondage.component').then(
        m => m.PassationSondageComponent
      ),
  },
  {
    path: 'sondage-public/:token',
    loadComponent: () =>
      import('./routes/Sondage/passation/passation-sondage.component').then(
        m => m.PassationSondageComponent
      ),
  },
  {
    path: 'auth',
    component: AuthLayoutComponent,
    children: [
      { path: 'login', component: LoginComponent },
      { path: 'change-password', component: ChangedPasswordComponent },
    ],
  },
  // Pages d'erreur (403 / 404 / 500) affichées par l'intercepteur, dans la mise en page de l'application
  ...[403, 404, 500].map(code => ({
    path: String(code),
    component: AdminLayoutComponent,
    canActivate: [authGuard, sondageObligatoireGuard],
    children: [
      { path: '', loadComponent: () => import('./routes/sessions/erreur/erreur-page.component').then(m => m.ErreurPageComponent), data: { code } },
    ],
  })),
  // Adresse inconnue : page d'arrivée de l'utilisateur (connexion s'il ne l'est pas)
  { path: '**', canActivate: [sondageObligatoireGuard, versPageAccueilGuard], children: [] },
];
