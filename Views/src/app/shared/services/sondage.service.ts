import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { message, TokenService } from '@core';
import {
  Sondage,
  QuestionSondage,
  ReponsePassation,
  UtilisateurCible,
  CibleSondage,
  OptionRef,
  RapportSondage,
} from '../../routes/Sondage/interfaces';
import { HttpParams } from '@angular/common/http';
import { Periode, paramsPeriode } from '@shared/periode';
import { PageServeur, paramsPage } from '@shared/utils/pagination-serveur';

/** Service du module Sondage (sondages du personnel). Prefixe /api/v1/sondage. */
@Injectable({ providedIn: 'root' })
export class SondageService {
  private readonly http = inject(HttpClient);
  private readonly tokens = inject(TokenService);
  private readonly base = '/api/v1/sondage';

  /* ----- Sondage ----- */
  /** Liste des sondages, éventuellement filtrée sur une période et la date choisie. */
  getAll(periode?: Periode | null, champ: 'creation' | 'modification' | 'reponse' = 'creation'): Observable<Sondage[]> {
    const params: Record<string, string> = { ...paramsPeriode(periode) };
    if (params['du'] || params['au']) params['champ'] = champ;
    return this.http.get<Sondage[]>(`${this.base}/all`, { params });
  }
  /** Une page de la liste (recherche et statut appliqués par le serveur). */
  getAllPage(periode: Periode | null, champ: 'creation' | 'modification' | 'reponse', filtres: { q?: string; statut?: string },
             page: { page: number; taille: number }): Observable<PageServeur<Sondage>> {
    const params: Record<string, string> = { ...paramsPeriode(periode) };
    if (params['du'] || params['au']) params['champ'] = champ;
    return this.http.get<PageServeur<Sondage>>(`${this.base}/all`, { params: paramsPage({ ...params, ...filtres }, page) });
  }
  getOne(id: number): Observable<Sondage> {
    return this.http.get<Sondage>(`${this.base}/${id}`);
  }
  add(body: Partial<Sondage>): Observable<message & { id: number }> {
    return this.http.post<message & { id: number }>(`${this.base}/add`, body);
  }
  update(id: number, body: Partial<Sondage>): Observable<message> {
    return this.http.put<message>(`${this.base}/update/${id}`, body);
  }
  changerStatut(id: number, statut: string): Observable<message> {
    return this.http.patch<message>(`${this.base}/${id}/statut`, { statut });
  }
  dupliquer(id: number): Observable<message & { id: number }> {
    return this.http.post<message & { id: number }>(`${this.base}/${id}/dupliquer`, {});
  }
  delete(id: number): Observable<message> {
    return this.http.delete<message>(`${this.base}/${id}`);
  }

  /* ----- Questions (+ options) ----- */
  /**
   * Sondage déjà répondu : ajouter / supprimer une question ou une option, changer un type
   * renvoie 409 CONFIRMATION_REQUISE ; on renvoie alors avec confirmer = true (remise à zéro).
   */
  addQuestion(body: QuestionSondage, confirmer = false): Observable<message & { id: number; reinitialise?: boolean }> {
    return this.http.post<message & { id: number; reinitialise?: boolean }>(`${this.base}/question/add`, {
      ...body,
      confirmer_reinitialisation: confirmer,
    });
  }
  updateQuestion(id: number, body: QuestionSondage, confirmer = false): Observable<message & { reinitialise?: boolean }> {
    return this.http.put<message & { reinitialise?: boolean }>(`${this.base}/question/${id}`, {
      ...body,
      confirmer_reinitialisation: confirmer,
    });
  }
  deleteQuestion(id: number, confirmer = false): Observable<message & { reinitialise?: boolean }> {
    return this.http.delete<message & { reinitialise?: boolean }>(`${this.base}/question/${id}`, {
      params: confirmer ? { confirmer: '1' } : {},
    });
  }

  /* ----- Passation par lien public (token) ----- */
  getPublic(token: string): Observable<{ etat: string; sondage?: Sondage; nom?: string }> {
    return this.http.get<{ etat: string; sondage?: Sondage; nom?: string }>(
      `${this.base}/public/${token}`
    );
  }
  soumettrePublic(token: string, reponses: ReponsePassation[]): Observable<message & { id: number }> {
    return this.http.post<message & { id: number }>(`${this.base}/public/${token}/soumettre`, {
      reponses,
    });
  }

