import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed, inject } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthService, TokenService, authGuard, isSafeReturnUrl } from '@core/authentication';
import { LocalStorageService, MemoryStorageService } from '@shared/services/storage.service';

@Component({
  template: '',
  standalone: true,
  imports: [],
  providers: [provideHttpClientTesting()],
})
class DummyComponent {}

describe('authGuard function unit test', () => {
  const route: any = {};
  const state: any = {};
  let router: Router;
  let authService: AuthService;
  let tokenService: TokenService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [DummyComponent],
      providers: [
        { provide: LocalStorageService, useClass: MemoryStorageService },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'dashboard', component: DummyComponent, canActivate: [authGuard] },
          { path: 'auth/login', component: DummyComponent },
        ]),
      ],
    });
    TestBed.createComponent(DummyComponent);
    router = TestBed.inject(Router);
    authService = TestBed.inject(AuthService);
    tokenService = TestBed.inject(TokenService);
  });

  it('should be created', () => {
    expect(authGuard).toBeTruthy();
  });

  it('should be authenticated', () => {
    inject([AuthService, Router], () => {
      tokenService.set({ access_token: 'token', token_type: 'bearer' });

      expect(authGuard(route, state)).toBeTrue();
    });
  });

  it('should redirect to /auth/login when authenticate failed', () => {
    inject([AuthService, Router], () => {
      spyOn(authService, 'check').and.returnValue(false);

      expect(authGuard(route, state)).toEqual(router.parseUrl('/auth/login'));
    });
  });

  it('redirige vers /auth/login avec returnUrl quand la page demandée est connue', () => {
    spyOn(authService, 'check').and.returnValue(false);
    const result = TestBed.runInInjectionContext(() =>
      authGuard(route, { url: '/mon-espace/Fiche/details/1' } as any)
    );

    expect(result).toEqual(router.parseUrl('/auth/login?returnUrl=%2Fmon-espace%2FFiche%2Fdetails%2F1'));
  });

  it('isSafeReturnUrl refuse les URL externes et les pages /auth', () => {
    expect(isSafeReturnUrl('/mon-espace/Fiche/Liste')).toBeTrue();
    expect(isSafeReturnUrl('//evil.example.com')).toBeFalse();
    expect(isSafeReturnUrl('https://evil.example.com')).toBeFalse();
    expect(isSafeReturnUrl('/auth/login')).toBeFalse();
    expect(isSafeReturnUrl(null)).toBeFalse();
  });
});
