import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { message } from '@core';
import {
  ModeleGrille,
  CategorieRessource,
  CritereRegle,
  PourquoiNode,
  ImportResume,
} from '../../routes/Calibrage/interfaces';

/**
 * Service dedie au module Calibrage (parametrage des modeles de grille
 * d'evaluation). Toutes les routes sont prefixees par /api/v1/calibrage.
 */
@Injectable({ providedIn: 'root' })
export class CalibrageService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/calibrage';

  /* ----- Modele de grille ----- */
  getAllModeles(): Observable<ModeleGrille[]> {
    return this.http.get<ModeleGrille[]>(`${this.base}/modele/all`);
  }
  getModele(id: number): Observable<ModeleGrille> {
    return this.http.get<ModeleGrille>(`${this.base}/modele/${id}`);
  }
  addModele(body: { nom: string; description?: string }): Observable<message & { id: number }> {
    return this.http.post<message & { id: number }>(`${this.base}/modele/add`, body);
  }
  updateModele(
    id: number,
    body: { nom: string; description?: string; Etat?: string }
  ): Observable<message> {
    return this.http.put<message>(`${this.base}/modele/update/${id}`, body);
  }
  deleteModele(id: number): Observable<message> {
    return this.http.delete<message>(`${this.base}/modele/${id}`);
  }

  /* ----- Niveau 1 : Categorie d'erreur ----- */
  addCategorieErreur(body: {
    id_ModeleGrille: number;
    nom: string;
    poids?: number;
    ordre?: number;
  }): Observable<message & { id: number }> {
    return this.http.post<message & { id: number }>(
      `${this.base}/categorie-erreur/add`,
      body
    );
  }
  updateCategorieErreur(
    id: number,
    body: { nom: string; poids?: number; ordre?: number }
  ): Observable<message> {
    return this.http.put<message>(`${this.base}/categorie-erreur/${id}`, body);
  }
  deleteCategorieErreur(id: number): Observable<message> {
    return this.http.delete<message>(`${this.base}/categorie-erreur/${id}`);
  }

  /* ----- Niveau 2 : Erreur ----- */
  addErreur(body: {
    id_CategorieErreur: number;
    nom: string;
    poids?: number;
    ordre?: number;
  }): Observable<message & { id: number }> {
    return this.http.post<message & { id: number }>(`${this.base}/erreur/add`, body);
  }
  updateErreur(
    id: number,
    body: { nom: string; poids?: number; ordre?: number }
  ): Observable<message> {
    return this.http.put<message>(`${this.base}/erreur/${id}`, body);
  }
  deleteErreur(id: number): Observable<message> {
    return this.http.delete<message>(`${this.base}/erreur/${id}`);
  }

  /* ----- Niveau 3 : Item ----- */
  addItem(body: {
    id_Erreur: number;
    nom: string;
    poids?: number;
    ordre?: number;
  }): Observable<message & { id: number }> {
    return this.http.post<message & { id: number }>(`${this.base}/item/add`, body);
  }
  updateItem(
    id: number,
    body: { nom: string; poids?: number; ordre?: number }
  ): Observable<message> {
    return this.http.put<message>(`${this.base}/item/${id}`, body);
  }
  deleteItem(id: number): Observable<message> {
    return this.http.delete<message>(`${this.base}/item/${id}`);
  }

  /* ----- Niveau 4 : Sous-item ----- */
  addSousItem(body: {
    id_Item: number;
    nom: string;
    referentiel?: string;
    poids?: number;
    ordre?: number;
  }): Observable<message & { id: number }> {
    return this.http.post<message & { id: number }>(`${this.base}/sous-item/add`, body);
  }
  updateSousItem(
    id: number,
    body: { nom: string; referentiel?: string; poids?: number; ordre?: number }
  ): Observable<message> {
    return this.http.put<message>(`${this.base}/sous-item/${id}`, body);
  }
  deleteSousItem(id: number): Observable<message> {
    return this.http.delete<message>(`${this.base}/sous-item/${id}`);
  }

  /* ----- Categories de ressources + association ----- */
  getAllCategoriesRessources(): Observable<CategorieRessource[]> {
    return this.http.get<CategorieRessource[]>(`${this.base}/categorie-ressource/all`);
  }
  setCategoriesRessources(id: number, categories: number[]): Observable<message> {
    return this.http.put<message>(
      `${this.base}/modele/${id}/categories-ressources`,
      { categories }
    );
  }

  /* ----- Phase 2 : import Excel ----- */
  importModele(
    formData: FormData
  ): Observable<message & { id: number; resume: ImportResume }> {
    return this.http.post<message & { id: number; resume: ImportResume }>(
      `${this.base}/modele/import`,
      formData
    );
  }

  /* ----- Phase 2 : criteres de reussite / echec ----- */
  getCriteres(idModele: number): Observable<CritereRegle[]> {
    return this.http.get<CritereRegle[]>(`${this.base}/critere-regle/modele/${idModele}`);
  }
  addCritere(body: Partial<CritereRegle> & { id_ModeleGrille: number }): Observable<message & { id: number }> {
    return this.http.post<message & { id: number }>(`${this.base}/critere-regle/add`, body);
  }
  updateCritere(id: number, body: Partial<CritereRegle>): Observable<message> {
    return this.http.put<message>(`${this.base}/critere-regle/${id}`, body);
  }
  deleteCritere(id: number): Observable<message> {
    return this.http.delete<message>(`${this.base}/critere-regle/${id}`);
  }

  /* ----- Phase 2 : 5 Pourquoi (cascade) ----- */
  getPourquoi(idModele: number): Observable<PourquoiNode[]> {
    return this.http.get<PourquoiNode[]>(`${this.base}/pourquoi/modele/${idModele}`);
  }
  addPourquoi(body: {
    id_ModeleGrille: number;
    niveau: number;
    libelle: string;
    id_parent?: number | null;
    ordre?: number;
  }): Observable<message & { id: number }> {
    return this.http.post<message & { id: number }>(`${this.base}/pourquoi/add`, body);
  }
  updatePourquoi(id: number, body: { libelle: string; ordre?: number }): Observable<message> {
    return this.http.put<message>(`${this.base}/pourquoi/${id}`, body);
  }
  deletePourquoi(id: number): Observable<message> {
    return this.http.delete<message>(`${this.base}/pourquoi/${id}`);
  }
}
