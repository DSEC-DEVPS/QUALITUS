import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Une URL de retour n'est acceptée que si elle reste dans l'application
 * (chemin interne, pas d'URL externe « //hote », pas de page /auth).
 */
export const isSafeReturnUrl = (url?: string | null): url is string =>
  !!url && url.startsWith('/') && !url.startsWith('//') && !url.startsWith('/auth');

export const authGuard = (route?: ActivatedRouteSnapshot, state?: RouterStateSnapshot) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.check()) {
    return true;
  }
  // Après reconnexion, l'utilisateur revient sur la page demandée.
  return isSafeReturnUrl(state?.url)
    ? router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state!.url } })
    : router.parseUrl('/auth/login');
};
