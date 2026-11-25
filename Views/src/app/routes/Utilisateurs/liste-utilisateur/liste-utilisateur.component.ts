import {
  Component,
  ViewChild,
  OnInit,
  inject,
  ChangeDetectionStrategy,
  Inject,
} from '@angular/core';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { UserService } from '@shared/services/user.service';
import { Utilisateur } from '@core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TitleCasePipe } from '@angular/common';
import { MatIcon, MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { AjouterUtilisateurComponent } from '../ajouter-utilisateur/ajouter-utilisateur.component';
import { ImportUtilisateursComponent } from '../import-utilisateurs/import-utilisateurs.component';
import { CanDirective } from '@core/authorization/can.directive';
import * as ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';
import {
  AppearanceAnimation,
  ConfirmBoxInitializer,
  DialogLayoutDisplay,
  DisappearanceAnimation,
} from '@costlydeveloper/ngx-awesome-popup';
import { catchError, of, Subject, takeUntil, tap, finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { ChargementComponent } from '@shared/components/chargement/chargement.component';
import { ConfirmationService } from '@shared/services/confirmation.service';
import { ModifierCompteDialogComponent } from '../../Responsable-Operation/renitialisation/modifier-compte-dialog.component';
@Component({
  selector: 'app-table-overview-example',
  standalone: true,
  imports: [ChargementComponent,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatGridListModule,
    MatTooltipModule,
    MatIcon,
    TitleCasePipe,
    CanDirective,
  ],
  templateUrl: './liste-utilisateur.component.html',
  styleUrl: './liste-utilisateur.component.scss',
})
export class ListeUtilisateurComponent implements OnInit {
  chargement = true;
  displayedColumns: string[] = [
    'id',
    'nom_utilisateur',
    'Fonction',
    'Site',
    'Programme',
    'status',
    'ACTIONS',
  ];
  msg = '';
  destroy$: Subject<boolean> = new Subject<boolean>();
  dataSource!: MatTableDataSource<Utilisateur>;
  /**le nom par defaut de la fiche à télécharger */
  filename = `Liste_Utilisateurs.xlsx`;
  downloadData!: Utilisateur[];
  Utilisateur!: Utilisateur[];
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  private readonly router = inject(Router);
  readonly dialog = inject(MatDialog);
  private readonly userService = inject(UserService);
  private readonly taostSrv = inject(ToastrService);
  private readonly confirmation = inject(ConfirmationService);

  /** Ouvre « Habilitations › Droits par utilisateur » sur cette personne. */
  ouvrirDroits(element: { id: number }): void {
    this.router.navigate(['/mon-espace/habilitations/droits-utilisateur'], { queryParams: { id: element.id } });
  }
  ngOnInit(): void {
    this.chargement = true;
    this.userService.getAllUtilisateur().pipe(finalize(() => (this.chargement = false))).subscribe(user => {
      this.dataSource = new MatTableDataSource(user);
      this.downloadData = user;
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

  /** Import Excel de comptes ; la liste est rechargée si des comptes ont été créés. */
  openImport(): void {
    this.dialog
      .open(ImportUtilisateursComponent, { width: 'calc(100% - 30px)', maxWidth: '1200px', maxHeight: 'calc(100% - 30px)', disableClose: true })
      .afterClosed()
      .subscribe(cree => {
        if (cree) this.ngOnInit();
      });
  }

  openDialog(): void {
    this.dialog.open(AjouterUtilisateurComponent, {
      height: 'calc(100% - 30px)',
      width: 'calc(100% - 30px)',
      maxWidth: '100%',
      maxHeight: '100%',
    });
  }

  openDialog_update(
    enterAnimationDuration: string,
    exitAnimationDuration: string,
    id: number
  ): void {
    this.dialog.open(UpdateUtilisateurComponent, {
      data: { id: id },
      width: '250px',
      enterAnimationDuration,
      exitAnimationDuration,
    });
  }

  /** Modification complète du compte (même fenêtre que « Gérer les comptes » / Jauge). */
  modifierCompte(element: any): void {
    this.dialog
      .open(ModifierCompteDialogComponent, { data: { id: element.id, nom_utilisateur: element.nom_utilisateur }, width: '760px', maxWidth: '95vw' })
      .afterClosed()
      .subscribe(ok => {
        if (!ok) return;
        this.taostSrv.success(`Le compte ${element.nom_utilisateur} a été mis à jour.`);
        this.ngOnInit();
      });
  }

  /** Remet le mot de passe par défaut du compte (après confirmation). */
  async reinitialiserMotDePasse(element: any): Promise<void> {
    if (!(await this.confirmation.confirmer({
      titre: 'Réinitialiser le mot de passe',
      message: `Remettre le mot de passe par défaut de ${element.nom_utilisateur} ?`,
      type: 'attention',
    }))) return;
    this.userService.restore_password(element.id).subscribe({
      next: r => this.taostSrv.success(r.message),
      error: () => {},
    });
  }

  NavigeOnSinglePageUtilisateur(id: number) {
    // Fiche détaillée commune avec « Mes agents » ; « Retour » revient à cette liste.
    this.router.navigate(['/mon-espace/Utilisateurs/details', id], {
      state: { retour: '/mon-espace/Utilisateurs/Liste' },
    });
  }

  deleteSomething(id: number) {
    const newConfirmBox = new ConfirmBoxInitializer();
    newConfirmBox.setTitle('Suppréssion du compte');
    newConfirmBox.setMessage('Êtes vous sûr de vouloir définitivement ce compte  ?');

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
            this.userService.deleteUtilisateur(id).subscribe({
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

  onchange(event: any) {
    const file = event.target.files[0];
    const fileReader = new FileReader();
    fileReader.onload = (e: any) => {
      const arrayBuffer = e.target.result;
      this.pareExcel(arrayBuffer);
    };
    fileReader.readAsArrayBuffer(file);
  }

  pareExcel(arrayBuffer: any): void {
    const workbook = new ExcelJS.Workbook();
    workbook.xlsx.load(arrayBuffer).then(workbook => {
      workbook.eachSheet((workbook, sheetId) => {
        const jsonData: any[] = [];
        workbook.eachRow({ includeEmpty: false }, (row, rowNumber) => {
          const rowData: any = {};
          row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            rowData[`column${colNumber}`] = cell.value;
          });
          jsonData.push(rowData);
        });
      });
      //console.log(JSON.stringify(jsonData,null,2));
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

@Component({
  selector: 'dialog-animations-example-dialog',
  templateUrl: 'update-dialog.component.html',
  standalone: true,
  imports: [MatButtonModule, MatDialogClose, MatDialogTitle, MatDialogContent, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpdateUtilisateurComponent implements OnInit {
  readonly dialogRef = inject(MatDialogRef<UpdateUtilisateurComponent>);
  private readonly userService = inject(UserService);
  private readonly toastSrv = inject(ToastrService);
  id!: any;
  constructor(@Inject(MAT_DIALOG_DATA) private data: any) {
    this.id = data.id;
  }
  ngOnInit(): void {}
  update(type_action: string) {
    this.userService.update_utilisateur(this.id, { ETAT: type_action }).subscribe({
      next: resultat => {
        this.toastSrv.success(resultat.message);
      },
      error: error => {
        console.log(error);
      },
    });
  }
}
