import { Component, OnInit, ViewChild, inject, AfterViewInit } from '@angular/core';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { UserService } from '@shared/services/user.service';
import { AuthService, Fiche, fiche_by_gestionnaire, User } from '@core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AppearanceAnimation,
  ConfirmBoxInitializer,
  DialogLayoutDisplay,
  DisappearanceAnimation,
} from '@costlydeveloper/ngx-awesome-popup';
import * as XLSX from 'xlsx';
import { catchError, of, Subject, takeUntil, tap } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
@Component({
  selector: 'app-liste-archive',
  standalone: true,
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatGridListModule,
    MatTooltipModule,
    MatIcon,
    DatePipe,
  ],
  templateUrl: './liste-archive.component.html',
  styleUrl: './liste-archive.component.scss',
})
export class ListeArchiveComponent implements AfterViewInit, OnInit {
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);
  private readonly toatSrv = inject(ToastrService);
  private readonly auth = inject(AuthService);

  displayedColumns: string[] = ['titre', 'type', 'Categorie', 'dateFin', 'archive_par', 'action'];
  filename = 'La_liste_de_mes_archives.xlsx';
  dataSource!: MatTableDataSource<fiche_by_gestionnaire>;
  downloadData!: fiche_by_gestionnaire[];
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  user!: User;
  ngOnInit(): void {
    this.auth.user().subscribe({
      next: user => {
        this.user = user;
      },
      error: error => {
        console.log(error);
      },
    });

    this.userService.getAllArchive().subscribe({
      next: result => {
        this.dataSource = new MatTableDataSource(result);
        this.downloadData = result;
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
  }
  lire_fiche(id: number) {
    this.router.navigateByUrl(`lecture-fiche/${id}`);
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
    const ws1: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws1, 'LISTE');
    XLSX.writeFile(wb, this.filename);
  }

  msg = '';
  destroy$: Subject<boolean> = new Subject<boolean>();
  deleteSomething(id: number) {
    const newConfirmBox = new ConfirmBoxInitializer();
    newConfirmBox.setTitle('Restauration');
    newConfirmBox.setMessage(`Êtes vous sûr de restaurer l'archive ?`);
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
            this.userService.restore_archive(id).subscribe({
              next: result => {
                console.log(result);
                this.toatSrv.success(result.message);
                this.router.navigateByUrl(`mon-espace/Fiche/Liste`);
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
}
