import { Component, OnInit, inject, ViewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { fonction } from '@core';
import { UserService } from '@shared/services/user.service';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatTableDataSource, MatTableModule, MatRowDef } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { AjouterFonctionComponent } from '../ajouter-fonction/ajouter-fonction.component';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { Router } from '@angular/router';
import * as XLSX from 'xlsx';
import { UpdateFonctionComponent } from '../update-fonction/update-fonction.component';
import { ToastrService } from 'ngx-toastr';
import {
  AppearanceAnimation,
  ConfirmBoxInitializer,
  DialogLayoutDisplay,
  DisappearanceAnimation,
} from '@costlydeveloper/ngx-awesome-popup';
import { catchError, of, Subject, takeUntil, tap } from 'rxjs';
@Component({
  selector: 'app-liste-fonction',
  standalone: true,
  imports: [
    MatButtonModule,
    MatTooltipModule,
    MatIconModule,
    MatCardModule,
    MatChipsModule,
    MatGridListModule,
    MatTableModule,
    MatRowDef,
    DatePipe,
    MatIcon,
    MatPaginatorModule,
    MatSortModule,
    MatInputModule,
    MatFormFieldModule,
    TitleCasePipe,
  ],
  templateUrl: './liste-fonction.component.html',
  styleUrl: './liste-fonction.component.scss',
})
export class ListeFonctionComponent implements OnInit {
  private readonly userService = inject(UserService);
  private readonly toastSrv = inject(ToastrService);
  msg = '';
  destroy$: Subject<boolean> = new Subject<boolean>();
  displayedColumns: string[] = ['id', 'nom', 'Role_Associe', 'Etat', 'dateCreation', 'Actions'];
  readonly dialog = inject(MatDialog);
  filename = `Liste_Programme${new Date()}.xlsx`;
  downloadData!: fonction[];
  dataSource!: MatTableDataSource<fonction>;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  private readonly router = inject(Router);
  ngOnInit(): void {
    this.userService.getAllFonction().subscribe(user => {
      this.dataSource = new MatTableDataSource(user);
      this.downloadData = user;
      this.dataSource.paginator = this.paginator;
      this.dataSource.sort = this.sort;
    });
  }
  openDialog(): void {
    this.dialog.open(AjouterFonctionComponent, {
      height: 'calc(100% - 30px)',
      width: 'calc(100% - 30px)',
      maxWidth: '100%',
      maxHeight: '100%',
    });
  }
  openDialog_update(id: number): void {
    this.dialog.open(UpdateFonctionComponent, {
      data: { id: id },
      height: 'calc(100% - 30px)',
      width: 'calc(100% - 30px)',
      maxWidth: '100%',
      maxHeight: '100%',
    });
  }
  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }
  NavigeOnSinglePageFonction(id: number) {
    this.router.navigateByUrl(`Fonction/details/${id}`);
  }
  download() {
    const data = this.downloadData;
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, this.filename);
  }

  delete(id: number) {
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
            this.userService.delete_fonction(id).subscribe({
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
}
