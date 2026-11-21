import { inject } from '@angular/core';
import { CanActivateChildFn, Router } from '@angular/router';
import { map } from 'rxjs/operators';
import { SondageService } from '@shared/services/sondage.service';

/**
 * Garde bloquant : si l'utilisateur connecté est ciblé par un sondage ACTIF qu'il
 * n'a pas encore complété, toute navigation est redirigée vers ce sondage
 * (page plein écran /sondage-obligatoire/:id, sans menu) tant qu'il ne l'a pas soumis.
 */
export const sondageObligatoireGuard: CanActivateChildFn = (route, state) => {
  const srv = inject(SondageService);
  const router = inject(Router);
  // La page de passation obligatoire elle-même est autorisée (pas de boucle).
  if (state.url.startsWith('/sondage-obligatoire/')) {
    return true;
  }
  return srv
    .premierObligatoire()
    .pipe(map(id => (id ? router.parseUrl('/sondage-obligatoire/' + id) : true)));
};
