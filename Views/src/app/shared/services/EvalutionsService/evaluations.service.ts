import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { environment } from '@env/environment';
import { EvaluationResultat } from '@shared/interfaces/evaluations/EvaluationResultat';
import { Evaluations } from '@shared/modeles/evaluations/Evaluations';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class EvaluationsService {
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
  addEvaluation(data: Evaluations): Observable<any> {
    console.log('dataservice');
    console.log(data);
    return this.http.post<any>(`/api/v1/evaluations/add`, data);
  }
  deleteEvaluation(id: number): Observable<any> {
    return this.http.delete<any>(`/api/v1/deleteEvaluations/${id}`);
  }
  updateEvaluation(id: number, data: any): Observable<any> {
    console.log('data');
    console.log(data);
    return this.http.put<any>(`/api/v1/evaluations/${id}`, data);
  }
  terminerEvaluation(id: number): Observable<any> {
    return this.http.put<any>(`/api/v1/terminerEvaluations/${id}`, {});
  }
  updateEvaluationResultat(data: any): Observable<any> {
    console.log('data');
    console.log(data);
    return this.http.put<any>(`/api/v1/evaluationsResultats`, data);
  }
  getEvaluationsByEvaluateur(id: number, debut: any, fin: any): Observable<any> {
    return this.http.get<any>(`/api/v1/evaluationsAll/${id}/${debut}/${fin}`);
  }
  getEvaluationsByAgent(id: number, debut: any, fin: any): Observable<any> {
    return this.http.get<any>(`/api/v1/evaluationsAll/${id}/${debut}/${fin}`);
  }
  getEvaluationsById(id: number): Observable<any> {
    return this.http.get<any>(`/api/v1/evaluations/${id}`);
  }
  getEvaluationsResultats(id: number): Observable<EvaluationResultat[]> {
    return this.http.get<EvaluationResultat[]>(`/api/v1/evaluationsResultats/${id}`);
  }
  getEvaluationsScores(id: number): Observable<EvaluationResultat[]> {
    return this.http.get<any>(`/api/v1/scoresByIdEvaluations/${id}`);
  }
}
