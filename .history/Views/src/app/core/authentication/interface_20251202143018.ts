import { ValidationFn } from 'ngx-permissions';

export interface User {
  [prop: string]: any;

  id?: number;
  nom?: string;
  prenom?: string;
  name?: string;
  email?: string;
  telephone?: string;
  adresse?: string;
  ville?: string;
  genre?: string;
  fonction?: string;
  programme?: string;
  site?: string;
  roles?: string;
  dateCreation?: string;
  permissions?: string[];
}

export interface echantillon {
  id: number;
  titre: string;
  type: string;
  ETAT: string;
  Gestionnaire: string;
  exactitude: string;
}
export interface QuestionnaireItem {
  id: number;
  titre?: string;
  type?: string;
  ETAT?: string;
  Gestionnaire?: string;
  exactitude?: string;
  // Ajoutez d'autres propriétés de votre tableau ici
  question?: string;
  response?: boolean | null; // n
}
export interface Fiche {
  Niveau: string;
  id: number;
  titre?: string;
  source?: string;
  type?: string;
  delai?: string;
  priorite?: string;
  ETAT?: string;
  dateDebut?: Date;
  dateFin?: Date;
  date_Archive?: Date;
  archive_par?: string;
  Categorie?: string;
  Sous_Categorie?: string;
  on_time?: string;
  Gestionnaire?: string;
  response?: boolean | null;
}
export interface Token {
  [prop: string]: any;

  access_token: string;
  token_type?: string;
  nb_session?: number;
  expires_in?: number;
  exp?: number;
  refresh_token?: string;
}
export interface message {
  message: string;
}
export interface url {
  id: number;
  titre?: string;
  url: string;
  extention: string;
  Utilite?: boolean;
  Quiz: Quiz[];
  Commentaire?: boolean;
  Data?: any;
}
export interface Quiz {
  id: number;
  libelleQuestion: string;
  reponseQuestion: number;
  id_Fiche: string;
}
export interface reporting_retour {
  reporting_data: reporting[];
  score: number;
}
export interface reporting {
  id: number;
  id_CONTROLE: number;
  titre: string;
  ETAT: string;
  nom_utilisateur: string;
  exactitude: string;
  dateControle: string;
}
export interface Utilisateur {
  id: number;
  nom: string;
  prenom: string;
  nom_utilisateur: string;
  email: string;
  telephone: number;
  Fonction: string;
  Site: string;
  Programme: string;
  Grille: string;
  status: string;
  dateCreation: string;
}
export interface sla {
  id: number;
  source: string;
  type: string;
  delai: number;
  priorite: string;
  Etat: string;
  dateCreationSla: string;
  dateModification: string;
}
export interface site {
  id: number;
  nom?: string;
  Etat?: string;
  description?: string;
  dateCreation?: string;
  dateModification?: string;
}
export interface categorie {
  id: number;
  nom: string;
  Etat: string;
  dateCreationCategorie: Date;
  dateModification: Date;
}
export interface sous_categorie {
  id: number;
  nom: string;
  dateCreationSousCategorie: Date;
  nom_Categorie: string;
  dateModification: Date;
}
export interface programme {
  id: number;
  nom?: string;
  description?: string;
  Etat?: string;
  dateCreation?: string;
  dateModification?: string;
}
export interface maVoixCompte {
  Motif_du_Message: string;
  message: string;
  Date: string;
  Login: string;
  Site: string;
  nom: string;
  prenom: string;
}
export interface grille {
  id: number;
  nom: string;
}
export interface fonction {
  id: number;
  nom: string;
  Role_Associe?: string;
  Permissions_Associe?: string;
  Etat: string;
  dateCreation: string;
  dateModification: string;
}
export interface CategorieInterface {
  id: number;
  Categorie: string;
  Sous_Categorie: Sous_CategorieInterface[];
}
export interface Sous_CategorieInterface {
  id: number;
  id_Categorie: number;
  nom: string;
}

export interface motif_ma_voix_compte {
  id: number;
  nomMotif: string;
  dateCreation: Date;
}
export interface fiche_by_gestionnaire {
  id: number;
  titre: string;
  source: string;
  type: string;
  priorite: string;
  ETAT?: string;
  dateEnregistrement?: string;
  dateDebut?: string;
  dateFin?: string;
  archive_par?: string;
  Categorie: string;
  Sous_Categorie: string;
  Gestionnaire: string;
}
export interface agent_by_superviseur {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  adresse: string;
  Fonction: string;
  Site: string;
  Programme: string;
  status: string;
}
export interface detailsUtilisateur {
  id: number;
  nom: string;
  prenom: string;
  telephone: string;
  email: string;
  Fonction: string;
  Site: string;
  Programme: string;
  consultations: Consultation[];
  commentaires: Commentaire[];
}
export interface Consultation {
  id: number;
  nb_consultation?: number;
  titre?: string;
  url?: string;
  Gestionnaire?: string;
  dateConsultation?: string;
}
export interface Commentaire {
  id: number;
  titre?: string;
  message?: string;
  url?: string;
  Gestionnaire?: string;
  dateCommentaire?: string;
}
export interface fiche_by_id_Fiche {
  infos_fiche: infos_fiche;
  Consultations: consultation_by_fiche[];
  Commentaires: commentaire_by_fiche[];
}
export interface infos_fiche {
  id: number;
  titre: string;
  dateReception: string;
  dateDebut: string;
  dateVisibilite: string;
  dateFin: string;
  type: string;
  categorie: string;
  url: string;
  extention: string;
}
export interface consultation_by_fiche {
  id: number;
  nb_consultation: number;
  nom_utilisateur: string;
  date_consultation: string;
}
export interface commentaire_by_fiche {
  id: number;
  nom_utilisateur: string;
  message: string;
  dateCommentaire: string;
}
export interface Notification {
  id_FICHE: number;
  titre: string;
  message: string;
  type: string;
  nom: string;
  url: string;
}
export interface Responsable_Operation {
  id: number;
  nom_utilisateur: string;
  fonction: string;
  programme: string;
  site: string;
  status: string;
  superviseur?: string;
  dateCreation: string;
}
export interface Quiz_reponse {
  id: number;
  id_UTILISATEUR: number;
  id_FICHE: number;
  titre: string;
  date_Quiz: string;
  ETAT: string;
  STATUT?: string;
  nom_utilisateur: string;
}
export interface statistic {
  fiche_non_lu: Fiche[];
  Quiz_encours: Fiche[];
  sondage_encours: Fiche[];
}
export interface statistic_TC {
  nombre_fiche_lue?: number;
  nombre_quiz_effectue?: number;
  nombre_sondage_effectue?: number;
  nombre_quiz_Echecs?: number;
  nombre_quiz_en_retest?: number;
  nombre_total_quiz_en_retest?: number;
  nombre_total_quiz_Echecs?: number;
}
export interface fiche_id_categorie_and_id_sous_cateogorie {
  id: number;
  titre: string;
  type: string;
  Niveau: string;
}
export interface profile_assignation {
  id: number;
  nom: string;
}
export interface updateFiche {
  id: number;
  titre: string;
  id_Sla: number;
  id_Categorie: number;
  id_SousCategorie: number;
  dateReception: string;
  dateDebut: string;
  dateVisibilite: string;
  dateFin: string;
  niveau: string;
  url: string;
  AccesSite: number[];
  isChecked: boolean;
  Quiz: Quiz[];
  Site: string[];
}
