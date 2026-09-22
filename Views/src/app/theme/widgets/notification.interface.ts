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
  // rétrocompat
  nom?: string;
}
