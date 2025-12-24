/*
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
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatListModule } from '@angular/material/list';
import { MatTableModule } from '@angular/material/table';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { CategorieInterface, fonction, site, sla, Sous_CategorieInterface } from '@core';
@Component({
  selector: 'app-forms-elements',
  templateUrl: './ajouter-fiche.component.html',
  styleUrl: './ajouter-fiche.component.scss',
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
})
export class AjouterFicheComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(UserService);
  private readonly toastSrv = inject(ToastrService);
  private readonly router = inject(Router);

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
  selectedQuizProfiles: number[] = [];
  selectedUtiliteProfiles: number[] = [];
  selectedAccesProfiles: number[] = [];
  selectedAccesSite: number[] = [];
  selectedAccesCommentaire: number[] = [];
  checkValue(event: any) {
    this.showQuestionnaireValue = !this.showQuestionnaireValue;
  }
  toggleValue(event: any) {
    this.showAccesValue = !this.showAccesValue;
  }

  uploadFile() {
    throw new Error('Method not implemented.');
  }
  constructor() {}
  ngOnInit() {
    // Créez une date pour le 1er janvier 3000 à 00:00
    const defaultDateFin = new Date('3000-01-01T00:00');
    // Formattez-la en YYYY-MM-DDTHH:mm
    const formattedDate = defaultDateFin.toISOString().slice(0, 16);
    this.snapForm = this.fb.group({
      titre: [null, [Validators.required]],
      id_Sla: [null, [Validators.required]],
      dateReception: [null, [Validators.required]],
      dateDebut: [null, [Validators.required]],
      dateVisibilite: [null, [Validators.required]],
      dateFin: [formattedDate, [Validators.required]],
      id_Categorie: [null, [Validators.required]],
      id_SousCategorie: [null, [Validators.required]],
      isChecked: [false],
      niveau: [null, [Validators.required]],
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
      quizAutorisation: [''], // For Quiz checkboxes
      utiliteAutorisation: [''], // For Utilité checkboxes
      accesAutorisation: [''],
      siteAutorisation: [''],
      commentaireAutorisation: [''],
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
        this.initializeCheckboxes();
      },
      error: error => {
        console.log(error);
      },
    });

    this.snapForm.get('niveau')?.valueChanges.subscribe(value => {
      console.log('Niveau sélectionné :', value);
    });
  }
  onQuizCheckboxChange(event: any, profileId: number): void {
    const checked = event.checked || event.target.checked;

    if (checked) {
      // Add to selected profiles if not already there
      if (!this.selectedQuizProfiles.includes(profileId)) {
        this.selectedQuizProfiles.push(profileId);
      }
    } else {
      // Remove from selected profiles
      this.selectedQuizProfiles = this.selectedQuizProfiles.filter(id => id !== profileId);
    }

    // Update form control value with concatenated string
    this.snapForm.get('quizAutorisation')?.setValue(this.selectedQuizProfiles.join(','));
  }

  onUtiliteCheckboxChange(event: any, profileId: number): void {
    const checked = event.checked || event.target.checked;

    if (checked) {
      if (!this.selectedUtiliteProfiles.includes(profileId)) {
        this.selectedUtiliteProfiles.push(profileId);
      }
    } else {
      this.selectedUtiliteProfiles = this.selectedUtiliteProfiles.filter(id => id !== profileId);
    }

    this.snapForm.get('utiliteAutorisation')?.setValue(this.selectedUtiliteProfiles.join(','));
  }
  onAccesCheckboxChange(event: any, profileId: number): void {
    const checked = event.checked || event.target.checked;

    if (checked) {
      if (!this.selectedAccesProfiles.includes(profileId)) {
        this.selectedAccesProfiles.push(profileId);
      }
    } else {
      this.selectedAccesProfiles = this.selectedAccesProfiles.filter(id => id !== profileId);
    }
    if (this.selectedAccesProfiles.length > 0) {
      this.snapForm.get('accesAutorisation')?.setValue(this.selectedAccesProfiles.join(','));
    } else {
      this.snapForm.get('accesAutorisation')?.setValue('');
    }

    this.snapForm.get('accesAutorisation')?.setValue(this.selectedAccesProfiles.join(','));
  }
  onAccesSiteCheckboxChange(event: any, profileId: number): void {
    const checked = event.checked || event.target.checked;

    if (checked) {
      if (!this.selectedAccesSite.includes(profileId)) {
        this.selectedAccesSite.push(profileId);
      }
    } else {
      this.selectedAccesSite = this.selectedAccesSite.filter(id => id !== profileId);
    }
    if (this.selectedAccesSite.length > 0) {
      this.snapForm.get('siteAutorisation')?.setValue(this.selectedAccesSite.join(','));
    } else {
      this.snapForm.get('siteAutorisation')?.setValue('');
    }

    this.snapForm.get('siteAutorisation')?.setValue(this.selectedAccesSite.join(','));
  }
  onAccesCommentaireCheckboxChange(event: any, profileId: number): void {
    const checked = event.checked || event.target.checked;

    if (checked) {
      if (!this.selectedAccesCommentaire.includes(profileId)) {
        this.selectedAccesCommentaire.push(profileId);
      }
    } else {
      this.selectedAccesCommentaire = this.selectedAccesCommentaire.filter(id => id !== profileId);
    }
    if (this.selectedAccesCommentaire.length > 0) {
      this.snapForm
        .get('commentaireAutorisation')
        ?.setValue(this.selectedAccesCommentaire.join(','));
    } else {
      this.snapForm.get('commentaireAutorisation')?.setValue('');
    }

    this.snapForm.get('commentaireAutorisation')?.setValue(this.selectedAccesCommentaire.join(','));
  }
  initializeCheckboxes() {
    // For roles that should be checked by default
    this.ListeProfil.forEach(role => {
      if (
        !(
          role.Role_Associe === 'R_ADMI' ||
          role.Role_Associe === 'R_SUPE' ||
          role.Role_Associe === 'R_GB'
        )
      ) {
        // Add these to the selected arrays by default
        if (!this.selectedQuizProfiles.includes(role.id)) {
          this.selectedQuizProfiles.push(role.id);
        }
        if (!this.selectedUtiliteProfiles.includes(role.id)) {
          this.selectedUtiliteProfiles.push(role.id);
        }
        if (!this.selectedAccesCommentaire.includes(role.id)) {
          this.selectedAccesCommentaire.push(role.id);
        }
      }
      if (!this.selectedAccesProfiles.includes(role.id)) {
        this.selectedAccesProfiles.push(role.id);
      }
    });

    this.ListeSite.forEach(site => {
      if (!this.selectedAccesSite.includes(site.id)) {
        this.selectedAccesSite.push(site.id);
      }
    });

    // Update form values
    this.snapForm.get('quizAutorisation')?.setValue(this.selectedQuizProfiles.join(','));
    this.snapForm.get('utiliteAutorisation')?.setValue(this.selectedUtiliteProfiles.join(','));
    this.snapForm.get('accesAutorisation')?.setValue(this.selectedAccesProfiles.join(','));
    this.snapForm.get('siteAutorisation')?.setValue(this.selectedAccesSite.join(','));
    this.snapForm.get('commentaireAutorisation')?.setValue(this.selectedAccesCommentaire.join(','));
  }

  // Autorisations des rôles avec des checkboxes
  onFileSelected(event: any) {
    this.file = event.target.files[0];
    console.log(this.file);
  }
  handleOnSumit() {
    this.isSubmitting = true;
    if (!this.file || this.file.size === 0) {
      this.toastSrv.error('Veuillez sélectionner un fichier');
      this.isSubmitting = false;
      return;
    }
    // Ensure we have the latest concatenated profiles
    this.snapForm.get('quizAutorisation')?.setValue(this.selectedQuizProfiles.join(','));
    this.snapForm.get('utiliteAutorisation')?.setValue(this.selectedUtiliteProfiles.join(','));
    this.snapForm.get('accesAutorisation')?.setValue(this.selectedAccesProfiles.join(','));
    this.snapForm.get('siteAutorisation')?.setValue(this.selectedAccesSite.join(','));
    this.snapForm.get('commentaireAutorisation')?.setValue(this.selectedAccesCommentaire.join(','));
    console.log(this.snapForm.value);
    const formdata = new FormData();
    formdata.append('file', this.file);
    console.log(this.snapForm.value);
    formdata.append('data', JSON.stringify(this.snapForm.value));
    this.userService.addFiche(formdata).subscribe({
      next: message => {
        this.toastSrv.success("Vous venez d'ajouter un nouveau document");
        this.isSubmitting = false;
        this.router.navigateByUrl('mon-espace/Fiche/Liste');
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
    this.selectedQuizProfiles = [];
    this.selectedUtiliteProfiles = [];
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

*/
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
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatListModule } from '@angular/material/list';
import { MatTableModule } from '@angular/material/table';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { CategorieInterface, fonction, site, sla, Sous_CategorieInterface } from '@core';

