import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ContexteService {
  constructor(private http: HttpClient) {}

  getAllContextes(): Observable<any> {
    return this.http.get<any>(`/api/v1/contextes`);
  }
  getAllContextesActifs(): Observable<any> {
    return this.http.get<any>(`/api/v1/contextesActifs`);
  }
  getContexteById(id: number): Observable<any> {
    return this.http.get<any>(`/api/v1/contextes/${id}`);
  }
  addContexte(data: any): Observable<any> {
    return this.http.post<any>(`/api/v1/contextes/add`, data);
  }
  updateContexte(id: number, data: any): Observable<any> {
    return this.http.put<any>(`/api/v1/contextes/${id}`, data);
  }
  deleteContexte(id: number): Observable<any> {
    return this.http.delete<any>(`/api/v1/contextes/${id}`);
  }
}
