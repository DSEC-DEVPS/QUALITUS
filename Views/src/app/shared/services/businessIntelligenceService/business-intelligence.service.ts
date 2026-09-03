import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { message } from '@core';
import { BI1 } from '@shared/modeles/businessIntelligence/BI1';
import { BI2 } from '@shared/modeles/businessIntelligence/BI2';
import { BI3 } from '@shared/modeles/businessIntelligence/BI3';
import { BI4 } from '@shared/modeles/businessIntelligence/BI4';
import { BusinessIntelligence } from '@shared/modeles/businessIntelligence/BusinessIntelligence';
import { BusinessIntelligenceInterface } from '@shared/interfaces/businessIntelligence/BusinessIntelligence';

import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class BusinessIntelligenceService {
  constructor(
    private http: HttpClient,
    private snackBar: MatSnackBar
  ) {}
  private _fiches$ = new BehaviorSubject<any>([]);
  get fiches$(): Observable<any> {
    return this._fiches$.asObservable();
  }

  getAllBI(): Observable<any> {
    return this.http.get<any>(`/api/v1/bIAll`);
  }
  getAllBIByGrille(id_Grille: number, id_Agent: number): Observable<any> {
    return this.http.get<any>(`/api/v1/bIAll/${id_Grille}/${id_Agent}`);
  }
  /**
   * Business Intelligence
   *
   */
  getAllBusinessIntelligence(): Observable<BusinessIntelligenceInterface[]> {
    return this.http.get<BusinessIntelligenceInterface[]>(`/api/v1/businessIntelligence`);
  }
  getAllBusinessIntelligenceByGrille(id: number): Observable<any> {
    return this.http.get<any>(`/api/v1/businessIntelligenceByGrille/${id}`);
  }
  addBusinessIntelligence(businessIntelligence: BusinessIntelligence): Observable<message> {
    return this.http.post<message>(`/api/v1/businessIntelligence`, businessIntelligence);
  }
  updateBusinessIntelligence(id: number, data: BusinessIntelligence): Observable<any> {
    console.log('service');
    console.log(id + 'id' + data);
    return this.http.put<any>(`/api/v1/businessIntelligence/${id}`, data);
  }
  deleteBusinessIntelligence(id: number): Observable<any> {
    console.log('service');
    console.log(id + 'id');
    return this.http.delete<any>(`/api/v1/businessIntelligence/${id}`);
  }
  /**
   * BI1
   *
   */
  getAllBI1BusinessIntelligence(id: number): Observable<any> {
    return this.http.get<any>(`/api/v1/bI1ByBusinessIntelligence/${id}`);
  }
  addBI1(bI1: BI1): Observable<message> {
    return this.http.post<message>(`/api/v1/bi1`, bI1);
  }
  updateBI1(id: number, data: BI1): Observable<any> {
    console.log('service');
    console.log(id + 'id' + data);
    return this.http.put<any>(`/api/v1/bI1/${id}`, data);
  }
  deleteBI1(id: number): Observable<any> {
    console.log('service');
    console.log(id + 'id');
    return this.http.delete<any>(`/api/v1/bI1/${id}`);
  }
  /**
   * BI2
   *
   */
  getAllBI2ByBI1(id: number): Observable<any> {
    return this.http.get<any>(`/api/v1/bI2ByBI_1/${id}`);
  }
  addBI2(bI2: BI2): Observable<message> {
    return this.http.post<message>(`/api/v1/bi2`, bI2);
  }
  updateBI2(id: number, data: BI2): Observable<any> {
    console.log('service');
    console.log(id + 'id' + data);
    return this.http.put<any>(`/api/v1/bI2/${id}`, data);
  }
  deleteBI2(id: number): Observable<any> {
    console.log('service');
    console.log(id + 'id');
    return this.http.delete<any>(`/api/v1/bI2/${id}`);
  }
  /**
   * BI3
   *
   */
  getAllBI3ByBI2(id: number): Observable<any> {
    return this.http.get<any>(`/api/v1/bI3ByBI_2/${id}`);
  }
  addBI3(bI3: BI3): Observable<message> {
    return this.http.post<message>(`/api/v1/bi3`, bI3);
  }
  updateBI3(id: number, data: BI3): Observable<any> {
    console.log('service');
    console.log(id + 'id' + data);
    return this.http.put<any>(`/api/v1/bI3/${id}`, data);
  }
  deleteBI3(id: number): Observable<any> {
    console.log('service');
    console.log(id + 'id');
    return this.http.delete<any>(`/api/v1/bI3/${id}`);
  }
  /**
   * BI4
   *
   */
  getAllBI4ByBI3(id: number): Observable<any> {
    return this.http.get<any>(`/api/v1/bI4ByBI_3/${id}`);
  }
  addBI4(bI4: BI4): Observable<message> {
    return this.http.post<message>(`/api/v1/bi4`, bI4);
  }
  updateBI4(id: number, data: BI4): Observable<any> {
    console.log('service');
    console.log(id + 'id' + data);
    return this.http.put<any>(`/api/v1/bI4/${id}`, data);
  }
  deleteBI4(id: number): Observable<any> {
    console.log('service');
    console.log(id + 'id');
    return this.http.delete<any>(`/api/v1/bI4/${id}`);
  }
  getAllSite(): Observable<any> {
    return this.http.get<any>(`/api/v1/site/all`);
  }
}
