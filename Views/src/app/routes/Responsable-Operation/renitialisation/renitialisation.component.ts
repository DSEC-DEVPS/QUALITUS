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
import { catchError, of, Subject, takeUntil, tap, finalize } from 'rxjs';
import { CommonModule } from '@angular/common';
import { UserService } from '@shared/services/user.service';
import { Responsable_Operation } from '@core';
import { ToastrService } from 'ngx-toastr';
import { Router } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import {
  ModifierProgrammeDialogComponent,
  ModifierProgrammeResultat,
} from './modifier-programme-dialog.component';
import { ChargementComponent } from '@shared/components/chargement/chargement.component';

/** Constants used to fill up our data base. */

/**
 * @title Data table with sorting, pagination, and filtering.
 */
@Component({
  selector: 'app-quiz-en-echecs',
  standalone: true,
  templateUrl: './renitialisation.component.html',
  styleUrl: './renitialisation.component.scss',
  imports: [ChargementComponent,
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatCardModule,
    MatIconModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatTooltipModule,
    MatDialogModule,
  ],
})
export class RenitialisationComponent implements OnInit, OnDestroy, AfterViewInit {
  chargement = true;
  displayedColumns: string[] = [
    'profil',
    'nom_utilisateur',
    'nom',
    'prenom',
    'fonction',
    'programme',
    'site',
    'status',
    'superviseur',
    'dateCreation',
    'details',
    'actions',
  ];
  private readonly userService = inject(UserService);
  private readonly taostSrv = inject(ToastrService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  // initialisé vide : ngAfterViewInit s\'exécute avant l\'arrivée des données
  dataSource = new MatTableDataSource<Responsable_Operation>([]);
  filename = `Liste_des_Agents.xlsx`;
  downloadData!: Responsable_Operation[];
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  ngOnInit(): void {
    this.chargement = true;
    this.userService.getAllAgentByRo().pipe(finalize(() => (this.chargement = false))).subscribe({
      next: result => {
        this.downloadData = result;
        this.dataSource = new MatTableDataSource(result);
        // Recherche sur : Login, Nom, Prénom, Fonction, Programme, Site, ETAT et
        // login du Superviseur (le nom / prénom du superviseur ne sont PAS cherchés :
        // la colonne Superviseur est informative).
        // Mot par mot : une ligne est retenue si elle contient TOUS les mots saisis,
        // dans n'importe quel ordre (« Moussa Diallo » = « Diallo Moussa »).
        this.dataSource.filterPredicate = (data: Responsable_Operation, filter: string) => {
          const texte = [
            data.nom_utilisateur, data.nom, data.prenom, data.fonction, data.programme,
            data.site, data.status, data.superviseur,
          ]
            .map(v => (v ?? '').toString().toLowerCase())
            .join(' ');
          return filter
            .split(/\s+/)
            .filter(mot => mot.length > 0)
            .every(mot => texte.includes(mot));
        };
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

  /** Ouvre la fenêtre de modification du programme ; met la ligne à jour sans recharger. */
  modifierProgramme(row: Responsable_Operation) {
    this.dialog
      .open<ModifierProgrammeDialogComponent, Responsable_Operation, ModifierProgrammeResultat>(
        ModifierProgrammeDialogComponent,
        { data: row, width: '440px' }
      )
      .afterClosed()
      .subscribe(resultat => {
        if (!resultat) return;
        row.id_Programme = resultat.id_Programme;
        row.programme = resultat.programme;
        // Réaffecte les données pour que la recherche / le tri prennent en compte le changement
        this.dataSource.data = [...this.dataSource.data];
        this.taostSrv.success(resultat.message);
      });
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

  /** Même page que « voir plus » de Mes agents ; le bouton Retour ramène ici. */
  voirDetails(id: number): void {
    this.router.navigate(['/mon-espace/mes-agents/details-agent', id], {
      state: { retour: '/mon-espace/RO/renitialisation-password' },
    });
  }
}
