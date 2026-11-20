import { HttpErrorResponse, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { TokenService } from '../authentication/token.service';
import { catchError, throwError } from 'rxjs';

export enum STATUS {
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  INTERNAL_SERVER_ERROR = 500,
}

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  private readonly router = inject(Router);
  private readonly toast = inject(ToastrService);
  private readonly tokenService = inject(TokenService);

  /** Évite plusieurs toasts / redirections quand plusieurs requêtes échouent en 401 en même temps. */
  private sessionExpiree = false;

  private readonly errorPages = [STATUS.FORBIDDEN, STATUS.NOT_FOUND, STATUS.INTERNAL_SERVER_ERROR];

  /** Message affiché quand le serveur n'en fournit pas (ou renvoie du HTML). */
  private readonly defaultMessages: Record<number, string> = {
    [STATUS.FORBIDDEN]: 'Accès refusé',
    [STATUS.NOT_FOUND]: 'Ressource introuvable',
    [STATUS.INTERNAL_SERVER_ERROR]: 'Erreur serveur, veuillez réessayer',
  };

  private getMessage = (error: HttpErrorResponse) => {
    if (error.error?.message) {
      return error.error.message;
    }

    if (error.error?.msg) {
      return error.error.msg;
    }

    if (this.defaultMessages[error.status]) {
      return this.defaultMessages[error.status];
    }

    return `${error.status} ${error.statusText}`;
  };

  intercept(req: HttpRequest<unknown>, next: HttpHandler) {
    return next
      .handle(req)
      .pipe(catchError((error: HttpErrorResponse) => this.handleError(req, error)));
  }

  private handleError(req: HttpRequest<unknown>, error: HttpErrorResponse) {
    if (error.status === STATUS.UNAUTHORIZED) {
      this.handleUnauthorized(req, error);
      return throwError(() => error);
    }

    // 403 / 404 / 500 : le message est toujours affiché à l'utilisateur.
    // - Chargement de page (GET) : on garde la redirection existante.
    // - Action (POST / PUT / PATCH / DELETE) : l'utilisateur reste sur sa page.
    if (this.errorPages.includes(error.status)) {
      console.error('ERROR', error);
      this.toast.error(this.getMessage(error));
      if (req.method === 'GET') {
        this.router.navigateByUrl(`/${error.status}`, {
          skipLocationChange: true,
        });
      }
    } else {
      console.error('ERROR', error);

      this.toast.error(this.getMessage(error));
      /* if (error.status === STATUS.UNAUTHORIZED) {
        this.toast.error('Login ou Mot de passe incorrect');
      }*/
    }

    return throwError(() => error);
  }

  /**
   * 401 :
   * - appel de connexion (mauvais identifiants) : on affiche le message du serveur ;
   * - démarrage de l'application ou page /auth (login, changement de mot de passe) : rien (pas de toast parasite) ;
   * - ailleurs (session expirée / jeton invalide) : on efface le jeton, un seul toast,
   *   puis redirection vers le login avec l'URL de retour.
   */
  private handleUnauthorized(req: HttpRequest<unknown>, error: HttpErrorResponse) {
    if (/\/api\/v1\/login(\?|$)/.test(req.url)) {
      this.toast.error(this.getMessage(error));
      return;
    }

    // Silence si : démarrage de l'application (aucune navigation encore faite,
    // le guard gère la redirection), page /auth déjà affichée, ou redirection en cours.
    const urlCourante = this.router.url || '';
    if (!this.router.navigated || urlCourante.startsWith('/auth') || this.sessionExpiree) {
      return;
    }

    this.sessionExpiree = true;
    this.tokenService.clear();
    this.toast.error('Votre session a expiré, veuillez vous reconnecter.');
    const extras = urlCourante && urlCourante !== '/' ? { queryParams: { returnUrl: urlCourante } } : {};
    this.router.navigate(['/auth/login'], extras).finally(() => (this.sessionExpiree = false));
  }
}
