import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { environment } from '@env/environment';
import { SupplementaireResultat } from '@shared/interfaces/supplementaires/SupplementaireResultats';
import { Supplementaires } from '@shared/modeles/supplementaires/Supplementaires';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SupplementairesService {
  private baseUrl = environment.baseUrl;
  constructor(
    private http: HttpClient,
    private snackBar: MatSnackBar
  ) {}
  getAgentByUsername(username: string): Observable<any> {
    if (username === '' || username === ' ') {
      username = 'loremipsum';
    }
    return this.http.get<any>(`/api/v1/evaluations/agent/${username}`);
  }
  addSupplementaire(data: Supplementaires): Observable<any> {
    console.log('dataservice');
    console.log(data);
    return this.http.post<any>(`/api/v1/supplementaires/add`, data);
  }
  deleteSupplementaire(id: number): Observable<any> {
    return this.http.delete<any>(`/api/v1/deletesupplementaires/${id}`);
  }
  updateSupplementaire(id: number, data: any): Observable<any> {
    console.log('data');
    console.log(data);
    return this.http.put<any>(`/api/v1/supplementaires/${id}`, data);
  }
  terminerSupplementaire(id: number): Observable<any> {
    return this.http.put<any>(`/api/v1/terminersupplementaires/${id}`, {});
  }
  updateSupplementaireResultat(data: any): Observable<any> {
    console.log('data');
    console.log(data);
    return this.http.put<any>(`/api/v1/supplementairesResultats`, data);
  }
  getSupplementairesByEvaluations(id: number): Observable<any> {
    return this.http.get<any>(`/api/v1/supplementairesByEvaluations/${id}`);
  }
  getSupplementairesByEvaluateur(id: number, debut: any, fin: any): Observable<any> {
    return this.http.get<any>(`/api/v1/supplementairesAll/${id}/${debut}/${fin}`);
  }
  getSupplementairesById(id: number): Observable<any> {
    return this.http.get<any>(`/api/v1/supplementaires/${id}`);
  }
  getSupplementairesResultats(id: number): Observable<SupplementaireResultat[]> {
    return this.http.get<SupplementaireResultat[]>(`/api/v1/supplementairesResultats/${id}`);
  }
  getSupplementairesScores(id: number): Observable<SupplementaireResultat[]> {
    return this.http.get<any>(`/api/v1/scoresByIdSupplementaires/${id}`);
  }
}