  /* ----- Phase 3 : cible & diffusion ----- */
  getSites(): Observable<OptionRef[]> {
    return this.http.get<OptionRef[]>('/api/v1/site/all');
  }
  getFonctions(): Observable<OptionRef[]> {
    return this.http.get<OptionRef[]>('/api/v1/fonction/all');
  }
  rechercherUtilisateurs(filtres: {
    sites?: number[];
    fonctions?: number[];
    anciennete_min?: number;
  }): Observable<UtilisateurCible[]> {
    let params = new HttpParams();
    if (filtres.sites?.length) params = params.set('sites', filtres.sites.join(','));
    if (filtres.fonctions?.length) params = params.set('fonctions', filtres.fonctions.join(','));
    if (filtres.anciennete_min) params = params.set('anciennete_min', String(filtres.anciennete_min));
    return this.http.get<UtilisateurCible[]>(`${this.base}/utilisateurs/rechercher`, { params });
  }
  getCibles(id: number): Observable<CibleSondage[]> {
    return this.http.get<CibleSondage[]>(`${this.base}/${id}/cible`);
  }
  addCibleUtilisateurs(id: number, id_utilisateurs: number[]): Observable<message & { nb: number }> {
    return this.http.post<message & { nb: number }>(`${this.base}/${id}/cible/utilisateurs`, {
      id_utilisateurs,
    });
  }
  importCibles(id: number, fichier: File): Observable<message & { nb: number }> {
    const fd = new FormData();
    fd.append('fichier', fichier);
    return this.http.post<message & { nb: number }>(`${this.base}/${id}/cible/import`, fd);
  }
  deleteCible(cibleId: number): Observable<message> {
    return this.http.delete<message>(`${this.base}/cible/${cibleId}`);
  }
  diffuser(
    id: number,
    canaux: string[]
  ): Observable<message & { nbEmail: number; nbSms: number; token: string }> {
    return this.http.post<message & { nbEmail: number; nbSms: number; token: string }>(
      `${this.base}/${id}/diffuser`,
      { canaux }
    );
  }

  /* ----- Phase 4 : rapport ----- */
  getRapport(id: number): Observable<RapportSondage> {
    return this.http.get<RapportSondage>(`${this.base}/${id}/rapport`);
  }

  /* ----- Sondages OBLIGATOIRES (cible interne connectée, bloquant) ----- */
  private obligatoiresCache: number[] | null = null;
  /** Jeton de la session pour laquelle le cache a été calculé (changement d'utilisateur => recalcul). */
  private obligatoiresCleSession = '';

  getObligatoiresMes(): Observable<{ id: number; nom: string }[]> {
    return this.http.get<{ id: number; nom: string }[]>(`${this.base}/obligatoires/mes`);
  }
  getObligatoire(id: number): Observable<{ etat: string; sondage?: Sondage }> {
    return this.http.get<{ etat: string; sondage?: Sondage }>(`${this.base}/obligatoire/${id}`);
  }
  soumettreObligatoire(
    id: number,
    reponses: ReponsePassation[]
  ): Observable<message & { id: number }> {
    return this.http.post<message & { id: number }>(`${this.base}/obligatoire/${id}/soumettre`, {
      reponses,
    });
  }

  /** Premier sondage obligatoire non fait (avec cache pour le garde de route). */
  premierObligatoire(): Observable<number | null> {
    const cle = this.tokens.getBearerToken() || '';
    if (cle !== this.obligatoiresCleSession) {
      this.obligatoiresCache = null;
      this.obligatoiresCleSession = cle;
    }
    if (this.obligatoiresCache !== null) {
      return of(this.obligatoiresCache.length ? this.obligatoiresCache[0] : null);
    }
    return this.getObligatoiresMes().pipe(
      map(list => {
        this.obligatoiresCache = list.map(s => s.id);
        return this.obligatoiresCache.length ? this.obligatoiresCache[0] : null;
      }),
      catchError(() => of(null))
    );
  }
  rafraichirObligatoires() {
    this.obligatoiresCache = null;
  }
}
