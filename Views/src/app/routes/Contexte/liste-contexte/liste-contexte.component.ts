import { Component, ViewChild, OnInit, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
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
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import {
  AppearanceAnimation,
  ConfirmBoxInitializer,
  DialogLayoutDisplay,
  DisappearanceAnimation,
} from '@costlydeveloper/ngx-awesome-popup';
import { catchError, of, Subject, takeUntil, tap } from 'rxjs';
import { ContexteService } from '@shared/services/ContexteService/contexte.service';
import { Contexte } from '@shared/modeles/contexte/Contexte';
import { AjouterContexteComponent } from '../ajouter-contexte/ajouter-contexte.component';
import { UpdateContexteComponent } from '../update-contexte/update-contexte.component';

@Component({
  selector: 'app-liste-contexte',
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
  ],
  templateUrl: './liste-contexte.component.html',
  styleUrl: './liste-contexte.component.scss',
})
export class ListeContexteComponent implements OnInit {
  displayedColums: string[] = ['id', 'nom', 'description', 'etat', 'date_creation', 'Actions'];
  dataSource!: MatTableDataSource<Contexte>;
  private readonly contexteService = inject(ContexteService);
  private readonly toastSrv = inject(ToastrService);
  msg = '';
  destroy$: Subject<boolean> = new Subject<boolean>();
  readonly dialog = inject(MatDialog);
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  ngOnInit(): void {
    this.loadContextes();
  }

  loadContextes(): void {
    this.contexteService.getAllContextes().subscribe({
      next: response => {
        this.dataSource = new MatTableDataSource(response?.data || []);
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
      },
      error: error => {
        console.log(error);
        this.toastSrv.error('Impossible de charger la liste des contextes');
      },
    });
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  delete_contexte(id: number) {
    const newConfirmBox = new ConfirmBoxInitializer();
    newConfirmBox.setTitle('Suppression !');
    newConfirmBox.setMessage('Êtes vous sûr de vouloir supprimer ?');
    newConfirmBox.setConfig({
      layoutType: DialogLayoutDisplay.DANGER,
      animationIn: AppearanceAnimation.BOUNCE_IN,
      animationOut: DisappearanceAnimation.BOUNCE_OUT,
      buttonPosition: 'right',
    });

    newConfirmBox.setButtonLabels('OUI', 'NON');

    newConfirmBox
      .openConfirmBox$()
      .pipe(
        tap(value => {
          if (value.success) {
            this.contexteService.deleteContexte(id).subscribe({
              next: resultat => {
                this.toastSrv.success(resultat.message);
                this.loadContextes();
              },
              error: error => {
                console.log(error);
                this.toastSrv.error(error?.error?.message || 'Il y a eu lieu une erreur');
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

  openDialog_update(id: number): void {
    const dialogRef = this.dialog.open(UpdateContexteComponent, {
      data: { id: id },
      width: '600px',
      maxWidth: '100%',
    });
    dialogRef.afterClosed().subscribe(() => this.loadContextes());
  }

  openDialog(): void {
    const dialogRef = this.dialog.open(AjouterContexteComponent, {
      width: '600px',
      maxWidth: '100%',
    });
    dialogRef.afterClosed().subscribe(() => this.loadContextes());
  }
}
