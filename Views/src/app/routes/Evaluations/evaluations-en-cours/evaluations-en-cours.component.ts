import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  forkJoin,
  map,
  of,
  Subject,
  takeUntil,
  tap,
} from 'rxjs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRowDef, MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatIcon, MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CommonModule, DatePipe } from '@angular/common';
import { LoginService } from '@core';
import {
  AppearanceAnimation,
  ConfirmBoxInitializer,
  DialogLayoutDisplay,
  DisappearanceAnimation,
} from '@costlydeveloper/ngx-awesome-popup';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { EvaluationsService } from '@shared/services/EvalutionsService/evaluations.service';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { formaterLaDate } from '@shared/utils/formatDate';
import { Router } from '@angular/router';
import { MatSelectModule } from '@angular/material/select';
import { CreateEvaluationsComponent } from '../create-evaluations/create-evaluations.component';
import { SupplementairesService } from '@shared/services/SupplementairesService/supplementaires.service';

@Component({
  selector: 'app-evaluations-en-cours',
  standalone: true,
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatGridListModule,
    MatTooltipModule,
    MatDatepickerModule,
    MatSelectModule,
    ReactiveFormsModule,
    MatIcon,
    MatRowDef,
    DatePipe,
    CommonModule,
  ],
  templateUrl: './evaluations-en-cours.component.html',
  styleUrl: './evaluations-en-cours.component.scss',
})
export class EvaluationsEnCoursComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  fb = inject(FormBuilder);
  private readonly toastSrv = inject(ToastrService);
  private readonly router = inject(Router);
  readonly dialog = inject(MatDialog);
  destroy$: Subject<boolean> = new Subject<boolean>();
  listeCalendarsPolicies: any;
  listeEvaluations: any[] = [];
  dataSource!: MatTableDataSource<any>;
  displayedColums: string[] = [
    'contexte',
    'programme',
    'dateCreation',
    'conclusion',
    'statut',
    'type',
    'Actions',
  ];
  msg = '';
  me: any;
  debut: any;
  fin: any;
  statuts = [{ name: 'En cours' }, { name: 'Terminer' }, { name: 'Tous' }];
  types = [{ name: 'Tous' }, { name: 'Supplementaire' }, { name: 'Evaluation' }];
  formGroup = this.fb.group({
    date_debut: [new Date()],
    date_fin: [new Date()],
    statut: ['En cours'],
    type: ['Evaluation'],
  });

  constructor(
    private evaluationService: EvaluationsService,
    private loginService: LoginService
  ) {}

  ngOnInit(): void {
    const now = new Date();

    this.debut = formaterLaDate(new Date(now.getFullYear(), now.getMonth(), 1));
    this.fin = formaterLaDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    this.loadMe();
    this.formGroup.patchValue(
      {
        date_debut: this.debut,
        date_fin: this.fin,
      },
      { emitEvent: false }
    );

    this.formGroup.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(
          (a, b) =>
            a.date_debut?.toString() === b.date_debut?.toString() &&
            a.date_fin?.toString() === b.date_fin?.toString()
        )
      )
      .subscribe(values => {
        if (values.date_debut && values.date_fin) {
          this.onDateChange(values.date_debut, values.date_fin);
        }
      });
    this.formGroup
      .get('statut')!
      .valueChanges.pipe(debounceTime(100), distinctUntilChanged())
      .subscribe(statut => {
        this.onStatutChange(statut);
      });
    this.formGroup
      .get('type')!
      .valueChanges.pipe(debounceTime(100), distinctUntilChanged())
      .subscribe(type => {
        this.onTypeChange(type);
      });
  }

  loadEvaluations() {
    this.evaluationService.getEvaluationsByEvaluateur(this.me.id, this.debut, this.fin).subscribe({
      next: response => {
        this.dataSource = new MatTableDataSource(response?.data);
        this.onStatutChange(this.formGroup.controls['statut'].value);
        this.dataSource.filterPredicate = (data, filter) => data.statut === filter;
        this.listeEvaluations = response;
        console.log('this.dataSource');
        console.log(this.dataSource);
        if (response?.data.length === 0) {
          this.toastSrv.warning(response?.message);
        }
      },
      error: error => {
        console.log('Error error', error);
        this.toastSrv.error(error.error.message);
        this.dataSource = new MatTableDataSource();
      },
    });
  }
  loadAllData() {
    this.evaluationService.getEvaluationsByEvaluateur(this.me.id, this.debut, this.fin).subscribe({
      next: results => {
        // On combine ce qui a réussi (si un appel a échoué, son .data sera [])
        const evaluations = results?.data;
        console.log('this.evaluations');
        console.log(evaluations);
        this.dataSource = new MatTableDataSource(evaluations);

        // Réapplication des filtres

        this.dataSource.filterPredicate = (data: any, filter: string) => {
          const searchTerms = JSON.parse(filter);

          const matchesStatut =
            searchTerms.statut === 'Tous' || !searchTerms.statut
              ? true
              : data.statut === searchTerms.statut;

          const matchesType =
            searchTerms.type === 'Tous' || !searchTerms.type
              ? true
              : data.type_evaluation === searchTerms.type;

          return matchesStatut && matchesType;
        };

        // 2. Appliquer immédiatement le filtre basé sur les valeurs du formulaire
        // Cela filtrera par "En cours" et "Evaluation" (vos valeurs par défaut)
        this.applyFilters();
        if (evaluations.length === 0) {
          this.toastSrv.warning('Aucune donnée disponible');
        }
      },
    });
  }
  loadMe() {
    this.loginService.me().subscribe({
      next: response => {
        this.me = response;
        // this.loadEvaluations();
        this.loadAllData();
      },
      error: error => {
        console.log(error);
      },
    });
  }
  openAddDialog(): void {
    const dialogRef = this.dialog.open(CreateEvaluationsComponent, {
      height: 'calc(100% - 30px)',
      width: 'calc(100% - 30px)',
      maxWidth: '100%',
      maxHeight: '100%',
    });
    dialogRef.afterClosed().subscribe(() => {});
  }

  applyFilters() {
    const filterValues = {
      statut: this.formGroup.get('statut')?.value,
      type: this.formGroup.get('type')?.value,
    };
    this.dataSource.filter = JSON.stringify(filterValues);
  }
  onStatutChange(statut: any) {
    // this.dataSource.filter = statut == 'Tous' ? '' : statut;
    // this.dataSource.filterPredicate = (data, filter) => data.statut === filter;
    // console.log('this.dataSource.statut change');
    // console.log(this.dataSource);
    this.applyFilters();
  }

  onTypeChange(type: any) {
    // this.dataSource.filter = type;
    // this.dataSource.filterPredicate = (data, filter) => data.type === filter;
    // console.log('this.dataSource.type change');
    // console.log(this.dataSource);
    this.applyFilters();
  }

  onDateChange(dateDebut: any, dateFin: any) {
    console.log('Debut', dateDebut);
    console.log('Fin', dateFin);

    this.debut = formaterLaDate(dateDebut);
    this.fin = formaterLaDate(dateFin);
    console.log('Envoi backend:', this.debut, this.fin);
    // this.loadEvaluations();
    this.loadAllData();
  }
  completionEvaluation(id: number, data: any) {
    if (data?.id_Evaluations == null) {
      this.router.navigateByUrl(`mon-espace/Evaluations/Completion/${id}`);
    } else {
      this.router.navigateByUrl(`mon-espace/Evaluations/Supplementaire/Completion/${id}`);
    }
  }
  deleteEvaluation(id: any, data: any) {
    const newConfirmBox = new ConfirmBoxInitializer();
    newConfirmBox.setTitle('Suppression !');
    newConfirmBox.setMessage('Êtes vous sûr de vouloir supprimer ?');
    // Choose layout color type
    newConfirmBox.setConfig({
      layoutType: DialogLayoutDisplay.DANGER, // SUCCESS | INFO | NONE | DANGER | WARNING
      animationIn: AppearanceAnimation.BOUNCE_IN, // BOUNCE_IN | SWING | ZOOM_IN | ZOOM_IN_ROTATE | ELASTIC | JELLO | FADE_IN | SLIDE_IN_UP | SLIDE_IN_DOWN | SLIDE_IN_LEFT | SLIDE_IN_RIGHT | NONE
      animationOut: DisappearanceAnimation.BOUNCE_OUT, // BOUNCE_OUT | ZOOM_OUT | ZOOM_OUT_WIND | ZOOM_OUT_ROTATE | FLIP_OUT | SLIDE_OUT_UP | SLIDE_OUT_DOWN | SLIDE_OUT_LEFT | SLIDE_OUT_RIGHT | NONE
      buttonPosition: 'right', // optional
    });
    newConfirmBox.setButtonLabels('OUI', 'NON');
    newConfirmBox
      .openConfirmBox$()
      .pipe(
        tap(value => {
          if (value.success) {
            this.evaluationService.deleteEvaluation(id).subscribe({
              next: response => {
                console.log('delete ' + id + ' ');
                console.log('response');
                console.log(response);
                this.toastSrv.success(response?.message);
                // this.loadEvaluations();
                this.loadAllData();
              },
              error: error => {
                console.log('error');
                console.log(error);
              },
            });
          }
        }),
        catchError(error => {
          console.log('error in dialog box');
          return of(null);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }
}
