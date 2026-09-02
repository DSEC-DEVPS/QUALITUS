// Interfaces du module Evaluation - Phase 1 (fondations)

export interface Contexte {
  id: number;
  libelle: string;
  Etat?: string;
  dateCreation?: string;
}

export interface Evaluateur {
  id: number;
  nom: string;
  prenom?: string;
  email?: string;
  login?: string;
  id_Site: number;
  site_nom?: string;
  Etat?: string;
  dateCreation?: string;
}

export interface AgentEvalue {
  id: number;
  nom: string;
  prenom?: string;
  login_genesys: string;
  id_CategorieRessource?: number | null;
  type_nom?: string;
  id_Site?: number | null;
  site_nom?: string;
  Etat?: string;
  dateCreation?: string;
}

// References pour les listes deroulantes
export interface SiteRef {
  id: number;
  nom: string;
}
export interface TypeRef {
  id: number;
  nom: string;
  est_robot?: number;
}

/* ----- Phase 2 : evaluations ----- */

// Arbre de grille (issu de Calibrage) pour l'execution
export interface EvSousItem {
  id: number;
  nom: string;
  referentiel?: string;
  poids?: number;
}
export interface EvItem {
  id: number;
  nom: string;
  poids?: number;
  sousItems?: EvSousItem[];
}
export interface EvErreur {
  id: number;
  nom: string;
  poids?: number;
  items?: EvItem[];
}
export interface EvCategorie {
  id: number;
  nom: string;
  poids?: number;
  erreurs?: EvErreur[];
}

export interface Evaluation {
  id: number;
  id_Contexte?: number | null;
  id_Agent?: number;
  id_ModeleGrille?: number | null;
  id_appel?: string;
  n_case?: string;
  date_appel?: string | null;
  dmt?: string;
  motif_appel?: string;
  resolution?: string | null;
  conclusion?: string | null;
  score_global?: number | null;
  statut?: string;
  actif?: number;
  date_creation?: string;
  agent_nom?: string;
  agent_prenom?: string;
  login_genesys?: string;
  contexte?: string;
  grille_nom?: string | null;
  // detail
  grille?: EvCategorie[];
  resultats?: { id_SousItem: number; conforme: number; commentaire?: string }[];
}

export interface DetailConclusion {
  categorie: string;
  score: number;
  operateur: string | null;
  objectif: number | null;
  reussi: boolean;
}
export interface ResultatTerminer {
  message: string;
  conclusion: string;
  score_global: number;
  resolution: string | null;
  details: DetailConclusion[];
}

/* ----- Phase 3 : suivi & coaching ----- */

export interface Coaching {
  id?: number;
  id_Evaluation?: number;
  cause_racine?: string;
  pourquoi1?: string;
  pourquoi2?: string;
  pourquoi3?: string;
  pourquoi4?: string;
  pourquoi5?: string;
}

export interface ActionType {
  id: number;
  libelle: string;
  Etat?: string;
}

export interface ActionCorrective {
  id?: number;
  id_Evaluation?: number;
  id_ActionType?: number | null;
  type_libelle?: string;
  action_libelle?: string;
  porteur?: string;
  contributeurs?: string;
  date_debut?: string | null;
  date_attendue?: string | null;
  date_realisation?: string | null;
  statut?: string;
  kpi?: string;
  commentaire?: string;
}

export interface EvalNotification {
  id: number;
  id_Evaluation: number;
  titre: string;
  message: string;
  lu: number;
  dateCreation: string;
}

export interface AgentPole {
  id_Agent: number;
  nom: string;
  prenom: string;
  login_genesys: string;
  nb_echecs: number;
  transactions_critiques: number;
  mois: string[];
  motifs: string[];
}

/* ----- Phase 4 : contre-evaluations ----- */

export interface EvaluateurSite {
  id: number;
  nom: string;
  prenom?: string;
  login?: string;
  id_Site: number;
  nb_evaluations: number;
}

export interface EvaluationEvaluateur {
  id: number;
  conclusion?: string;
  score_global?: number;
  date_execution?: string;
  agent_nom?: string;
  agent_prenom?: string;
  login_genesys?: string;
  contexte?: string;
  nb_contre: number;
}

export interface ContreEvaluation {
  id: number;
  id_Evaluation: number;
  resolution?: string | null;
  conclusion?: string | null;
  score_global?: number | null;
  date_visibilite?: string | null;
  statut?: string;
  actif?: number;
  id_ModeleGrille?: number | null;
  agent_nom?: string;
  agent_prenom?: string;
  login_genesys?: string;
  grille_nom?: string | null;
  grille?: EvCategorie[];
  resultats_anciens?: { id_SousItem: number; conforme: number }[];
  resultats_nouveaux?: { id_SousItem: number; conforme: number }[];
}

export interface ContreListItem {
  id: number;
  id_Evaluation: number;
  conclusion?: string;
  score_global?: number;
  date_visibilite?: string | null;
  statut?: string;
  actif?: number;
  agent_nom?: string;
  agent_prenom?: string;
  evaluateur_nom?: string;
  evaluateur_prenom?: string;
}
