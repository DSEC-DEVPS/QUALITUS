import { ChangeDetectorRef,AfterViewInit, Component, ElementRef, Inject, inject, OnInit, ViewChild } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { UserService } from '@shared/services/user.service';
import { MatSort } from '@angular/material/sort';
import {  Fiche, reporting,  User } from '@core';
import { MatRadioModule } from '@angular/material/radio';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import {  Router } from '@angular/router';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { ViewEncapsulation } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import {  Subject, switchMap, } from 'rxjs';
import { ChangeDetectionStrategy } from '@angular/core';
import { MatDialogActions, MatDialogClose } from '@angular/material/dialog';
import Handsontable from 'handsontable';
import { registerAllModules } from 'handsontable/registry';
import * as XLSX from 'xlsx';
import { ToastrService } from 'ngx-toastr';
import { HotTableModule } from '@handsontable/angular';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { init } from 'pptx-preview';

registerAllModules();
@Component({
  selector: 'app-verification',
  templateUrl: './verification.component.html',
  styleUrl: './verification.component.scss',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTabsModule,
    MatTableModule,
    MatRadioModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatSelectModule,
    MatCheckboxModule,
    MatButtonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatDatepickerModule,
    MatDatepickerModule,
    MatFormFieldModule,
    FormsModule,
    MatInputModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatTooltipModule,
  ],
})
export class VerificationComponent implements OnInit {
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);
  private fb = inject(FormBuilder);
  private readonly toast = inject(ToastrService);
  form_echantillon!: FormGroup;
   form_echantillon_M_1!: FormGroup;
  dateForm!: FormGroup;
  form!: FormGroup;
  form_M_1!: FormGroup;
  readonly dialog = inject(MatDialog);
  show_echantillon_actif = false;
  displayedColumns = ['id', 'titre', 'type', 'dateDebut','dateFin', 'Gestionnaire', 'exactitude'];
  displayedColumns_reporting = [
    'id',
    'id_CONTROLE',
    'titre',
    'ETAT',
    'nom_utilisateur',
    'exactitude',
    'on_time',
    'dateControle',
  ];
  score = 0;
  //table_echantillon!: Fiche[];
  table_echantillonnage_reponse!: Fiche[];
  dataSource = new MatTableDataSource<Fiche>([]);
  dataSource_M_1 = new MatTableDataSource<Fiche>([]);
  dataSource_reporting = new MatTableDataSource<reporting>([]);
  reporting_data: reporting[] = [];
  show_echantillonnage_template = false;
  show_reporting_template = false;
  show_echantillonnage_template_M_1 = false;
  @ViewChild(MatSort) sort!: MatSort;
  ngOnInit() {
    this.form = this.fb.group({
      items: this.fb.array([]),
    });
    this.form_M_1 = this.fb.group({
      items: this.fb.array([]),
    });
this.form_echantillon=this.fb.group({
 quantite_echantillon:[null,[Validators.required]]
});
this.form_echantillon_M_1=this.fb.group({
 quantite_echantillon_M_1:[null,[Validators.required]]
});
    this.dateForm = this.fb.group({
      typeControle: ['', [Validators.required]],
      dateDebut: ['', [Validators.required]],
      dateFin: ['', [Validators.required]],
    });
  }

  // Getter pour accéder facilement au FormArray
  get itemsFormArray(): FormArray {
    return this.form.get('items') as FormArray;
  }

  get itemsFormArray_M_1(): FormArray {
    return this.form_M_1.get('items') as FormArray;
  }
  resetFormArray(items: Fiche[]): void {
    // Vider d'abord le FormArray
    while (this.itemsFormArray.length !== 0) {
      this.itemsFormArray.removeAt(0);
    }

    // Ajouter un FormGroup pour chaque item
    items.forEach(item => {
      const itemGroup = this.fb.group({
        id: [item.id],
        response: [item.response, Validators.required],
      });
      this.itemsFormArray.push(itemGroup);
    });
  }
  allResponsesSelected_M_1(): boolean {
    if (this.itemsFormArray_M_1.length === 0) return false;

    for (let i = 0; i < this.itemsFormArray_M_1.length; i++) {
      const control = this.itemsFormArray_M_1.at(i).get('response');
      if (!control?.value) {
        return false;
      }
    }
    return true;
  }

  resetFormArray_M_1(items: Fiche[]): void {
    // Vider d'abord le FormArray
    while (this.itemsFormArray_M_1.length !== 0) {
      this.itemsFormArray_M_1.removeAt(0);
    }

    // Ajouter un FormGroup pour chaque item
    items.forEach(item => {
      const itemGroup = this.fb.group({
        id: [item.id],
        response: [item.response, Validators.required],
      });
      this.itemsFormArray_M_1.push(itemGroup);
    });
  }
  allResponsesSelected(): boolean {
    if (this.itemsFormArray.length === 0) return false;

    for (let i = 0; i < this.itemsFormArray.length; i++) {
      const control = this.itemsFormArray.at(i).get('response');
      if (!control?.value) {
        return false;
      }
    }
    return true;
  }

  // Méthode pour obtenir le FormGroup correspondant à un index
  getFormGroupAt(index: number): FormGroup {
    return this.itemsFormArray.at(index) as FormGroup;
  }

  // Méthode pour obtenir le FormGroup correspondant à un index
  getFormGroupAt_M_1(index: number): FormGroup {
    return this.itemsFormArray_M_1.at(index) as FormGroup;
  }

  display_echantillon_actif() {
    this.show_echantillonnage_template = true;
    this.userService.getResultat_controle_actif(this.form_echantillon.value).subscribe({
      next: resultat => {
        // Mettre à jour la source de données
        this.dataSource.data = resultat;
        this.resetFormArray(resultat);
        console.log(" le reotur dispaly echantillon ");
        console.log(resultat);
        this.show_echantillon_actif = true;
      },
      error: error => {
        console.log(error);
      },
    });
  }
  display_echantillon_M_1() {
    this.show_echantillonnage_template = true;
    this.userService.getResultat_controle_m_1(this.form_echantillon_M_1.value).subscribe({
      next: resultat => {
        console.log(resultat);
        this.dataSource_M_1.data = resultat;
        this.resetFormArray_M_1(resultat);
        this.show_echantillonnage_template_M_1 = true;
      },
      error: error => {
        console.log(error);
      },
    });
  }
  lire(id: number) {
    this.router.navigateByUrl(`lecture-fiche/${id}`);
  }
  chargement_reporting() {
    console.log(this.dateForm.value);
    this.userService.getReporting(this.dateForm.value).subscribe({
      next: resultat => {
        console.log(resultat);
        this.reporting_data = resultat.reporting_data;
        this.dataSource_reporting.data = resultat.reporting_data;
        this.score = resultat.score;
        this.show_reporting_template = true;
      },
      error: error => {
        console.log(error);
      },
    });
  }
  // Envoyer les réponses à la base de données
  submitResponses(): void {
    if (this.form.valid) {
      const responses = this.itemsFormArray.controls.map(control => {
        return {
          id: control.get('id')?.value,
          response: control.get('response')?.value,
        };
      });

      /** les services pour envoyer les données */
      let value = 0;
      Object.keys(responses).forEach(cle => {
        if (responses[+cle].response === '1') {
          value = value + 1;
        }
      });
      console.log(responses);
      const score = Math.round((value / responses.length) * 100);
      this.userService.addControle(responses, 'controle_actif', score).subscribe({
        next: resultat => {
          this.toast.success(resultat.message);
        },
        error: error => {
          console.log(error);
        },
      });
      const message =
        score === 0
          ? `Tous les chargements de l'échantillon sont éronés`
          : `de l'echantillon du controle de contenu Actif sont exacts`;
      this.userService.showScoreNotification(score, message);
      /** les services pour envoyer les données */
    }
  }
  submitResponses_M_1(): void {
    if (this.form_M_1.valid) {
      const responses = this.itemsFormArray_M_1.controls.map(control => {
        return {
          id: control.get('id')?.value,
          response: control.get('response')?.value,
        };
      });
      let value = 0;
      Object.keys(responses).forEach(cle => {
        if (responses[+cle].response === '1') {
          value = value + 1;
        }
      });
      const score = Math.round((value / responses.length) * 100);
      this.userService.addControle(responses, 'controle_m_1', score).subscribe({
        next: resultat => {
          this.toast.success(resultat.message);
        },
        error: error => {
          console.log(error);
        },
      });
      /** les services pour envoyer les données */
      const message =
        score === 0
          ? `Tous les chargements de l'échantillon sont éronés`
          : `de l'echantillon du controle de contenu Actif sont exacts`;
      this.userService.showScoreNotification(score, message);
    }
  }
  openDialog(id: number): void {
    this.dialog.open(LectureFicheComponent, {
      data: { id: id },
      height: 'calc(100% - 30px)',
      width: 'calc(100% - 30px)',
      maxWidth: '100%',
      maxHeight: '100%',
    });
  }
  download() {
    const transformedData = this.reporting_data.map(item => {
      const { id, ...itemWithoutId } = item; // Remove 'id' key
      return itemWithoutId;
    });

    // Add a result row at the bottom
    const resultRow = {
      id_CONTROLE: 'Résultat',
      titre: this.score,
      ETAT: '',
      nom_utilisateur: '',
      exactitude: '',
      dateControle: '',
    };

    // Add the result row to the data
    const finalData = [...transformedData, resultRow];
    const ws1: XLSX.WorkSheet = XLSX.utils.json_to_sheet(finalData);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws1, 'LISTE');
    XLSX.writeFile(wb, 'reporting.xlsx');
  }
}
/*
@Component({
  selector: 'app-lecture-fiche',
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    MatIconModule,
    MatTabsModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    MatTooltipModule,
    CommonModule,
    MatCheckboxModule,
    MatRadioModule,
    MatDialogActions,
    MatDialogClose,
    MatButtonModule,
    HotTableModule,
    ReactiveFormsModule,
    MatDialogModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './lecture-fiche.component.html',
  styleUrl: './verification.component.scss',
})
export class LectureFicheComponent implements OnInit {
  private readonly userService = inject(UserService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly toast = inject(ToastrService);
  private readonly cdr = inject(ChangeDetectorRef);
  readonly dialogRef = inject(MatDialogRef<LectureFicheComponent>);
   private pptxPreviewer: any;
    @ViewChild('pptxWrapper', { static: false }) pptxWrapper!: ElementRef<HTMLDivElement>;
  /** les attributs pour la lecture des fiches de type excel */
