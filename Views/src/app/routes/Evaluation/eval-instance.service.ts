import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface AgentEvaluable {
  id: number;
  nom: string;
  prenom: string;
  login: string;
  site?: string;
  programme?: string;
  id_grille?: number;
  grille?: string;
  grille_statut?: string;
  grille_type?: string;
}

export interface ResolutionGrilleAgent {
  ok: boolean;
  message?: string;
  grille?: { id: number; nom: string; statut: string; type_ressource_cible: string };
  id_site?: number;
  id_programme?: number;
}

export interface RefItem { id: number; libelle: string; }

export interface EvaluationListe {
  id: number;
  type_ressource: string;
  statut: string;
  conclusion: string | null;
  date_appel: string | null;
  date_creation: string | null;
  identifiant_appel: string | null;
  numero_case?: string | null;
  numero_appel?: string | null;
  actif?: number;
  id_evaluation_parente?: number | null;
  agent_nom: string | null;
  agent_prenom: string | null;
  evaluateur_nom: string | null;
  evaluateur_prenom: string | null;
  type_evaluation: string | null;
  type_code?: string | null;
  contexte: string | null;
  grille: string | null;
  site?: string | null;
  coaching_statut?: string | null;
}

export interface FiltresEvaluation {
  q?: string;
  statut?: string;
  conclusion?: string;
  type_ressource?: string;
  type_evaluation?: string;
  id_site?: number | null;
  id_contexte?: number | null;
  date_debut?: any;
  date_fin?: any;
  inactifs?: boolean;
  portee?: string; // 'mes-agents' | 'coaching' (vues superviseur)
}

export interface CompteRenduMasse {
  total: number;
  crees: { index: number; id: number }[];
  rejetes: { index: number; motif: string }[];
  message: string;
}

/** Service des instances d'évaluation (schéma cahier, endpoints /api/v1/eval/*). */
@Injectable({ providedIn: 'root' })
export class EvalInstanceService {
  private readonly http = inject(HttpClient);

  getEvaluations(filtres?: FiltresEvaluation): Observable<EvaluationListe[]> {
    const qs = new URLSearchParams();
    if (filtres) {
      Object.entries(filtres).forEach(([k, v]) => {
        if (v !== null && v !== undefined && v !== '' && v !== false) qs.set(k, String(v));
      });
    }
    const s = qs.toString() ? `?${qs}` : '';
    return this.http.get<EvaluationListe[]>(`/api/v1/eval/evaluation/all${s}`);
  }
  setActif(id: number, actif: boolean) {
    return this.http.put(`/api/v1/eval/evaluation/${id}/actif`, { actif });
  }
  desactiverMasse(ids: number[]) {
    return this.http.post(`/api/v1/eval/evaluation/desactiver-masse`, { ids });
  }
  deleteEvaluation(id: number) {
    return this.http.delete(`/api/v1/eval/evaluation/${id}`);
  }
  getSites(): Observable<{ id: number; nom: string }[]> {
    return this.http.get<{ id: number; nom: string }[]>(`/api/v1/site/all`);
  }
  getContextes(): Observable<RefItem[]> {
    return this.http.get<RefItem[]>(`/api/v1/eval/ref/contexte`);
  }
  getNatures(): Observable<RefItem[]> {
    return this.http.get<RefItem[]>(`/api/v1/eval/ref/nature`);
  }
  getAgentsEvaluables(): Observable<AgentEvaluable[]> {
    return this.http.get<AgentEvaluable[]>(`/api/v1/eval/agents-evaluables`);
  }
  getGrilleForAgent(id: number): Observable<ResolutionGrilleAgent> {
    return this.http.get<ResolutionGrilleAgent>(`/api/v1/eval/agent-grille/${id}`);
  }
  createEvaluation(body: any): Observable<{ id: number; afficher_grille: boolean }> {
    return this.http.post<{ id: number; afficher_grille: boolean }>(`/api/v1/eval/evaluation/add`, body);
  }
  createEvaluationMasse(body: { commun: any; lignes: any[] }): Observable<CompteRenduMasse> {
    return this.http.post<CompteRenduMasse>(`/api/v1/eval/evaluation/add-masse`, body);
  }
}
