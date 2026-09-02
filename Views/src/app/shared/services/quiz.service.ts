import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { message } from '@core';
import {
  Quiz,
  Question,
  OptionQ,
  FicheRecente,
  QuizDisponible,
  QuizAPasser,
  ResultatSoumission,
  ScoreHistorique,
  QuizNotification,
  BadgeUtilisateur,
  RapportQuiz,
  RapportQuestion,
  RetestEchec,
  QuizIp,
  QuizIpDemande,
  SiteOption,
  QuizPublic,
  RapportParticipant,
  TentativeDetail,
  QuestionRatee,
} from '../../routes/Quiz/interfaces';

/**
 * Service du generateur de quiz (nouveau modele structure).
 * Routes prefixees par /api/v1/quiz. Distinct du quiz legacy (par fiche).
 */
@Injectable({ providedIn: 'root' })
export class QuizService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/quiz';

  /* ----- Quiz ----- */
  getAll(): Observable<Quiz[]> {
    return this.http.get<Quiz[]>(`${this.base}/all`);
  }
  getOne(id: number): Observable<Quiz> {
    return this.http.get<Quiz>(`${this.base}/${id}`);
  }
  add(body: Partial<Quiz>): Observable<message & { id: number }> {
    return this.http.post<message & { id: number }>(`${this.base}/add`, body);
  }
  update(id: number, body: Partial<Quiz>): Observable<message> {
    return this.http.put<message>(`${this.base}/update/${id}`, body);
  }
  delete(id: number): Observable<message> {
    return this.http.delete<message>(`${this.base}/${id}`);
  }

  /* ----- Questions (+ options) ----- */
  addQuestion(body: {
    id_Quiz: number;
    type: string;
    libelle: string;
    ordre?: number;
    options: OptionQ[];
  }): Observable<message & { id: number }> {
    return this.http.post<message & { id: number }>(`${this.base}/question/add`, body);
  }
  updateQuestion(
    id: number,
    body: { type: string; libelle: string; ordre?: number; options: OptionQ[] }
  ): Observable<message> {
    return this.http.put<message>(`${this.base}/question/${id}`, body);
  }
  deleteQuestion(id: number): Observable<message> {
    return this.http.delete<message>(`${this.base}/question/${id}`);
  }

  /* ----- Contenus KB (fiches) ----- */
  getFichesRecentes(): Observable<FicheRecente[]> {
    return this.http.get<FicheRecente[]>(`${this.base}/fiches/recentes`);
  }

  /* ----- Sites (pour l'attribution d'un quiz a des sites) ----- */
  getSites(): Observable<SiteOption[]> {
    return this.http.get<SiteOption[]>('/api/v1/site/all');
  }
  getQuizPublics(): Observable<QuizPublic[]> {
    return this.http.get<QuizPublic[]>(`${this.base}/participer/publics`);
  }

  /* ----- Phase 2 : participation ----- */
  getDisponibles(): Observable<QuizDisponible[]> {
    return this.http.get<QuizDisponible[]>(`${this.base}/participer/disponibles`);
  }
  getQuizAPasser(id: number): Observable<QuizAPasser> {
    return this.http.get<QuizAPasser>(`${this.base}/participer/${id}`);
  }
  getByPin(pin: string): Observable<{ etat: string; id?: number; titre?: string }> {
    return this.http.get<{ etat: string; id?: number; titre?: string }>(`${this.base}/pin/${pin}`);
  }
  soumettre(
    id: number,
    reponses: { id_Question: number; id_Options: number[] }[]
  ): Observable<ResultatSoumission> {
    return this.http.post<ResultatSoumission>(`${this.base}/participer/${id}/soumettre`, {
      reponses,
    });
  }
  getMesScores(): Observable<ScoreHistorique[]> {
    return this.http.get<ScoreHistorique[]>(`${this.base}/historique/mes-scores`);
  }

  /* ----- Phase 3 : notifications ----- */
  notifier(id: number): Observable<message & { nb: number }> {
    return this.http.post<message & { nb: number }>(`${this.base}/${id}/notifier`, {});
  }
  getMesNotifications(): Observable<QuizNotification[]> {
    return this.http.get<QuizNotification[]>(`${this.base}/notifications/mes`);
  }
  marquerLu(id: number): Observable<message> {
    return this.http.patch<message>(`${this.base}/notifications/${id}/lu`, {});
  }
  marquerToutLu(): Observable<message> {
    return this.http.patch<message>(`${this.base}/notifications/lu-tout`, {});
  }

  /* ----- Phase 3 : badges ----- */
  getMesBadges(): Observable<BadgeUtilisateur[]> {
    return this.http.get<BadgeUtilisateur[]>(`${this.base}/badges/mes`);
  }

  /* ----- Phase 3 : rapports de difficulte ----- */
  getRapportDifficulte(): Observable<RapportQuiz[]> {
    return this.http.get<RapportQuiz[]>(`${this.base}/rapports/difficulte`);
  }
  getRapportQuestions(id: number): Observable<RapportQuestion[]> {
    return this.http.get<RapportQuestion[]>(`${this.base}/rapports/questions/${id}`);
  }
  getRapportParticipants(
    id: number,
    filtres?: { agent?: string; statut?: string; site?: string }
  ): Observable<RapportParticipant[]> {
    const p: Record<string, string> = {};
    if (filtres?.agent) p['agent'] = filtres.agent;
    if (filtres?.statut) p['statut'] = filtres.statut;
    if (filtres?.site) p['site'] = filtres.site;
    return this.http.get<RapportParticipant[]>(`${this.base}/${id}/rapport/participants`, { params: p });
  }
  getTentativeDetail(tid: number): Observable<TentativeDetail> {
    return this.http.get<TentativeDetail>(`${this.base}/tentative/${tid}/detail`);
  }
  getQuestionsRatees(id: number): Observable<QuestionRatee[]> {
    return this.http.get<QuestionRatee[]>(`${this.base}/${id}/rapport/questions-ratees`);
  }

  /* ----- Retest controle par le superviseur ----- */
  getRetestEchecs(): Observable<RetestEchec[]> {
    return this.http.get<RetestEchec[]>(`${this.base}/retest/echecs`);
  }
  autoriserRetest(id_Quiz: number, id_UTILISATEUR: number): Observable<message> {
    return this.http.post<message>(`${this.base}/retest/autoriser`, { id_Quiz, id_UTILISATEUR });
  }

  /* ----- Autorisations IP (liste blanche par quiz) ----- */
  getIps(id: number): Observable<QuizIp[]> {
    return this.http.get<QuizIp[]>(`${this.base}/${id}/ip`);
  }
  addIp(id: number, body: { adresse_ip: string; libelle?: string }): Observable<message & { id: number }> {
    return this.http.post<message & { id: number }>(`${this.base}/${id}/ip`, body);
  }
  deleteIp(ipId: number): Observable<message> {
    return this.http.delete<message>(`${this.base}/ip/${ipId}`);
  }

  /* ----- Demandes d'acces IP en attente ----- */
  getDemandesIp(id: number): Observable<QuizIpDemande[]> {
    return this.http.get<QuizIpDemande[]>(`${this.base}/${id}/ip/demandes`);
  }
  traiterDemandeIp(demandeId: number, decision: 'AUTORISER' | 'REFUSER'): Observable<message> {
    return this.http.post<message>(`${this.base}/ip/demande/${demandeId}/traiter`, { decision });
  }
}
