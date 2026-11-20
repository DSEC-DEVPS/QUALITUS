import {
  HTTP_INTERCEPTORS,
  HttpClient,
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideToastr, ToastrService } from 'ngx-toastr';
// TokenService (barrel @core) est importé AVANT l'intercepteur : même ordre de chargement que l'application.
import { TokenService } from '@core/authentication';
import { ErrorInterceptor } from './error-interceptor';

describe('ErrorInterceptor', () => {
  let httpMock: HttpTestingController;
  let http: HttpClient;
  let router: Router;
  let toast: ToastrService;
  const emptyFn = () => {};

  function assertStatus(status: number, statusText: string) {
    spyOn(router, 'navigateByUrl');

    http.get('/me').subscribe({ next: emptyFn, error: emptyFn, complete: emptyFn });

    httpMock.expectOne('/me').flush({}, { status, statusText });

    expect(router.navigateByUrl).toHaveBeenCalledWith(`/${status}`, {
      skipLocationChange: true,
    });
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideToastr(),
      ],
    });

    httpMock = TestBed.inject(HttpTestingController);
    http = TestBed.inject(HttpClient);
    router = TestBed.inject(Router);
    toast = TestBed.inject(ToastrService);
  });

  afterEach(() => httpMock.verify());

  it('401 session expirée : un seul toast, jeton effacé, redirection login avec returnUrl', async () => {
    const tokenService = TestBed.inject(TokenService);
    spyOn(tokenService, 'clear');
    spyOnProperty(router, 'url', 'get').and.returnValue('/mon-espace/Fiche/details/1');
    router.navigated = true;
    const nav = spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    spyOn(toast, 'error');

    // Deux requêtes en échec simultané → un seul toast et une seule redirection
    http.get('/a').subscribe({ next: emptyFn, error: emptyFn });
    http.put('/b', {}).subscribe({ next: emptyFn, error: emptyFn });
    httpMock.expectOne('/a').flush({ message: 'Merci de vous connecter' }, { status: 401, statusText: 'Unauthorized' });
    httpMock.expectOne('/b').flush({ message: 'Merci de vous connecter' }, { status: 401, statusText: 'Unauthorized' });

    expect(tokenService.clear).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith('Votre session a expiré, veuillez vous reconnecter.');
    expect(nav).toHaveBeenCalledOnceWith(['/auth/login'], {
      queryParams: { returnUrl: '/mon-espace/Fiche/details/1' },
    });
  });

  it('401 sur la page de login (avant connexion) : aucun toast, aucune redirection', () => {
    spyOnProperty(router, 'url', 'get').and.returnValue('/auth/login');
    spyOn(router, 'navigate');
    spyOn(toast, 'error');

    http.get('/api/v1/me/permissions').subscribe({ next: emptyFn, error: emptyFn });
    httpMock.expectOne('/api/v1/me/permissions').flush({ message: 'Merci de vous connecter' }, { status: 401, statusText: 'Unauthorized' });

    expect(toast.error).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('401 au démarrage de l\'application (avant toute navigation) : aucun toast, aucune redirection', () => {
    router.navigated = false;
    spyOnProperty(router, 'url', 'get').and.returnValue('/');
    spyOn(router, 'navigate');
    spyOn(toast, 'error');

    http.get('/api/v1/me/permissions').subscribe({ next: emptyFn, error: emptyFn });
    httpMock.expectOne('/api/v1/me/permissions').flush({ message: 'Merci de vous connecter' }, { status: 401, statusText: 'Unauthorized' });

    expect(toast.error).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('401 sur la connexion (mauvais identifiants) : message du serveur, sans redirection', () => {
    spyOnProperty(router, 'url', 'get').and.returnValue('/auth/login');
    spyOn(router, 'navigate');
    spyOn(toast, 'error');

    http.post('/api/v1/login', {}).subscribe({ next: emptyFn, error: emptyFn });
    httpMock.expectOne('/api/v1/login').flush(
      { message: 'Le nom utilisateur ou le mot de passe est incorrect' },
      { status: 401, statusText: 'Unauthorized' }
    );

    expect(toast.error).toHaveBeenCalledWith('Le nom utilisateur ou le mot de passe est incorrect');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should handle status code 403', () => {
    assertStatus(403, 'Forbidden');
  });

  it('should handle status code 404', () => {
    assertStatus(404, 'Not Found');
  });

  it('should handle status code 500', () => {
    assertStatus(500, 'Internal Server Error');
  });

  it('GET 403 : affiche le message du serveur ET garde la redirection', () => {
    spyOn(router, 'navigateByUrl');
    spyOn(toast, 'error');

    http.get('/me').subscribe({ next: emptyFn, error: emptyFn, complete: emptyFn });
    httpMock
      .expectOne('/me')
      .flush({ message: 'Accès refusé : habilitation manquante (x.lire).' }, { status: 403, statusText: 'Forbidden' });

    expect(toast.error).toHaveBeenCalledWith('Accès refusé : habilitation manquante (x.lire).');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/403', { skipLocationChange: true });
  });

  it('PUT 403 : affiche le message du serveur, sans redirection', () => {
    spyOn(router, 'navigateByUrl');
    spyOn(toast, 'error');

    http.put('/archive', {}).subscribe({ next: emptyFn, error: emptyFn, complete: emptyFn });
    httpMock
      .expectOne('/archive')
      .flush({ message: 'Accès refusé : habilitation manquante (fiche.archiver).' }, { status: 403, statusText: 'Forbidden' });

    expect(toast.error).toHaveBeenCalledWith('Accès refusé : habilitation manquante (fiche.archiver).');
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('POST 500 sans message JSON : message par défaut, sans redirection', () => {
    spyOn(router, 'navigateByUrl');
    spyOn(toast, 'error');

    http.post('/x', {}).subscribe({ next: emptyFn, error: emptyFn, complete: emptyFn });
    httpMock.expectOne('/x').flush('<html>Internal Server Error</html>', { status: 500, statusText: 'Internal Server Error' });

    expect(toast.error).toHaveBeenCalledWith('Erreur serveur, veuillez réessayer');
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('DELETE 404 sans message : message par défaut, sans redirection', () => {
    spyOn(router, 'navigateByUrl');
    spyOn(toast, 'error');

    http.delete('/y').subscribe({ next: emptyFn, error: emptyFn, complete: emptyFn });
    httpMock.expectOne('/y').flush({}, { status: 404, statusText: 'Not Found' });

    expect(toast.error).toHaveBeenCalledWith('Ressource introuvable');
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('should handle others status code', () => {
    spyOn(toast, 'error');

    http.get('/me').subscribe({ next: emptyFn, error: emptyFn, complete: emptyFn });

    httpMock.expectOne('/me').flush({}, { status: 504, statusText: 'Gateway Timeout' });

    expect(toast.error).toHaveBeenCalledWith('504 Gateway Timeout');
  });
});
