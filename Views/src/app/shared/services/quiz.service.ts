import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { message } from '@core';
import { Periode, paramsPeriode } from '@shared/periode';
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
  ReinitialisationDemande,
  QuizSource,
  QuestionSource,
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
  getAll(periode?: Periode | null): Observable<Quiz[]> {
    return this.http.get<Quiz[]>(`${this.base}/all`, { params: paramsPeriode(periode) });
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
  /** Active / désactive un quiz (côté propriétaire uniquement). */
  changerStatut(id: number, statut: 'ACTIF' | 'INACTIF'): Observable<{ message: string; statut: string }> {
    return this.http.patch<{ message: string; statut: string }>(`${this.base}/${id}/statut`, { statut });
  }
  delete(id: number): Observable<message> {
    return this.http.delete<message>(`${this.base}/${id}`);
  }

  /* ----- Questions (+ options) ----- */
  addQuestion(body: {
    id_Quiz: number;
    type: string;
    libelle: string;
    points?: number;
    ordre?: number;
    options: OptionQ[];
  }): Observable<message & { id: number }> {
    return this.http.post<message & { id: number }>(`${this.base}/question/add`, body);
  }
  updateQuestion(
    id: number,
    body: { type: string; libelle: string; points?: number; ordre?: number; options: OptionQ[] }
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

  /* ----- Diffusion : filtres + désignation des participants (Partie II) ----- */
  getFonctions(): Observable<any[]> {
    return this.http.get<any[]>('/api/v1/fonction/all');
  }
  getProgrammes(): Observable<any[]> {
    return this.http.get<any[]>('/api/v1/programme/all');
  }
  /** `quiz` : quiz concerné (un utilisateur autorisé est alors limité à son site). */
  rechercherUtilisateursDiffusion(p: { sites?: string; postes?: string; programmes?: string; quiz?: number }): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/diffusion/utilisateurs`, { params: p as any });
  }
  getParticipantsDiffusion(id: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/${id}/participants`);
  }
  diffuser(id: number, id_utilisateurs: number[]): Observable<message & { nb: number }> {
    return this.http.post<message & { nb: number }>(`${this.base}/${id}/diffuser`, { id_utilisateurs });
  }

  /* ----- Utilisateurs autorisés (Partie IV) ----- */
  getAutorises(id: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/${id}/autorises`);
  }
  candidatsAutorisation(id: number, p: { sites?: string; postes?: string; programmes?: string }): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/${id}/autorises/candidats`, { params: p as any });
  }
  autoriser(id: number, id_utilisateurs: number[]): Observable<message & { nb: number }> {
    return this.http.post<message & { nb: number }>(`${this.base}/${id}/autorises`, { id_utilisateurs });
  }
  retirerAutorisation(id: number, uid: number): Observable<message> {
    return this.http.delete<message>(`${this.base}/${id}/autorises/${uid}`);
  }
  getQuizPublics(): Observable<QuizPublic[]> {
    return this.http.get<QuizPublic[]>(`${this.base}/participer/publics`);
  }
  /* ----- Reprise des questions d'un ancien quiz ----- */
  getSourcesQuestions(quizId: number, recherche = ''): Observable<QuizSource[]> {
    const params: Record<string, string> = recherche ? { q: recherche } : {};
    return this.http.get<QuizSource[]>(`${this.base}/${quizId}/sources-questions`, { params });
  }
  getQuestionsSource(quizId: number, sourceId: number): Observable<QuestionSource[]> {
    return this.http.get<QuestionSource[]>(`${this.base}/${quizId}/sources-questions/${sourceId}`);
  }
  reprendreQuestions(
    quizId: number,
    body: { id_source: number; ids_questions: number[] }
  ): Observable<message & { nb_ajoutees: number; nb_ignorees: number }> {
    return this.http.post<message & { nb_ajoutees: number; nb_ignorees: number }>(
      `${this.base}/${quizId}/reprendre-questions`,
      body
    );
  }

  /** Quiz commencés et non soumis (privés et publics), avec du temps restant. */
  getQuizEnCours(): Observable<QuizPublic[]> {
    return this.http.get<QuizPublic[]>(`${this.base}/participer/en-cours`);
  }

  /* ----- Phase 2 : participation ----- */
  getDisponibles(): Observable<QuizDisponible[]> {
    return this.http.get<QuizDisponible[]>(`${this.base}/participer/disponibles`);
  }
  /** Quiz à passer. `pin` : obligatoire pour un quiz privé (saisi dans l'écran Participer). */
  getQuizAPasser(id: number, pin?: string | null): Observable<QuizAPasser> {
    const options = pin ? { params: { pin } } : {};
    return this.http.get<QuizAPasser>(`${this.base}/participer/${id}`, options);
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
  getMesScores(periode?: Periode | null): Observable<ScoreHistorique[]> {
    return this.http.get<ScoreHistorique[]>(`${this.base}/historique/mes-scores`, {
      params: paramsPeriode(periode),
    });
  }

  /* ----- Phase 3 : notifications ----- */
  getMesNotifications(): Observable<QuizNotification[]> {
    return this.http.get<QuizNotification[]>(`${this.base}/notifications/mes`);
  }
  marquerLu(id: number): Observable<message> {
    return this.http.patch<message>(`${this.base}/notifications/${id}/lu`, {});
  }

  /* ----- Réinitialisation de la participation ----- */
  demanderReinitialisation(quizId: number, agentId: number): Observable<message & { id: number }> {
    return this.http.post<message & { id: number }>(`${this.base}/${quizId}/reinitialisation`, {
      id_UTILISATEUR: agentId,
    });
  }
  annulerReinitialisation(demandeId: number): Observable<message> {
    return this.http.delete<message>(`${this.base}/reinitialisation/${demandeId}`);
  }
  getMesReinitialisations(): Observable<ReinitialisationDemande[]> {
    return this.http.get<ReinitialisationDemande[]>(`${this.base}/reinitialisations/mes`);
  }
  repondreReinitialisation(demandeId: number, decision: 'CONFIRMER' | 'REFUSER'): Observable<message> {
    return this.http.post<message>(`${this.base}/reinitialisation/${demandeId}/repondre`, { decision });
  }

  /* ----- Phase 3 : badges ----- */
  getMesBadges(): Observable<BadgeUtilisateur[]> {
    return this.http.get<BadgeUtilisateur[]>(`${this.base}/badges/mes`);
  }

  /* ----- Phase 3 : rapports de difficulte ----- */
  getRapportDifficulte(periode?: Periode | null): Observable<RapportQuiz[]> {
    return this.http.get<RapportQuiz[]>(`${this.base}/rapports/difficulte`, {
      params: paramsPeriode(periode),
    });
  }
  getRapportQuestions(id: number, periode?: Periode | null): Observable<RapportQuestion[]> {
    return this.http.get<RapportQuestion[]>(`${this.base}/rapports/questions/${id}`, {
      params: paramsPeriode(periode),
    });
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
  getRetestEchecs(periode?: Periode | null): Observable<RetestEchec[]> {
    return this.http.get<RetestEchec[]>(`${this.base}/retest/echecs`, {
      params: paramsPeriode(periode),
    });
  }
  autoriserRetest(id_Quiz: number, id_UTILISATEUR: number): Observable<message> {
    return this.http.post<message>(`${this.base}/retest/autoriser`, { id_Quiz, id_UTILISATEUR });
  }

  /* ----- Autorisations IP (liste blanche par quiz) ----- */
  getIps(id: number): Observable<QuizIp[]> {
    return this.http.get<QuizIp[]>(`${this.base}/${id}/ip`);
  }
  addIp(
    id: number,
    body: { adresse_ip: string; libelle?: string; id_Site: number }
  ): Observable<message & { id: number }> {
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
