import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { message } from '@core';
import {
  Contexte,
  Evaluateur,
  AgentEvalue,
  SiteRef,
  TypeRef,
  Evaluation,
  ResultatTerminer,
  Coaching,
  ActionType,
  ActionCorrective,
  EvalNotification,
  AgentPole,
  EvaluateurSite,
  EvaluationEvaluateur,
  ContreEvaluation,
  ContreListItem,
} from '../../routes/Evaluation/interfaces';

/**
 * Service du module Evaluation. Routes prefixees /api/v1/evaluation.
 * Reutilise /site/all et /calibrage/categorie-ressource/all pour les listes.
 */
@Injectable({ providedIn: 'root' })
export class EvaluationService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/evaluation';

  /* ----- References ----- */
  getSites(): Observable<SiteRef[]> {
    return this.http.get<SiteRef[]>(`/api/v1/site/all`);
  }
  getTypes(): Observable<TypeRef[]> {
    return this.http.get<TypeRef[]>(`/api/v1/calibrage/categorie-ressource/all`);
  }

  /* ----- Contexte ----- */
  getContextes(): Observable<Contexte[]> {
    return this.http.get<Contexte[]>(`${this.base}/contexte/all`);
  }
  addContexte(body: { libelle: string }): Observable<message & { id: number }> {
    return this.http.post<message & { id: number }>(`${this.base}/contexte/add`, body);
  }
  updateContexte(id: number, body: { libelle: string; Etat?: string }): Observable<message> {
    return this.http.put<message>(`${this.base}/contexte/${id}`, body);
  }
  deleteContexte(id: number): Observable<message> {
    return this.http.delete<message>(`${this.base}/contexte/${id}`);
  }

  /* ----- Evaluateurs ----- */
  getEvaluateurs(): Observable<Evaluateur[]> {
    return this.http.get<Evaluateur[]>(`${this.base}/evaluateur/all`);
  }
  addEvaluateur(body: Partial<Evaluateur>): Observable<message & { id: number }> {
    return this.http.post<message & { id: number }>(`${this.base}/evaluateur/add`, body);
  }
  updateEvaluateur(id: number, body: Partial<Evaluateur>): Observable<message> {
    return this.http.put<message>(`${this.base}/evaluateur/${id}`, body);
  }
  deleteEvaluateur(id: number): Observable<message> {
    return this.http.delete<message>(`${this.base}/evaluateur/${id}`);
  }

  /* ----- Agents a evaluer ----- */
  getAgents(): Observable<AgentEvalue[]> {
    return this.http.get<AgentEvalue[]>(`${this.base}/agent/all`);
  }
  addAgent(body: Partial<AgentEvalue>): Observable<message & { id: number }> {
    return this.http.post<message & { id: number }>(`${this.base}/agent/add`, body);
  }
  updateAgent(id: number, body: Partial<AgentEvalue>): Observable<message> {
    return this.http.put<message>(`${this.base}/agent/${id}`, body);
  }
  deleteAgent(id: number): Observable<message> {
    return this.http.delete<message>(`${this.base}/agent/${id}`);
  }
  importAgents(formData: FormData): Observable<message & { nb: number }> {
    return this.http.post<message & { nb: number }>(`${this.base}/agent/import`, formData);
  }

  /* ----- Phase 2 : evaluations ----- */
  getEvaluations(): Observable<Evaluation[]> {
    return this.http.get<Evaluation[]>(`${this.base}/evaluation/all`);
  }
  getEvaluation(id: number): Observable<Evaluation> {
    return this.http.get<Evaluation>(`${this.base}/evaluation/${id}`);
  }
  addEvaluation(body: Partial<Evaluation>): Observable<message & { id: number; id_ModeleGrille: number | null; grille_manquante: boolean }> {
    return this.http.post<message & { id: number; id_ModeleGrille: number | null; grille_manquante: boolean }>(
      `${this.base}/evaluation/add`,
      body
    );
  }
  addEvaluationMasse(body: { agents: number[]; id_Contexte?: number; id_appel?: string; n_case?: string; date_appel?: string; dmt?: string; motif_appel?: string }): Observable<message & { nb: number }> {
    return this.http.post<message & { nb: number }>(`${this.base}/evaluation/add-masse`, body);
  }
  updateEvaluation(id: number, body: Partial<Evaluation>): Observable<message> {
    return this.http.put<message>(`${this.base}/evaluation/${id}`, body);
  }
  setActifEvaluation(ids: number[], actif: number): Observable<message> {
    return this.http.put<message>(`${this.base}/evaluation/actif`, { ids, actif });
  }
  deleteEvaluation(id: number): Observable<message> {
    return this.http.delete<message>(`${this.base}/evaluation/${id}`);
  }
  terminerEvaluation(
    id: number,
    resolution: string,
    resultats: { id_SousItem: number; conforme: number; commentaire?: string }[]
  ): Observable<ResultatTerminer> {
    return this.http.post<ResultatTerminer>(`${this.base}/evaluation/${id}/terminer`, {
      resolution,
      resultats,
    });
  }

  /* ----- Phase 3 : coaching ----- */
  getCoaching(idEvaluation: number): Observable<Coaching | null> {
    return this.http.get<Coaching | null>(`${this.base}/coaching/${idEvaluation}`);
  }
  saveCoaching(idEvaluation: number, body: Coaching): Observable<message> {
    return this.http.post<message>(`${this.base}/coaching/${idEvaluation}`, body);
  }

  /* ----- Phase 3 : types d'action ----- */
  getActionTypes(): Observable<ActionType[]> {
    return this.http.get<ActionType[]>(`${this.base}/action-type/all`);
  }
  addActionType(body: { libelle: string }): Observable<message & { id: number }> {
    return this.http.post<message & { id: number }>(`${this.base}/action-type/add`, body);
  }
  updateActionType(id: number, body: { libelle: string; Etat?: string }): Observable<message> {
    return this.http.put<message>(`${this.base}/action-type/${id}`, body);
  }
  deleteActionType(id: number): Observable<message> {
    return this.http.delete<message>(`${this.base}/action-type/${id}`);
  }

  /* ----- Phase 3 : plan d'action ----- */
  getActions(idEvaluation: number): Observable<ActionCorrective[]> {
    return this.http.get<ActionCorrective[]>(`${this.base}/action/evaluation/${idEvaluation}`);
  }
  addAction(body: ActionCorrective): Observable<message & { id: number }> {
    return this.http.post<message & { id: number }>(`${this.base}/action/add`, body);
  }
  updateAction(id: number, body: ActionCorrective): Observable<message> {
    return this.http.put<message>(`${this.base}/action/${id}`, body);
  }
  deleteAction(id: number): Observable<message> {
    return this.http.delete<message>(`${this.base}/action/${id}`);
  }

  /* ----- Phase 3 : notifications ----- */
  getMesNotifications(): Observable<EvalNotification[]> {
    return this.http.get<EvalNotification[]>(`${this.base}/notification/mes`);
  }
  marquerNotifLu(id: number): Observable<message> {
    return this.http.patch<message>(`${this.base}/notification/${id}/lu`, {});
  }
  marquerToutNotifLu(): Observable<message> {
    return this.http.patch<message>(`${this.base}/notification/lu-tout`, {});
  }

  /* ----- Phase 3 : rapport agents en pole ----- */
  getRapportAgentsPole(): Observable<AgentPole[]> {
    return this.http.get<AgentPole[]>(`${this.base}/rapport/agents-pole`);
  }

  /* ----- Phase 4 : contre-evaluations ----- */
  getEvaluateursBySite(idSite: number): Observable<EvaluateurSite[]> {
    return this.http.get<EvaluateurSite[]>(`${this.base}/contre/evaluateurs/${idSite}`);
  }
  getEvaluationsByEvaluateur(idEvaluateur: number): Observable<EvaluationEvaluateur[]> {
    return this.http.get<EvaluationEvaluateur[]>(`${this.base}/contre/evaluations/${idEvaluateur}`);
  }
  creerContre(idEvaluation: number): Observable<message & { id: number }> {
    return this.http.post<message & { id: number }>(`${this.base}/contre/creer/${idEvaluation}`, {});
  }
  getContre(id: number): Observable<ContreEvaluation> {
    return this.http.get<ContreEvaluation>(`${this.base}/contre/${id}`);
  }
  terminerContre(
    id: number,
    body: { resolution: string; date_visibilite: string; resultats: { id_SousItem: number; conforme: number }[] }
  ): Observable<message & { conclusion: string; score_global: number }> {
    return this.http.post<message & { conclusion: string; score_global: number }>(`${this.base}/contre/${id}/terminer`, body);
  }
  getAllContre(): Observable<ContreListItem[]> {
    return this.http.get<ContreListItem[]>(`${this.base}/contre/all`);
  }
  setActifContre(id: number, actif: number): Observable<message> {
    return this.http.put<message>(`${this.base}/contre/${id}/actif`, { actif });
  }
}
