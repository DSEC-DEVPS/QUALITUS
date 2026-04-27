import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { environment } from '@env/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SiteService {
  private baseUrl = environment.baseUrl;
  constructor(
    private http: HttpClient,
    private snackBar: MatSnackBar
  ) {}

  getAllSite(): Observable<any> {
    return this.http.get<any>(`/api/v1/site/all`);
  }
}
