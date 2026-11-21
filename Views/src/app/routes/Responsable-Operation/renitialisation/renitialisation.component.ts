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
import { ChargementComponent } from '@shared/components/chargement/chargement.component';
import { PermissionsService } from '@core/authorization/permissions.service';
import { ModifierCompteDialogComponent } from './modifier-compte-dialog.component';

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
  private readonly perms = inject(PermissionsService);
  /** Sites présents dans la liste (plusieurs : site à vision globale ou administrateur). */
  sites: string[] = [];
  siteFiltre = '';
  private texteFiltre = '';
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
        this.sites = [...new Set(result.map(r => r.site).filter((s): s is string => !!s))].sort((a, b) => a.localeCompare(b));
        // Permission Jauge : colonne « Modifier »
        if (this.perms.can('compte.jauge') && !this.displayedColumns.includes('modifier')) {
          this.displayedColumns = [...this.displayedColumns.slice(0, -1), 'modifier', 'actions'];
        }
        this.dataSource = new MatTableDataSource(result);
        // Recherche sur : Login, Nom, Prénom, Fonction, Programme, Site, ETAT et
        // login du Superviseur (le nom / prénom du superviseur ne sont PAS cherchés :
        // la colonne Superviseur est informative).
        // Mot par mot : une ligne est retenue si elle contient TOUS les mots saisis,
        // dans n'importe quel ordre (« Moussa Diallo » = « Diallo Moussa »).
        this.dataSource.filterPredicate = (data: Responsable_Operation) => {
          if (this.siteFiltre && data.site !== this.siteFiltre) return false;
          const filter = this.texteFiltre;
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
        if (this.siteFiltre || this.texteFiltre) this.relancerFiltre();
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
    this.texteFiltre = (event.target as HTMLInputElement).value.trim().toLowerCase();
    this.relancerFiltre();
  }
  filtrerSite(site: string) {
    this.siteFiltre = site || '';
    this.relancerFiltre();
  }
  /** Recherche texte + site : la valeur de `filter` sert seulement à déclencher le filtrage. */
  private relancerFiltre() {
    this.dataSource.filter = `${this.siteFiltre}|${this.texteFiltre}` || ' ';
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }
  download() {
    // colonnes techniques retirées de l'export
    const data = (this.downloadData || []).map(({ est_moi, id_Site, ...ligne }) => ligne);

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, this.filename);
  }

  /** Permission Jauge : modification complète ; recharge la liste après enregistrement. */
  modifierCompte(row: Responsable_Operation) {
    this.dialog
      .open(ModifierCompteDialogComponent, { data: { id: row.id, nom_utilisateur: row.nom_utilisateur }, width: '760px', maxWidth: '95vw' })
      .afterClosed()
      .subscribe(ok => {
        if (!ok) return;
        this.taostSrv.success(`Le compte ${row.nom_utilisateur} a été mis à jour.`);
        this.ngOnInit();
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
