import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface Grille {
  id: number;
  nom: string;
  mode_ponderation: 'AUTO' | 'MANUEL';
  type_ressource_cible: 'HUMAINE' | 'AUTOMATISEE';
  statut: 'BROUILLON' | 'ACTIVE';
  etat: string;
}

export interface Erreur {
  id: number;
  id_sous_categorie_erreur: number;
  item: string;
  sous_item?: string;
  referentiel?: string;
  poids_calcule: number;
  poids_saisi?: number | null;
  poids_applique?: number;
  score_pct?: number;
  score_sur20?: number;
  etat: string;
}

export interface SousCategorieErreur {
  id: number;
  id_categorie_erreur: number;
  libelle: string;
  poids_calcule: number;
  poids_saisi?: number | null;
  poids_applique?: number;
  cumul_erreurs?: number;
  etat: string;
  erreurs?: Erreur[];
}

export interface CategorieErreur {
  id: number;
  id_grille: number;
  libelle: string;
  poids: number;
  seuil_reussite: number;
  comparateur: '>' | '>=';
  critique: number;
  ordre: number;
  cumul_sous_categories?: number;
  etat: string;
  sous_categories?: SousCategorieErreur[];
}

export interface Ecart {
  niveau: string;
  parent: string;
  obtenu: number;
  attendu: number;
}

export interface GrilleDetail {
  grille: Grille;
  categories: CategorieErreur[];
  cumul_categories: number;
  coherence: { ok: boolean; ecarts: Ecart[] };
  completude: { ok: boolean; manques: { element: string; detail: string }[] };
  activable: boolean;
}

/** Service des grilles d'évaluation (schéma cahier, endpoints /api/v1/eval/*). */
@Injectable({ providedIn: 'root' })
export class EvalGrilleService {
  private readonly http = inject(HttpClient);

  getGrilles(params?: { statut?: string; type_ressource_cible?: string }): Observable<Grille[]> {
    const qs = new URLSearchParams();
    if (params?.statut) qs.set('statut', params.statut);
    if (params?.type_ressource_cible) qs.set('type_ressource_cible', params.type_ressource_cible);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return this.http.get<Grille[]>(`/api/v1/eval/grille/all${suffix}`);
  }
  getGrilleDetail(id: number, archives = false): Observable<GrilleDetail> {
    return this.http.get<GrilleDetail>(`/api/v1/eval/grille/${id}?archives=${archives}`);
  }
  addGrille(body: { nom: string; type_ressource_cible: string; mode_ponderation?: string }) {
    return this.http.post<{ id: number }>(`/api/v1/eval/grille/add`, body);
  }
  updateGrille(id: number, body: { nom: string; type_ressource_cible?: string }) {
    return this.http.put(`/api/v1/eval/grille/${id}`, body);
  }
  deleteGrille(id: number) {
    return this.http.delete(`/api/v1/eval/grille/${id}`);
  }
  changeMode(id: number, mode: 'AUTO' | 'MANUEL') {
    return this.http.put<{ downgraded: boolean }>(`/api/v1/eval/grille/${id}/mode`, { mode });
  }
  activerGrille(id: number) {
    return this.http.put(`/api/v1/eval/grille/${id}/activer`, {});
  }
  desactiverGrille(id: number) {
    return this.http.put(`/api/v1/eval/grille/${id}/desactiver`, {});
  }

  addCategorie(body: any) {
    return this.http.post(`/api/v1/eval/categorie-erreur/add`, body);
  }
  updateCategorie(id: number, body: any) {
    return this.http.put(`/api/v1/eval/categorie-erreur/${id}`, body);
  }
  deleteCategorie(id: number) {
    return this.http.delete(`/api/v1/eval/categorie-erreur/${id}`);
  }
  archiverCategorie(id: number) {
    return this.http.put(`/api/v1/eval/categorie-erreur/${id}/archiver`, {});
  }
  reactiverCategorie(id: number) {
    return this.http.put(`/api/v1/eval/categorie-erreur/${id}/reactiver`, {});
  }

  addSousCategorie(body: any) {
    return this.http.post(`/api/v1/eval/sous-categorie-erreur/add`, body);
  }
  updateSousCategorie(id: number, body: any) {
    return this.http.put(`/api/v1/eval/sous-categorie-erreur/${id}`, body);
  }
  deleteSousCategorie(id: number) {
    return this.http.delete(`/api/v1/eval/sous-categorie-erreur/${id}`);
  }
  archiverSousCategorie(id: number) {
    return this.http.put(`/api/v1/eval/sous-categorie-erreur/${id}/archiver`, {});
  }
  reactiverSousCategorie(id: number) {
    return this.http.put(`/api/v1/eval/sous-categorie-erreur/${id}/reactiver`, {});
  }

  addErreur(body: any) {
    return this.http.post(`/api/v1/eval/erreur/add`, body);
  }
  updateErreur(id: number, body: any) {
    return this.http.put(`/api/v1/eval/erreur/${id}`, body);
  }
  deleteErreur(id: number) {
    return this.http.delete(`/api/v1/eval/erreur/${id}`);
  }
  archiverErreur(id: number) {
    return this.http.put(`/api/v1/eval/erreur/${id}/archiver`, {});
  }
  reactiverErreur(id: number) {
    return this.http.put(`/api/v1/eval/erreur/${id}/reactiver`, {});
  }
}
