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
  /** L'utilisateur connecté a créé cette contre-évaluation. */
  est_createur?: number | boolean;
  agent_login?: string | null;
  date_evaluation?: string | null;
  site?: string | null;
}

/** Évaluation terminée proposée à la contre-évaluation, avec l'état de sa contre-évaluation. */
export interface EvaluationAContreEvaluer {
  id: number;
  date_appel: string | null;
  date_evaluation: string | null;
  identifiant_appel: string | null;
  numero_case: string | null;
  conclusion: string | null;
  id_evaluateur: number;
  /** Évaluation faite par l'utilisateur : il ne peut pas la contre-évaluer. */
  propre: boolean;
  evaluateur_nom: string | null; evaluateur_prenom: string | null; evaluateur_login: string | null;
  agent_nom: string | null; agent_prenom: string | null; agent_login: string | null;
  site: string | null; grille: string | null; type_evaluation: string | null;
  contre_id: number | null;
  contre_statut: string | null;
  contre_actif: number | null;
  contre_conclusion: string | null;
  contre_mienne: boolean;
  contre_responsable_nom: string | null; contre_responsable_prenom: string | null;
  peut_ouvrir_contre: boolean;
}
export interface ContreErreur {
  id: number; item: string; sous_item?: string; referentiel?: string;
  poids: number; coche: number; commentaire?: string;
  commentaire_initial?: string | null; // commentaire de l'évaluateur d'origine (lecture seule)
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
  est_responsable?: boolean;
}

@Injectable({ providedIn: 'root' })
export class EvalContreService {
  private readonly http = inject(HttpClient);

  /** Sites proposés à la création (site à vision globale : tous) et accès transverse. */
  getContexte(): Observable<{ vision_globale: boolean; id_site: number | null; sites: { id: number; nom: string }[]; voir_tous: boolean }> {
    return this.http.get<any>(`/api/v1/eval/contre/contexte`);
  }
  private dateParams(f?: { date_debut?: string | null; date_fin?: string | null }): any {
    const p: any = {};
    if (f?.date_debut) p.date_debut = f.date_debut;
    if (f?.date_fin) p.date_fin = f.date_fin;
    return p;
  }
  getAll(f?: { date_debut?: string | null; date_fin?: string | null; portee?: 'miennes' | 'toutes' | 'autres' }): Observable<ContreListe[]> {
    const params = this.dateParams(f);
    if (f?.portee === 'toutes' || f?.portee === 'autres') params.portee = f.portee;
    return this.http.get<ContreListe[]>(`/api/v1/eval/contre/all`, { params });
  }
  getMes(f?: { date_debut?: string | null; date_fin?: string | null }): Observable<ContreListe[]> {
    return this.http.get<ContreListe[]>(`/api/v1/eval/contre/mes`, { params: this.dateParams(f) });
  }
  getEvaluateurs(idSite: number): Observable<any[]> { return this.http.get<any[]>(`/api/v1/eval/contre/evaluateurs/${idSite}`); }
  /** Évaluations terminées (site, évaluateur, période sur la date d'évaluation) et état de leur contre-évaluation. */
  getAContreEvaluer(f: { id_site?: number | null; id_evaluateur?: number | null; date_debut?: string | null; date_fin?: string | null }): Observable<EvaluationAContreEvaluer[]> {
    const params: Record<string, string> = {};
    for (const [k, v] of Object.entries(f)) if (v !== null && v !== undefined && v !== '') params[k] = String(v);
    return this.http.get<EvaluationAContreEvaluer[]>(`/api/v1/eval/contre/a-contre-evaluer`, { params });
  }
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
