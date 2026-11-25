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
  /** Barème de la question (1..100, 5 par défaut). */
  points?: number;
  ordre: number;
  options?: OptionQ[];
}

export interface Quiz {
  id: number;
  titre: string;
  /** Côté propriétaire : tentatives / participants (tous sites) et disponibilité,
   *  pour prévenir avant de modifier les questions d'un quiz déjà passé. */
  nb_tentatives_total?: number;
  nb_participants_total?: number;
  disponible?: number;
  code_pin?: string;
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
  /** Fiches liées (listes) : id, titre, état. */
  fiches_liees?: FicheLiee[];
  sites?: number[]; // ids des sites cibles (n..n)
  sites_detail?: { id_Site: number; nom: string }[];
  sites_titres?: string | null; // noms de sites concatenes (liste)
  // Visibilité par site (cahier Quiz, Partie III)
  origine?: 'SITE' | 'INVITE'; // quiz du site propriétaire vs site invité
  autorise?: number;            // 1 si l'utilisateur peut ouvrir le détail
  note_passage: number; // "Seuil de reussite"
  /** Retests possibles (0 | 1, non par défaut) : page « Retests à autoriser ». */
  retest_auto: number;
  /** Nombre maximum de retests par agent (1 à 10). */
  nb_retest_max: number;
  /** État : OUVERT | CLOTURER (participations ouvertes / closes) */
  Etat?: string;
  /** Statut : ACTIF | INACTIF (quiz en service / mis de côté) */
  statut?: string;
  /** 1 = admin / créateur / site propriétaire (questions, statut, tous paramètres) */
  cote_proprietaire?: number;
  /** Site de l'utilisateur connecté (Diffusion d'un utilisateur autorisé) */
  mon_site_id?: number | null;
  /** Site du créateur du quiz (out115). */
  createur_site_id?: number | null;
  createur_site?: string | null;
  /** Sites où l'utilisateur peut diffuser (null : tous) — out114. */
  sites_diffusion?: number[] | null;
  dateCreation?: string;
  dateModification?: string;
  nb_questions?: number;
  /** Total des points des questions (barème conforme = 100). */
  total_points?: number;
  nb_participants?: number;
  questions?: Question[];
}

export interface QuizIp {
  id: number;
  id_Quiz: number;
  adresse_ip: string;
  /** Site dont les participants sont autorisés sur cette IP. */
  id_Site?: number | null;
  site?: string | null;
  libelle?: string | null;
  agents?: string | null; // nom(s) de l'agent lie(s) a cette IP (via demande), du même site
  dateCreation?: string;
}

export interface QuizIpDemande {
  id: number;
  id_Quiz: number;
  id_UTILISATEUR: number;
  adresse_ip: string;
  statut: string;
  dateCreation?: string;
  nom: string;
  prenom: string;
  login: string;
  site?: string | null;
}

export interface FicheRecente {
  id: number;
  titre: string;
  dateModification?: string;
  dateEnregistrement?: string;
  /** ACTIF / ARCHIVE (une fiche déjà liée peut avoir été archivée depuis). */
  ETAT?: string;
  Categorie?: string | null;
  Sous_Categorie?: string | null;
  /** Date de début (ou d'enregistrement), AAAA-MM-JJ. */
  date?: string | null;
}

/** Fiche liée à un quiz (listes, rapports). */
export interface FicheLiee {
  id: number;
  titre: string;
  ETAT?: string;
}

export interface SiteOption {
  id: number;
  nom: string;
}

// Quiz PUBLIC visible sans code PIN (selon le site de l'utilisateur)
/** Quiz dont on peut reprendre les questions (mon site, actif). */
export interface QuizSource {
  id: number;
  titre: string;
  Etat?: string;
  dateCreation?: string;
  nb_questions: number;
}

/** Question d'un quiz source ; deja_presente = libellé déjà dans le quiz cible. */
export interface QuestionSource {
  id: number;
  type: string;
  libelle: string;
  points: number;
  options: { libelle: string; est_correcte: number }[];
  deja_presente: number;
}

export interface QuizPublic {
  id: number;
  titre: string;
  note_passage: number;
  duree?: number | null;
  sites_titres?: string | null;
  nb_questions: number;
  nb_essais: number;
  dateCreation?: string;
  // Temps deja ecoule (serveur) si une tentative est en cours ; null sinon
  temps_ecoule_secondes?: number | null;
  /** Quiz en cours : PUBLIC ou PRIVATE (reprise sans PIN). */
  acces?: string;
  /** Quiz fermé par sa date, passage commencé avant : à soumettre avant cette heure. */
  fin_grace?: string | null;
}

/** Écran Participer : quiz disponible (public ou privé déverrouillé) ou terminé. */
export interface QuizParticiper {
  id: number;
  titre: string;
  acces: 'PUBLIC' | 'PRIVATE' | string;
  note_passage: number;
  duree?: number | null;
  dateCreation?: string;
  nb_questions: number;
  nb_essais: number;
  retest_autorise: number;
  derniere_reussi?: number | null;
  dernier_score?: number | string | null;
  date_dernier_passage?: string | null;
  /** NON_PASSE : désigné, quiz arrivé à échéance (ou clôturé) sans aucun passage. */
  etat: 'A_COMMENCER' | 'RETEST' | 'TERMINE' | 'NON_PASSE';
  /** Terminé : quiz encore ouvert pour l'utilisateur (résultat et fiches consultables). */
  peut_voir?: boolean;
  /** Non passé : date de fermeture atteinte (null : clôturé manuellement). */
  date_fermeture?: string | null;
}

