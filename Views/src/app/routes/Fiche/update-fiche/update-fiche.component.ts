import { Component, OnInit, inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatOptionModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ControlsOf, IProfile } from '@shared';
import { UserService } from '@shared/services/user.service';
import { MtxButtonModule } from '@ng-matero/extensions/button';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';
import { MatListModule } from '@angular/material/list';
import { MatTableModule } from '@angular/material/table';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { CategorieInterface, fonction, site, sla, Sous_CategorieInterface } from '@core';
import { ActivatedRoute } from '@angular/router';
import { error } from 'console';
@Component({
  selector: 'app-forms-elements',
  standalone: true,
  imports: [
    CommonModule,
    MatListModule,
    MatTableModule,
    MatSlideToggleModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatOptionModule,
    MatSelectModule,
    MtxButtonModule,
    MatCheckboxModule,
  ],
  templateUrl: './update-fiche.component.html',
  styleUrl: './update-fiche.component.scss',
})
export class UpdateFicheComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(UserService);
  private readonly toastSrv = inject(ToastrService);
  private readonly route = inject(ActivatedRoute);
  snapForm!: FormGroup;
  isSubmitting = false;
  responses = [
    { id: 1, label: 'VRAI' },
    { id: 0, label: 'FAUX' },
  ];
  slaListe!: sla[];
  showQuestionnaireValue = false;
  showAccesValue = true;
  ListecategorieSousCategorie!: CategorieInterface[];
  ListeSousCategorie!: Sous_CategorieInterface[];
  ListeSite!: site[];
  ListeProfil!: fonction[];
  selectedFileName: any;
  fileInput: any;
  file!: File;

  toggleValue(event: any) {
    this.showAccesValue = !this.showAccesValue;
  }

  uploadFile() {
    throw new Error('Method not implemented.');
  }
  constructor() {}
  ngOnInit() {
    const id = this.route.snapshot.params['id'];
    this.snapForm = this.fb.group({
      titre: [null, [Validators.required]],
      id_Sla: [null, [Validators.required]],
      dateReception: [null, [Validators.required]],
      dateDebut: [null, [Validators.required]],
      dateVisibilite: [null, [Validators.required]],
      dateFin: [null, [Validators.required]],
      id_Categorie: [null, [Validators.required]],
      id_SousCategorie: [null, [Validators.required]],
      AccesSite: [true, [Validators.required]],
      Utilite: [true, [Validators.required]],
      isChecked: [false],
      Quiz1: this.fb.group({
        Question1: [null],
        Reponse1: [null],
      }),
      Quiz2: this.fb.group({
        Question2: [null],
        Reponse2: [null],
      }),
      Quiz3: this.fb.group({
        Question3: [null],
        Reponse3: [null],
      }),
      Quiz4: this.fb.group({
        Question4: [null],
        Reponse4: [null],
      }),
      Autorisation: this.fb.array([this.fb.control(this.ListeProfil)]),
    });

    this.userService.getAllSla().subscribe({
      next: sla => {
        this.slaListe = sla;
      },
      error: error => {
        console.log(error);
      },
    });
    this.userService.getAllCategorieWithTheirSousCategorie().subscribe({
      next: result => {
        this.ListecategorieSousCategorie = result;
      },
      error: error => {
        console.log(error);
      },
    });
    this.userService.getAllSite().subscribe({
      next: site => {
        this.ListeSite = site;
      },
      error: error => {
        console.log(error);
      },
    });
    this.userService.getAllFonction().subscribe({
      next: fonction => {
        console.log(fonction);
        this.ListeProfil = fonction;
        console.log(this.ListeProfil);
      },
      error: error => {
        console.log(error);
      },
    });
    this.userService.getOneFiche(id).subscribe({
      next: resultat => {
        console.log(resultat);
        this.snapForm.get('titre')?.setValue(resultat.titre);
        this.snapForm.get('id_Sla')?.setValue(resultat.id_Sla);
        this.snapForm.get('id_Categorie')?.setValue(resultat.id_Categorie);
        this.snapForm.get('id_SousCategorie')?.setValue(resultat.id_SousCategorie);
        this.snapForm.get('dateReception')?.setValue(resultat.dateReception);
        this.snapForm.get('dateReception')?.disable();
        this.snapForm.get('dateDebut')?.disable();
        this.snapForm.get('dateVisibilite')?.disable();
        this.snapForm.get('isChecked')?.setValue(resultat.isChecked);
        if (resultat.isChecked === true) {
          this.showQuestionnaireValue = !this.showQuestionnaireValue;
          this.snapForm.get('Quiz1')?.get('Question1')?.setValue(resultat.Quiz[0].libelleQuestion);
          this.snapForm.get('Quiz1')?.get('Reponse1')?.setValue(resultat.Quiz[0].reponseQuestion);
          this.snapForm.get('Quiz2')?.get('Question2')?.setValue(resultat.Quiz[1].libelleQuestion);
          this.snapForm.get('Quiz2')?.get('Reponse2')?.setValue(resultat.Quiz[1].reponseQuestion);
          this.snapForm.get('Quiz3')?.get('Question3')?.setValue(resultat.Quiz[2].libelleQuestion);
          this.snapForm.get('Quiz3')?.get('Reponse3')?.setValue(resultat.Quiz[2].reponseQuestion);
          this.snapForm.get('Quiz4')?.get('Question4')?.setValue(resultat.Quiz[3].libelleQuestion);
          this.snapForm.get('Quiz4')?.get('Reponse4')?.setValue(resultat.Quiz[3].reponseQuestion);
        }
      },
      error: error => {
        console.log(error);
      },
    });
  }

  // Autorisations des rôles avec des checkboxes
  onFileSelected(event: any) {
    this.file = event.target.files[0];
    console.log(this.file);
  }
  checkValue(event: any) {
    this.showQuestionnaireValue = !this.showQuestionnaireValue;
  }
  handleOnSumit() {
    this.isSubmitting = true;
    if (this.file.size === 0) return;
    const formdata = new FormData();
    formdata.append('file', this.file);
    console.log(this.snapForm.value);
    formdata.append('data', JSON.stringify(this.snapForm.value));
    this.userService.addFiche(formdata).subscribe({
      next: message => {
        this.toastSrv.success("Vous venez d'ajouter un nouveau document");
        this.snapForm.reset();
        this.isSubmitting = false;
      },
      error: error => {
        this.toastSrv.error("Une Erreur s'est produite");
        console.log(error);
        this.isSubmitting = false;
      },
    });
  }

  getErrorMessage(form: FormGroup<ControlsOf<IProfile>>) {
    return form.get('email')?.hasError('required')
      ? 'validation.required'
      : form.get('email')?.hasError('email')
        ? 'validation.invalid_email'
        : '';
  }
  onSelectionChanged(event: Event) {
    const selectValue = (event.target as HTMLSelectElement).value;
    const selectValueNumber = Number(selectValue);
    const value = this.ListecategorieSousCategorie.filter(item => item.id === selectValueNumber);
    this.ListeSousCategorie = value[0].Sous_Categorie;
  }

  resetForm() {
    this.snapForm.reset();
  }
}

export class UploadComponent {
  fileName = 'Aucun fichier choisi';
  file: File | null = null;
  allowedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-powerpoint',
  ];

  onFileSelected(event: any) {
    const selectedFile = event.target.files[0];
    if (selectedFile && this.allowedTypes.includes(selectedFile.type)) {
      this.file = selectedFile;
      this.fileName = selectedFile.name;
    } else {
      alert('Veuillez sélectionner un fichier au format PDF, Word, Excel ou PowerPoint.');
      this.fileName = 'Aucun fichier choisi';
      this.file = null;
    }
  }

  uploadFile() {
    if (this.file) {
      console.log('Fichier prêt à être uploadé :', this.file);
    }
  }
}
