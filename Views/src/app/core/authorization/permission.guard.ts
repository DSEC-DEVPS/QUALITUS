import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { map } from 'rxjs/operators';
import { PermissionsService } from './permissions.service';
import { PageAccueilService } from './page-accueil.service';
import { AuthService } from '../authentication/auth.service';

/**
 * Guard de route (canMatch) : autorise la navigation si l'utilisateur possède
 * la permission requise, sinon redirige vers la page d'arrivée de l'utilisateur
 * (cf. PageAccueilService) — ou vers la page 403 si c'est justement elle qui est refusée.
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
    if (ok) return true;
    const demandee = router.getCurrentNavigation()?.extractedUrl.toString() || '';
    return inject(PageAccueilService)
      .url$()
      .pipe(map(url => router.parseUrl(demandee.startsWith(url) ? '/403' : url)));
  };
}
