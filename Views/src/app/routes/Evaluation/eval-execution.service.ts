import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface ErreurSnap {
  id: number;
  item: string;
  sous_item?: string;
  referentiel?: string;
  poids: number;
  score_sur20: number;
  libelle_sous_categorie?: string;
  coche: number;
  commentaire?: string;
}

export interface CategorieSnap {
  id: number;
  libelle: string;
  poids: number;
  seuil_reussite: number;
  comparateur: string;
  critique: number;
  score_obtenu: number;
  nb_erreurs_decochees: number;
  reussite: boolean;
  erreurs: ErreurSnap[];
}

export interface EvaluationInfo {
  id: number;
  type_ressource: string;
  statut: string;
  conclusion: string | null;
  resolution: string | null;
  statut_apres_evaluation: string | null;
  synthese: string | null;
  avis_agent: string | null;
  date_appel: string | null;
  date_evaluation: string | null;
  identifiant_appel: string | null;
  numero_case: string | null;
  numero_appel: string | null;
  motif_appel: string | null;
  dmt: number;
  agent_nom: string | null;
  agent_prenom: string | null;
  evaluateur_nom: string | null;
  evaluateur_prenom: string | null;
  superviseur_nom: string | null;
  superviseur_prenom: string | null;
  contexte: string | null;
  grille: string | null;
  nature_ressource: string | null;
  site: string | null;
  programme: string | null;
  type_evaluation: string | null;
}

export interface ViewerInfo {
  role: string | null;
  is_agent: boolean;
  is_evaluateur: boolean;
  is_superviseur: boolean;
  lecture_seule: boolean;
}

export interface EvaluationDetail {
  evaluation: EvaluationInfo;
  categories: CategorieSnap[];
  conclusion_live: string;
  viewer: ViewerInfo;
}

export interface ToggleResult {
  id_categorie: number;
  score_categorie: number;
  nb_decochees: number;
  reussite_categorie: boolean;
  conclusion_live: string;
}

@Injectable({ providedIn: 'root' })
export class EvalExecutionService {
  private readonly http = inject(HttpClient);

  getDetail(id: number): Observable<EvaluationDetail> {
    return this.http.get<EvaluationDetail>(`/api/v1/eval/evaluation/${id}`);
  }
  toggleErreur(id: number, idErreur: number, coche: boolean, commentaire?: string): Observable<ToggleResult> {
    return this.http.put<ToggleResult>(`/api/v1/eval/evaluation/${id}/erreur/${idErreur}`, { coche, commentaire });
  }
  setResolution(id: number, resolution: string | null, synthese?: string) {
    return this.http.put(`/api/v1/eval/evaluation/${id}/resolution`, { resolution, synthese });
  }
  terminer(id: number): Observable<{ conclusion: string; message: string }> {
    return this.http.post<{ conclusion: string; message: string }>(`/api/v1/eval/evaluation/${id}/terminer`, {});
  }
  setAvis(id: number, avis: string) {
    return this.http.put(`/api/v1/eval/evaluation/${id}/avis`, { avis });
  }
}
