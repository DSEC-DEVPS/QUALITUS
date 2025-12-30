// Interface pour les notifications
export interface Notification {
  id: number;
  id_FICHE: number;
  nom: string;
  titre: string;
  isRead: boolean;
  createdAt?: Date;
  userId?: number;
}