@Component({
  selector: 'app-forms-elements',
  templateUrl: './ajouter-fiche.component.html',
  styleUrl: './ajouter-fiche.component.scss',
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
})
export class AjouterFicheComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(UserService);
  private readonly toastSrv = inject(ToastrService);
  private readonly router = inject(Router);

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
  selectedQuizProfiles: number[] = [];
  selectedUtiliteProfiles: number[] = [];
  selectedAccesProfiles: number[] = [];
  selectedAccesSite: number[] = [];
  selectedAccesCommentaire: number[] = [];

  checkValue(event: any) {
    this.showQuestionnaireValue = !this.showQuestionnaireValue;

    // Ajouter ou retirer les validateurs pour les questions du quiz
    if (this.showQuestionnaireValue) {
      this.addQuizValidators();
    } else {
      this.removeQuizValidators();
    }
  }

  toggleValue(event: any) {
    this.showAccesValue = !this.showAccesValue;
  }

  uploadFile() {
    throw new Error('Method not implemented.');
  }

  constructor() {}

  ngOnInit() {
    // Créez une date pour le 1er janvier 3000 à 00:00
    const defaultDateFin = new Date('3000-01-01T00:00');
    // Formattez-la en YYYY-MM-DDTHH:mm
    const formattedDate = defaultDateFin.toISOString().slice(0, 16);

    this.snapForm = this.fb.group({
      titre: [null, [Validators.required]],
      id_Sla: [null, [Validators.required]],
      dateReception: [null, [Validators.required]],
      dateDebut: [null, [Validators.required]],
      dateVisibilite: [null, [Validators.required]],
      dateFin: [null],
      id_Categorie: [null, [Validators.required]],
      id_SousCategorie: [null, [Validators.required]],
      isChecked: [false],
      niveau: [null, [Validators.required]],
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
      quizAutorisation: [''],
      utiliteAutorisation: [''],
      accesAutorisation: [''],
      siteAutorisation: [''],
      commentaireAutorisation: [''],
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
        this.initializeCheckboxes();
      },
      error: error => {
        console.log(error);
      },
    });

    this.snapForm.get('niveau')?.valueChanges.subscribe(value => {
      console.log('Niveau sélectionné :', value);
    });
  }

  // Ajouter les validateurs pour les questions du quiz
  addQuizValidators() {
    const quiz1 = this.snapForm.get('Quiz1') as FormGroup;
    const quiz2 = this.snapForm.get('Quiz2') as FormGroup;
    const quiz3 = this.snapForm.get('Quiz3') as FormGroup;
    const quiz4 = this.snapForm.get('Quiz4') as FormGroup;

    quiz1.get('Question1')?.setValidators([Validators.required]);
    quiz1.get('Reponse1')?.setValidators([Validators.required]);
    quiz2.get('Question2')?.setValidators([Validators.required]);
    quiz2.get('Reponse2')?.setValidators([Validators.required]);
    quiz3.get('Question3')?.setValidators([Validators.required]);
    quiz3.get('Reponse3')?.setValidators([Validators.required]);
    quiz4.get('Question4')?.setValidators([Validators.required]);
    quiz4.get('Reponse4')?.setValidators([Validators.required]);

    quiz1.get('Question1')?.updateValueAndValidity();
    quiz1.get('Reponse1')?.updateValueAndValidity();
    quiz2.get('Question2')?.updateValueAndValidity();
    quiz2.get('Reponse2')?.updateValueAndValidity();
    quiz3.get('Question3')?.updateValueAndValidity();
    quiz3.get('Reponse3')?.updateValueAndValidity();
    quiz4.get('Question4')?.updateValueAndValidity();
    quiz4.get('Reponse4')?.updateValueAndValidity();
  }

  // Retirer les validateurs pour les questions du quiz
  removeQuizValidators() {
    const quiz1 = this.snapForm.get('Quiz1') as FormGroup;
    const quiz2 = this.snapForm.get('Quiz2') as FormGroup;
    const quiz3 = this.snapForm.get('Quiz3') as FormGroup;
    const quiz4 = this.snapForm.get('Quiz4') as FormGroup;

    quiz1.get('Question1')?.clearValidators();
    quiz1.get('Reponse1')?.clearValidators();
    quiz2.get('Question2')?.clearValidators();
    quiz2.get('Reponse2')?.clearValidators();
    quiz3.get('Question3')?.clearValidators();
    quiz3.get('Reponse3')?.clearValidators();
    quiz4.get('Question4')?.clearValidators();
    quiz4.get('Reponse4')?.clearValidators();

    quiz1.get('Question1')?.updateValueAndValidity();
    quiz1.get('Reponse1')?.updateValueAndValidity();
    quiz2.get('Question2')?.updateValueAndValidity();
    quiz2.get('Reponse2')?.updateValueAndValidity();
    quiz3.get('Question3')?.updateValueAndValidity();
    quiz3.get('Reponse3')?.updateValueAndValidity();
    quiz4.get('Question4')?.updateValueAndValidity();
    quiz4.get('Reponse4')?.updateValueAndValidity();
  }

  onQuizCheckboxChange(event: any, profileId: number): void {
    const checked = event.checked || event.target.checked;

    if (checked) {
      if (!this.selectedQuizProfiles.includes(profileId)) {
        this.selectedQuizProfiles.push(profileId);
      }
    } else {
      this.selectedQuizProfiles = this.selectedQuizProfiles.filter(id => id !== profileId);
    }

    this.snapForm.get('quizAutorisation')?.setValue(this.selectedQuizProfiles.join(','));
  }

  onUtiliteCheckboxChange(event: any, profileId: number): void {
    const checked = event.checked || event.target.checked;

    if (checked) {
      if (!this.selectedUtiliteProfiles.includes(profileId)) {
        this.selectedUtiliteProfiles.push(profileId);
      }
    } else {
      this.selectedUtiliteProfiles = this.selectedUtiliteProfiles.filter(id => id !== profileId);
    }

    this.snapForm.get('utiliteAutorisation')?.setValue(this.selectedUtiliteProfiles.join(','));
  }

  onAccesCheckboxChange(event: any, profileId: number): void {
    const checked = event.checked || event.target.checked;

    if (checked) {
      if (!this.selectedAccesProfiles.includes(profileId)) {
        this.selectedAccesProfiles.push(profileId);
      }
    } else {
      this.selectedAccesProfiles = this.selectedAccesProfiles.filter(id => id !== profileId);
    }

    if (this.selectedAccesProfiles.length > 0) {
      this.snapForm.get('accesAutorisation')?.setValue(this.selectedAccesProfiles.join(','));
    } else {
      this.snapForm.get('accesAutorisation')?.setValue('');
    }
  }

  onAccesSiteCheckboxChange(event: any, profileId: number): void {
    const checked = event.checked || event.target.checked;

    if (checked) {
      if (!this.selectedAccesSite.includes(profileId)) {
        this.selectedAccesSite.push(profileId);
      }
    } else {
      this.selectedAccesSite = this.selectedAccesSite.filter(id => id !== profileId);
    }

    if (this.selectedAccesSite.length > 0) {
      this.snapForm.get('siteAutorisation')?.setValue(this.selectedAccesSite.join(','));
    } else {
      this.snapForm.get('siteAutorisation')?.setValue('');
    }
  }

  onAccesCommentaireCheckboxChange(event: any, profileId: number): void {
    const checked = event.checked || event.target.checked;

    if (checked) {
      if (!this.selectedAccesCommentaire.includes(profileId)) {
        this.selectedAccesCommentaire.push(profileId);
      }
    } else {
      this.selectedAccesCommentaire = this.selectedAccesCommentaire.filter(id => id !== profileId);
    }

    if (this.selectedAccesCommentaire.length > 0) {
      this.snapForm
        .get('commentaireAutorisation')
        ?.setValue(this.selectedAccesCommentaire.join(','));
    } else {
      this.snapForm.get('commentaireAutorisation')?.setValue('');
    }
  }

  initializeCheckboxes() {
    this.ListeProfil.forEach(role => {
      if (
        !(
          role.Role_Associe === 'R_ADMI' ||
          role.Role_Associe === 'R_SUPE' ||
          role.Role_Associe === 'R_GB'
        )
      ) {
        if (!this.selectedQuizProfiles.includes(role.id)) {
          this.selectedQuizProfiles.push(role.id);
        }
        if (!this.selectedUtiliteProfiles.includes(role.id)) {
          this.selectedUtiliteProfiles.push(role.id);
        }
        if (!this.selectedAccesCommentaire.includes(role.id)) {
          this.selectedAccesCommentaire.push(role.id);
        }
      }
      if (!this.selectedAccesProfiles.includes(role.id)) {
        this.selectedAccesProfiles.push(role.id);
      }
    });

    this.ListeSite.forEach(site => {
      if (!this.selectedAccesSite.includes(site.id)) {
        this.selectedAccesSite.push(site.id);
      }
    });

    this.snapForm.get('quizAutorisation')?.setValue(this.selectedQuizProfiles.join(','));
    this.snapForm.get('utiliteAutorisation')?.setValue(this.selectedUtiliteProfiles.join(','));
    this.snapForm.get('accesAutorisation')?.setValue(this.selectedAccesProfiles.join(','));
    this.snapForm.get('siteAutorisation')?.setValue(this.selectedAccesSite.join(','));
    this.snapForm.get('commentaireAutorisation')?.setValue(this.selectedAccesCommentaire.join(','));
  }

  onFileSelected(event: any) {
    this.file = event.target.files[0];
    console.log(this.file);
  }

  // Validation complète du formulaire avec messages d'erreur détaillés
  validateForm(): boolean {
    const missingFields: string[] = [];

    // Vérifier le fichier
    if (!this.file || this.file.size === 0) {
      missingFields.push('Fichier');
    }

    // Vérifier les champs obligatoires
    if (!this.snapForm.get('titre')?.value) {
      missingFields.push('Titre');
    }

    if (!this.snapForm.get('id_Sla')?.value) {
      missingFields.push('Type');
    }

    if (!this.snapForm.get('id_Categorie')?.value) {
      missingFields.push('Catégorie');
    }

    if (!this.snapForm.get('id_SousCategorie')?.value) {
      missingFields.push('Sous-Catégorie');
    }

    if (!this.snapForm.get('dateReception')?.value) {
      missingFields.push('Date de réception');
    }

    if (!this.snapForm.get('dateDebut')?.value) {
      missingFields.push('Date de début');
    }

    if (!this.snapForm.get('dateVisibilite')?.value) {
      missingFields.push('Date de visibilité');
    }

    if (!this.snapForm.get('niveau')?.value) {
      missingFields.push('Niveau');
    }

    // Vérifier les questions du quiz si le questionnaire est activé
    if (this.showQuestionnaireValue) {
      const quiz1 = this.snapForm.get('Quiz1') as FormGroup;
      const quiz2 = this.snapForm.get('Quiz2') as FormGroup;
      const quiz3 = this.snapForm.get('Quiz3') as FormGroup;
      const quiz4 = this.snapForm.get('Quiz4') as FormGroup;

      if (!quiz1.get('Question1')?.value || !quiz1.get('Reponse1')?.value) {
        missingFields.push('Question 1 et sa réponse');
      }
      if (!quiz2.get('Question2')?.value || !quiz2.get('Reponse2')?.value) {
        missingFields.push('Question 2 et sa réponse');
      }
      if (!quiz3.get('Question3')?.value || !quiz3.get('Reponse3')?.value) {
        missingFields.push('Question 3 et sa réponse');
      }
      if (!quiz4.get('Question4')?.value || !quiz4.get('Reponse4')?.value) {
        missingFields.push('Question 4 et sa réponse');
      }
    }

    // Afficher les erreurs si des champs sont manquants
    if (missingFields.length > 0) {
      const errorMessage = `Les champs suivants sont obligatoires :\n${missingFields.join('\n')}`;
      this.toastSrv.error(errorMessage, 'Formulaire incomplet', {
        timeOut: 7000,
        progressBar: true,
        closeButton: true,
      });
      return false;
    }

    // Validation des dates
    const dateDebut = new Date(this.snapForm.get('dateDebut')?.value);
    const dateFin = new Date(this.snapForm.get('dateFin')?.value);
    const dateVisibilite = new Date(this.snapForm.get('dateVisibilite')?.value);
    const dateReception = new Date(this.snapForm.get('dateReception')?.value);

    if (dateVisibilite < dateDebut) {
      this.toastSrv.error(
        'La date de visibilité ne peut pas être antérieure à la date de début.',
        'Erreur de validation'
      );
      return false;
    }

    return true;
  }

  handleOnSumit() {
    // Marquer tous les champs comme touchés pour afficher les erreurs
    Object.keys(this.snapForm.controls).forEach(key => {
      const control = this.snapForm.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        Object.keys(control.controls).forEach(subKey => {
          control.get(subKey)?.markAsTouched();
        });
      }
    });

    // Valider le formulaire
    if (!this.validateForm()) {
      return;
    }

    this.isSubmitting = true;
    if (!this.file || this.file.size === 0) {
      this.toastSrv.error('Veuillez sélectionner un fichier');
      this.isSubmitting = false;
      return;
    }
    // Ensure we have the latest concatenated profiles
    this.snapForm.get('quizAutorisation')?.setValue(this.selectedQuizProfiles.join(','));
    this.snapForm.get('utiliteAutorisation')?.setValue(this.selectedUtiliteProfiles.join(','));
    this.snapForm.get('accesAutorisation')?.setValue(this.selectedAccesProfiles.join(','));
    this.snapForm.get('siteAutorisation')?.setValue(this.selectedAccesSite.join(','));
    this.snapForm.get('commentaireAutorisation')?.setValue(this.selectedAccesCommentaire.join(','));
    console.log(this.snapForm.value);
    const formdata = new FormData();
    formdata.append('file', this.file);
    console.log(this.snapForm.value);
    formdata.append('data', JSON.stringify(this.snapForm.value));
    this.userService.addFiche(formdata).subscribe({
      next: message => {
        this.toastSrv.success("Vous venez d'ajouter un nouveau document");
        this.isSubmitting = false;
        this.router.navigateByUrl('mon-espace/Fiche/Liste');
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

    // Réinitialiser la sous-catégorie quand la catégorie change
    this.snapForm.get('id_SousCategorie')?.setValue(null);
  }

  resetForm() {
    this.snapForm.reset();
    this.selectedQuizProfiles = [];
    this.selectedUtiliteProfiles = [];
    this.selectedAccesProfiles = [];
    this.selectedAccesSite = [];
    this.selectedAccesCommentaire = [];
    this.file = null as any;
    this.showQuestionnaireValue = false;

    // Réinitialiser la date de fin par défaut
    const defaultDateFin = new Date('3000-01-01T00:00');
    const formattedDate = defaultDateFin.toISOString().slice(0, 16);
    this.snapForm.get('dateFin')?.setValue(formattedDate);

    // Réinitialiser les checkboxes
    this.initializeCheckboxes();

    this.toastSrv.info('Formulaire réinitialisé', 'Information');
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
