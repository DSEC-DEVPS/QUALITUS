import { AfterViewInit, Component, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import * as XLSX from 'xlsx';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  AppearanceAnimation,
  ConfirmBoxInitializer,
  DialogLayoutDisplay,
  DisappearanceAnimation,
} from '@costlydeveloper/ngx-awesome-popup';
import { catchError, of, Subject, takeUntil, tap } from 'rxjs';
import { CommonModule, DatePipe } from '@angular/common';
import { UserService } from '@shared/services/user.service';
import { Quiz_reponse } from '@core';
import { ToastrService } from 'ngx-toastr';
import { Router } from '@angular/router';

/** Constants used to fill up our data base. */

/**
 * @title Data table with sorting, pagination, and filtering.
 */
@Component({
  selector: 'app-quiz-en-echecs',
  standalone: true,
  templateUrl: './quiz-en-echecs.component.html',
  styleUrl: './quiz-en-echecs.component.scss',
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatCardModule,
    MatIconModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatTooltipModule,
    DatePipe,
  ],
})
export class QuizEnEchecsComponent implements OnInit, OnDestroy {
  private readonly userService = inject(UserService);
  private readonly toastSrv = inject(ToastrService);
  private readonly router = inject(Router);
  displayedColumns: string[] = ['titre', 'date_Quiz', 'ETAT', 'nom_utilisateur', 'reset'];
  dataSource!: MatTableDataSource<Quiz_reponse>;
  filename = `Liste_Quiz_en_echecs.xlsx`;
  downloadData!: Quiz_reponse[];
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  ngOnInit(): void {
    this.userService.Quiz_en_echecs().subscribe({
      next: resultat => {
        this.dataSource = new MatTableDataSource(resultat);
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
        this.downloadData = resultat;
      },
      error: error => {},
    });
  }
  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }
  restore() {
    const shouldDelete = window.confirm('Êtes vous sûr de relancer le Retest ?');
    if (shouldDelete) {
      window.alert('vous avez confirmer');
    }
  }
  download() {
    const data = this.downloadData;

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, this.filename);
  }

  msg = '';
  destroy$: Subject<boolean> = new Subject<boolean>();

  deleteSomething(id_UTILISATEUR: number, id_FICHE: number) {
    const newConfirmBox = new ConfirmBoxInitializer();
    newConfirmBox.setTitle('Retest');
    newConfirmBox.setMessage('Êtes vous sûr de relancer le Retest ?');
    // Choose layout color type
    newConfirmBox.setConfig({
      layoutType: DialogLayoutDisplay.WARNING, // SUCCESS | INFO | NONE | DANGER | WARNING
      animationIn: AppearanceAnimation.BOUNCE_IN, // BOUNCE_IN | SWING | ZOOM_IN | ZOOM_IN_ROTATE | ELASTIC | JELLO | FADE_IN | SLIDE_IN_UP | SLIDE_IN_DOWN | SLIDE_IN_LEFT | SLIDE_IN_RIGHT | NONE
      animationOut: DisappearanceAnimation.BOUNCE_OUT, // BOUNCE_OUT | ZOOM_OUT | ZOOM_OUT_WIND | ZOOM_OUT_ROTATE | FLIP_OUT | SLIDE_OUT_UP | SLIDE_OUT_DOWN | SLIDE_OUT_LEFT | SLIDE_OUT_RIGHT | NONE
      buttonPosition: 'right', // optional
    });

    newConfirmBox.setButtonLabels('OUI', 'NON');

    // Simply open the popup and observe button click
    newConfirmBox
      .openConfirmBox$()
      .pipe(
        tap(value => {
          if (value.success) {
            this.userService.Quiz_Retest({ id_UTILISATEUR, id_FICHE }).subscribe({
              next: resultat => {
                this.toastSrv.success(resultat.message);
              },
              error: error => {
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

  ngOnDestroy(): void {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }
  display_details_agents(id: number) {
    console.log(id);
    //this.router.navigateByUrl(`mon-espace/mes-agents/details-agent/${id}`);
  }
}
