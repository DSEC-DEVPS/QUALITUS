import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { message } from '@core';
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

/** Service du module Sondage (sondages du personnel). Prefixe /api/v1/sondage. */
@Injectable({ providedIn: 'root' })
export class SondageService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/sondage';

  /* ----- Sondage ----- */
  getAll(): Observable<Sondage[]> {
    return this.http.get<Sondage[]>(`${this.base}/all`);
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
  addQuestion(body: QuestionSondage): Observable<message & { id: number }> {
    return this.http.post<message & { id: number }>(`${this.base}/question/add`, body);
  }
  updateQuestion(id: number, body: QuestionSondage): Observable<message> {
    return this.http.put<message>(`${this.base}/question/${id}`, body);
  }
  deleteQuestion(id: number): Observable<message> {
    return this.http.delete<message>(`${this.base}/question/${id}`);
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
