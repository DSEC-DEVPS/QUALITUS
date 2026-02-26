import { Injectable } from '@angular/core';
import {
  message,
  Utilisateur,
  site,
  fonction,
  categorie,
  sous_categorie,
  sla,
  programme,
  grille,
  maVoixCompte,
  Fiche,
  CategorieInterface,
  motif_ma_voix_compte,
  url,
  fiche_by_gestionnaire,
  agent_by_superviseur,
  detailsUtilisateur,
  fiche_by_id_Fiche,
  Notification,
  Responsable_Operation,
  Quiz_reponse,
  statistic,
  fiche_id_categorie_and_id_sous_cateogorie,
  updateFiche,
  statistic_TC,
  echantillon,
  reporting_retour,
  reporting_resultat,
} from '@core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, catchError, map, Observable, tap, throwError } from 'rxjs';
import { environment } from '@env/environment';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PopupComponent } from '@shared/components/popup/popup.component';
@Injectable({
  providedIn: `root`,
})
export class UserService {
  private baseUrl = environment.baseUrl;
  constructor(
    private http: HttpClient,
    private snackBar: MatSnackBar
  ) {}
  private _fiches$ = new BehaviorSubject<Fiche[]>([]);
  get fiches$(): Observable<Fiche[]> {
    return this._fiches$.asObservable();
  }
  private lastFicheload = 0;
  getFicheFromServer() {
    if (Date.now() - this.lastFicheload <= 300000) {
      return;
    }
    this.http
      .get<Fiche[]>(`/api/v1/fiche/all`)
      .pipe(
        tap(fiches => {
          this.lastFicheload = Date.now();
          this._fiches$.next(fiches);
        }),
        map(fiche => {
          console.log(fiche);
        })
      )
      .subscribe({
        error: error => console.error('Erreur lors du chargement des fiches:', error),
      });
  }
  addUser(formValue: {
    nom: string;
    prenom: string;
    nom_utilisateur: string;
    genre: string;
    email: string;
    telephone: string;
    ville: string;
    adresse: string;
    id_Fonction: number;
    id_Site: number;
    id_Programme: number;
    id_Grille: number;
  }): Observable<message> {
    return this.http.post<message>(`/api/v1/sign_in`, formValue);
  }
  showScoreNotification(score: number, message: string): void {
    this.snackBar.openFromComponent(PopupComponent, {
      data: {
        score: score,
        message: message,
      },
      duration: 10000,
        horizontalPosition: 'center',
    verticalPosition: 'bottom', // IMPORTANT
    panelClass: ['center-snackbar'],
    });
  }
  getAllUtilisateur(): Observable<Utilisateur[]> {
    return this.http.get<Utilisateur[]>(`/api/v1/utilisateur/all`);
  }
  update_utilisateur(id: number, form: { ETAT: string }): Observable<message> {
    return this.http.put<message>(`/api/v1/update_utilisateur/${id}`, form);
  }
  getAllFonction(): Observable<fonction[]> {
    return this.http.get<fonction[]>(`/api/v1/fonction/all`);
  }
  getOneFonction(id: number): Observable<fonction> {
    return this.http.get<fonction>(`/api/v1/fonction_id/${id}`);
  }
  addFonction(formValue: { nom: string }): Observable<message> {
    return this.http.post<message>(`/api/v1/fonction/add`, formValue);
  }
  update_fonction(id: number, form: { nom: string }): Observable<message> {
    return this.http.put<message>(`/api/v1/fonction_update/${id}`, form);
  }
  delete_fonction(id: number): Observable<message> {
    return this.http.delete<message>(`/api/v1/fonction/${id}`);
  }
  addSite(formValue: { nom: string; description: string }): Observable<message> {
    return this.http.post<message>(`/api/v1/site/add`, formValue);
  }
  updateSite(id: number, form: { nom: string; description: string }): Observable<message> {
    return this.http.put<message>(`/api/v1/site/${id}`, form);
  }
  deleteSite(id: number): Observable<message> {
    return this.http.delete<message>(`/api/v1/delete_site/${id}`);
  }
  getAllSite(): Observable<site[]> {
    return this.http.get<site[]>(`/api/v1/site/all`);
  }
  getOneSite(id: number): Observable<site> {
    return this.http.get<site>(`/api/v1/site/${id}`);
  }
  getDetailsSiteById(id: number): Observable<any> {
    return this.http.get<any>(`/api/v1/details_site/${id}`);
  }
  getAllSousCategorie(): Observable<sous_categorie[]> {
    return this.http.get<sous_categorie[]>(`/api/v1/sous_categorie/all`);
  }
  getAllCategorieWithTheirSousCategorie(): Observable<CategorieInterface[]> {
    return this.http.get<CategorieInterface[]>(`/api/v1/categorie_and_sous_categorie/all`);
  }
  getAllSla(): Observable<sla[]> {
    return this.http.get<sla[]>(`/api/v1/sla/all`);
  }
  addSla(formValue: {
    source: string;
    type: string;
    delai: string;
    priorite: string;
  }): Observable<message> {
    return this.http.post<message>(`/api/v1/sla/add`, formValue);
  }
  getSlaById(id: number): Observable<sla> {
    return this.http.get<sla>(`/api/v1/sla/${id}`);
  }
  updateSla(
    id: number,
    form: { source: string; type: string; delai: string; priorite: string }
  ): Observable<message> {
    return this.http.put<message>(`/api/v1/sla/update/${id}`, form);
  }
  deleteSla(id: number): Observable<message> {
    return this.http.delete<message>(`/api/v1/sla/delete/${id}`);
  }
  /** les requêtes http pour le programme */
  getAllProgramme(): Observable<programme[]> {
    return this.http.get<programme[]>(`/api/v1/programme/all`);
  }
  addProgramme(formValue: { nom: string }): Observable<message> {
    return this.http.post<message>(`/api/v1/programme/add`, formValue);
  }
  getDetailsProgrammeById(id: number): Observable<any> {
    return this.http.get<any>(`/api/v1/details_programme/${id}`);
  }
  getOneProgramme(id: number): Observable<programme> {
    return this.http.get<programme>(`/api/v1/programme/${id}`);
  }
  updateProgramme(id: number, formValue: { nom: string }): Observable<message> {
    return this.http.put<message>(`/api/v1/programme/${id}`, formValue);
  }
  deleteProgramme(id: number): Observable<message> {
    return this.http.delete<message>(`/api/v1/programme/${id}`);
  }
  /** les requêtes http pour la Grille */
  addGrille(formValue: { nom: string }): Observable<message> {
    return this.http.post<message>(`/api/v1/grille/add`, formValue);
  }
  getAllGrille(): Observable<grille[]> {
    return this.http.get<grille[]>(`/api/v1/grille/all`);
  }
  updateGrille(id: number, formValue: { nom: string }): Observable<message> {
    return this.http.put<message>(`/api/v1/grille/${id}`, formValue);
  }
  deleteGrille(id: number): Observable<message> {
    return this.http.delete<message>(`/api/v1/grille/${id}`);
  }
  getOneGrile(id: number): Observable<grille> {
    return this.http.get<grille>(`/api/v1/grille_by_grille/${id}`);
  }
  getAllGrile(): Observable<grille[]> {
    return this.http.get<grille[]>(`/api/v1/grille/all`);
  }
  /** les requêtes pour la cotégorie */
  addCategorie(formValue: { nom: string }): Observable<message> {
    return this.http.post<message>(`/api/v1/categorie/add`, formValue);
  }
  getAllCategorie(): Observable<categorie[]> {
    return this.http.get<categorie[]>(`/api/v1/categorie/all`);
  }
  updateCategorie(id: number, formValue: { nom: string }): Observable<message> {
    return this.http.put<message>(`/api/v1/categorie/update/${id}`, formValue);
  }
  deleteCategorie(id: number): Observable<message> {
    return this.http.delete<message>(`/api/v1/categorie/delete/${id}`);
  }
  getOneCatgorie(id: number): Observable<categorie> {
    return this.http.get<categorie>(`/api/v1/categorie_by_id/${id}`);
  }
  /** les requêtes pour la Sous Catégorie */
  addSousCategorie(formValue: { nom: string; id_Categorie: number }): Observable<message> {
    return this.http.post<message>(`/api/v1/sous_categorie/add`, formValue);
  }
  /** les requêtes pour la Sous Mavoixcompte */
  addMaVoixCompte(formValue: {
    motif_ma_voix_compte: string;
    message: string;
  }): Observable<message> {
    return this.http.post<message>(`/api/v1/ma_voix_compte/add`, formValue);
  }
  getAllMaVoixCompte(): Observable<maVoixCompte[]> {
    return this.http.get<maVoixCompte[]>(`/api/v1/ma_voix_compte/all`);
  }
  addFiche(formData: FormData): Observable<message> {
    return this.http.post<message>(`/api/v1/fiche/add`, formData);
  }
    updateFiche(id:number,formData:FormData):Observable<message>{
      return this.http.put<message>(`/api/v1/fiche/update/${id}`,formData);
    }
  getAllFiche(): Observable<Fiche[]> {
    return this.http.get<Fiche[]>(`/api/v1/fiche/all`);
  }
  getAllFiche_Archive(): Observable<Fiche[]> {
    return this.http.get<Fiche[]>(`/api/v1/fiche_archive/all`);
  }
  getOneFiche(id: number): Observable<updateFiche> {
    return this.http.get<updateFiche>(`/api/v1/one_fiche/${id}`);
  }

