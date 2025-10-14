import { DatePipe, CommonModule, TitleCasePipe } from '@angular/common';
import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { DomSanitizer } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { commentaire_by_fiche, consultation_by_fiche, infos_fiche } from '@core';
import { UserService } from '@shared/services/user.service';
import {
  AppearanceAnimation,
  ConfirmBoxInitializer,
  DialogLayoutDisplay,
  DisappearanceAnimation,
} from '@costlydeveloper/ngx-awesome-popup';
import { catchError, of, Subject, takeUntil, tap } from 'rxjs';
import * as XLSX from 'xlsx';
import { ToastrService } from 'ngx-toastr';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Location } from '@angular/common';
import Handsontable from 'handsontable';
import { HotTableModule } from '@handsontable/angular';
import { MatButtonModule } from '@angular/material/button';
@Component({
  selector: 'app-detail-fiche',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatTabsModule,
    MatIconModule,
    DatePipe,
    TitleCasePipe,
    MatTabsModule,
    MatTableModule,
    MatPaginatorModule,
    MatTooltipModule,
    HotTableModule,
    MatButtonModule,
  ],
  templateUrl: './detail-fiche.component.html',
  styleUrl: './detail-fiche.component.scss',
})
export class DetailFicheComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly userService = inject(UserService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly toast = inject(ToastrService);
  private readonly router = inject(Router);
  readonly dialog = inject(MatDialog);
  /** les attributs pour la lecture des fiches de type excel */
  fileId = '';
  workbook: XLSX.WorkBook | null = null;
  sheetNames: string[] = [];
  currentSheet = '';
  data: any[][] = [];
  excelBlob: Blob | null = null;
  hotSettings: Handsontable.GridSettings = {
    stretchH: 'all',
    autoWrapRow: true,
    autoWrapCol: true,
    readOnly: true,
    manualColumnResize: true,
    manualRowResize: true,
    contextMenu: false,
    className: 'htCenter',
    cell: [],
    // Personnalisation des en-têtes de colonne
    afterGetColHeader: function (col, TH) {
      // Appliquer le style gras aux en-têtes
      TH.style.fontWeight = 'bold';
      TH.style.backgroundColor = '#f3f3f3';
    },
  };
  /** Fin les attributs pour la lecture des fiches de type excel */
  private readonly location = inject(Location);
  displayedColumns: string[] = ['consultation'];
  displayedColumns_message: string[] = ['nom_utilisateur', 'message', 'dateCommentaire'];
  dataSource!: MatTableDataSource<consultation_by_fiche>;
  dataSource_message!: MatTableDataSource<commentaire_by_fiche>;
  table_consultation!: consultation_by_fiche[];
  table_infos_fiche!: infos_fiche[];
  table_commentaire!: commentaire_by_fiche[];
  infos_fiche!: infos_fiche;
  filename!: string;
  url: any;
  resultsLength!: number;
  resultsLength_message!: number;
  msg = '';
  destroy$: Subject<boolean> = new Subject<boolean>();
  router_id!: number;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  constructor(private _location: Location) {}
  ngOnInit(): void {
    const id = this.route.snapshot.params['id'];
    this.router_id = id;
    this.userService.getDetailsFicheByIdFiche(id).subscribe({
      next: fiche => {
        if (fiche.infos_fiche.extention === '.pdf') {
          this.infos_fiche = fiche.infos_fiche;
          this.dataSource = new MatTableDataSource(fiche.Consultations);
          this.resultsLength = fiche.Consultations.length;
          this.table_consultation = fiche.Consultations;
          this.table_commentaire = fiche.Commentaires;
          this.dataSource_message = new MatTableDataSource(fiche.Commentaires);
          this.resultsLength_message = fiche.Commentaires.length;
          this.selectedDocumentType(fiche.infos_fiche);
          this.filename = `Liste_Consultations_Commentaires_de_la_fiche_${fiche.infos_fiche.titre}.xlsx`;
          this.dataSource.paginator = this.paginator;
          this.dataSource.sort = this.sort;
        } else {
          if (fiche.infos_fiche.extention === '.xlsx') {
            /****** */

            this.infos_fiche = fiche.infos_fiche;
            this.dataSource = new MatTableDataSource(fiche.Consultations);
            this.resultsLength = fiche.Consultations.length;
            this.table_consultation = fiche.Consultations;
            this.table_commentaire = fiche.Commentaires;
            this.dataSource_message = new MatTableDataSource(fiche.Commentaires);
            this.resultsLength_message = fiche.Commentaires.length;
            this.filename = `Liste_Consultations_Commentaires_de_la_fiche_${fiche.infos_fiche.titre}.xlsx`;
            this.dataSource.paginator = this.paginator;
            this.dataSource.sort = this.sort;
            this.userService.getAllExcelFicheByIDFiche(id).subscribe({
              next: (data: Blob) => {
                console.log('Données Excel reçues:', data);
                console.log('Type MIME:', data.type);
                console.log('Taille:', data.size, 'octets');

                if (!data || data.size === 0) {
                  this.toast.error('Le fichier Excel est vide ou corrompu');
                  return;
                }

                this.excelBlob = data;
                const reader = new FileReader();

                reader.onload = (e: any) => {
                  try {
                    console.log('Lecture du fichier réussie');
                    const arrayBuffer = e.target.result;
                    console.log('ArrayBuffer obtenu, taille:', arrayBuffer.byteLength);

                    const data = new Uint8Array(arrayBuffer);
                    this.workbook = XLSX.read(data, { type: 'array' });
                    console.log('Workbook créé:', this.workbook);
                    this.sheetNames = this.workbook.SheetNames;
                    console.log('Feuilles trouvées:', this.sheetNames);

                    if (this.sheetNames.length > 0) {
                      this.currentSheet = this.sheetNames[0];
                      this.loadSheet();
                    } else {
                      this.toast.warning('Le fichier Excel ne contient aucune feuille');
                    }
                  } catch (error) {
                    console.error('Erreur lors de la lecture du fichier Excel:', error);
                    this.toast.error(
                      'Impossible de lire le fichier Excel. Format non valide ou fichier corrompu.'
                    );
                  }
                };

                reader.onerror = error => {
                  console.error('Erreur FileReader:', error);
                  this.toast.error('Erreur lors de la lecture du fichier');
                };

                reader.readAsArrayBuffer(data);
              },
              error: error => {
                console.log(error);
              },
            });
          }
        }
      },
      error: error => {
        console.log(error);
      },
    });
  }
  selectedDocumentType(type: any) {
    if (!type || !type.extention || !type.url) {
      console.warn('Type ou données manquantes dans selectedDocumentType:', type);
      return;
    }

    switch (type.extention) {
      case '.pdf':
        this.url = this.sanitizer.bypassSecurityTrustResourceUrl(type.url);
        break;
      case '.xlsx':
        this.url = this.sanitizer.bypassSecurityTrustResourceUrl(
          `https://view.officeapps.live.com/op/embed.aspx?src=${type.url}`
        );
        break;
      default:
        this.url = this.sanitizer.bypassSecurityTrustResourceUrl(
          `https://view.officeapps.live.com/op/embed.aspx?src=${type.url}`
        );
        break;
    }
  }
  download() {
    const consultations = this.table_consultation;
    const commentarie = this.table_commentaire;
    const ws2: XLSX.WorkSheet = XLSX.utils.json_to_sheet(consultations);
    const ws3: XLSX.WorkSheet = XLSX.utils.json_to_sheet(commentarie);

    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws2, 'Liste_Consultaitons');
    XLSX.utils.book_append_sheet(wb, ws3, 'Liste_Commentaires');
    XLSX.writeFile(wb, this.filename);
  }
  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }
  // Modifiez votre méthode loadSheet pour formater les données
  loadSheet(): void {
    if (this.workbook && this.currentSheet) {
      const worksheet = this.workbook.Sheets[this.currentSheet];
      this.data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Détection des en-têtes (première ligne)
      if (this.data.length > 0) {
        const headers = this.data[0];

        // Configuration des cellules personnalisées pour les en-têtes
        this.hotSettings.cell = [];

        // Appliquer le style gras aux cellules d'en-tête (première ligne)
        if (headers) {
          for (let col = 0; col < headers.length; col++) {
            this.hotSettings.cell.push({
              row: 0,
              col: col,
              className: 'header-cell', // Classe CSS personnalisée
            });
          }
        }
      }
    }
  }

  deleteSomething(message: string, type: string) {
    const newConfirmBox = new ConfirmBoxInitializer();
    if (type === 'archivage') {
      newConfirmBox.setTitle('Archivage');
    } else {
      newConfirmBox.setTitle('Suppression !');
    }

    newConfirmBox.setMessage(message);
    // Choose layout color type
    if (type === 'archivage') {
      newConfirmBox.setConfig({
        layoutType: DialogLayoutDisplay.WARNING, // SUCCESS | INFO | NONE | DANGER | WARNING
        animationIn: AppearanceAnimation.BOUNCE_IN, // BOUNCE_IN | SWING | ZOOM_IN | ZOOM_IN_ROTATE | ELASTIC | JELLO | FADE_IN | SLIDE_IN_UP | SLIDE_IN_DOWN | SLIDE_IN_LEFT | SLIDE_IN_RIGHT | NONE
        animationOut: DisappearanceAnimation.BOUNCE_OUT, // BOUNCE_OUT | ZOOM_OUT | ZOOM_OUT_WIND | ZOOM_OUT_ROTATE | FLIP_OUT | SLIDE_OUT_UP | SLIDE_OUT_DOWN | SLIDE_OUT_LEFT | SLIDE_OUT_RIGHT | NONE
        buttonPosition: 'right', // optional
      });
    } else {
      newConfirmBox.setConfig({
        layoutType: DialogLayoutDisplay.DANGER, // SUCCESS | INFO | NONE | DANGER | WARNING
        animationIn: AppearanceAnimation.BOUNCE_IN, // BOUNCE_IN | SWING | ZOOM_IN | ZOOM_IN_ROTATE | ELASTIC | JELLO | FADE_IN | SLIDE_IN_UP | SLIDE_IN_DOWN | SLIDE_IN_LEFT | SLIDE_IN_RIGHT | NONE
        animationOut: DisappearanceAnimation.BOUNCE_OUT, // BOUNCE_OUT | ZOOM_OUT | ZOOM_OUT_WIND | ZOOM_OUT_ROTATE | FLIP_OUT | SLIDE_OUT_UP | SLIDE_OUT_DOWN | SLIDE_OUT_LEFT | SLIDE_OUT_RIGHT | NONE
        buttonPosition: 'right', // optional
      });
    }

    newConfirmBox.setButtonLabels('OUI', 'NON');

    // Simply open the popup and observe button click
    newConfirmBox
      .openConfirmBox$()
      .pipe(
        tap(value => {
          if (value.success) {
            if (type === 'archivage') {
              this.userService.archive_fiche(this.router_id).subscribe({
                next: result => {
                  this.toast.success(result.message);
                },
                error: error => {
                  console.log(error);
                },
              });
            } else {
              this.userService.deleteFiche(this.router_id).subscribe({
                next: resultat => {
                  this.toast.success(resultat.message);
                  this._location.back();
                },
                error: error => {
                  console.log(error);
                },
              });
            }
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
  openDialog(id: number) {
    this.router.navigateByUrl(`mon-espace/Fiche/update/${id}`);
  }
  back() {
    this.location.back();
  }
}
