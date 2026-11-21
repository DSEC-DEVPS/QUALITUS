import { inject, Injectable } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { NgxPermissionsService, NgxRolesService } from 'ngx-permissions';
import { Observable, of } from 'rxjs';
import { catchError, filter, map, take, timeout } from 'rxjs/operators';
import { Menu, MenuChildrenItem, MenuService } from '../bootstrap/menu.service';
import { AuthService } from '../authentication/auth.service';
import { PermissionsService } from './permissions.service';

/** Page d'arrivée privilégiée par rôle (si l'utilisateur y a effectivement accès). */
const PAGE_PAR_ROLE: Record<string, string> = {
  R_TC: '/mon-espace/MaVoixCompte/ajouter',
  R_BO: '/mon-espace/MaVoixCompte/ajouter',
  R_GE: '/mon-espace/Fiche/ge-chargement',
  R_RO: '/mon-espace/RO/renitialisation-password',
  R_SUP: '/mon-espace/mes-agents/Liste',
};
const DASHBOARD = '/mon-espace/dashboard';

/**
 * Page d'arrivée de « Mon espace », calculée d'après ce que l'utilisateur VOIT
 * réellement dans le menu latéral (mêmes règles : rôles/permissions only/except
 * et module) :
 *  1. la page prévue pour son rôle, si elle lui est accessible ;
 *  2. sinon le tableau de bord, s'il y a droit ;
 *  3. sinon la première entrée du menu qu'il voit ;
 *  4. sinon la page d'accueil (« / »).
 */
@Injectable({ providedIn: 'root' })
export class PageAccueilService {
  private readonly menu = inject(MenuService);
  private readonly auth = inject(AuthService);
  private readonly perms = inject(PermissionsService);
  private readonly ngxPerms = inject(NgxPermissionsService);
  private readonly ngxRoles = inject(NgxRolesService);

  /** URL d'arrivée ; attend (au plus 3 s) que le menu soit chargé. */
  url$(): Observable<string> {
    return this.menu.getAll().pipe(
      filter(m => !!m && m.length > 0),
      take(1),
      timeout({ first: 3000, with: () => of([] as Menu[]) }),
      map(m => this.calculer(m)),
      catchError(() => of('/'))
    );
  }

  /** L'utilisateur voit-il cette route dans son menu ? */
  routeVisible$(route: string): Observable<boolean> {
    return this.menu.getAll().pipe(
      filter(m => !!m && m.length > 0),
      take(1),
      timeout({ first: 3000, with: () => of([] as Menu[]) }),
      map(m => this.routesVisibles(m).includes(route)),
      catchError(() => of(false))
    );
  }

  private calculer(menu: Menu[]): string {
    const visibles = this.routesVisibles(menu);
    let role = '';
    this.auth
      .user()
      .pipe(take(1))
      .subscribe(u => (role = String((u as any)?.roles || (u as any)?.role || '')));
    const preferee = PAGE_PAR_ROLE[role];
    if (preferee && visibles.includes(preferee)) return preferee;
    if (visibles.includes(DASHBOARD)) return DASHBOARD;
    return visibles[0] || '/';
  }

  /** Routes (liens internes) visibles dans le menu, dans l'ordre d'affichage. */
  routesVisibles(menu: Menu[]): string[] {
    const cles = new Set<string>([
      ...Object.keys(this.ngxPerms.getPermissions() || {}),
      ...Object.keys(this.ngxRoles.getRoles() || {}),
    ]);
    const res: string[] = [];
    const parcourir = (items: (Menu | MenuChildrenItem)[], parents: string[]) => {
      for (const it of items || []) {
        if (!this.visible(it, cles)) continue;
        const chemin = parents.concat([it.route]);
        if (it.type === 'link') res.push(this.menu.buildRoute(chemin));
        else if (it.type === 'sub') parcourir(it.children || [], chemin);
      }
    };
    parcourir(menu, []);
    return res;
  }

  private visible(it: Menu | MenuChildrenItem, cles: Set<string>): boolean {
    const liste = (v?: string | string[]) => (v == null ? [] : Array.isArray(v) ? v : [v]);
    const only = liste(it.permissions?.only);
    const except = liste(it.permissions?.except);
    if (only.length && !only.some(k => cles.has(k))) return false;
    if (except.length && except.some(k => cles.has(k))) return false;
    if (it.module && !this.perms.canModule(it.module)) return false;
    return true;
  }
}

/** Garde : redirige vers la page d'arrivée calculée (« /mon-espace », adresse inconnue…). */
export const versPageAccueilGuard: CanActivateFn = () => {
  const router = inject(Router);
  if (!inject(AuthService).check()) return router.parseUrl('/auth/login');
  return inject(PageAccueilService)
    .url$()
    .pipe(map(url => router.parseUrl(url)));
};

/** Garde du tableau de bord : réservé à ceux qui le voient dans le menu. */
export const dashboardGuard: CanActivateFn = () => {
  const router = inject(Router);
  const svc = inject(PageAccueilService);
  return svc.routeVisible$(DASHBOARD).pipe(
    // Pas de droit : on renvoie vers la page d'arrivée de l'utilisateur.
    map(ok => (ok ? true : router.parseUrl('/mon-espace'))),
  );
};
