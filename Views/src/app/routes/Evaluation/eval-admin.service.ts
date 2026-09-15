import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface NotificationEval {
  id: number;
  id_evaluation: number | null;
  titre: string;
  message: string;
  lu: number;
  dateCreation: string;
  dateLecture: string | null;
  conclusion: string | null;
  type_ressource: string | null;
}

export interface RefItem {
  id: number;
  libelle: string;
  description?: string | null;
  etat?: string;
  ordre?: number;
  dateCreation?: string;
}

export type RefType = 'contexte' | 'nature' | 'action' | 'statut' | 'kpi';

@Injectable({ providedIn: 'root' })
export class EvalAdminService {
  private readonly http = inject(HttpClient);

  // Notifications
  getMesNotifications(): Observable<NotificationEval[]> {
    return this.http.get<NotificationEval[]>(`/api/v1/eval/notifications/mes`);
  }
  countNonLues(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`/api/v1/eval/notifications/count`);
  }
  marquerLu(id: number) {
    return this.http.patch(`/api/v1/eval/notifications/${id}/lu`, {});
  }
  marquerToutLu() {
    return this.http.patch(`/api/v1/eval/notifications/lu-tout`, {});
  }

  // Référentiels
  getRef(type: RefType): Observable<RefItem[]> {
    return this.http.get<RefItem[]>(`/api/v1/eval/ref/${type}/all`);
  }
  addRef(type: RefType, body: { libelle: string; description?: string; ordre?: number }) {
    return this.http.post(`/api/v1/eval/ref/${type}/add`, body);
  }
  updateRef(type: RefType, id: number, body: { libelle: string; description?: string | null; etat?: string; ordre?: number }) {
    return this.http.put(`/api/v1/eval/ref/${type}/${id}`, body);
  }
  deleteRef(type: RefType, id: number) {
    return this.http.delete(`/api/v1/eval/ref/${type}/${id}`);
  }
}
