import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { message } from '@core';
import { Periode, paramsPeriode } from '@shared/periode';
import { PageServeur, paramsPage } from '@shared/utils/pagination-serveur';
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
  MesQuiz,
  RapportParticipant,
  TentativeDetail,
  QuestionRatee,
  ReinitialisationDemande,
  QuizSource,
  QuestionSource,
} from '../../routes/Quiz/interfaces';

/** Page du rapport de difficulté (out113) : lignes (rang compris) + synthèse de la période. */
export interface PageRapportQuiz extends PageServeur<RapportQuiz & { rang: number | null }> {
  synthese: {
    nb_quiz: number; nb_avec_tentatives: number; total_tentatives: number; total_reussites: number;
    taux_global: number | null; total_designes: number; total_non_passes: number;
    taux_participation_global: number | null; score_global: number | null; a_des_limites: boolean;
  };
}

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
  /**
   * Liste des quiz filtrée et triée par le serveur : une page (`page`), ou toutes les
   * lignes pour l'export (`page` absent -> export=1).
   */
  getAllPage(periode: Periode | null, filtres: { q?: string; statut?: string; tri?: string; sens?: string; site_createur?: string },
             page?: { page: number; taille: number } | null): Observable<PageServeur<Quiz> & { sites_createurs?: { id: string; nom: string }[] }> {
    const params = paramsPage({ ...paramsPeriode(periode), ...filtres, ...(page ? {} : { export: 1 }) }, page);
    return this.http.get<PageServeur<Quiz> & { sites_createurs?: { id: string; nom: string }[] }>(`${this.base}/all`, { params });
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
  /** Fiches ACTIVES dont le titre contient `q` (30 max) ; sans `q` : les plus récentes. */
  getFichesRecentes(q = ''): Observable<FicheRecente[]> {
    const params = q.trim() ? new HttpParams().set('q', q.trim()) : undefined;
    return this.http.get<FicheRecente[]>(`${this.base}/fiches/recentes`, { params });
  }

  /** Détail des fiches déjà liées à un quiz (quel que soit leur état). */
  getFichesParIds(ids: number[]): Observable<FicheRecente[]> {
    return this.http.get<FicheRecente[]>(`${this.base}/fiches/recentes`, { params: new HttpParams().set('ids', ids.join(',')) });
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
  /** Répartit équitablement les 100 points du barème entre les questions. */
  repartirPoints(id: number): Observable<message & { total_points: number }> {
    return this.http.post<message & { total_points: number }>(`${this.base}/${id}/repartir-points`, {});
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

  /** Écran Participer : quiz disponibles (publics + privés déverrouillés) et terminés. */
  getMesQuiz(): Observable<MesQuiz> {
    return this.http.get<MesQuiz>(`${this.base}/participer/mes-quiz`);
  }

  /* ----- Phase 2 : participation ----- */
  getDisponibles(): Observable<QuizDisponible[]> {
    return this.http.get<QuizDisponible[]>(`${this.base}/participer/disponibles`);
  }
  /** Quiz à passer. `pin` : obligatoire pour un quiz privé (saisi dans l'écran Participer). */
  /** Écran d'accueil : informations et fiches, sans questions ni démarrage du chronomètre. */
  getQuizApercu(id: number, pin?: string | null): Observable<QuizAPasser> {
    const options = pin ? { params: { pin } } : {};
    return this.http.get<QuizAPasser>(`${this.base}/participer/${id}/apercu`, options);
  }
  /** Démarrage (ou reprise) : questions + heure de début enregistrée côté serveur. */
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
  getMesScoresPage(periode: Periode | null, page: { page: number; taille: number }): Observable<PageServeur<ScoreHistorique>> {
    return this.http.get<PageServeur<ScoreHistorique>>(`${this.base}/historique/mes-scores`, {
      params: paramsPage(paramsPeriode(periode), page),
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
  /** Badges d'un agent (page détail agent : mêmes accès que ses statistiques). */
  getBadgesAgent(idAgent: number): Observable<BadgeUtilisateur[]> {
    return this.http.get<BadgeUtilisateur[]>(`/api/v1/agent/${idAgent}/badges-quiz`);
  }

  /* ----- Phase 3 : rapports de difficulte ----- */
  getRapportDifficulte(periode?: Periode | null): Observable<RapportQuiz[]> {
    return this.http.get<RapportQuiz[]>(`${this.base}/rapports/difficulte`, {
      params: paramsPeriode(periode),
    });
  }
  /** Une page du rapport, avec la synthèse calculée sur tous les quiz de la période. */
  getRapportDifficultePage(periode: Periode | null, filtres: { q?: string; masquer_sans_tentative?: boolean },
                           page: { page: number; taille: number }): Observable<PageRapportQuiz> {
    const f = { q: filtres.q, masquer_sans_tentative: filtres.masquer_sans_tentative ? 1 : '' };
    return this.http.get<PageRapportQuiz>(`${this.base}/rapports/difficulte`, {
      params: paramsPage({ ...paramsPeriode(periode), ...f }, page),
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
  /** Classe l'échec d'un agent « retest non autorisé » (sort de la page). */
  refuserRetest(id_Quiz: number, id_UTILISATEUR: number): Observable<message & { nb?: number }> {
    return this.http.post<message & { nb?: number }>(`${this.base}/retest/refuser`, { id_Quiz, id_UTILISATEUR });
  }
  /** Classe tous les échecs en attente d'un quiz « retest non autorisé ». */
  refuserRetestsQuiz(id_Quiz: number): Observable<message & { nb?: number }> {
    return this.http.post<message & { nb?: number }>(`${this.base}/retest/refuser`, { id_Quiz, tous: true });
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