/*
  fileId = '';
  workbook: XLSX.WorkBook | null = null;
  sheetNames: string[] = [];
  currentSheet = '';
  data_hot_table: any[][] = [];
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
/*
  msg = '';
  destroy$: Subject<boolean> = new Subject<boolean>();
  fiche!: url;
  url: any;
  id = 0;
   pptxBlob: Blob | null = null;
     // Zoom state
  zoom = 1;
  minZoom = 0.2;
  maxZoom = 3;
  zoomStep = 0.1;
  logo_Orange = 'img/Orange_logo.png';
  imageOrangeLogo = 'img/Orange_logo.png';
  constructor(@Inject(MAT_DIALOG_DATA) private data: any) {
    this.id = data.id;
    console.log('id envoyé est ', this.id);
    this.loadData();
  }
ngOnInit(): void {
  this.loadData();
}
  loadData(): void {
    this.userService.getAllFicheByIDFiche(this.id).subscribe({
      next: result => {
        this.fiche = result;
        console.log(this.fiche);
        if (result.extention === '.pdf') {
          this.selectedDocumentType(result);
          this.cdr.detectChanges();
        } else {
          if (result.extention === '.xlsx') {
            this.userService.getAllExcelFicheByIDFiche(this.id).subscribe({
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
                      this.cdr.detectChanges();
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
          }else{
            if(result.extention === '.pptx'){
              this.userService
                            .getAllFicheByIDFiche(this.id)
                            .pipe(
                              switchMap((meta: any) => {
                                console.log('Metadata reçues:', meta);
                                return this.userService.downloadFileByUrl(meta.url); // retourne Observable<Blob>
                              })
                            )
                            .subscribe({
                              next: (data: Blob) => {
                                console.log('data reçu:', data);
                                console.log('Données Pptx reçues:', data);
                                console.log('Type MIME:', data.type);
                                console.log('Taille:', data.size, 'octets');
                                this.pptxPreviewer = init(this.pptxWrapper.nativeElement, {
                                  width: 900,
                                  height: 600,
                                });
              
                                this.loadPptx(data);
                                this.pptxBlob = data;
                                this.cdr.detectChanges();
                              },
                              error: err => console.error(err),
                            });
            }
          }
        }
      },
      error: error => {
        console.log(error);
      },
    });
  }
  async loadPptx(data: Blob): Promise<void> {
    if (!(data instanceof Blob)) {
      console.error("loadPptx: data n'est pas un Blob :", data);
      this.toast.error('Le fichier PPTX est corrompu.');
      return;
    }

    try {
      // conversion propre
      const arrayBuffer = await data.arrayBuffer();

      // affichage
      this.pptxPreviewer.preview(arrayBuffer);
    } catch (err) {
      console.error('Erreur lors de la conversion Blob -> ArrayBuffer', err);
      this.toast.error('Impossible de lire le fichier PPTX.');
    }
  }

  // Modifiez votre méthode loadSheet pour formater les données
  loadSheet(): void {
    if (this.workbook && this.currentSheet) {
      const worksheet = this.workbook.Sheets[this.currentSheet];
      this.data_hot_table = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (this.data_hot_table.length > 0) {
        const headers = this.data_hot_table[0];

        this.hotSettings.cell = [];
        if (headers) {
          for (let col = 0; col < headers.length; col++) {
            this.hotSettings.cell.push({
              row: 0,
              col: col,
              className: 'header-cell', // Classe CSS personnalisée
            });
          }
        }
        this.cdr.detectChanges();
        setTimeout(() => {
          this.cdr.detectChanges();
        }, 100);
      }
    }
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
  onNoClick(): void {
    this.dialogRef.close();
  }
  // Zoom controls
  zoomIn() {
    this.setZoom(this.zoom + this.zoomStep);
  }
  zoomOut() {
    this.setZoom(this.zoom - this.zoomStep);
  }
  resetZoom() {
    this.setZoom(1);
  }
  onSlider(event: Event) {
    const v = (event.target as HTMLInputElement).valueAsNumber;
    this.setZoom(v);
  }
  private setZoom(value: number) {
    this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, Math.round(value * 100) / 100));
  }
    // molette : si Ctrl (ou meta) est enfoncé, on effectue un zoom
  onWheel(event: WheelEvent) {
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      const delta = event.deltaY;
      if (delta < 0) {
        this.zoomIn();
      } else {
        this.zoomOut();
      }
    }
    // sinon laisser le scroll normal
  }

    downloadPptx(): void {
    if (!this.pptxBlob) {
      this.toast.error('Aucun fichier PPTX à télécharger');
      return;
    }

    const url = URL.createObjectURL(this.pptxBlob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.fiche?.titre || 'presentation'}.pptx`;
    a.style.display = 'none';

    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }


}

*/


