import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { message } from '@core';
import { environment } from '@env/environment';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class GrilleService {
  private baseUrl = environment.baseUrl;
  constructor(
    private http: HttpClient,
    private snackBar: MatSnackBar
  ) {}

  getAllGrille(): Observable<any> {
    return this.http.get<any>(`/api/v1/grille/all`);
  }}
