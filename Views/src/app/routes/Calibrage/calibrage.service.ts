import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { toYMD } from '@shared/date-utils';

export interface CalSessionListe {
  id: number; nom: string; date_calibrage: string; statut: string; visibilite: number;
  id_jauge: number; nombre_transactions: number; site: string; grille: string;
  nb_participants: number; nb_termines: number; nb_transactions_chargees: number;
}
export interface CalSession {
  id: number; nom: string; description: string | null; date_calibrage: any;
  id_site: number; id_grille: number; type_ressource_cible: string;
  nombre_transactions: number; duree_minutes: number; statut: string; visibilite: number;
  id_jauge: number; site?: string; grille?: string;
}
export interface CalParticipant {
  id: number; id_evaluateur: number; invite: number; date_invitation: string | null;
  statut_participation: string; date_cloture: string | null; nom: string; prenom: string;
}
export interface CalTransaction {
  id: number; id_session: number; identifiant_appel: string; descriptif: string;
  numero_case: string | null; numero_appel: string | null; date_appel: any;
  motif_appel: string | null; ordre_passage: number;
}
export interface EvaluateurDispo { id: number; nom: string; prenom: string; nom_utilisateur: string; }

export interface FiltresSession { id_site?: number | null; date_debut?: any; date_fin?: any; statut?: string; }

@Injectable({ providedIn: 'root' })
export class CalibrageService {
  private readonly http = inject(HttpClient);
  private base = '/api/v1/calibrage';

  getSessions(f: FiltresSession = {}): Observable<CalSessionListe[]> {
    const params: any = {};
    if (f.id_site) params.id_site = f.id_site;
    if (f.date_debut) params.date_debut = toYMD(f.date_debut);
    if (f.date_fin) params.date_fin = toYMD(f.date_fin);
    if (f.statut) params.statut = f.statut;
    return this.http.get<CalSessionListe[]>(`${this.base}/session/all`, { params });
  }
  createSession(body: any): Observable<{ id: number; message: string }> {
    return this.http.post<{ id: number; message: string }>(`${this.base}/session`, { ...body, date_calibrage: toYMD(body.date_calibrage) });
  }
  getSession(id: number): Observable<{ session: CalSession; participants: CalParticipant[]; nb_transactions_chargees: number }> {
    return this.http.get<any>(`${this.base}/session/${id}`);
  }
  updateSession(id: number, body: any) {
    return this.http.put(`${this.base}/session/${id}`, { ...body, date_calibrage: toYMD(body.date_calibrage) });
  }
  deleteSession(id: number) { return this.http.delete(`${this.base}/session/${id}`); }
  ouvrir(id: number) { return this.http.put(`${this.base}/session/${id}/ouvrir`, {}); }

  getEvaluateursDisponibles(id: number): Observable<EvaluateurDispo[]> {
    return this.http.get<EvaluateurDispo[]>(`${this.base}/session/${id}/evaluateurs-disponibles`);
  }
  setParticipants(id: number, ids: number[]) { return this.http.post(`${this.base}/session/${id}/participants`, { ids }); }
  removeParticipant(id: number, pid: number) { return this.http.delete(`${this.base}/session/${id}/participant/${pid}`); }
  inviter(id: number, ids?: number[]) { return this.http.post(`${this.base}/session/${id}/inviter`, ids ? { ids } : {}); }

  getTransactions(id: number): Observable<CalTransaction[]> {
    return this.http.get<CalTransaction[]>(`${this.base}/session/${id}/transactions`);
  }
  addTransaction(id: number, body: any) {
    return this.http.post(`${this.base}/session/${id}/transaction`, { ...body, date_appel: toYMD(body.date_appel) });
  }
  updateTransaction(tid: number, body: any) {
    return this.http.put(`${this.base}/transaction/${tid}`, { ...body, date_appel: toYMD(body.date_appel) });
  }
  deleteTransaction(tid: number) { return this.http.delete(`${this.base}/transaction/${tid}`); }
  dupliquerTransactions(id: number, id_source: number) {
    return this.http.post(`${this.base}/session/${id}/dupliquer-transactions`, { id_source });
  }

  // --- Phase 2 : déroulement (F.46) ---
  getTravail(id: number): Observable<any> { return this.http.get<any>(`${this.base}/session/${id}/travail`); }
  getGrilleTransaction(tid: number): Observable<any> { return this.http.get<any>(`${this.base}/transaction/${tid}/grille`); }
  toggleErreur(evalId: number, erreurId: number, body: { coche: boolean; commentaire?: string }) {
    return this.http.put(`${this.base}/evaluation-tx/${evalId}/erreur/${erreurId}`, body);
  }
  terminerTransaction(tid: number) { return this.http.put(`${this.base}/transaction/${tid}/terminer`, {}); }
  cloturerParticipation(id: number) { return this.http.post(`${this.base}/session/${id}/cloturer-participation`, {}); }
  cloturerReference(id: number) { return this.http.post(`${this.base}/session/${id}/cloturer-reference`, {}); }
  setVisibilite(id: number, visible: boolean) { return this.http.put(`${this.base}/session/${id}/visibilite`, { visible }); }
  reinitialiser(pid: number) { return this.http.put(`${this.base}/participant/${pid}/reinitialiser`, {}); }

  // --- Phase 3 : résultats (F.47) ---
  getResultats(id: number): Observable<any> { return this.http.get<any>(`${this.base}/session/${id}/resultats`); }
  getConfrontation(id: number, pid: number): Observable<any> { return this.http.get<any>(`${this.base}/session/${id}/confrontation/${pid}`); }
  modifierCote(id: number, body: { cote: 'REFERENCE' | 'PARTICIPANT'; id_transaction: number; id_participant?: number; id_erreur_origine: number; coche: boolean }) {
    return this.http.put(`${this.base}/session/${id}/cote`, body);
  }
  setAppreciation(id: number, body: { id_transaction: number; id_erreur_origine: number; appreciation: string }) {
    return this.http.put(`${this.base}/session/${id}/appreciation`, body);
  }
  setConclusions(id: number, conclusions: string) { return this.http.put(`${this.base}/session/${id}/conclusions`, { conclusions }); }
  valider(id: number) { return this.http.post(`${this.base}/session/${id}/valider`, {}); }
}
