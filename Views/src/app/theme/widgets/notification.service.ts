import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApercuMenage, CriteresMenage, Notification, PageNotifications } from './notification.interface';

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
  markNotificationAsRead(notificationId: number, source: string = 'CORE'): Observable<any> {
    return this.http.patch(`${this.apiUrl}/notifications/${notificationId}/read?source=${source}`, {});
  }

  /** Nombre de non lues (badge de la cloche). */
  getCompte(): Observable<{ non_lues: number }> {
    return this.http.get<{ non_lues: number }>(`${this.apiUrl}/notifications/compte`);
  }

  /** Historique paginé et filtré (page « Mes notifications »). */
  getHistorique(f: {
    page: number;
    taille: number;
    statut?: string;
    categorie?: string;
    du?: string | null;
    au?: string | null;
  }): Observable<PageNotifications> {
    const params: Record<string, string> = { page: String(f.page), taille: String(f.taille) };
    if (f.statut) params['statut'] = f.statut;
    if (f.categorie) params['categorie'] = f.categorie;
    if (f.du) params['du'] = f.du;
    if (f.au) params['au'] = f.au;
    return this.http.get<PageNotifications>(`${this.apiUrl}/notifications/historique`, { params });
  }

  /* ----- Ménage (permission notification.supprimer) ----- */
  private paramsMenage(c: CriteresMenage): Record<string, string> {
    const p: Record<string, string> = {};
    if (c.lues_jours) p['lues_jours'] = String(c.lues_jours);
    if (c.non_lues_jours) p['non_lues_jours'] = String(c.non_lues_jours);
    if (c.id_utilisateur) p['id_utilisateur'] = String(c.id_utilisateur);
    return p;
  }
  apercuMenage(c: CriteresMenage): Observable<ApercuMenage> {
    return this.http.get<ApercuMenage>(`${this.apiUrl}/notifications/menage/apercu`, { params: this.paramsMenage(c) });
  }
  supprimerMenage(c: CriteresMenage): Observable<{ message: string; total: number }> {
    return this.http.delete<{ message: string; total: number }>(`${this.apiUrl}/notifications/menage`, {
      body: this.paramsMenage(c),
    });
  }
  rechercherUtilisateursMenage(q: string): Observable<{ id: number; nom: string; prenom: string; login: string }[]> {
    return this.http.get<{ id: number; nom: string; prenom: string; login: string }[]>(
      `${this.apiUrl}/notifications/menage/utilisateurs`,
      { params: { q } }
    );
  }
}