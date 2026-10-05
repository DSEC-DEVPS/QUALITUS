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

import { Subscription } from 'rxjs';

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

import { MatFormFieldModule } from '@angular/material/form-field';

import { MatDatepickerModule } from '@angular/material/datepicker';

import {
  MAT_DATE_FORMATS,
  MatNativeDateModule,
} from '@angular/material/core';


import { MatInputModule } from '@angular/material/input';

import * as XLSX from 'xlsx';

import {
  Commentaire,
  Consultation,
  detailsUtilisateur,
  statistic_TC,
} from '@core';

import { UserService } from '@shared/services/user.service';
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
  ],

  imports: [
    MatTableModule,
    MatPaginatorModule,
    MatTabsModule,
    DatePipe,
    MatTooltipModule,
    TitleCasePipe,
    MatIconModule,
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

  private readonly userService = inject(UserService);

  private readonly router = inject(Router);

  private readonly datePipe = inject(DatePipe);


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

  private subscriptionConsultation =
    new Subscription();


  // =========================================================
  // DONNÉES
  // =========================================================

  private allConsultations: Consultation[] = [];

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

    const id =
      this.route.snapshot.params['id'];


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
          // Filtrage immédiat
          // --------------------------------------------------

          this.filterConsultations(
            dateDebut,
            dateFin
          );

        })
    );
  }


  // =========================================================
  // CHARGEMENT UTILISATEUR
  // =========================================================

  private loadUserDetails(
    id: number
  ): void {

    this.userService
      .getDetailsUtilisateur(id)
      .subscribe({

        next: result => {

          // ------------------------------------------------
          // CONSERVATION DES CONSULTATIONS ORIGINALES
          // ------------------------------------------------

          this.allConsultations =
            result.consultations || [];


          // ------------------------------------------------
          // TABLE CONSULTATIONS
          // ------------------------------------------------

          this.dataSource =
            new MatTableDataSource<Consultation>(
              this.allConsultations
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


          // ------------------------------------------------
          // FILTRE INITIAL
          // ------------------------------------------------

          const dateDebut =
            this.dateFormConsulation
              .get('selectedDateDebut')
              ?.value;


          const dateFin =
            this.dateFormConsulation
              .get('selectedDateFin')
              ?.value;


          if (
            dateDebut &&
            dateFin
          ) {

            this.filterConsultations(
              dateDebut,
              dateFin
            );
          }
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
  // FILTRER LES CONSULTATIONS
  // =========================================================

  private filterConsultations(
    dateDebut: Date,
    dateFin: Date
  ): void {

    // -------------------------------------------------------
    // DATE DÉBUT
    // -------------------------------------------------------

    const debut =
      new Date(dateDebut);

    debut.setHours(
      0,
      0,
      0,
      0
    );


    // -------------------------------------------------------
    // DATE FIN
    // -------------------------------------------------------

    const fin =
      new Date(dateFin);

    fin.setHours(
      23,
      59,
      59,
      999
    );


    // -------------------------------------------------------
    // PÉRIODE INVALIDE
    // -------------------------------------------------------

    if (debut > fin) {

      this.dataSource.data = [];

      return;
    }


    // -------------------------------------------------------
    // FILTRAGE
    // -------------------------------------------------------

    const consultationsFiltrees =
      this.allConsultations.filter(
        consultation => {

          if (
            !consultation.dateConsultation
          ) {
            return false;
          }


          const dateConsultation =
            this.parseConsultationDate(
              consultation.dateConsultation
            );


          if (!dateConsultation) {
            return false;
          }


          return (
            dateConsultation.getTime() >=
              debut.getTime()
            &&
            dateConsultation.getTime() <=
              fin.getTime()
          );

        }
      );


    // -------------------------------------------------------
    // MISE À JOUR TABLEAU
    // -------------------------------------------------------

    this.dataSource.data =
      consultationsFiltrees;


    // -------------------------------------------------------
    // RETOUR PREMIÈRE PAGE
    // -------------------------------------------------------

    if (this.dataSource.paginator) {

      this.dataSource.paginator.firstPage();

    }
  }


  // =========================================================
  // CONVERSION DATE CONSULTATION
  // =========================================================

  private parseConsultationDate(
    dateString: string
  ): Date | null {

    const date =
      new Date(dateString);


    if (
      isNaN(
        date.getTime()
      )
    ) {

      return null;
    }


    return date;
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

    this.userService
      .statistic_TC_FOR_SUP({

        userId: id,

        date:
          this.todayDate ||
          '3000-01-01',

      })
      .subscribe({

        next: resultat => {

          this.updateStatistics(
            resultat
          );

        },

        error: error => {

          console.error(
            'Erreur statistiques :',
            error
          );

        },

      });
  }


  // =========================================================
  // MISE À JOUR STATISTIQUES
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

    const formattedDate =
      this.formatDateForApi(date);


    this.userService
      .statistic_TC_FOR_SUP({

        userId: id,

        date: formattedDate,

      })
      .subscribe({

        next: resultat => {

          this.updateStatistics(
            resultat
          );

        },

        error: error => {

          console.error(
            'Erreur lors de la récupération des statistiques :',
            error
          );

        },

      });
  }


  // =========================================================
  // FORMAT DATE API
  // yyyy-MM-dd
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


    const ws1: XLSX.WorkSheet =
      XLSX.utils.json_to_sheet(
        data.consultations
      );


    const ws2: XLSX.WorkSheet =
      XLSX.utils.json_to_sheet(
        data.commentaires
      );


    const wb: XLSX.WorkBook =
      XLSX.utils.book_new();


    XLSX.utils.book_append_sheet(
      wb,
      ws1,
      'Liste_Consultaitons'
    );


    XLSX.utils.book_append_sheet(
      wb,
      ws2,
      'Liste_Commentaires'
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
