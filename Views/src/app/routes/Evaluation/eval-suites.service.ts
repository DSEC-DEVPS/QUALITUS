import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface Supplementaire {
  id: number;
  statut: string;
  conclusion: string | null;
  date_creation: string;
  date_evaluation: string | null;
}
export interface SupplementairesResult {
  attendues: number | null;
  realisees: number;
  total: number;
  supplementaires: Supplementaire[];
}

export interface LignePlanAction {
  id: number;
  id_evaluation: number;
  /** Action (saisie libre). */
  action: string | null;
  id_porteur: number | null;
  date_debut: string | null;
  date_attendue: string | null;
  date_realisation: string | null;
  id_statut: number | null;
  /** KPI (saisie libre). */
  kpi: string | null;
  commentaire: string | null;
  synthese?: string | null;
  action_libelle?: string;
  statut_libelle?: string;
  kpi_libelle?: string;
  porteur_nom?: string;
  porteur_prenom?: string;
  contributeurs?: { id_utilisateur: number; nom: string; prenom: string }[];
  /** Action close (Réalisé, Abandonné, Annulé…) : plus de modification ni de suppression (out107). */
  close?: boolean;
}

/** Statut qui clôt une action (même règle que le serveur). */
export const RE_STATUT_CLOS = /^(r[ée]alis|abandon|annul|clos|cl[oô]tur|termin)/i;

/** Utilisateur proposable comme porteur / contributeur (actif, du périmètre autorisé). */
export interface UtilisateurAssignable { id: number; nom: string; prenom: string; login?: string; site?: string | null; }

/** Ligne de la page « Suivi des plans d'actions ». */
export interface PageSuivi {
  lignes: ActionSuivi[];
  total: number;
  page: number;
  taille: number;
  compteurs: { en_cours: number; en_retard: number; proche: number; realisee: number };
  total_filtres: number;
  total_perimetre: number;
  nb_sans_porteur: number;
  porteurs: { id: number; nom: string }[];
  contributeurs: { id: number; nom: string }[];
  /** Sites des actions visibles (filtre Site ; -1 = sans site). */
  sites?: { id: number; nom: string; n: number }[];
}

export interface ActionSuivi {
  id: number;
  id_evaluation: number;
  action: string;
  synthese: string | null;
  kpi: string | null;
  id_statut: number | null;
  statut: string | null;
  id_porteur: number | null;
  porteur_nom: string | null;
  porteur_prenom: string | null;
  contributeurs: string | null;
  date_attendue: string | null;
  date_realisation: string | null;
  id_agent: number | null;
  agent_nom: string | null;
  agent_prenom: string | null;
  agent_login: string | null;
  date_appel: string | null;
  site: string | null;
  realisee: boolean;
  en_retard: boolean;
  echeance_proche: boolean;
  /** L'utilisateur est porteur ou contributeur. */
  mienne: boolean;
  commentaire: string | null;
  date_debut: string | null;
  contributeurs_ids: number[];
  /** Statut et synthèse modifiables (porteur, ou coache l'évaluation ; action non close). */
  peut_modifier: boolean;
  /** Peut attribuer un porteur à une ancienne action qui n'en a pas. */
  peut_attribuer_porteur: boolean;
  /** Action close : figée. */
  close: boolean;
}

export interface LettreData {
  type: string;
  modele: string;
  /** Début et fin de la lettre, variables déjà remplacées (modèle paramétrable). */
  introduction?: string;
  cloture?: string;
  agent: { nom: string; prenom: string };
  evaluateur?: { nom: string | null; prenom: string | null; fonction: string | null };
  date_evaluation: string;
  contexte: string;
  identifiant_appel: string;
  synthese: string;
  conclusion: string;
  avis_agent: string;
  scores: { categorie: string; score: number; seuil: number; reussite: boolean }[];
  constats: { categorie: string; item: string; commentaire: string; referentiel: string }[];
  business_intelligence: { niveau: number; libelle: string }[];
  cause_racine: { niveau: number; libelle: string }[];
}

