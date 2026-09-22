import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface ContreListe {
  id: number;
  statut: string;
  conclusion: string | null;
  date_creation: string;
  date_visibilite: any;
  id_evaluation_initiale: number;
  identifiant_appel: string | null;
  evaluateur_nom: string; evaluateur_prenom: string;
  agent_nom: string; agent_prenom: string;
  responsable_nom: string; responsable_prenom: string;
}
export interface ContreErreur {
  id: number; item: string; sous_item?: string; referentiel?: string;
  poids: number; coche: number; commentaire?: string;
  coche_initiale: number | null; ecart: boolean;
}
export interface ContreCategorie {
  id: number; libelle: string; poids: number; seuil_reussite: number; comparateur: string;
  score_obtenu: number; nb_erreurs_decochees: number; reussite: boolean; erreurs: ContreErreur[];
}
export interface ContreDetail {
  contre: any;
  categories: ContreCategorie[];
  conclusion_live: string;
}

@Injectable({ providedIn: 'root' })
export class EvalContreService {
  private readonly http = inject(HttpClient);

  getSites(): Observable<{ id: number; nom: string }[]> { return this.http.get<any[]>(`/api/v1/site/all`); }
  getAll(): Observable<ContreListe[]> { return this.http.get<ContreListe[]>(`/api/v1/eval/contre/all`); }
  getMes(): Observable<ContreListe[]> { return this.http.get<ContreListe[]>(`/api/v1/eval/contre/mes`); }
  getEvaluateurs(idSite: number): Observable<any[]> { return this.http.get<any[]>(`/api/v1/eval/contre/evaluateurs/${idSite}`); }
  getEvaluations(idEvaluateur: number): Observable<any[]> { return this.http.get<any[]>(`/api/v1/eval/contre/evaluations/${idEvaluateur}`); }
  creer(idEvaluation: number): Observable<{ id: number }> { return this.http.post<{ id: number }>(`/api/v1/eval/contre/creer/${idEvaluation}`, {}); }
  getDetail(id: number): Observable<ContreDetail> { return this.http.get<ContreDetail>(`/api/v1/eval/contre/${id}`); }
  toggleErreur(id: number, idErreur: number, coche: boolean, commentaire?: string) {
    return this.http.put<any>(`/api/v1/eval/contre/${id}/erreur/${idErreur}`, { coche, commentaire });
  }
  setResolution(id: number, body: { resolution?: string; synthese?: string; date_visibilite?: string | null }) {
    return this.http.put(`/api/v1/eval/contre/${id}/resolution`, body);
  }
  terminer(id: number) { return this.http.post<{ conclusion: string }>(`/api/v1/eval/contre/${id}/terminer`, {}); }
  setActif(id: number, actif: boolean) { return this.http.put(`/api/v1/eval/contre/${id}/actif`, { actif }); }
  supprimer(id: number) { return this.http.delete(`/api/v1/eval/contre/${id}`); }
}
