export interface SupplementaireResultatItem {
  id: number;
  id_Categories_Erreurs: number;
  id_Sous_Categories_Erreurs: number;
  items: string;
  sous_items: string;
  referentiels: string;
  poids_items: string;
  score_en_pourcent: string;
  score_sur_vingt: string;
  commentaire: string;
  etat: number;
  id_Supplementaires: number;
}
