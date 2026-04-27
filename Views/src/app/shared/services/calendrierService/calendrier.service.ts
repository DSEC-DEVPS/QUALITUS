import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, catchError, map, Observable, tap, throwError } from 'rxjs';
import { environment } from '@env/environment';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PopupComponent } from '@shared/components/popup/popup.component';
import { message } from '@core';
import { CalendarsPolicies } from '@shared/modeles/calendars/CalendarsPolicies';

@Injectable({
  providedIn: 'root',
})
export class CalendrierService {
  private baseUrl = environment.baseUrl;
  constructor(
    private http: HttpClient,
    private snackBar: MatSnackBar
  ) {}

  getAllCalendars(): Observable<any> {
    return this.http.get<any>(`/api/v1/calendars`);
  }
  addCalendars(formValue: {
    date_debut: string;
    date_fin: string;
    id_Site: number;
  }): Observable<message> {
    return this.http.post<message>(`/api/v1/calendars/add`, formValue);
  }
  update(id: number, data: any): Observable<any> {
    console.log('service');
    console.log(id + 'id' + data);
    return this.http.put<any>(`/api/v1/calendars/${id}`, data);
  }
  delete(id: number): Observable<any> {
    console.log('service');
    console.log(id + 'id');
    return this.http.delete<any>(`/api/v1/deleteCalendarsBySite/${id}`);
  }

  getAllSite(): Observable<any> {
    return this.http.get<any>(`/api/v1/site/all`);
  }

  getAllCalendarsPolicies(): Observable<any> {
    return this.http.get<any>(`/api/v1/calendarsPolicies`);
  }

  addCalendarsPolicies(calendars: CalendarsPolicies): Observable<message> {
    return this.http.post<message>(`/api/v1/calendarsPolicies/add`, calendars);
  }
  updateCalendarsPolicies(id: number, data: any): Observable<any> {
    console.log('service');
    console.log(id + 'id' + data);
    return this.http.put<any>(`/api/v1/calendarsPolicies/${id}`, data);
  }
  deletePolicies(id: number): Observable<any> {
    console.log('service');
    console.log(id + 'id');
    return this.http.delete<any>(`/api/v1/deleteCalendarsPolicies/${id}`);
  }
}