// Importez vos services et interfaces
// import { UserService } from './path-to-your-service';
// interface url { ... }

@Component({
  selector: 'app-lecture-fiche',
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    MatIconModule,
    MatTabsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    MatTooltipModule,
    CommonModule,
    MatCheckboxModule,
    MatRadioModule,
    MatDialogActions,
    MatDialogClose,
    HotTableModule,
    MatDialogModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './lecture-fiche.component.html',
  styleUrl: './verification.component.scss',
})
export class LectureFicheComponent implements OnInit, AfterViewInit {
  private readonly userService = inject(UserService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly toast = inject(ToastrService);
  private readonly cdr = inject(ChangeDetectorRef);
  readonly dialogRef = inject(MatDialogRef<LectureFicheComponent>);

  // ViewChild avec static: false pour les éléments dans *ngIf
  @ViewChild('pptxWrapper', { static: false }) pptxWrapper?: ElementRef<HTMLDivElement>;
  @ViewChild('viewport', { static: false }) viewport?: ElementRef<HTMLDivElement>;

  // PPTX Previewer
  private pptxPreviewer: any;
  private pptxDataPending: Blob | null = null;

  // Excel attributes
  fileId = '';
  workbook: XLSX.WorkBook | null = null;
  sheetNames: string[] = [];
  currentSheet = '';
  data_hot_table: any[][] = [];
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
    afterGetColHeader: function (col, TH) {
      TH.style.fontWeight = 'bold';
      TH.style.backgroundColor = '#f3f3f3';
    },
  };

