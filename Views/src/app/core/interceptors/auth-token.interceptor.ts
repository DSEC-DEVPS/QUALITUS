import {
  HttpEvent,
  HttpHandler,
  HttpHeaders,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { TokenService } from '@core/authentication';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private readonly tokenService = inject(TokenService);
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const headers = new HttpHeaders().append('Authorization', this.tokenService.getBearerToken());
    const requestClone = req.clone({ headers });
    return next.handle(requestClone);
  }
}
