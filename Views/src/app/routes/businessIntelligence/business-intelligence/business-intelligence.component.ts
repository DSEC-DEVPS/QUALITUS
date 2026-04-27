import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCardHeader, MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { UppercaseAllPipe } from '@shared/pipes/UppercaseAllPipe';
import { BusinessIntelligenceService } from '@shared/services/businessIntelligenceService/business-intelligence.service';
import { CreateBusinessIntelligenceComponent } from '../create-business-intelligence/create-business-intelligence.component';
import { CreateBI1Component } from '../create-bi1/create-bi1.component';
import { EditBI1Component } from '../edit-bi1/edit-bi1.component';
import { EditBusinessIntelligenceComponent } from '../edit-business-intelligence/edit-business-intelligence.component';
import { CreateBI2Component } from '../create-bi2/create-bi2.component';
import { EditBI2Component } from '../edit-bi2/edit-bi2.component';
import { CreateBI3Component } from '../create-bi3/create-bi3.component';
import { EditBI3Component } from '../edit-bi3/edit-bi3.component';
import { CreateBI4Component } from '../create-bi4/create-bi4.component';
import { EditBI4Component } from '../edit-bi4/edit-bi4.component';
import {
  AppearanceAnimation,
  ConfirmBoxInitializer,
  DialogLayoutDisplay,
  DisappearanceAnimation,
} from '@costlydeveloper/ngx-awesome-popup';
import { catchError, of, Subject, takeUntil, tap } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { BusinessIntelligence } from '@shared/modeles/businessIntelligence/BusinessIntelligence';

@Component({
  selector: 'app-business-intelligence',
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
  templateUrl: './business-intelligence.component.html',
  styleUrl: './business-intelligence.component.scss',
})
export class BusinessIntelligenceComponent implements OnInit {
  readonly dialog = inject(MatDialog);
  destroy$: Subject<boolean> = new Subject<boolean>();
  private readonly toastSrv = inject(ToastrService);

  businessList: any;
  constructor(private businessIntelligenceService: BusinessIntelligenceService) {}
  ngOnInit(): void {
    this.loadAllBI();
  }

  loadAllBI() {
    this.businessIntelligenceService.getAllBI().subscribe({
      next: response => {
        console.log('response');
        console.log(response);
        this.businessList = response;
      },
      error: error => {
        console.log(error);
      },
    });
  }
  openAddBusinessIntelligenceDialog(): void {
    const dialogRef = this.dialog.open(CreateBusinessIntelligenceComponent, {
      height: 'calc(100% - 30px)',
      width: 'calc(100% - 30px)',
      maxWidth: '100%',
      maxHeight: '100%',
    });
    dialogRef.afterClosed().subscribe(() => {
      this.loadAllBI();
    });
  }
  openEditBusinessIntelligenceDialog(businessIntelligence: any): void {
    const dialogRef = this.dialog.open(EditBusinessIntelligenceComponent, {
      data: { businessIntelligence: businessIntelligence },
      height: 'calc(100% - 30px)',
      width: 'calc(100% - 30px)',
      maxWidth: '100%',
      maxHeight: '100%',
    });
    dialogRef.afterClosed().subscribe(() => {
      this.loadAllBI();
    });
  }
  openAddBI1Dialog(bi: any): void {
    const dialogRef = this.dialog.open(CreateBI1Component, {
      data: { bi: bi },
      height: 'calc(100% - 30px)',
      width: 'calc(100% - 30px)',
      maxWidth: '100%',
      maxHeight: '100%',
    });
    dialogRef.afterClosed().subscribe(() => {
      this.loadAllBI();
    });
  }
  openEditBI1Dialog(bi1: any): void {
    console.log('bi1');
    console.log(bi1);
    const dialogRef = this.dialog.open(EditBI1Component, {
      data: { bi1: bi1 },
      height: 'calc(100% - 30px)',
      width: 'calc(100% - 30px)',
      maxWidth: '100%',
      maxHeight: '100%',
    });
    dialogRef.afterClosed().subscribe(() => {
      this.loadAllBI();
    });
  }

