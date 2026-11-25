import {
  Component,
  OnDestroy,
  OnInit,
  ViewChild,
  ViewEncapsulation,
  inject,
} from '@angular/core';

import { DatePipe, TitleCasePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';

import { Subject, Subscription, catchError, of, switchMap, tap } from 'rxjs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { MatTabsModule } from '@angular/material/tabs';
import {
  MatPaginator,
  MatPaginatorModule,
} from '@angular/material/paginator';

import {
  MatTableDataSource,
  MatTableModule,
} from '@angular/material/table';

import { MatSort } from '@angular/material/sort';

import { MatTooltipModule } from '@angular/material/tooltip';

import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

import { MatFormFieldModule } from '@angular/material/form-field';

import { MatDatepickerModule } from '@angular/material/datepicker';

import {
  DateAdapter,
  MAT_DATE_FORMATS,
  MatNativeDateModule,
  NativeDateAdapter,
} from '@angular/material/core';
import { Injectable } from '@angular/core';

/** Calendrier natif en français : saisie au clavier jj/mm/aaaa (sinon lue comme mm/jj). */
@Injectable()
export class DateAdapterFr extends NativeDateAdapter {
  override parse(value: unknown, parseFormat?: unknown): Date | null {
    if (typeof value === 'string') {
      const m = value.trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
      if (m) {
        const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
        return d.getMonth() === Number(m[2]) - 1 ? d : this.invalid();
      }
    }
    return super.parse(value, parseFormat);
  }
}


import { MatInputModule } from '@angular/material/input';

import * as XLSX from 'xlsx';

import {
  Commentaire,
  Consultation,
  detailsUtilisateur,
  statistic_TC,
} from '@core';

import { UserService } from '@shared/services/user.service';
import { toYMD } from '@shared/date-utils';
import { QuizService } from '@shared/services/quiz.service';
import { BadgesQuizComponent } from '../../Quiz/badges-quiz/badges-quiz.component';
import { BadgeUtilisateur } from '../../Quiz/interfaces';
export const MY_DATE_FORMATS = {
  parse: {
    dateInput: 'DD/MM/YYYY',
  },
  display: {
    dateInput: 'DD/MM/YYYY',
    monthYearLabel: 'MMMM YYYY',
    dateA11yLabel: 'DD/MM/YYYY',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};


@Component({
  selector: 'app-single-agent',
  standalone: true,
  encapsulation: ViewEncapsulation.None,

  providers: [
     DatePipe,
  {
    provide: MAT_DATE_FORMATS,
    useValue: MY_DATE_FORMATS,
  },
  { provide: DateAdapter, useClass: DateAdapterFr },
  ],

  imports: [
    BadgesQuizComponent,
    MatProgressSpinnerModule,
    MatTableModule,
    MatPaginatorModule,
    MatTabsModule,
    DatePipe,
    MatTooltipModule,
    TitleCasePipe,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    ReactiveFormsModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatInputModule,
  ],

  templateUrl: './single-agent.component.html',

  styleUrl: './single-agent.component.scss',
})
export class SingleAgentComponent
  implements OnInit, OnDestroy {

  // =========================================================
  // SERVICES
  // =========================================================

  private readonly route = inject(ActivatedRoute);
  private readonly quizSrv = inject(QuizService);
  /** Badges quiz de l'agent (null = en cours de chargement). */
  badgesQuiz: BadgeUtilisateur[] | null = null;

  private readonly userService = inject(UserService);

  private readonly router = inject(Router);

  private readonly datePipe = inject(DatePipe);

  private readonly dateAdapter = inject(DateAdapter);

  /** Écran d'origine (Mes agents par défaut, ou Gérer les comptes). */
  readonly retourUrl: string = (() => {
    const r = this.router.getCurrentNavigation()?.extras.state?.['retour'] ?? history.state?.retour;
    return typeof r === 'string' && r.startsWith('/mon-espace/') ? r : '/mon-espace/mes-agents/Liste';
  })();


  // =========================================================
  // FORMULAIRES
  // =========================================================

  dateForm!: FormGroup;

  dateFormConsulation!: FormGroup;


  // =========================================================
  // SUBSCRIPTIONS
  // =========================================================

  private subscription =
    new Subscription();

  /** Cartes statistiques : chargement en cours (spinner dans chaque carte). */
  chargementStats = false;
  /** Demandes de statistiques (date au format AAAA-MM-JJ) : seule la dernière compte. */
  private readonly demandeStats$ = new Subject<{ id: number; date: string }>();

  private subscriptionConsultation =
    new Subscription();


  // =========================================================
  // DONNÉES
  // =========================================================

  /** Utilisateur affiché (pour recharger les consultations à chaque période). */
  private agentId!: number;

  details_utilisateur?: detailsUtilisateur;

  statistic_TC!: statistic_TC;


  // =========================================================
  // TABLEAUX
  // =========================================================

  dataSource!: MatTableDataSource<Consultation>;

  dataSource_messages!: MatTableDataSource<Commentaire>;


  // =========================================================
  // COLONNES CONSULTATIONS
  // =========================================================

  displayedColumns: string[] = [
    'nb_consultation',
    'titre',
    'Gestionnaire',
    'dateConsultation',
  ];


  // =========================================================
  // COLONNES COMMENTAIRES
  // =========================================================

  displayedColumns_messages: string[] = [
    'titre',
    'message',
    'dateCommentaire',
  ];


  // =========================================================
  // STATISTIQUES
  // =========================================================

  nb_fiche_non_lu = 0;

  nb_sondage_encours = 0;

  nb_quiz_en_retest = 0;

  nb_quiz_echecs = 0;

  nb_quiz_total_en_retest = 0;

  nb_quiz_total_echecs = 0;

  bn_notification_non_lues = 0;


  // =========================================================
  // AUTRES
  // =========================================================

  imageUrl = 'img/person.png';

  todayDate!: string | null;

  filename!: string;


  // =========================================================
  // PAGINATORS / SORT
  // =========================================================

  @ViewChild('consultPaginator')
  consultPaginator!: MatPaginator;

  @ViewChild('messagePaginator')
  messagePaginator!: MatPaginator;

  @ViewChild(MatSort)
  sort!: MatSort;


  // =========================================================
  // INIT
  // =========================================================

  ngOnInit(): void {

    // Calendrier natif : dates affichées jj/mm/aaaa quelle que soit la langue du navigateur.
    this.dateAdapter.setLocale('fr-FR');

    const id =
      this.route.snapshot.params['id'];

    // Badges quiz de l'agent (mêmes accès que ses statistiques)
    this.quizSrv.getBadgesAgent(Number(id)).subscribe({
      next: b => (this.badgesQuiz = b),
      error: () => (this.badgesQuiz = []),
    });


    // =======================================================
    // DATE DU JOUR
    // =======================================================

    this.todayDate =
      this.datePipe.transform(
        new Date(),
        'yyyy-MM-dd'
      );


    // =======================================================
    // INITIALISATION DES FORMULAIRES
    // =======================================================

    this.initializeForms();


    // =======================================================
    // ÉCOUTE DU FILTRE DES CONSULTATIONS
    // =======================================================

    this.initializeConsultationFilter();


    // =======================================================
    // CHARGEMENT DES DONNÉES UTILISATEUR
    // =======================================================

    this.loadUserDetails(id);


    // =======================================================
    // CHARGEMENT DES STATISTIQUES
    // =======================================================

    this.loadStatistics(id);


    // =======================================================
    // ÉCOUTE DE LA DATE DES STATISTIQUES
    // =======================================================

    this.initializeStatisticsDate(id);
  }


  // =========================================================
  // INITIALISATION DES FORMULAIRES
  // =========================================================

  private initializeForms(): void {

    // -------------------------------------------------------
    // FORMULAIRE STATISTIQUES
    // -------------------------------------------------------

    this.dateForm =
      new FormGroup({

        selectedDate:
          new FormControl(new Date()),

      });


    // -------------------------------------------------------
    // DATE ACTUELLE
    // -------------------------------------------------------

    const today =
      new Date();


    // -------------------------------------------------------
    // PREMIER JOUR DU MOIS
    // -------------------------------------------------------

    const dateDebut =
      new Date(
        today.getFullYear(),
        today.getMonth(),
        1,
        0,
        0,
        0,
        0
      );


    // -------------------------------------------------------
    // DERNIER JOUR DU MOIS
    // -------------------------------------------------------

    const dateFin =
      new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        0,
        23,
        59,
        59,
        999
      );


    // -------------------------------------------------------
    // FORMULAIRE CONSULTATIONS
    // -------------------------------------------------------

    this.dateFormConsulation =
      new FormGroup({

        selectedDateDebut:
          new FormControl(dateDebut),

        selectedDateFin:
          new FormControl(dateFin),

      });
  }


  // =========================================================
  // FILTRE CONSULTATIONS
  // =========================================================

  private initializeConsultationFilter(): void {

    this.subscriptionConsultation.add(

      this.dateFormConsulation.valueChanges
        .subscribe(values => {

          const dateDebut =
            values.selectedDateDebut;

          const dateFin =
            values.selectedDateFin;


          // --------------------------------------------------
          // Si une date manque
          // --------------------------------------------------

          if (!dateDebut || !dateFin) {
            return;
          }


          // --------------------------------------------------
          // Rechargement : comptes et dernière consultation
          // calculés par le serveur SUR la période
          // --------------------------------------------------

          this.loadConsultations();

        })
    );
  }


  // =========================================================
  // CHARGEMENT UTILISATEUR
  // =========================================================

  private loadUserDetails(
    id: number
  ): void {

    this.agentId = id;
    const periode = this.periodeYMD();

    this.userService
      .getDetailsUtilisateur(id, periode?.du, periode?.au)
      .subscribe({

        next: result => {

          // ------------------------------------------------
          // TABLE CONSULTATIONS (déjà calculées sur la période)
          // ------------------------------------------------

          this.dataSource =
            new MatTableDataSource<Consultation>(
              periode ? result.consultations || [] : []
            );


          // ------------------------------------------------
          // TABLE COMMENTAIRES
          // ------------------------------------------------

          this.dataSource_messages =
            new MatTableDataSource<Commentaire>(
              result.commentaires || []
            );


          // ------------------------------------------------
          // INFORMATIONS UTILISATEUR
          // ------------------------------------------------

          this.details_utilisateur =
            result;


          this.filename =
            `Details_agent_${result.nom}.xlsx`;


          // ------------------------------------------------
          // PAGINATION
          // ------------------------------------------------

          this.dataSource.paginator =
            this.consultPaginator;


          this.dataSource_messages.paginator =
            this.messagePaginator;


          // ------------------------------------------------
          // TRI
          // ------------------------------------------------

          this.dataSource.sort =
            this.sort;


        },


        error: error => {

          console.error(
            'Erreur lors du chargement des détails utilisateur :',
            error
          );

        },

      });
  }


  // =========================================================
  // PÉRIODE DES CONSULTATIONS (AAAA-MM-JJ) ; null si incomplète ou inversée
  // =========================================================

  private periodeYMD(): { du: string; au: string } | null {
    const du = toYMD(this.dateFormConsulation.get('selectedDateDebut')?.value);
    const au = toYMD(this.dateFormConsulation.get('selectedDateFin')?.value);
    if (!du || !au || du > au) {
      return null;
    }
    return { du, au };
  }


  // =========================================================
  // RECHARGER LES CONSULTATIONS DE LA PÉRIODE
  // (nombre et dernière consultation calculés sur la période)
  // =========================================================

  private loadConsultations(): void {
    if (!this.dataSource || !this.agentId) {
      return;
    }
    const periode = this.periodeYMD();
    if (!periode) {
      this.dataSource.data = [];
      return;
    }
    this.userService
      .getDetailsUtilisateur(this.agentId, periode.du, periode.au)
      .subscribe({
        next: result => {
          this.dataSource.data = result.consultations || [];
          this.dataSource.paginator?.firstPage();
        },
        error: error => {
          console.error('Erreur lors du chargement des consultations :', error);
        },
      });
  }


  // =========================================================
  // STATISTIQUES : ÉCOUTE DATE
  // =========================================================

  private initializeStatisticsDate(
    id: number
  ): void {

    this.subscription.add(

      this.dateForm
        .get('selectedDate')
        ?.valueChanges
        .subscribe(date => {

          if (!date) {
            return;
          }


          this.sendDateRequest(
            id,
            date
          );

        })
    );
  }


  // =========================================================
  // CHARGEMENT STATISTIQUES
  // =========================================================

  private loadStatistics(
    id: number
  ): void {

    // Une seule requête active : un changement de date annule la précédente,
    // une ancienne réponse ne peut donc pas écraser la nouvelle.
    this.subscription.add(
      this.demandeStats$
        .pipe(
          tap(() => (this.chargementStats = true)),
          switchMap(d =>
            this.userService
              .statistic_TC_FOR_SUP({ userId: d.id, date: d.date })
              .pipe(
                catchError(error => {
                  console.error('Erreur statistiques :', error);
                  return of(null);
                })
              )
          )
        )
        .subscribe(resultat => {
          this.chargementStats = false;
          if (resultat) {
            this.updateStatistics(resultat);
          }
        })
    );

    this.demandeStats$.next({ id, date: this.todayDate || '3000-01-01' });
  }


  // =========================================================
  // MISE À JOUR DES STATISTIQUES
  // =========================================================

  private updateStatistics(
    resultat: statistic_TC
  ): void {

    this.nb_fiche_non_lu =
      resultat.nombre_fiche_lue || 0;


    this.nb_quiz_en_retest =
      resultat.nombre_quiz_en_retest || 0;


    this.nb_quiz_echecs =
      resultat.nombre_quiz_Echecs || 0;


    this.nb_sondage_encours =
      resultat.nombre_sondage_effectue || 0;


    this.nb_quiz_total_en_retest =
      resultat.nombre_total_quiz_en_retest || 0;


    this.nb_quiz_total_echecs =
      resultat.nombre_total_quiz_Echecs || 0;


    this.bn_notification_non_lues =
      resultat.nombre_notification_non_lue || 0;


    this.statistic_TC =
      resultat;
  }


  // =========================================================
  // REQUÊTE STATISTIQUES
  // =========================================================

  private sendDateRequest(
    id: number,
    date: Date
  ): void {

    this.demandeStats$.next({ id, date: this.formatDateForApi(date) });
  }


  // =========================================================
  // FORMAT DATE API
  // =========================================================

  private formatDateForApi(
    date: Date
  ): string {

    const year =
      date.getFullYear();


    const month =
      String(
        date.getMonth() + 1
      ).padStart(
        2,
        '0'
      );


    const day =
      String(
        date.getDate()
      ).padStart(
        2,
        '0'
      );


    return `${year}-${month}-${day}`;
  }


  // =========================================================
  // NAVIGATION FICHE
  // =========================================================

  retour(): void {
    this.router.navigateByUrl(this.retourUrl);
  }

  lire_fiche(
    id: number
  ): void {

    this.router.navigateByUrl(
      `lecture-fiche/${id}`
    );
  }


  // =========================================================
  // EXPORT EXCEL
  // =========================================================

  download(): void {

    const data =
      this.details_utilisateur;


    if (!data) {
      return;
    }


    // Consultations : celles affichées (période choisie), colonnes lisibles.
    const ws1: XLSX.WorkSheet =
      XLSX.utils.json_to_sheet(
        (this.dataSource?.data || []).map(c => ({
          Fiche: c.titre,
          Gestionnaire: c.Gestionnaire,
          'Consultations sur la période': c.nb_consultation,
          'Dernière consultation': c.dateConsultation
            ? this.datePipe.transform(c.dateConsultation, 'dd/MM/yyyy HH:mm')
            : '',
        }))
      );


    const ws2: XLSX.WorkSheet =
      XLSX.utils.json_to_sheet(
        (data.commentaires || []).map(c => ({
          Fiche: c.titre,
          Commentaire: c.message,
          Date: c.dateCommentaire
            ? this.datePipe.transform(c.dateCommentaire, 'dd/MM/yyyy HH:mm')
            : '',
        }))
      );


    const wb: XLSX.WorkBook =
      XLSX.utils.book_new();


    XLSX.utils.book_append_sheet(
      wb,
      ws1,
      'Consultations'
    );


    XLSX.utils.book_append_sheet(
      wb,
      ws2,
      'Commentaires'
    );


    XLSX.writeFile(
      wb,
      this.filename
    );
  }


  // =========================================================
  // DESTROY
  // =========================================================

  ngOnDestroy(): void {

    this.subscription.unsubscribe();

    this.subscriptionConsultation.unsubscribe();
  }
}
