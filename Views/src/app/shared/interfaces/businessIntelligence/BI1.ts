import { BI2Interface } from './BI2';

export interface BI1Interface {
  id: number;
  id_Business_Intelligence: number;
  options: number;
  bi2: BI2Interface[];
}
