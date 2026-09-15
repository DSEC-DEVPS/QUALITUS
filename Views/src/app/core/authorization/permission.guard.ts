import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { PermissionsService } from './permissions.service';

/**
 * Guard de route (canMatch) : autorise la navigation si l'utilisateur possède
 * la permission requise, sinon redirige vers le tableau de bord.
 */
export function canMatchPermission(code: string): CanMatchFn {
  return () => {
    const perms = inject(PermissionsService);
    const router = inject(Router);
    return perms.can(code) ? true : router.createUrlTree(['/mon-espace/dashboard']);
  };
}
