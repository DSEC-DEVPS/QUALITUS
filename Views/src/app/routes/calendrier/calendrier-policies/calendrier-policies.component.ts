import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { CalendrierService } from '@shared/services/calendrierService/calendrier.service';
import { ToastrService } from 'ngx-toastr';
import { catchError, of, Subject, takeUntil, tap } from 'rxjs';
import { CreateCalendrierComponent } from '../create-calendrier/create-calendrier.component';
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
import { CommonModule, DatePipe, NgIf } from '@angular/common';
import { categorie } from '@core';
import { CalendarsPolicies } from '@shared/interfaces/calendars/CalendarsPolicies';
import { CreateCalendrierPoliciesComponent } from '../create-calendrier-policies/create-calendrier-policies.component';
import {
  AppearanceAnimation,
  ConfirmBoxInitializer,
  DialogLayoutDisplay,
  DisappearanceAnimation,
} from '@costlydeveloper/ngx-awesome-popup';
import { EditCalendrierPoliciesComponent } from '../edit-calendrier-policies/edit-calendrier-policies.component';

@Component({
  selector: 'app-calendrier-policies',
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
    CommonModule,
  ],
  templateUrl: './calendrier-policies.component.html',
  styleUrl: './calendrier-policies.component.scss',
})
export class CalendrierPoliciesComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  private readonly toastSrv = inject(ToastrService);
  readonly dialog = inject(MatDialog);
  destroy$: Subject<boolean> = new Subject<boolean>();
  listeCalendarsPolicies: any;
  dataSource!: MatTableDataSource<CalendarsPolicies>;
  displayedColums: string[] = ['Site', 'Politique', 'dateCreation', 'Actions'];
  msg = '';
  constructor(private calendrierService: CalendrierService) {}
  ngOnInit(): void {
    this.loadAllCalendarsPolicies();
  }

  openAddDialog(): void {
    const dialogRef = this.dialog.open(CreateCalendrierPoliciesComponent, {
      height: 'calc(100% - 30px)',
      width: 'calc(100% - 30px)',
      maxWidth: '100%',
      maxHeight: '100%',
    });
    dialogRef.afterClosed().subscribe(() => {
      this.loadAllCalendarsPolicies();
    });
  }
  openEditDialog(calendarsPolicies: any): void {
    const dialogRef = this.dialog.open(EditCalendrierPoliciesComponent, {
      data: { calendarsPolicies: calendarsPolicies },
      height: 'calc(100% - 30px)',
      width: 'calc(100% - 30px)',
      maxWidth: '100%',
      maxHeight: '100%',
    });
    dialogRef.afterClosed().subscribe(() => {
      this.loadAllCalendarsPolicies();
    });
  }
  loadAllCalendarsPolicies() {
    this.calendrierService.getAllCalendarsPolicies().subscribe({
      next: response => {
        this.dataSource = response?.objet;
        console.log(response);
      },
      error: error => {
        console.log(error.error.message);
      },
    });
  }
  deletePolicies(id: any) {
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
            this.calendrierService.deletePolicies(id).subscribe({
              next: response => {
                console.log('delete ' + id + ' ');
                console.log('response');
                console.log(response);
                this.toastSrv.success(response?.message);
                this.loadAllCalendarsPolicies();
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
