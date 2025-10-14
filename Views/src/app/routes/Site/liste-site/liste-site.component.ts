import { Component, AfterViewInit, ViewChild, OnInit, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { PageHeaderComponent } from '@shared';
import { site } from '@core';
import { UserService } from '@shared/services/user.service';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatTableDataSource, MatTableModule, MatRowDef } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { Router } from '@angular/router';
import * as XLSX from 'xlsx';
import { AjouterSiteComponent } from '../ajouter-site/ajouter-site.component';
import { MatDialog } from '@angular/material/dialog';
import { UpdateSiteComponent } from '../update-site/update-site.component';
import { ToastrService } from 'ngx-toastr';
import {
  AppearanceAnimation,
  ConfirmBoxInitializer,
  DialogLayoutDisplay,
  DisappearanceAnimation,
} from '@costlydeveloper/ngx-awesome-popup';
import { catchError, of, Subject, takeUntil, tap } from 'rxjs';
@Component({
  selector: 'app-liste-site',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatTableModule,
    MatRowDef,
    MatCardModule,
    MatChipsModule,
    MatGridListModule,
    DatePipe,
    MatIcon,
    MatPaginatorModule,
    MatSortModule,
    MatInputModule,
    MatFormFieldModule,
    TitleCasePipe,
    MatTooltipModule,
  ],
  templateUrl: './liste-site.component.html',
  styleUrl: './liste-site.component.scss',
})
export class ListeSiteComponent implements OnInit {
  displayedColums: string[] = ['id', 'nom', 'Etat', 'dateCreation', 'Actions'];
  dataSource!: MatTableDataSource<site>;
  private readonly userService = inject(UserService);
  private readonly toastSrv = inject(ToastrService);
  downloadData!: site[];
  msg = '';
  destroy$: Subject<boolean> = new Subject<boolean>();
  filename = `Liste_Site${new Date()}.xlsx`;
  readonly dialog = inject(MatDialog);
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  private readonly router = inject(Router);

  ngOnInit(): void {
    this.userService.getAllSite().subscribe(user => {
      this.downloadData = user;
      this.dataSource = new MatTableDataSource(user);
      this.dataSource.paginator = this.paginator;
      this.dataSource.sort = this.sort;
    });
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }
  delete_site(id: number) {
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

    // Simply open the popup and observe button click
    newConfirmBox
      .openConfirmBox$()
      .pipe(
        tap(value => {
          if (value.success) {
            this.userService.deleteSite(id).subscribe({
              next: resultat => {
                this.toastSrv.success(resultat.message);
              },
              error: error => {
                console.log(error);
              },
            });
            this.msg = 'Deleted successfully';
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
  openDialog_update(id: number): void {
    this.dialog.open(UpdateSiteComponent, {
      data: { id: id },
      height: 'calc(100% - 30px)',
      width: 'calc(100% - 30px)',
      maxWidth: '100%',
      maxHeight: '100%',
    });
  }

  NavigeOnSinglePageUtilisateur(id: number) {
    this.router.navigateByUrl(`mon-espace/Site/Details/${id}`);
  }
  openDialog(): void {
    this.dialog.open(AjouterSiteComponent, {
      height: 'calc(100% - 30px)',
      width: 'calc(100% - 30px)',
      maxWidth: '100%',
      maxHeight: '100%',
    });
  }

  download() {
    const data = this.downloadData;
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, this.filename);
  }
}
