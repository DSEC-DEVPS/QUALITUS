/*import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';

import { Menu } from '@core';
import { Token, User } from './interface';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class LoginService {
  protected readonly http = inject(HttpClient);
  private baseUrl = environment.baseUrl;

  login(nom_utilisateur: string, password: string, rememberMe = false): Observable<Token> {
    console.log(this.baseUrl);
    return this.http.post<Token>(`http://server:3000/api/v1/login`, {
      nom_utilisateur,
      password,
    });
  }
  refresh(params: Record<string, any>) {
    return this.http.post<Token>('/auth/refresh', params);
  }

  logout() {
    return this.http.post<any>('/auth/logout', {});
  }

  me() {
    return this.http.get<User>(`http://localhost:3000/api/v1/user_info`);
  }

  menu() {
    return this.http.get<{ menu: Menu[] }>('/me/menu').pipe(map(res => res.menu));
  }
}
*/
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';

import { Menu } from '@core';
import { Token, User } from './interface';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class LoginService {
  protected readonly http = inject(HttpClient);
  private baseUrl = environment.baseUrl;

  login(nom_utilisateur: string, password: string, rememberMe = false): Observable<Token> {
    console.log(this.baseUrl);
    return this.http.post<Token>(`/api/v1/login`, {
      nom_utilisateur,
      password,
    });
  }
  refresh(params: Record<string, any>) {
    return this.http.post<Token>('/auth/refresh', params);
  }

  logout() {
    return this.http.post<any>('/auth/logout', {});
  }

  me() {
    return this.http.get<User>(`/api/v1/user_info`);
  }

  menu() {
    return this.http.get<{ menu: Menu[] }>('/me/menu').pipe(map(res => res.menu));
  }
}
