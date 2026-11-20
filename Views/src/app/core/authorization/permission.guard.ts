import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { PermissionsService } from './permissions.service';
import { AuthService } from '../authentication/auth.service';

/**
 * Guard de route (canMatch) : autorise la navigation si l'utilisateur possède
 * la permission requise, sinon redirige vers le tableau de bord.
 * Utilisateur NON connecté (session expirée) : on laisse passer pour que l'authGuard
 * du parent « mon-espace » le renvoie au login avec l'URL de retour exacte
 * (sinon on perdait la page demandée au profit du tableau de bord).
 */
export function canMatchPermission(code: string | string[]): CanMatchFn {
  return () => {
    const perms = inject(PermissionsService);
    const router = inject(Router);
    if (!inject(AuthService).check()) {
      return true;
    }
    // Plusieurs codes : il suffit d'en détenir un.
    const ok = Array.isArray(code) ? perms.canAny(code) : perms.can(code);
    return ok ? true : router.createUrlTree(['/mon-espace/dashboard']);
  };
}
