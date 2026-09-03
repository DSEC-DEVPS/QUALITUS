import { SupplementaireResultatItem } from './SupplementaireResultatItem';

export interface SupplementaireResultat {
  id: number;
  titre: string;
  resultats: SupplementaireResultatItem[];
}
