import { Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { ToastrService } from 'ngx-toastr';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatOptionModule } from '@angular/material/core';
import { MtxButtonModule } from '@ng-matero/extensions/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { catchError, of, Subject, takeUntil, tap } from 'rxjs';
import { EvaluationsResultat } from '@shared/modeles/evaluations/EvaluationsResultat';
import { EvaluationResultatItem } from '@shared/interfaces/evaluations/EvaluationResultatItem';
import { BusinessIntelligenceService } from '@shared/services/businessIntelligenceService/business-intelligence.service';
import { BI1Interface } from '@shared/interfaces/businessIntelligence/BI1';
import { BI2Interface } from '@shared/interfaces/businessIntelligence/BI2';
import { BI3Interface } from '@shared/interfaces/businessIntelligence/BI3';
import { BI4Interface } from '@shared/interfaces/businessIntelligence/BI4';
import {
  AppearanceAnimation,
  ConfirmBoxInitializer,
  DialogLayoutDisplay,
  DisappearanceAnimation,
} from '@costlydeveloper/ngx-awesome-popup';
import { SupplementairesComponent } from '../supplementaires/supplementaires.component';
import { SupplementaireResultat } from '@shared/interfaces/supplementaires/SupplementaireResultats';
import { SupplementairesService } from '@shared/services/SupplementairesService/supplementaires.service';
import { SupplementaireResultatItem } from '@shared/interfaces/supplementaires/SupplementaireResultatItem';
import { SupplementairesResultat } from '@shared/modeles/supplementaires/SupplementairesResultat';

@Component({
  selector: 'app-completion-supplementaires',
  standalone: true,
  imports: [
    MatCardModule,
    MatIconModule,
    CommonModule,
    MatCheckboxModule,
    MatTooltipModule,
    FormsModule,
    MatAutocompleteModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatOptionModule,
    MtxButtonModule,
    MatDatepickerModule,
    CommonModule,
  ],
  templateUrl: './completion-supplementaires.component.html',
  styleUrl: './completion-supplementaires.component.scss',
})
export class CompletionSupplementairesComponent {
  supplementaireId: number = 0;
  supplementaire: any;
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly toastSrv = inject(ToastrService);
  fb = inject(FormBuilder);
  readonly dialog = inject(MatDialog);
  destroy$: Subject<boolean> = new Subject<boolean>();
  supplementaireResultats: SupplementaireResultat[] = [];
  formGroup = this.fb.group({
    id: [0],
    etat: [0],
    id_Supplementaires: [0],
  });
  formGroupPk = this.fb.group({
    resolution: [''],
    pourquoi1: [null],
    pourquoi2: [null],
    pourquoi3: [null],
    pourquoi4: [null],
  });
  selectedItemId: number | null = null;
  selectedItem: any = null;
  i = 0;
  scores: any[] = [];
  focus = false;
  commentaire: any;
  bi: any;
  collectionBi1: BI1Interface[] = [];
  collectionBi2: BI2Interface[] = [];
  collectionBi3: BI3Interface[] = [];
  collectionBi4: BI4Interface[] = [];
  resolutions = [{ name: 'Oui' }, { name: 'Non' }];
  reinit = false;

  openedCollapseId: number | null = null;

  constructor(
    private supplementaireService: SupplementairesService,
    private businessIntelligenceService: BusinessIntelligenceService
  ) {}
  ngOnInit(): void {
    this.supplementaireId = this.route.snapshot.params['id'];
    console.log('this.supplementaireId');
    console.log(this.supplementaireId);

    if (this.supplementaireId !== 0) {
      this.loadSupplementaireById();
    }
  }

  loadSupplementaireById() {
    this.supplementaireService.getSupplementairesById(this.supplementaireId).subscribe({
      next: response => {
        this.supplementaire = response;
        this.loadEvaluationResultats(response?.id);
        this.loadScores(response.id);
        console.log(this.supplementaire);
        this.formGroupPk.patchValue({
          resolution: this.supplementaire?.resolution,
          pourquoi1: this.supplementaire?.pourquoi1,
          pourquoi2: this.supplementaire?.pourquoi2,
          pourquoi3: this.supplementaire?.pourquoi3,
          pourquoi4: this.supplementaire?.pourquoi4,
        });
      },
      error: error => {
        console.log(error);
        if (error.status === 400) {
          this.toastSrv.warning(error.error.message);
        } else {
          this.toastSrv.error(error.error.message);
        }
      },
    });
  }

