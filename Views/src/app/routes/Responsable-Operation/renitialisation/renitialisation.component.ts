import { AfterViewInit, Component, OnDestroy, ViewChild, OnInit, inject } from '@angular/core';
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
import { CommonModule } from '@angular/common';
import { UserService } from '@shared/services/user.service';
import { Responsable_Operation } from '@core';
import { ToastrService } from 'ngx-toastr';

/** Constants used to fill up our data base. */

/**
 * @title Data table with sorting, pagination, and filtering.
 */
@Component({
  selector: 'app-quiz-en-echecs',
  standalone: true,
  templateUrl: './renitialisation.component.html',
  styleUrl: './renitialisation.component.scss',
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
  ],
})
export class RenitialisationComponent implements OnInit, OnDestroy, AfterViewInit {
  displayedColumns: string[] = [
    'profil',
    'nom_utilisateur',
    'fonction',
    'programme',
    'site',
    'status',
    'superviseur',
    'dateCreation',
    'actions',
  ];
  private readonly userService = inject(UserService);
  private readonly taostSrv = inject(ToastrService);
  dataSource!: MatTableDataSource<Responsable_Operation>;
  filename = `Liste_des_Agents.xlsx`;
  downloadData!: Responsable_Operation[];
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  ngOnInit(): void {
    this.userService.getAllAgentByRo().subscribe({
      next: result => {
        this.downloadData = result;
        this.dataSource = new MatTableDataSource(result);
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
      },
      error: error => {
        console.log(error);
      },
    });
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
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

  deleteSomething(id: number) {
    const newConfirmBox = new ConfirmBoxInitializer();
    newConfirmBox.setTitle('Rénitialisation de mot de passe');
    newConfirmBox.setMessage('Êtes vous sûr de vouloir ce mot de passe  ?');

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
            this.userService.restore_password(id).subscribe({
              next: result => {
                this.taostSrv.success(result.message);
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
}
