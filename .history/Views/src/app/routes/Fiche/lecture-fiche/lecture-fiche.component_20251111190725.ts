import { Component, ViewEncapsulation, OnInit, inject, model } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { DomSanitizer } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService, url, User } from '@core';
import { UserService } from '@shared/services/user.service';
import { MatButtonModule } from '@angular/material/button';

import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import * as XLSX from 'xlsx';
import Handsontable from 'handsontable';
import { HotTableModule } from '@handsontable/angular';
import { registerAllModules } from 'handsontable/registry';
import {
  AppearanceAnimation,
  ConfirmBoxInitializer,
  DialogLayoutDisplay,
  DisappearanceAnimation,
} from '@costlydeveloper/ngx-awesome-popup';
import { catchError, of, Subject, takeUntil, tap } from 'rxjs';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
import { Location } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { Z } from '@angular/cdk/keycodes';
registerAllModules();
@Component({
  selector: 'app-lecture-fiche',
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    MatIconModule,
    MatTabsModule,
    MatTableModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    MatTooltipModule,
    CommonModule,
    MatCheckboxModule,
    MatRadioModule,
    TitleCasePipe,
    MatCardModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    HotTableModule,
    FormsModule,
  ],
  templateUrl: './lecture-fiche.component.html',
  styleUrl: './lecture-fiche.component.scss',
})
export class LectureFicheComponent implements OnInit {
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
  private readonly route = inject(ActivatedRoute);
  private readonly userService = inject(UserService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly toast = inject(ToastrService);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly location = inject(Location);

  msg = '';
  destroy$: Subject<boolean> = new Subject<boolean>();
  fiche!: url;
  formGroum!: FormGroup;
  formGroup_Quiz!: FormGroup;
  url: any;
  logo_Orange = 'img/Orange_logo.png';
  imageOrangeLogo = 'img/Orange_logo.png';
  show_value_Quiz = false;
  show_div_value_sondage = false;
  show_value_utilite = false;
  show_div_value_commentaire = false;
  router_id!: number;
  user!: User;
  col_div_iframe = 'col-md-11 pt-2 m-auto';
  resultat_Quiz!: number;
  constructor(private _location: Location) {}
  ngOnInit(): void {
    const id = this.route.snapshot.params['id'];
    this.router_id = id;
    this.formGroum = this.fb.group({
      message: [null, [Validators.required]],
      id_Fiche: [id],
    });
    this.formGroup_Quiz = this.fb.group({
      Reponse1: [null, [Validators.required]],
      Reponse2: [null, [Validators.required]],
    });

    this.auth.user().subscribe({
      next: user => {
        this.user = user;
      },
      error: error => {
        console.log(error);
      },
    });
    this.userService.getAllFicheByIDFiche(id).subscribe({
      next: result => {
        this.fiche = result;
        if (result.Utilite) {
          this.show_div_value_sondage = result.Utilite;
          this.show_value_utilite = true;
          this.col_div_iframe = 'col-md-9 pt-2';
        }
        if (result.Quiz.length > 0) {
          this.show_value_Quiz = true;
          this.col_div_iframe = 'col-md-9 pt-2';
        }
        if (result.Commentaire) {
          this.show_div_value_commentaire = result.Commentaire;
          this.col_div_iframe = 'col-md-9 pt-2';
        }
        if (
          result.extention === '.pdf' ||
          result.extention === '.pptx' ||
          result.extention === '.docx'
        ) {
          console.log(this.fiche);
          this.selectedDocumentType(result);
          console.log(this.url);
        } else {
          if (result.extention === '.xlsx') {
            /****** */
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
                this.downloadExcel();
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

  changeSheet(): void {
    this.loadSheet();
  }

  downloadExcel(): void {
    if (this.excelBlob) {
      const url = window.URL.createObjectURL(this.excelBlob);
      const a = document.createElement('a');
      document.body.appendChild(a);
      a.style.display = 'none';
      a.href = url;
      a.download = `${this.fiche.titre}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }
  }
  back() {
    if (window.history.length > 1) {
      this.location.back();
    } else {
      // Fallback to home page if no history
      this.router.navigateByUrl('/');
    }
  }

  selectedDocumentType(type: url) {
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
    }
  }

  toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }
  addCommentaire() {
    console.log(this.formGroum.value);
    this.userService.addCommentaire(this.formGroum.value).subscribe({
      next: message => {
        this.toast.success(message.message);
        this.formGroum.reset();
      },
      error: error => {
        console.log(error);
        this.toast.error("Une erreur s'est produite ");
      },
    });
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
                  this.router.navigateByUrl(`mon-espace/Fiche/archives`);
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
  response_quiz() {
    if (
      this.fiche.Quiz[0].reponseQuestion === this.formGroup_Quiz.value.Reponse1 &&
      this.fiche.Quiz[1].reponseQuestion === this.formGroup_Quiz.value.Reponse2
    ) {
      this.resultat_Quiz = 1;
      this.userService
        .response_Quiz(this.router_id, { resultat_Quiz: this.resultat_Quiz })
        .subscribe({
          next: resultat => {
            this.userService.showScoreNotification(100, 'Bravo, Vous avez réussi tous les quiz !');
          },
          error: error => {
            this.userService.showScoreNotification(
              0,
              `Désolé, vous n'avez pas réussi tous les quiz. Votre superviseur vous en enverra d'autres.`
            );
            console.log(error);
          },
        });
    } else {
      this.resultat_Quiz = 0;
      this.userService
        .response_Quiz(this.router_id, { resultat_Quiz: this.resultat_Quiz })
        .subscribe({
          next: resultat => {
            this.userService.showScoreNotification(
              0,
              `Désolé, vous n'avez pas réussi tous les quiz. Votre superviseur vous en enverra d'autres.`
            );
          },
          error: error => {
            console.log(error);
          },
        });
    }
    this.show_value_Quiz = false;
  }
  reponse_utilite(id: number) {
    this.userService.reponse_utilite(this.router_id, { resultat_utilite: id }).subscribe({
      next: resultat => {
        this.show_value_utilite = false;
      },
      error: error => {
        console.log(error);
      },
    });
  }

  update(id: number) {
    this.router.navigateByUrl(`mon-espace/Fiche/update/${id}`);
  }
}
