// Interfaces du module Sondage (sondages du personnel)

export interface OptionSondage {
  id?: number;
  libelle: string;
  ordre?: number;
}

export interface ConditionSondage {
  id?: number;
  id_Question_source: number; // question dont on teste la reponse
  operateur: string; // EGAL | DIFFERENT | SUP_EGAL | INF_EGAL | CONTIENT
  id_Option?: number | null; // pour source de type choix
  valeur?: string | null; // pour source curseur/ouverte
}

export interface QuestionSondage {
  id?: number;
  id_Sondage?: number;
  page: number; // numero de page (P1, P2...)
  ordre?: number;
  type: string; // CHOIX_UNIQUE | CHOIX_MULTIPLE | OUVERTE | CLASSEMENT | CURSEUR | INFO
  libelle: string;
  obligatoire: number; // 0 | 1
  curseur_min?: number | null;
  curseur_max?: number | null;
  options?: OptionSondage[];
  conditions?: ConditionSondage[];
}

// Reponse envoyee lors de la passation
export interface ReponsePassation {
  id_Question: number;
  id_Options?: number[];
  valeur_texte?: string;
  valeur_num?: number;
  classement?: number[];
}

export interface Sondage {
  id: number;
  nom: string;
  token?: string; // lien public
  langue: string; // 'Francais' par defaut
  statut: string; // ENCOURS | ACTIF | DESACTIF
  bouton_retour: number; // 0 | 1 (afficher le bouton Retour)
  id_createur?: number;
  dateCreation?: string;
  dateModification?: string;
  nb_questions?: number;
  questions?: QuestionSondage[];
}

export const TYPES_QUESTION: { value: string; label: string; icon: string }[] = [
  { value: 'CHOIX_UNIQUE', label: 'Choix unique', icon: 'radio_button_checked' },
  { value: 'CHOIX_MULTIPLE', label: 'Choix multiples', icon: 'check_box' },
  { value: 'OUVERTE', label: 'Question ouverte', icon: 'notes' },
  { value: 'CLASSEMENT', label: 'Question de classement', icon: 'sort' },
  { value: 'CURSEUR', label: 'Curseur (1 à N)', icon: 'tune' },
  { value: 'INFO', label: "Message d'information", icon: 'info' },
];

export const LANGUES = ['Francais', 'Anglais'];
export const STATUTS = ['ENCOURS', 'ACTIF', 'DESACTIF'];

/* ----- Phase 4 : rapport ----- */
export interface QuestionRapport {
  id: number;
  page: number;
  type: string;
  libelle: string;
  curseur_min?: number | null;
  curseur_max?: number | null;
  resultat: any;
}
export interface RapportSondage {
  id: number;
  nom: string;
  nb_passations: number;
  questions: QuestionRapport[];
}

/* ----- Phase 3 : cible & diffusion ----- */
export interface OptionRef {
  id: number;
  nom: string;
}

export interface UtilisateurCible {
  id: number;
  nom: string;
  prenom: string;
  email?: string;
  telephone?: string;
  site?: string;
  fonction?: string;
  anciennete_mois?: number;
}

export interface CibleSondage {
  id: number;
  id_Sondage?: number;
  id_UTILISATEUR?: number | null;
  nom?: string;
  prenom?: string;
  email?: string;
  telephone?: string;
  date_envoi_email?: string | null;
  date_envoi_sms?: string | null;
}
