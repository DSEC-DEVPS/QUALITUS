import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface Supplementaire {
  id: number;
  statut: string;
  conclusion: string | null;
  date_creation: string;
  date_evaluation: string | null;
}
export interface SupplementairesResult {
  attendues: number | null;
  realisees: number;
  total: number;
  supplementaires: Supplementaire[];
}

export interface LignePlanAction {
  id: number;
  id_evaluation: number;
  id_action: number | null;
  id_porteur: number | null;
  date_debut: string | null;
  date_attendue: string | null;
  date_realisation: string | null;
  id_statut: number | null;
  id_kpi: number | null;
  commentaire: string | null;
  action_libelle?: string;
  statut_libelle?: string;
  kpi_libelle?: string;
  porteur_nom?: string;
  porteur_prenom?: string;
  contributeurs?: { id_utilisateur: number; nom: string; prenom: string }[];
}

export interface LettreData {
  type: string;
  modele: string;
  agent: { nom: string; prenom: string };
  date_evaluation: string;
  contexte: string;
  identifiant_appel: string;
  synthese: string;
  conclusion: string;
  avis_agent: string;
  scores: { categorie: string; score: number; seuil: number; reussite: boolean }[];
  constats: { categorie: string; item: string; commentaire: string; referentiel: string }[];
  business_intelligence: { niveau: number; libelle: string }[];
  cause_racine: { niveau: number; libelle: string }[];
}

@Injectable({ providedIn: 'root' })
export class EvalSuitesService {
  private readonly http = inject(HttpClient);

  // Évaluations supplémentaires
  getSupplementaires(idEval: number): Observable<SupplementairesResult> {
    return this.http.get<SupplementairesResult>(`/api/v1/eval/evaluation/${idEval}/supplementaires`);
  }
  creerSupplementaire(idEval: number): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(`/api/v1/eval/evaluation/${idEval}/supplementaire`, {});
  }

  // Plan d'action
  getPlanAction(idEval: number): Observable<LignePlanAction[]> {
    return this.http.get<LignePlanAction[]>(`/api/v1/eval/evaluation/${idEval}/plan-action`);
  }
  addLigne(body: any) {
    return this.http.post(`/api/v1/eval/plan-action/ligne`, body);
  }
  updateLigne(id: number, body: any) {
    return this.http.put(`/api/v1/eval/plan-action/ligne/${id}`, body);
  }
  deleteLigne(id: number) {
    return this.http.delete(`/api/v1/eval/plan-action/ligne/${id}`);
  }

  // Lettre
  getLettre(idEval: number): Observable<LettreData> {
    return this.http.get<LettreData>(`/api/v1/eval/evaluation/${idEval}/lettre`);
  }

  // Utilisateurs (porteur / contributeurs)
  getUtilisateurs(): Observable<any[]> {
    return this.http.get<any[]>(`/api/v1/utilisateur/all`);
  }
}