  // General attributes
  msg = '';
  destroy$: Subject<boolean> = new Subject<boolean>();
  fiche!: any; // Remplacez 'any' par votre interface 'url'
  url: any;
  id = 0;
  pptxBlob: Blob | null = null;

  // Zoom state
  zoom = 1;
  minZoom = 0.2;
  maxZoom = 3;
  zoomStep = 0.1;

  logo_Orange = '/images/Orange.jpg';
  imageOrangeLogo = '/images/Orange.jpg';

  constructor(@Inject(MAT_DIALOG_DATA) private data: any) {
    this.id = data.id;
    console.log('id envoyé est', this.id);
  }

  ngOnInit(): void {
    // Chargez les données une seule fois ici
    this.loadData();
  }

  ngAfterViewInit(): void {
    // Si des données PPTX sont en attente et que le wrapper est disponible, initialisez
    if (this.pptxDataPending && this.pptxWrapper?.nativeElement) {
      this.initPptxPreviewer(this.pptxDataPending);
      this.pptxDataPending = null;
    }
  }

  loadData(): void {
    this.userService.getAllFicheByIDFiche(this.id).subscribe({
      next: result => {
        this.fiche = result;
        console.log('Fiche reçue:', this.fiche);

        if (result.extention === '.pdf') {
          this.selectedDocumentType(result);
          this.cdr.detectChanges();
        } else if (result.extention === '.xlsx') {
          this.loadExcelFile();
          this.cdr.detectChanges();
        } else if (result.extention === '.pptx') {
          this.loadPptxFile();
          this.cdr.detectChanges();
        }
      },
      error: error => {
        console.error('Erreur lors du chargement de la fiche:', error);
        this.toast.error('Impossible de charger la fiche');
      },
    });
  }

