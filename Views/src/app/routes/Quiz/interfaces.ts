// Interfaces du module Quiz (nouveau modele structure - generateur)

export interface OptionQ {
  id?: number;
  id_Question?: number;
  libelle: string;
  est_correcte: number; // 0 | 1
  ordre?: number;
}

export interface Question {
  id: number;
  id_Quiz: number;
  type: string; // 'VRAI_FAUX' (extensible)
  libelle: string;
  ordre: number;
  options?: OptionQ[];
}

export interface Quiz {
  id: number;
  titre: string;
  type?: string | null; // categorie du quiz (Formation / Evaluation / Certification)
  duree?: number | null; // en minutes
  date_fermeture?: string | null;
  acces?: string; // PRIVATE | PUBLIC
  alterner_questions?: number; // 0 | 1
  autoriser_machines?: number; // 0 | 1
  description?: string;
  id_Fiche?: number | null;
  fiche_titre?: string | null;
  fiches?: number[]; // ids des contenus associes (n..n)
  fiches_detail?: { id_Fiche: number; titre: string }[];
  fiches_titres?: string | null; // libelles concatenes (liste)
  note_passage: number; // "Seuil de reussite"
  retest_auto: number; // 0 | 1 (conserve en base, hors formulaire)
  nb_retest_max: number;
  Etat?: string;
  dateCreation?: string;
  dateModification?: string;
  nb_questions?: number;
  questions?: Question[];
}

export interface FicheRecente {
  id: number;
  titre: string;
  dateModification?: string;
  dateEnregistrement?: string;
}

/* ----- Phase 2 : participation ----- */

export interface QuizDisponible {
  id: number;
  titre: string;
  description?: string;
  fiche_titre?: string | null;
  note_passage: number;
  retest_auto: number;
  nb_retest_max: number;
  nb_questions: number;
  nb_essais: number;
  derniere_reussi: number | null;
  retest_autorise?: number; // nb d'autorisations de retest non consommees
}

// Option servie a l'utilisateur (sans reveler la bonne reponse)
export interface OptionAPasser {
  id: number;
  id_Question: number;
  libelle: string;
  ordre: number;
}
export interface QuestionAPasser {
  id: number;
  id_Quiz: number;
  type: string;
  libelle: string;
  ordre: number;
  options: OptionAPasser[];
}
export interface QuizAPasser {
  id: number;
  titre: string;
  description?: string;
  note_passage: number;
  retest_auto: number;
  nb_retest_max: number;
  questions: QuestionAPasser[];
  deja_tente?: boolean;
  peut_participer?: boolean;
}

export interface RetestEchec {
  id_tentative: number;
  id_Quiz: number;
  id_UTILISATEUR: number;
  score: number;
  num_essai: number;
  date_tentative: string;
  quiz_titre: string;
  nom: string;
  prenom: string;
  login: string;
  retest_en_attente: number;
}

export interface FeedbackItem {
  id_Question: number;
  libelle: string;
  type?: string;
  ids_choisis: number[];
  ids_corrects: number[];
  bonnes_reponses: string[];
  est_correcte: number;
}
export interface ResultatSoumission {
  message: string;
  id_tentative: number;
  score: number;
  nb_bonnes: number;
  nb_total: number;
  note_passage: number;
  reussi: boolean;
  num_essai: number;
  statut: string;
  nouveaux_badges?: { code: string; nom: string; description: string; icone: string }[];
}

export interface ScoreHistorique {
  id: number;
  id_Quiz: number;
  quiz_titre: string;
  score: number;
  nb_bonnes: number;
  nb_total: number;
  reussi: number;
  num_essai: number;
  statut: string;
  date_tentative: string;
}

/* ----- Phase 3 : notifications, badges, rapports ----- */

export interface QuizNotification {
  id: number;
  id_Quiz: number;
  titre: string;
  message: string;
  lu: number;
  dateCreation: string;
  quiz_etat?: string;
}

export interface Badge {
  code: string;
  nom: string;
  description: string;
  icone: string;
}

export interface BadgeUtilisateur extends Badge {
  id: number;
  obtenu: number;
  dateObtention?: string | null;
}

export interface RapportQuiz {
  id: number;
  titre: string;
  fiche_titre?: string | null;
  nb_tentatives: number;
  nb_reussis: number;
  score_moyen: number | null;
  taux_reussite: number | null;
}

export interface RapportQuestion {
  id: number;
  libelle: string;
  nb_reponses: number;
  nb_echecs: number;
  taux_echec: number | null;
}
