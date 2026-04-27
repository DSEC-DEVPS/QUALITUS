import { Component, inject, OnInit } from '@angular/core';
import { MatCardHeader, MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { CalendrierService } from '@shared/services/calendrierService/calendrier.service';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CommonModule } from '@angular/common';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { FormsModule } from '@angular/forms';
import { UppercaseAllPipe } from '@shared/pipes/UppercaseAllPipe';
import { ToastrService } from 'ngx-toastr';
import { CreateCalendrierComponent } from './create-calendrier/create-calendrier.component';
import { MatDialog } from '@angular/material/dialog';
import { catchError, of, Subject, takeUntil, tap } from 'rxjs';
import {
  AppearanceAnimation,
  ConfirmBoxInitializer,
  DialogLayoutDisplay,
  DisappearanceAnimation,
} from '@costlydeveloper/ngx-awesome-popup';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CreateCalendrierPoliciesComponent } from './create-calendrier-policies/create-calendrier-policies.component';

@Component({
  selector: 'app-calendrier',
  standalone: true,
  imports: [
    MatCardHeader,
    MatCardModule,
    MatIconModule,
    CommonModule,
    MatCheckboxModule,
    MatTooltipModule,
    FormsModule,
    UppercaseAllPipe,
  ],
  templateUrl: './calendrier.component.html',
  styleUrl: './calendrier.component.scss',
})
export class CalendrierComponent implements OnInit {
  private readonly toastSrv = inject(ToastrService);
  readonly dialog = inject(MatDialog);
  destroy$: Subject<boolean> = new Subject<boolean>();
  listeCalendrier: any;
  statut: any;
  constructor(private calendrierService: CalendrierService) {}
  ngOnInit(): void {
    this.loadAllCalendars();
  }
  loadAllCalendars() {
    this.calendrierService.getAllCalendars().subscribe({
      next: response => {
        console.log('Calendars');

        console.log(response);
        this.listeCalendrier = response?.objet;
      },
      error: error => {
        console.error('Erreur lors du chargement du calendars', error);
      },
    });
  }
  updateCalendars(id: any, data: any) {
    this.calendrierService.update(id, data).subscribe({
      next: response => {
        console.log('update ' + id + ' ' + data);
        console.log('response');
        console.log(response);
        this.toastSrv.success(response?.message);
      },
      error: error => {
        console.log('error');
        console.log(error);
      },
    });
  }
  deleteCalendarsBySite(id: any) {
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
            this.calendrierService.delete(id).subscribe({
              next: response => {
                console.log('delete ' + id + ' ');
                console.log('response');
                console.log(response);
                this.toastSrv.success(response?.message);
                this.loadAllCalendars();
              },
              error: error => {
                console.log('error');
                console.log(error);
              },
            });
            // this.msg = 'Deleted successfully';
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
  openDialog(): void {
    const dialogRef = this.dialog.open(CreateCalendrierComponent, {
      height: 'calc(100% - 30px)',
      width: 'calc(100% - 30px)',
      maxWidth: '100%',
      maxHeight: '100%',
    });
    dialogRef.afterClosed().subscribe(() => {
      this.loadAllCalendars();
    });
  }
  toggleEtat(cal: any) {
    console.log(cal);
    console.log(`Etat${cal.etat} du calendrier ${cal.id} changé à`, cal.etat);
    let etat = cal.etat ? 1 : 0;
    let data = { etat: etat };
    this.updateCalendars(cal.id, data);
  }
}