  openAddBI2Dialog(bi1: any): void {
    const dialogRef = this.dialog.open(CreateBI2Component, {
      data: { bi1: bi1 },
      height: 'calc(100% - 30px)',
      width: 'calc(100% - 30px)',
      maxWidth: '100%',
      maxHeight: '100%',
    });
    dialogRef.afterClosed().subscribe(() => {
      this.loadAllBI();
    });
  }
  openEditBI2Dialog(bi1: any, bi2: any): void {
    const dialogRef = this.dialog.open(EditBI2Component, {
      data: { bi1: bi1, bi2: bi2 },
      height: 'calc(100% - 30px)',
      width: 'calc(100% - 30px)',
      maxWidth: '100%',
      maxHeight: '100%',
    });
    dialogRef.afterClosed().subscribe(() => {
      this.loadAllBI();
    });
  }

  openAddBI3Dialog(bi2: any): void {
    const dialogRef = this.dialog.open(CreateBI3Component, {
      data: { bi2: bi2 },
      height: 'calc(100% - 30px)',
      width: 'calc(100% - 30px)',
      maxWidth: '100%',
      maxHeight: '100%',
    });
    dialogRef.afterClosed().subscribe(() => {
      this.loadAllBI();
    });
  }
  openEditBI3Dialog(bi2: any, bi3: any): void {
    const dialogRef = this.dialog.open(EditBI3Component, {
      data: { bi2: bi2, bi3: bi3 },
      height: 'calc(100% - 30px)',
      width: 'calc(100% - 30px)',
      maxWidth: '100%',
      maxHeight: '100%',
    });
    dialogRef.afterClosed().subscribe(() => {
      this.loadAllBI();
    });
  }
  openAddBI4Dialog(bi3: any): void {
    const dialogRef = this.dialog.open(CreateBI4Component, {
      data: { bi3: bi3 },
      height: 'calc(100% - 30px)',
      width: 'calc(100% - 30px)',
      maxWidth: '100%',
      maxHeight: '100%',
    });
    dialogRef.afterClosed().subscribe(() => {
      this.loadAllBI();
    });
  }
  openEditBI4Dialog(bi3: any, bi4: any): void {
    const dialogRef = this.dialog.open(EditBI4Component, {
      data: { bi3: bi3, bi4: bi4 },
      height: 'calc(100% - 30px)',
      width: 'calc(100% - 30px)',
      maxWidth: '100%',
      maxHeight: '100%',
    });
    dialogRef.afterClosed().subscribe(() => {
      this.loadAllBI();
    });
  }

  delete(id: any, num: number) {
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
            switch (num) {
              case 1:
                this.businessIntelligenceService.deleteBusinessIntelligence(id).subscribe({
                  next: response => {
                    console.log('delete ' + id + ' ');
                    console.log('response');
                    console.log(response);
                    this.toastSrv.success(response?.message);
                    this.loadAllBI();
                  },
                  error: error => {
                    console.log('error');
                    console.log(error);
                  },
                });
                break;
              case 2:
                this.businessIntelligenceService.deleteBI1(id).subscribe({
                  next: response => {
                    console.log('delete ' + id + ' ');
                    console.log('response');
                    console.log(response);
                    this.toastSrv.success(response?.message);
                    this.loadAllBI();
                  },
                  error: error => {
                    console.log('error');
                    console.log(error);
                  },
                });
                break;
              case 3:
                this.businessIntelligenceService.deleteBI2(id).subscribe({
                  next: response => {
                    console.log('delete ' + id + ' ');
                    console.log('response');
                    console.log(response);
                    this.toastSrv.success(response?.message);
                    this.loadAllBI();
                  },
                  error: error => {
                    console.log('error');
                    console.log(error);
                  },
                });
                break;
              case 4:
                this.businessIntelligenceService.deleteBI3(id).subscribe({
                  next: response => {
                    console.log('delete ' + id + ' ');
                    console.log('response');
                    console.log(response);
                    this.toastSrv.success(response?.message);
                    this.loadAllBI();
                  },
                  error: error => {
                    console.log('error');
                    console.log(error);
                  },
                });
                break;
              case 5:
                this.businessIntelligenceService.deleteBI4(id).subscribe({
                  next: response => {
                    console.log('delete ' + id + ' ');
                    console.log('response');
                    console.log(response);
                    this.toastSrv.success(response?.message);
                    this.loadAllBI();
                  },
                  error: error => {
                    console.log('error');
                    console.log(error);
                  },
                });
                break;
              default:
                break;
            }
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