  private loadExcelFile(): void {
    this.userService.getAllExcelFicheByIDFiche(this.id).subscribe({
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
              this.cdr.detectChanges();
            } else {
              this.toast.warning('Le fichier Excel ne contient aucune feuille');
            }
          } catch (error) {
            console.error('Erreur lors de la lecture du fichier Excel:', error);
            this.toast.error('Impossible de lire le fichier Excel. Format non valide ou fichier corrompu.');
          }
        };

        reader.onerror = error => {
          console.error('Erreur FileReader:', error);
          this.toast.error('Erreur lors de la lecture du fichier');
        };

        reader.readAsArrayBuffer(data);
      },
      error: error => {
        console.error('Erreur lors du téléchargement du fichier Excel:', error);
        this.toast.error('Impossible de télécharger le fichier Excel');
      },
    });
  }

  private loadPptxFile(): void {
    this.userService
      .getAllFicheByIDFiche(this.id)
      .pipe(
        switchMap((meta: any) => {
          console.log('Metadata reçues:', meta);
          return this.userService.downloadFileByUrl(meta.url);
        })
      )
      .subscribe({
        next: (data: Blob) => {
          console.log('Données PPTX reçues:', data);
          console.log('Type MIME:', data.type);
          console.log('Taille:', data.size, 'octets');

          this.pptxBlob = data;

          // Vérifier si le wrapper est disponible
          if (!this.pptxWrapper?.nativeElement) {
            console.warn('pptxWrapper non disponible, données en attente');
            // Stocker les données pour ngAfterViewInit
            this.pptxDataPending = data;
            this.cdr.detectChanges();
            return;
          }

          // Initialiser immédiatement si le wrapper est disponible
          this.initPptxPreviewer(data);
          this.cdr.detectChanges();
        },
        error: err => {
          console.error('Erreur lors du chargement du fichier PPTX:', err);
          this.toast.error('Impossible de charger le fichier PPTX');
        },
      });
  }

  private initPptxPreviewer(data: Blob): void {
    // Vérification de sécurité finale
    if (!this.pptxWrapper?.nativeElement) {
      console.error('pptxWrapper.nativeElement non disponible');
      return;
    }

    try {
      // Initialiser le previewer
      this.pptxPreviewer = init(this.pptxWrapper.nativeElement, {
        width: 1100,
        height: 840,
      });

      // Charger le fichier PPTX
      this.loadPptxContent(data);
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Erreur lors de l\'initialisation du previewer PPTX:', error);
      this.toast.error('Impossible d\'initialiser le visualiseur PPTX');
    }
  }

  private async loadPptxContent(data: Blob): Promise<void> {
    if (!(data instanceof Blob)) {
      console.error("loadPptxContent: data n'est pas un Blob:", data);
      this.toast.error('Le fichier PPTX est corrompu.');
      return;
    }

    try {
      // Conversion Blob -> ArrayBuffer
      const arrayBuffer = await data.arrayBuffer();

      // Affichage dans le previewer
      if (this.pptxPreviewer) {
        this.pptxPreviewer.preview(arrayBuffer);
        console.log('PPTX chargé avec succès');
      }
    } catch (err) {
      console.error('Erreur lors de la conversion Blob -> ArrayBuffer', err);
      this.toast.error('Impossible de lire le fichier PPTX.');
    }
  }

  loadSheet(): void {
    if (this.workbook && this.currentSheet) {
      const worksheet = this.workbook.Sheets[this.currentSheet];
      this.data_hot_table = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (this.data_hot_table.length > 0) {
        const headers = this.data_hot_table[0];

        this.hotSettings.cell = [];
        if (headers) {
          for (let col = 0; col < headers.length; col++) {
            this.hotSettings.cell.push({
              row: 0,
              col: col,
              className: 'header-cell',
            });
          }
        }
        this.cdr.detectChanges();
        setTimeout(() => {
          this.cdr.detectChanges();
        }, 100);
      }
    }
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

  downloadPptx(): void {
    if (!this.pptxBlob) {
      this.toast.error('Aucun fichier PPTX à télécharger');
      return;
    }

    const url = URL.createObjectURL(this.pptxBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.fiche?.titre || 'presentation'}.pptx`;
    a.style.display = 'none';

    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  selectedDocumentType(type: any): void {
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

  onNoClick(): void {
    this.dialogRef.close();
  }

  // ============================================
  // ZOOM CONTROLS
  // ============================================

  zoomIn(): void {
    this.setZoom(this.zoom + this.zoomStep);
  }

  zoomOut(): void {
    this.setZoom(this.zoom - this.zoomStep);
  }

  resetZoom(): void {
    this.setZoom(1);
  }

  onSlider(event: Event): void {
    const v = (event.target as HTMLInputElement).valueAsNumber;
    this.setZoom(v);
  }

  private setZoom(value: number): void {
    this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, Math.round(value * 100) / 100));
    this.cdr.detectChanges();
  }

  // Molette : si Ctrl (ou meta) est enfoncé, on effectue un zoom
  onWheel(event: WheelEvent): void {
    // Vérification de sécurité
    if (!this.viewport?.nativeElement) {
      return;
    }

    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      const delta = event.deltaY;
      if (delta < 0) {
        this.zoomIn();
      } else {
        this.zoomOut();
      }
    }
    // Sinon laisser le scroll normal
  }

  ngOnDestroy(): void {
    this.destroy$.next(true);
    this.destroy$.complete();
  }
}