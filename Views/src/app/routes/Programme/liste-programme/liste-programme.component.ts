import {
  AfterViewInit,
  Component,
  ViewChild,
  OnInit,
  ChangeDetectionStrategy,
  inject,
} from '@angular/core';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { UserService } from '@shared/services/user.service';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { grille, programme, sla } from '@core';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatTableDataSource, MatTableModule, MatRowDef } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DatePipe } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { AjouterProgrammeComponent } from '../ajouter-programme/ajouter-programme.component';
import * as XLSX from 'xlsx';
import { Router } from '@angular/router';
import {
  AppearanceAnimation,
  ConfirmBoxInitializer,
  DialogLayoutDisplay,
  DisappearanceAnimation,
} from '@costlydeveloper/ngx-awesome-popup';
import { catchError, of, Subject, takeUntil, tap } from 'rxjs';
import { UpdateProgrammeComponent } from '../update-programme/update-programme.component';
import { ToastrService } from 'ngx-toastr';
@Component({
  selector: 'app-table-overview-example',
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
    MatIcon,
    MatRowDef,
    DatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './liste-programme.component.html',
  styleUrl: './liste-programme.component.scss',
})
export class ListeProgrammeComponent implements OnInit, AfterViewInit {
  dataSource!: MatTableDataSource<programme>;
  private readonly toastSrv = inject(ToastrService);
  private readonly route = inject(Router);
  msg = '';
  destroy$: Subject<boolean> = new Subject<boolean>();
  displayedColums: string[] = ['id', 'nom', 'Etat', 'dateCreation', 'Actions'];
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  filename = `Liste_Programme${new Date()}.xlsx`;
  downloadData!: programme[];
  @ViewChild(MatSort) sort!: MatSort;
  readonly dialog = inject(MatDialog);
  constructor(private userService: UserService) {}
  ngOnInit(): void {
    this.userService.getAllProgramme().subscribe(user => {
      this.downloadData = user;
      this.dataSource = new MatTableDataSource(user);
      this.dataSource.paginator = this.paginator;
      this.dataSource.sort = this.sort;
    });
  }
  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
  }
  openDialog(): void {
    this.dialog.open(AjouterProgrammeComponent, {
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
  NavigeOnSinglePageProgramme(id: number) {
    this.route.navigateByUrl(`mon-espace/Programme/details/${id}`);
  }
  delete_programme(id: number) {
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
            this.userService.deleteProgramme(id).subscribe({
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
    this.dialog.open(UpdateProgrammeComponent, {
      data: { id: id },
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
