import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface CoachingOption {
  id: number;
  id_parent: number | null;
  niveau: number;
  libelle: string;
  etat: string;
}
export interface CoachingChoix { niveau: number; id_option: number | null; libelle: string; }
export interface EvaluationCoaching {
  coaching: { id: number; statut: string } | null;
  choix: CoachingChoix[];
  en_attente_validation: boolean;
  eligible: boolean;
}
export interface CoachingOptionEnAttente {
  id: number;
  niveau: number;
  libelle: string;
  id_coaching_origine: number;
  id_evaluation: number;
  proposeur_nom: string;
  proposeur_prenom: string;
  parent_libelle: string | null;
  dateCreation: string;
}

@Injectable({ providedIn: 'root' })
export class EvalCoachingService {
  private readonly http = inject(HttpClient);

  // Arbre (admin)
  getArbre(): Observable<CoachingOption[]> {
    return this.http.get<CoachingOption[]>(`/api/v1/eval/coaching/arbre`);
  }
  addOption(body: { id_parent: number | null; niveau: number; libelle: string }) {
    return this.http.post<{ id: number }>(`/api/v1/eval/coaching/option`, body);
  }
  updateOption(id: number, libelle: string) {
    return this.http.put(`/api/v1/eval/coaching/option/${id}`, { libelle });
  }
  deleteOption(id: number) {
    return this.http.delete(`/api/v1/eval/coaching/option/${id}`);
  }

  // Coaching par évaluation
  getEvaluationCoaching(idEval: number): Observable<EvaluationCoaching> {
    return this.http.get<EvaluationCoaching>(`/api/v1/eval/evaluation/${idEval}/coaching`);
  }
  getOptionsEnfants(params: { id_parent?: number | null; niveau: number; id_coaching: number }): Observable<CoachingOption[]> {
    const qs = new URLSearchParams();
    qs.set('niveau', String(params.niveau));
    qs.set('id_coaching', String(params.id_coaching || 0));
    if (params.id_parent) qs.set('id_parent', String(params.id_parent));
    return this.http.get<CoachingOption[]>(`/api/v1/eval/coaching/options-enfants?${qs}`);
  }
  save(idEval: number, choix: CoachingChoix[]) {
    return this.http.post<{ idCoaching: number; statut: string }>(`/api/v1/eval/evaluation/${idEval}/coaching`, { choix });
  }
  terminer(idEval: number) {
    return this.http.post(`/api/v1/eval/evaluation/${idEval}/coaching/terminer`, {});
  }
  proposer(body: { id_parent: number | null; niveau: number; libelle: string; id_coaching: number; id_evaluation: number }) {
    return this.http.post<{ id: number }>(`/api/v1/eval/coaching/proposer`, body);
  }

  // Validation
  getOptionsEnAttente(): Observable<CoachingOptionEnAttente[]> {
    return this.http.get<CoachingOptionEnAttente[]>(`/api/v1/eval/coaching/options-en-attente`);
  }
  valider(id: number, libelle?: string) {
    return this.http.post(`/api/v1/eval/coaching/option/${id}/valider`, libelle ? { libelle } : {});
  }
  rejeter(id: number, motif: string) {
    return this.http.post(`/api/v1/eval/coaching/option/${id}/rejeter`, { motif });
  }
}