  loadEvaluationResultats(id: number) {
    this.supplementaireService.getSupplementairesResultats(id).subscribe({
      next: response => {
        console.log('response');
        console.log(response);
        this.supplementaireResultats = response;
        this.i++;
        if (this.i === 1) {
          this.selectedItem = this.supplementaireResultats[0];
          this.selectedItemId = this.selectedItem?.id;
          console.log('this.supplementaireResultats');
          console.log(this.supplementaireResultats);
        }
        if (this.selectedItem) {
          this.selectedItem =
            this.supplementaireResultats.find(item => item.id === this.selectedItemId) || null;
        }
        console.log('supplementaireResultats');
        console.log(this.supplementaireResultats);
      },
      error: error => {
        console.log(error);
      },
    });
  }
  loadScores(id: number) {
    this.supplementaireService.getSupplementairesScores(id).subscribe({
      next: response => {
        this.scores = response;
        console.log('this.scores supplementaires ', this.scores);
      },
      error: error => {
        console.log(error);
      },
    });
  }
  resetBusinessIntelligence() {
    this.reinit = true;
    this.formGroupPk.patchValue({
      resolution: 'Oui',
    });
    this.bi = null;
    this.collectionBi1 = [];
    this.collectionBi2 = [];
    this.collectionBi3 = [];
    this.collectionBi4 = [];
    console.log(this.reinit);
  }
  onResolutionChange(event: any) {
    console.log('event');
    console.log(event.source.value);

    if (event.source.value === 'Non') {
      if (!this.supplementaire) {
        this.toastSrv.error("L'evaluation n'a pas ete charger !");
      }
      const id_Grille = this.supplementaire?.id_Grille;
      const id_Agent = this.supplementaire?.id_Agent;

      this.businessIntelligenceService.getAllBIByGrille(id_Grille, id_Agent).subscribe({
        next: response => {
          this.bi = response[0];
          console.log('this.bi');
          console.log(this.bi);
          this.collectionBi1 = this.bi?.bi1;
        },
        error: error => {
          console.log(error);
        },
      });
    } else {
      this.bi = null;
      this.collectionBi1 = [];
      this.collectionBi2 = [];
      this.collectionBi3 = [];
      this.collectionBi4 = [];
    }
  }