export interface MesQuiz {
  disponibles: QuizParticiper[];
  termines: QuizParticiper[];
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
  duree?: number | null; // duree en minutes (pour le chrono)
  temps_ecoule_secondes?: number; // temps deja ecoule depuis le debut (serveur)
  note_passage: number;
  retest_auto: number;
  nb_retest_max: number;
  questions: QuestionAPasser[];
  deja_tente?: boolean;
  peut_participer?: boolean;
  /** Statut du dernier essai (TEMPS_ECOULE : durée épuisée sans soumission). */
  derniere_tentative_statut?: string | null;
  /** Fiches liées actives accessibles à l'utilisateur (« Contenu à revoir »). */
  contenus?: FicheLiee[];
  /** Écran d'accueil : nombre de questions, d'essais, passage déjà commencé. */
  nb_questions?: number;
  nb_essais?: number;
  total_points?: number;
  acces?: string;
  session_en_cours?: boolean;
  /** Quiz fermé par sa date, passage commencé avant : à soumettre avant cette heure. */
  fin_grace?: string | null;
  /** Dernier passage du participant (résultat seulement) : écran « Voir » d'un quiz terminé. */
  dernier_passage?: {
    reussi: number;
    score: number | null;
    nb_points: number | null;
    nb_points_total: number | null;
    num_essai: number;
    statut: string | null;
    date: string | null;
  } | null;
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
  /** Nombre maximum de retests du quiz (num_essai - 1 = retests déjà passés). */
  nb_retest_max: number;
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
  nb_points?: number;
  nb_points_total?: number;
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
  nb_points?: number | null;
  nb_points_total?: number | null;
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
  quiz_titre?: string;
  /** PUBLIC | PRIVATE */
  quiz_acces?: string;
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
  /** DECOUVERTE | PROGRESSION | QUALITE | MENSUEL */
  categorie?: string;
  condition_type?: string;
  condition_valeur?: number;
  /** Nombre de fois obtenu (badges mensuels) ; 1 pour un badge cumulatif obtenu. */
  nb_obtentions?: number;
  /** Mois d'obtention 'AAAA-MM' (badges mensuels). */
  periodes?: string[];
  /** Part des participants aux quiz qui détiennent ce badge (%). */
  rarete?: number;
  detenteurs?: number;
}

export interface RapportQuiz {
  id: number;
  titre: string;
  fiche_titre?: string | null;
  nb_tentatives: number;
  nb_reussis: number;
  score_moyen: number | null;
  taux_reussite: number | null;
  Etat?: string;
  statut?: string;
  /** 1 : utilisateur invité, statistiques limitées aux agents de son site. */
  limite_site?: number;
  /** Fiches liées au quiz (toutes, pas seulement la première). */
  fiches_liees?: FicheLiee[];
  /** Participation (état actuel, hors période) : désignés, ayant passé au moins une fois. */
  nb_designes?: number;
  nb_passes?: number;
  nb_non_passes?: number;
  taux_participation?: number | null;
}

export interface RapportQuestion {
  id: number;
  libelle: string;
  nb_reponses: number;
  nb_echecs: number;
  taux_echec: number | null;
}

// Rapport "Questions ratée" : distribution des reponses par question echouee
export interface OptionRatee {
  id: number;
  libelle: string;
  est_correcte: number;
  nb_choix: number;
}
export interface QuestionRatee {
  id: number;
  libelle: string;
  nb_agents: number;
  options: OptionRatee[];
}

// Rapport "Tous participants" (une ligne par tentative)
export interface RapportParticipant {
  id: number; // id de la tentative
  id_UTILISATEUR: number;
  prenom: string;
  nom: string;
  id_Site: number | null;
  site: string | null;
  date_debut?: string | null;
  date_fin?: string | null;
  date_tentative?: string;
  score: number;
  reussi: number;
  num_essai: number;
  statut: string;
  temps_secondes: number | null;
  nb_points?: number | null;
  nb_points_total?: number | null;
  /** Nombre d'essais de l'agent sur ce quiz. */
  nb_essais?: number;
  /** Demande de réinitialisation en attente (id), sinon null. */
  reinit_id?: number | null;
  /** 1 : 1 seul essai, pas de retest ni de demande en cours, quiz disponible. */
  reinitialisable?: number;
}

/** Demande de réinitialisation en attente de MA confirmation (agent). */
export interface ReinitialisationDemande {
  id: number;
  id_Quiz: number;
  quiz_titre: string;
  score_initial: number | null;
  dateDemande: string;
  demandeur: string | null;
}

export interface TentativeDetail {
  id: number;
  id_Quiz: number;
  id_UTILISATEUR: number;
  prenom: string;
  nom: string;
  site: string | null;
  quiz_titre: string;
  score: number;
  reussi: number;
  num_essai: number;
  statut: string;
  date_debut?: string | null;
  date_fin?: string | null;
  temps_secondes: number | null;
  nb_points?: number | null;
  nb_points_total?: number | null;
  reponses: { id_Question: number; libelle: string; points?: number; est_correcte: number }[];
}