export interface ModeleLettre {
  type: string;
  introduction: string | null;
  cloture: string | null;
  dateModification?: string | null;
}

@Injectable({ providedIn: 'root' })
export class EvalSuitesService {
  private readonly http = inject(HttpClient);

  // Évaluations supplémentaires
  getSupplementaires(idEval: number): Observable<SupplementairesResult> {
    return this.http.get<SupplementairesResult>(`/api/v1/eval/evaluation/${idEval}/supplementaires`);
  }
  creerSupplementaire(idEval: number): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(`/api/v1/eval/evaluation/${idEval}/supplementaire`, {});
  }

  // Plan d'action
  getPlanAction(idEval: number): Observable<LignePlanAction[]> {
    return this.http.get<LignePlanAction[]>(`/api/v1/eval/evaluation/${idEval}/plan-action`);
  }
  addLigne(body: any) {
    return this.http.post(`/api/v1/eval/plan-action/ligne`, body);
  }
  updateLigne(id: number, body: any) {
    return this.http.put(`/api/v1/eval/plan-action/ligne/${id}`, body);
  }
  deleteLigne(id: number) {
    return this.http.delete(`/api/v1/eval/plan-action/ligne/${id}`);
  }

  // Lettre
  getLettre(idEval: number): Observable<LettreData> {
    return this.http.get<LettreData>(`/api/v1/eval/evaluation/${idEval}/lettre`);
  }
  // Modèles de lettres (Évaluation › Modèles de lettres)
  getModeleLettre(type: 'FELICITATION' | 'DEBRIEFING'): Observable<ModeleLettre> {
    return this.http.get<ModeleLettre>(`/api/v1/eval/lettre-modele/${type}`);
  }
  enregistrerModeleLettre(type: 'FELICITATION' | 'DEBRIEFING', m: { introduction: string; cloture: string }): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`/api/v1/eval/lettre-modele/${type}`, m);
  }
  // Avis de l'agent (saisi depuis la lettre) — met aussi à jour statut_apres_evaluation
  setAvis(idEval: number, avis: string): Observable<{ message: string; statut_apres_evaluation: string }> {
    return this.http.put<{ message: string; statut_apres_evaluation: string }>(`/api/v1/eval/evaluation/${idEval}/avis`, { avis });
  }

  // Utilisateurs (porteur / contributeurs)
  /** Statuts d'action (lecture, permission evaluation.lire). */
  getStatuts(): Observable<{ id: number; libelle: string }[]> {
    return this.http.get<{ id: number; libelle: string }[]>(`/api/v1/eval/plan-action/statuts`);
  }
  /** Porteurs / contributeurs proposables (son site + site à vision globale, ou tous les sites). */
  getUtilisateurs(): Observable<UtilisateurAssignable[]> {
    return this.http.get<UtilisateurAssignable[]>(`/api/v1/eval/plan-action/utilisateurs`);
  }
  /** Suivi transverse des plans d'actions (filtres serveur : etat, id_statut, id_porteur, id_agent, du, au, periode, mes_actions, id_site, equipe, q). */
  /** Une page du suivi (pagination côté serveur), avec les compteurs des cartes et les listes des filtres. */
  getSuiviPage(filtres: Record<string, any>, page: { page: number; taille: number }): Observable<PageSuivi> {
    const params: Record<string, string> = {};
    for (const [k, v] of Object.entries<any>({ ...filtres, ...page })) if (v !== null && v !== undefined && v !== '') params[k] = String(v);
    return this.http.get<PageSuivi>(`/api/v1/eval/plan-action/suivi`, { params });
  }
  getSuivi(filtres: Record<string, any>): Observable<ActionSuivi[]> {
    const params: Record<string, string> = {};
    for (const [k, v] of Object.entries(filtres)) if (v !== null && v !== undefined && v !== '') params[k] = String(v);
    return this.http.get<ActionSuivi[]>(`/api/v1/eval/plan-action/suivi`, { params });
  }
}
