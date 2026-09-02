// Interfaces du module Calibrage (modele de grille d'evaluation hierarchique)

export interface CategorieRessource {
  id: number;
  nom: string;
  est_robot: number;
  Etat?: string;
}

export interface SousItem {
  id: number;
  id_Item: number;
  nom: string;
  referentiel?: string;
  poids: number;
  ordre: number;
}

export interface Item {
  id: number;
  id_Erreur: number;
  nom: string;
  poids: number;
  ordre: number;
  sousItems?: SousItem[];
}

export interface Erreur {
  id: number;
  id_CategorieErreur: number;
  nom: string;
  poids: number;
  ordre: number;
  items?: Item[];
}

export interface CategorieErreur {
  id: number;
  id_ModeleGrille?: number;
  nom: string;
  poids: number;
  ordre: number;
  erreurs?: Erreur[];
}

export interface ModeleGrille {
  id: number;
  nom: string;
  description?: string;
  Etat?: string;
  dateCreation?: string;
  dateModification?: string;
  categories?: CategorieErreur[];
  categoriesRessources?: CategorieRessource[];
}

// Niveau d'un noeud dans l'arbre (utilise par le dialog generique d'edition)
export type NiveauCalibrage = 'categorie' | 'erreur' | 'item' | 'sousItem';

// Phase 2 : critere de reussite / echec (feuille REGLES)
export interface CritereRegle {
  id: number;
  id_ModeleGrille?: number;
  type_ecart: string;
  operateur: string;
  valeur_objectif: number | null;
  libelle_echec?: string;
  libelle_reussite?: string;
  ordre?: number;
}

// Phase 2 : noeud de l'arbre "5 Pourquoi" (listes interdependantes)
export interface PourquoiNode {
  id: number;
  id_ModeleGrille: number;
  niveau: number;
  libelle: string;
  id_parent: number | null;
  ordre: number;
  enfants?: PourquoiNode[];
}

// Resume renvoye apres un import Excel
export interface ImportResume {
  categories: number;
  erreurs: number;
  items: number;
  sousItems: number;
  regles: number;
}
