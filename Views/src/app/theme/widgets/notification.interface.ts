// Interface unifiée des notifications (tous modules : fiches, évaluations,
// calibrage, quiz…). Chaque notification porte une url de redirection vers
// l'objet concerné et une `source` qui indique la table d'origine.
export interface Notification {
  id: number;
  source: 'CORE' | 'QUIZ';
  titre: string;
  message?: string | null;
  type?: string | null;
  nature_objet?: string | null;
  id_objet?: number | null;
  id_FICHE?: number | null;
  url?: string | null;
  isRead: boolean;
  createdAt?: string | Date;
  /** Date de lecture (null si non lue). */
  readAt?: string | Date | null;
  /** FICHE | EVALUATION | CALIBRAGE | COACHING | BI | QUIZ | AUTRE */
  categorie?: string;
  // rétrocompat
  nom?: string;
}

/** Page « Mes notifications » : une page de l'historique. */
export interface PageNotifications {
  total: number;
  page: number;
  taille: number;
  items: Notification[];
}

/** Ménage : aperçu des notifications concernées, par catégorie. */
export interface ApercuMenage {
  total: number;
  par_categorie: { categorie: string; lues: number; non_lues: number; total: number }[];
}

/** Critères du ménage : au moins un des deux nombres de jours. */
export interface CriteresMenage {
  lues_jours?: number | null;
  non_lues_jours?: number | null;
  id_utilisateur?: number | null;
}