  getAllFicheByGestionnaire(): Observable<Fiche[]> {
    return this.http.get<Fiche[]>(`/api/v1/fiche_by_gestionnaire/all`);
  }

  getAllFicheByIDFiche(id: number): Observable<url> {
    return this.http.get<url>(`/api/v1/fiche_by_id_Fiche/${id}`);
  }
  downloadFileByUrl(url: string) {
    return this.http.get(url, { responseType: 'blob' });
  }

  getAllExcelFicheByIDFiche(id: number): Observable<Blob> {
    return this.http
      .get(`/api/v1/excel_fiche_by_id_Fiche/${id}`, {
        responseType: 'blob', // Important: spécifie que la réponse est un blob binaire
        headers: new HttpHeaders({
          Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
      })
      .pipe(
        tap(blob => console.log('Blob reçu:', blob.size, 'octets, type:', blob.type)),
        catchError(error => {
          console.error('Erreur HTTP:', error);
          return throwError(
            () => new Error(`Erreur lors de la récupération du fichier Excel: ${error.message}`)
          );
        })
      );
  }
  getAllFicheByIdCategorieAndIdSousCategorie(form: {
    id_SousCategorie: number;
    id_Categorie: number;
  }): Observable<fiche_id_categorie_and_id_sous_cateogorie[]> {
    return this.http.post<fiche_id_categorie_and_id_sous_cateogorie[]>(
      `/api/v1/fiche_id_categorie_and_id_sous_cateogorie`,
      form
    );
  }
  getResultat_controle_actif(quantite_echantillon:number): Observable<Fiche[]> {
    return this.http.post<Fiche[]>(`/api/v1/resultat_controle_actif`,quantite_echantillon);
  }
  getResultat_controle_m_1(quantite_echantillon_M_1:number): Observable<Fiche[]> {
    return this.http.post<Fiche[]>(`/api/v1/resultat_controle_m_1`,quantite_echantillon_M_1);
  }
  getReporting(): Observable<reporting_resultat[]> {
    return this.http.get<reporting_resultat[]>(`/api/v1/get_reporting`);
  }
  /*
   getReporting(data: {
    typeControle: string;
    dateDebut: Date;
    dateFin: string;
  }): Observable<reporting_retour> {
    return this.http.post<reporting_retour>(`/api/v1/get_reporting`, data);
  }*/
  deleteFiche(id: number): Observable<message> {
    return this.http.delete<message>(`/api/v1/fiche/${id}`);
  }
  getAllMotifMaVoix(): Observable<motif_ma_voix_compte[]> {
    return this.http.get<motif_ma_voix_compte[]>(`/api/v1/motif_ma_voix_compte/all`);
  }
  getOneMotifMaVoixCompte(id: number): Observable<motif_ma_voix_compte> {
    return this.http.get<motif_ma_voix_compte>(`/api/v1/motif_ma_voix_compte/${id}`);
  }
  addMotifMaVoixCompte(data: { nomMotif: string }): Observable<message> {
    return this.http.post<message>(`/api/v1/motif_ma_voix_compte/add`, data);
  }
  deleteMotifMaVoixCompte(id: number): Observable<message> {
    return this.http.delete<message>(`/api/v1/motif_ma_voix_compte/${id}`);
  }
  updateMotifMaVoixCompte(id: number, data: { nomMotif: string }): Observable<message> {
    return this.http.put<message>(`/api/v1/motif_ma_voix_compte/${id}`, data);
  }
  add_ma_voix_compte(form_data: {
    motif_ma_voix_compte: string;
    message: string;
  }): Observable<message> {
    return this.http.post<message>(`/api/v1/ma_voix_compte/add`, form_data);
  }
  getAllAgentBySuperviseur(id: number): Observable<agent_by_superviseur[]> {
    return this.http.get<agent_by_superviseur[]>(`/api/v1/agent_by_superviseur/${id}`);
  }
  affecte_agent_to_superviseur(form_data: {
    id_SUPERVISEUR: number;
    id_AGENT: number;
  }): Observable<message> {
    return this.http.post<message>(
      `/api/v1/agent_by_superviseur/add`,

      form_data
    );
  }
  addCommentaire(formdata: { message: string; id_Fiche: number }): Observable<message> {
    return this.http.post<message>(`/api/v1/commentaire/add`, formdata);
  }
  getDetailsUtilisateur(id: number): Observable<detailsUtilisateur> {
    return this.http.get<detailsUtilisateur>(`/api/v1/utilisateur/details/${id}`);
  }
  deleteUtilisateur(id: number): Observable<message> {
    return this.http.delete<message>(`/api/v1/utilisateur/delete/${id}`);
  }
  getAllArchiveByGestionnaire(id: number): Observable<fiche_by_gestionnaire[]> {
    return this.http.get<fiche_by_gestionnaire[]>(`/api/v1/archive_by_gestionnaire/all/${id}`);
  }
  getAllArchive(): Observable<fiche_by_gestionnaire[]> {
    return this.http.get<fiche_by_gestionnaire[]>(`/api/v1/archive_by_gestionnaire/all`);
  }

  restore_archive(id: number): Observable<message> {
    return this.http.put<message>(`/api/v1/restore_archive/${id}`, {});
  }
  getDetailsFicheByIdFiche(id: number): Observable<fiche_by_id_Fiche> {
    return this.http.get<fiche_by_id_Fiche>(`/api/v1/historique_by_fiche/all/${id}`);
  }
  archive_fiche(id: number): Observable<message> {
    return this.http.put<message>(`/api/v1/archive_fiche/${id}`, {});
  }
  getAllNotification(): Observable<Notification[]> {
    return this.http.get<Notification[]>(`/api/v1/notification/all`);
  }
  getAllAgentByRo(): Observable<Responsable_Operation[]> {
    return this.http.get<Responsable_Operation[]>(`/api/v1/agents_by_RO/all`);
  }
  getAllAgentByRo_Assignable(): Observable<any[]> {
    return this.http.get<any[]>(`/api/v1/agents_by_RO_assignable/all`);
  }
  assigne_agent(form_data: {
    id_SUPERVISEUR: number;
    liste_agents: string[];
  }): Observable<message> {
    return this.http.put<message>(`/api/v1/assigne_agent`, form_data);
  }
  getAllSuperviseurByRo(): Observable<any[]> {
    return this.http.get<any[]>(`/api/v1/superviseur_by_ro`);
  }
  restore_password(id: number): Observable<message> {
    return this.http.put<message>(`/api/v1/renitialize/${id}`, {});
  }
  response_Quiz(id: number, form: { resultat_Quiz: number }): Observable<message> {
    return this.http.post<message>(`/api/v1/response_quiz/${id}`, form);
  }
  reponse_utilite(id: number, utilite: { resultat_utilite: number }): Observable<message> {
    return this.http.post<message>(`/api/v1/reponse_utilite/${id}`, utilite);
  }
  getAllDashboard(): Observable<any[]> {
    return this.http.get<any[]>(`/api/v1/export_dashboard/all`);
  }
  getAllDashboard_admin(): Observable<any[]> {
    return this.http.get<any[]>(`/api/v1/export_dashboard_amin/all`);
  }
  reponse_exactitude(id: number, exactitude: { resultat_exactitude: number }): Observable<message> {
    return this.http.post<message>(`/api/v1/reponse_exactitude/${id}`, exactitude);
  }
  Quiz_en_echecs(): Observable<Quiz_reponse[]> {
    return this.http.get<Quiz_reponse[]>(`/api/v1/quiz_en_echecs`);
  }
  Quiz_encours_retest(): Observable<Quiz_reponse[]> {
    return this.http.get<Quiz_reponse[]>(`/api/v1/quiz_encours_retest`);
  }
  Quiz_Retest(form: { id_UTILISATEUR: number; id_FICHE: number }): Observable<message> {
    return this.http.put<message>(`/api/v1/quiz_retest`, form);
  }

  statistic(): Observable<statistic> {
    return this.http.get<statistic>(`/api/v1/fiche_non_lu_sondage_encours`);
  }
  statistic_TC(date: string): Observable<statistic_TC> {
    return this.http.post<statistic_TC>(`/api/v1/fiche_lu_Quiz_sondage`, {
      date,
    });
  }
  statistic_TC_FOR_SUP(data: { userId: number; date: string }): Observable<statistic_TC> {
    return this.http.post<statistic_TC>(`/api/v1/fiche_lu_Quiz_sondage_for_sup`, {
      data,
    });
  }
  export_ma_voix_compte(form: {
    dataType: string;
    dateDebut: string;
    dateFin: string;
    format: string;
  }): Observable<maVoixCompte[]> {
    return this.http.post<maVoixCompte[]>(`/api/v1/ma_voix_compte/all`, form);
  }
  change_password(form: {
    ancien_mot_de_passe: string;
    nouveau_mot_de_passe: string;
    confirme_mot_de_passe: string;
  }): Observable<message> {
    return this.http.put<message>(`/api/v1/change_password`, form);
  }
  addControle(
    Data: { id: any; response: any }[],
    typeControle: string,
    score: number
  ): Observable<message> {
    return this.http.post<message>(`/api/v1/add_controle`, {
      Data,
      typeControle,
      score,
    });
  }
}
