import { inject } from '@angular/core';
import { CanActivateChildFn, Router } from '@angular/router';
import { map } from 'rxjs/operators';
import { SondageService } from '@shared/services/sondage.service';

/**
 * Garde bloquant : si l'utilisateur connecté est ciblé par un sondage ACTIF qu'il
 * n'a pas encore complété, toute navigation est redirigée vers ce sondage
 * (plein écran) tant qu'il ne l'a pas effectué.
 */
export const sondageObligatoireGuard: CanActivateChildFn = (route, state) => {
  const srv = inject(SondageService);
  const router = inject(Router);
  // La page de passation obligatoire elle-même est autorisée (pas de boucle).
  if (state.url.includes('sondage/obligatoire')) {
    return true;
  }
  return srv
    .premierObligatoire()
    .pipe(map(id => (id ? router.parseUrl('/mon-espace/sondage/obligatoire/' + id) : true)));
};
