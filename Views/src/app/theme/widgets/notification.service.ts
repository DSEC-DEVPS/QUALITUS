import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Notification } from './notification.interface';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = '/api/v1'; // Remplacez par votre URL API

  constructor(private http: HttpClient) {}

  /**
   * Récupère toutes les notifications de l'utilisateur connecté
   */
  getAllNotification(): Observable<Notification[]> {
    return this.http.get<Notification[]>(`${this.apiUrl}/notifications`);
  }

  /**
   * Marque une notification comme lue
   * @param notificationId - L'ID de la notification à marquer comme lue
   */
  markNotificationAsRead(notificationId: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/notifications/${notificationId}/read`, {});
  }

  /**
   * Marque plusieurs notifications comme lues
   * @param notificationIds - Tableau des IDs des notifications à marquer comme lues
   */
  markAllNotificationsAsRead(notificationIds: number[]): Observable<any> {
    return this.http.patch(`${this.apiUrl}/notifications/read-all`, { ids: notificationIds });
  }
}