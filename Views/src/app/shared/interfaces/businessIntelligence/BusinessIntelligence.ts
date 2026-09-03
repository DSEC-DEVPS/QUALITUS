import { BI1Interface } from './BI1';

export interface BusinessIntelligenceInterface {
  id: number;
  nom: string;
  nom_Site: string;
  id_Site: number;
  id_Grille: number;
  bi1: BI1Interface[];
}
