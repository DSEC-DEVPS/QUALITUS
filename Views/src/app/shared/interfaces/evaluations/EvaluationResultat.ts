import { EvaluationResultatItem } from './EvaluationResultatItem';

export interface EvaluationResultat {
  id: number;
  titre: string;
  resultats: EvaluationResultatItem[];
}
