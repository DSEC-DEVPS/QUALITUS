import { Component, inject, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { UserService } from '@shared/services/user.service';
import { motif_ma_voix_compte } from '@core';
import { AjouterMotifComponent } from '../ajouter-motif/ajouter-motif.component';
import { MatDialog } from '@angular/material/dialog';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import {
  AppearanceAnimation,
  ConfirmBoxInitializer,
  DialogLayoutDisplay,
  DisappearanceAnimation,
} from '@costlydeveloper/ngx-awesome-popup';
import { catchError, of, Subject, takeUntil, tap } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { UpdateMotifVoixCompteComponent } from '../update-motif-voix-compte/update-motif-voix-compte.component';
@Component({
  selector: 'app-motif-ma-voix-compte',
  standalone: true,
  imports: [MatCardModule, MatIconModule, MatTableModule, MatPaginatorModule],
  templateUrl: './motif-ma-voix-compte.component.html',
  styleUrl: './motif-ma-voix-compte.component.scss',
})
export class MotifMaVoixCompteComponent implements OnInit {
  private readonly userService = inject(UserService);
  private readonly toastSrv = inject(ToastrService);
  readonly dialog = inject(MatDialog);
  msg = '';
  destroy$: Subject<boolean> = new Subject<boolean>();
  displayedColumns: string[] = ['id', 'nomMotif', 'dateCreation', 'actions'];
  tableau_motifs!: MatTableDataSource<motif_ma_voix_compte>;
  ngOnInit(): void {
    this.userService.getAllMotifMaVoix().subscribe({
      next: data => {
        this.tableau_motifs = new MatTableDataSource(data);
      },
      error: error => {
        console.error(error);
      },
    });
  }
  openDialog(): void {
    this.dialog.open(AjouterMotifComponent, {
      height: 'calc(100% - 30px)',
      width: 'calc(100% - 30px)',
      maxWidth: '100%',
      maxHeight: '100%',
    });
  }

  openDialog_update(id: number): void {
    // Logic to update the motif with the given ID
    this.dialog.open(UpdateMotifVoixCompteComponent, {
      data: { id: id },
      height: 'calc(100% - 30px)',
      width: 'calc(100% - 30px)',
      maxWidth: '100%',
      maxHeight: '100%',
    });
  }

  delete_motif(id: number) {
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
            this.userService.deleteMotifMaVoixCompte(id).subscribe({
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

  download() {}
  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    // Apply the filter to your data source
  }
}
