import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface AgentPoleEval {
  id: number; id_evaluateur?: number; date_appel: string; critiques_decochees: number; peut_plan?: boolean;
}
export interface AgentPole {
  id: number;
  nom: string;
  prenom: string;
  login: string;
  programme: string | null;
  site: string | null;
  superviseur: string;
  id_superviseur?: number;
  criteres: string[];
  nb_evaluations: number;
  evaluations: AgentPoleEval[];
}
export interface RapportPoleResult { voir_tous: boolean; agents: AgentPole[]; }
export interface UserInfo {
  id: number; nom: string; prenom: string; login?: string; email?: string; telephone?: any;
  site?: string; programme?: string;
}
export interface AgentPoleDetail { agent: AgentPole; infos_agent: UserInfo | null; superviseur: UserInfo | null; }

export interface FiltresRapport {
  id_site?: number | null;
  id_programme?: number | null;
  id_superviseur?: number | null;
  date_debut?: any;
  date_fin?: any;
}

@Injectable({ providedIn: 'root' })
export class EvalRapportService {
  private readonly http = inject(HttpClient);

  getAgentsPole(f?: FiltresRapport): Observable<RapportPoleResult> {
    const qs = new URLSearchParams();
    if (f) Object.entries(f).forEach(([k, v]) => { if (v !== null && v !== undefined && v !== '') qs.set(k, String(v)); });
    const s = qs.toString() ? `?${qs}` : '';
    return this.http.get<RapportPoleResult>(`/api/v1/eval/rapport/agents-pole${s}`);
  }
  getAgentDetail(idAgent: number, f?: FiltresRapport): Observable<AgentPoleDetail> {
    const qs = new URLSearchParams();
    if (f) Object.entries(f).forEach(([k, v]) => { if (v !== null && v !== undefined && v !== '') qs.set(k, String(v)); });
    const s = qs.toString() ? `?${qs}` : '';
    return this.http.get<AgentPoleDetail>(`/api/v1/eval/rapport/agents-pole/${idAgent}${s}`);
  }
  getSuperviseurs(): Observable<{ id: number; nom: string; prenom: string }[]> {
    return this.http.get<any[]>(`/api/v1/eval/rapport/superviseurs`);
  }
  getSites(): Observable<{ id: number; nom: string }[]> { return this.http.get<any[]>(`/api/v1/site/all`); }
  getProgrammes(): Observable<{ id: number; nom: string }[]> { return this.http.get<any[]>(`/api/v1/programme/all`); }
}