  onBI1Change(event: any) {
    console.log(event.value);
    this.collectionBi2 = event?.value?.bi2;
  }
  onBI2Change(event: any) {
    this.collectionBi3 = event?.value?.bi3;
  }
  onBI3Change(event: any) {
    this.collectionBi4 = event?.value?.bi4;
  }
  onTextAreaFocus() {
    this.focus = true;
    console.log('this.focus');
    console.log(this.focus);
  }
  onTextAreaBlur() {
    this.focus = false;
    console.log('this.BLUR');
    console.log(this.focus);
  }
  // openAddDialog(): void {
  //   const dialogRef = this.dialog.open(SupplementairesComponent, {
  //     data: { id_Evaluations: this.supplementaireId },
  //     height: 'calc(100% - 30px)',
  //     width: 'calc(100% - 30px)',
  //     maxWidth: '100%',
  //     maxHeight: '100%',
  //   });
  //   dialogRef.afterClosed().subscribe(() => {});
  // }
  supplementaireResultat: SupplementairesResultat = Object.assign(
    new SupplementairesResultat(),
    this.formGroup.value
  );
  updateSupplementaireResultat(
    etat: number,
    updateItem: boolean,
    data: SupplementaireResultatItem
  ) {
    this.formGroup.patchValue({
      id: data?.id,
      etat: etat,
      id_Supplementaires: data?.id_Supplementaires,
    });
    this.supplementaireResultat.fromData(this.formGroup.value);

    const raw = {
      id: this.formGroup.controls['id'].value,
      etat: this.formGroup.controls['etat'].value,
      commentaire: data.commentaire,
      id_Supplementaires: this.formGroup.controls['id_Supplementaires'].value,
    };

    if (this.supplementaire?.statut !== 'Terminer') {
      this.supplementaireService.updateSupplementaireResultat(raw).subscribe({
        next: () => {
          // 🔥 mise à jour locale
          data.etat = etat;

          if (updateItem) {
            // garde le collapse ouvert
            this.openedCollapseId = data?.id;
          } else {
            this.openedCollapseId = 0;
          }

          this.loadSupplementaireById();
          // this.loadEvaluationResultats(raw.id_Evaluations || 0);
        },
      });
    }
  }
  terminerSupplementaires() {
    const newConfirmBox = new ConfirmBoxInitializer();
    newConfirmBox.setTitle('Confirmation !');
    newConfirmBox.setMessage("Êtes vous sûr de vouloir terminer l'evaluation ?");
    // Choose layout color type
    newConfirmBox.setConfig({
      layoutType: DialogLayoutDisplay.INFO, // SUCCESS | INFO | NONE | DANGER | WARNING
      animationIn: AppearanceAnimation.BOUNCE_IN, // BOUNCE_IN | SWING | ZOOM_IN | ZOOM_IN_ROTATE | ELASTIC | JELLO | FADE_IN | SLIDE_IN_UP | SLIDE_IN_DOWN | SLIDE_IN_LEFT | SLIDE_IN_RIGHT | NONE
      animationOut: DisappearanceAnimation.BOUNCE_OUT, // BOUNCE_OUT | ZOOM_OUT | ZOOM_OUT_WIND | ZOOM_OUT_ROTATE | FLIP_OUT | SLIDE_OUT_UP | SLIDE_OUT_DOWN | SLIDE_OUT_LEFT | SLIDE_OUT_RIGHT | NONE
      buttonPosition: 'right', // optional
    });
    newConfirmBox.setButtonLabels('OUI', 'NON');
    newConfirmBox
      .openConfirmBox$()
      .pipe(
        tap(value => {
          if (value.success) {
            this.supplementaireService.terminerSupplementaire(this.supplementaireId).subscribe({
              next: response => {
                console.log(response);
                this.toastSrv.success(response?.message);
                this.loadSupplementaireById();
                this.loadEvaluationResultats(this.supplementaireId);
              },
              error: error => {
                console.log(error);
                this.toastSrv.error('Une erreur est survenue');
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

  onToggleItem(item: SupplementaireResultatItem) {
    this.openedCollapseId = item?.id;

    const newEtat = item?.etat === 1 ? 0 : 1;
    this.updateSupplementaireResultat(newEtat, true, item);
  }

  updateSupplementaire() {
    if (!this.supplementaire) {
      this.toastSrv.error("L'evaluation n'a pas ete charger !");
    }
    const raw = {
      resolution: this.formGroupPk.controls['resolution'].value,
      pourquoi1: this.formGroupPk.controls['pourquoi1'].value,
      pourquoi2: this.formGroupPk.controls['pourquoi2'].value,
      pourquoi3: this.formGroupPk.controls['pourquoi3'].value,
      pourquoi4: this.formGroupPk.controls['pourquoi4'].value,
    };

    console.log('raw');
    console.log(raw);

    this.supplementaireService.updateSupplementaire(this.supplementaire.id, raw).subscribe({
      next: response => {
        console.log(response);
        this.loadSupplementaireById();
        this.toastSrv.success('Le business intelligence a ete ajouter !');
        this.reinit = false;
      },
      error: error => {
        console.log(error);
      },
    });
  }
  addCommentaire(data: SupplementaireResultatItem) {
    const raw = {
      id: data.id,
      etat: data.etat,
      commentaire: data.commentaire,
      id_Supplementaires: data.id_Supplementaires,
    };

    if (this.supplementaire?.statut !== 'Terminer') {
      this.supplementaireService.updateSupplementaireResultat(raw).subscribe({
        next: response => {
          console.log(response);
          this.loadEvaluationResultats(this.supplementaireId);
          this.loadSupplementaireById();
          this.toastSrv.success('Commentaire ajouter !');
        },
        error: error => {
          console.log(error);
          this.toastSrv.error("Une erreur est survenue lors de l'ajout du commentaire !");
        },
      });
    }
  }

  selectItem(item: any) {
    this.selectedItemId = item.id;
    this.selectedItem = item;
  }

  back() {
    this.location.back();
  }
}
