import { CommonModule, DatePipe } from '@angular/common';
import { Component, Inject, inject, ViewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatIcon, MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatRowDef, MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import {
  AppearanceAnimation,
  ConfirmBoxInitializer,
  DialogLayoutDisplay,
  DisappearanceAnimation,
} from '@costlydeveloper/ngx-awesome-popup';
import { formaterLaDate } from '@shared/utils/formatDate';
import { ToastrService } from 'ngx-toastr';
import { catchError, debounceTime, distinctUntilChanged, of, Subject, takeUntil, tap } from 'rxjs';
import { LoginService } from '@core';
import { CreateSupplementairesComponent } from '../create-supplementaires/create-supplementaires.component';
import { SupplementairesService } from '@shared/services/SupplementairesService/supplementaires.service';

@Component({
  selector: 'app-supplementaires',
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
  templateUrl: './supplementaires.component.html',
  styleUrl: './supplementaires.component.scss',
})
export class SupplementairesComponent {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  fb = inject(FormBuilder);
  readonly dialog = inject(MatDialog);
  private readonly toastSrv = inject(ToastrService);
  private readonly router = inject(Router);
  readonly dialogRef = inject(MatDialogRef<SupplementairesComponent>);
  destroy$: Subject<boolean> = new Subject<boolean>();
  listeSupplementaires: any[] = [];
  dataSource!: MatTableDataSource<any>;
  displayedColums: string[] = [
    'contexte',
    'programme',
    'dateCreation',
    'conclusion',
    'statut',
    'Actions',
  ];
  msg = '';
  me: any;
  id_Evaluations: number = 0;
  debut: any;
  fin: any;
  statuts = [{ name: 'En cours' }, { name: 'Terminer' }, { name: 'Tous' }];
  formGroup = this.fb.group({
    date_debut: [new Date()],
    date_fin: [new Date()],
    statut: ['En cours'],
  });
  constructor(
    private supplementairesService: SupplementairesService,
    private loginService: LoginService,
    @Inject(MAT_DIALOG_DATA) data: any
  ) {
    this.id_Evaluations = data.id_Evaluations;
  }

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

    console.log('this.id_Evaluations');
    console.log(this.id_Evaluations);
  }

  loadSupplementaires() {
    if (this.id_Evaluations) {
      this.supplementairesService.getSupplementairesByEvaluations(this.id_Evaluations).subscribe({
        next: response => {
          this.dataSource = new MatTableDataSource(response?.data);
          this.onStatutChange(this.formGroup.controls['statut'].value);
          this.dataSource.filterPredicate = (data, filter) => data.statut === filter;
          this.listeSupplementaires = response?.data;
          console.log('this.dataSourcesupp');
          console.log(this.dataSource);
          if (!response?.data) {
            this.toastSrv.warning(response?.message);
            this.dataSource = new MatTableDataSource();
          }
        },
        error: error => {
          console.log('Error error', error);
          this.dataSource = new MatTableDataSource();
          this.toastSrv.error(error.error);
        },
      });
    } else {
      this.toastSrv.warning("Une erreur est survenue lors de l'ouverture du pop up");
    }
  }
  loadMe() {
    this.loginService.me().subscribe({
      next: response => {
        this.me = response;
        this.loadSupplementaires();
      },
      error: error => {
        console.log(error);
      },
    });
  }
  openAddDialog(): void {
    if (this.dataSource.data.length < 2) {
      const dialogRef = this.dialog.open(CreateSupplementairesComponent, {
        data: { id_Evaluations: this.id_Evaluations },
        height: 'calc(100% - 30px)',
        width: 'calc(100% - 30px)',
        maxWidth: '100%',
        maxHeight: '100%',
      });
      dialogRef.afterClosed().subscribe(() => {
        this.dialogRef.close();
      });
    } else {
      this.toastSrv.info('Vous ne pouvez pas avoir plus de deux supplementaires par evaluation !');
    }
  }
  onStatutChange(statut: any) {
    this.dataSource.filter = statut == 'Tous' ? '' : statut;
    this.dataSource.filterPredicate = (data, filter) => data.statut === filter;
    console.log('this.dataSource.statut change');
    console.log(this.dataSource);
  }
  onDateChange(dateDebut: any, dateFin: any) {
    console.log('Debut', dateDebut);
    console.log('Fin', dateFin);

    this.debut = formaterLaDate(dateDebut);
    this.fin = formaterLaDate(dateFin);
    console.log('Envoi backend:', this.debut, this.fin);
    this.loadSupplementaires();
  }
  completionSupplementaire(id: number) {
    this.router.navigateByUrl(`mon-espace/Evaluations/Supplementaire/Completion/${id}`);
    this.dialogRef.close();
  }
  deleteSupplemntaire(id: any) {
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
            this.supplementairesService.deleteSupplementaire(id).subscribe({
              next: response => {
                console.log('delete ' + id + ' ');
                console.log('response');
                console.log(response);
                this.toastSrv.success(response?.message);
                this.loadSupplementaires();
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
  onCloseModal() {
    this.dialogRef.close();
  }
}
