import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { message } from '@core';
import { environment } from '@env/environment';
import { BehaviorSubject, Observable } from 'rxjs';
import { CategorieErreur } from '@shared/interfaces/categorieErreur/CategorieErreur';
import { SousCategorieErreur } from '@shared/interfaces/sousCategorieErreur/SousCategorieErreur';
import { Erreurs } from '@shared/interfaces/erreurs/Erreurs';
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
  }

  getAllCategorieErreursByGrille(id: number): Observable<CategorieErreur[]> {
    return this.http.get<CategorieErreur[]>(`/api/v1/categoriesErreursByGrille/${id}`);
  }
  updateCategorieErreur(id: number, data: any): Observable<any> {
    console.log('data');
    console.log(data);
    return this.http.put<any>(`/api/v1/categoriesErreurs/${id}`, data);
  }
  deleteCategorie(id: number): Observable<any> {
    return this.http.delete<any>(`/api/v1/categoriesErreurs/${id}`);
  }
  getAllSousCategorieErreursByCategorie(id: number): Observable<SousCategorieErreur[]> {
    return this.http.get<SousCategorieErreur[]>(`/api/v1/sousCategoriesErreursByCategorie/${id}`);
  }
  updateSousCategorieErreur(id: number, data: any): Observable<any> {
    console.log('data');
    console.log(data);
    return this.http.put<any>(`/api/v1/sousCategoriesErreurs/${id}`, data);
  }
  deleteSousCategorie(id: number): Observable<any> {
    return this.http.delete<any>(`/api/v1/sousCategoriesErreurs/${id}`);
  }
  getAllErreursByCategorie(id: number): Observable<Erreurs[]> {
    return this.http.get<Erreurs[]>(`/api/v1/erreursByCategorie/${id}`);
  }
}
