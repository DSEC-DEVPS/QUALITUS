import { TestBed } from '@angular/core/testing';
import { HTTP_INTERCEPTORS, HttpClient, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TokenService } from '@core/authentication';
import { AuthInterceptor } from './auth-token.interceptor';

describe('AuthInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let jeton: string;

  beforeEach(() => {
    jeton = 'Bearer abc123';
    TestBed.configureTestingModule({
      providers: [
        { provide: TokenService, useValue: { getBearerToken: () => jeton } },
        { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('ajoute l\'en-tête Authorization avec le jeton courant', () => {
    http.get('/api/v1/me').subscribe();
    const req = httpMock.expectOne('/api/v1/me');
    expect(req.request.headers.get('Authorization')).toBe('Bearer abc123');
    req.flush({});
  });

  it('reprend le jeton à chaque requête (changement d\'utilisateur)', () => {
    jeton = 'Bearer autre';
    http.post('/api/v1/x', {}).subscribe();
    const req = httpMock.expectOne('/api/v1/x');
    expect(req.request.headers.get('Authorization')).toBe('Bearer autre');
    req.flush({});
  });
});
