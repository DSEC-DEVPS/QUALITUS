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
import { ActivatedRoute, Router } from '@angular/router';

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
  private readonly router = inject(Router);

  snapForm!: FormGroup;
  isSubmitting = false;
  ficheId!: number;

  // Gestion du fichier
  file: File | null = null;
  existingFileName: string | null = null;
  existingFileUrl: string | null = null;
  isFileChanged = false;
  selectedFileName = 'Aucun fichier choisi';

  allowedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-powerpoint',
  ];

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

  selectedQuizProfiles: number[] = [];
  selectedUtiliteProfiles: number[] = [];
  selectedAccesProfiles: number[] = [];
  selectedAccesSite: number[] = [];
  selectedAccesCommentaire: number[] = [];

  constructor() {}

  ngOnInit() {
    this.ficheId = this.route.snapshot.params['id'];

    this.initializeForm();
    this.loadFormData();
  }

  private initializeForm() {
    this.snapForm = this.fb.group({
      titre: [null, [Validators.required]],
      id_Sla: [null, [Validators.required]],
      dateReception: [null, [Validators.required]],
      dateDebut: [null, [Validators.required]],
      dateVisibilite: [null, [Validators.required]],
      niveau: [null, [Validators.required]],
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
      quizAutorisation: [''],
      utiliteAutorisation: [''],
      accesAutorisation: [''],
      siteAutorisation: [''],
      commentaireAutorisation: [''],
    });
  }

  private loadFormData() {
    // Charger les SLA
    this.userService.getAllSla().subscribe({
      next: sla => {
        this.slaListe = sla;
      },
      error: error => {
        console.error('Erreur lors du chargement des SLA:', error);
        this.toastSrv.error('Erreur lors du chargement des SLA');
      },
    });

    // Charger les sites
    this.userService.getAllSite().subscribe({
      next: site => {
        this.ListeSite = site;
      },
      error: error => {
        console.error('Erreur lors du chargement des sites:', error);
        this.toastSrv.error('Erreur lors du chargement des sites');
      },
    });

    // Charger les fonctions/profils
    this.userService.getAllFonction().subscribe({
      next: fonction => {
        this.ListeProfil = fonction;
        this.initializeCheckboxes();
      },
      error: error => {
        console.error('Erreur lors du chargement des fonctions:', error);
        this.toastSrv.error('Erreur lors du chargement des fonctions');
      },
    });

    // Charger les données de la fiche
    this.userService.getOneFiche(this.ficheId).subscribe({
      next: resultat => {
        console.log('Données de la fiche:', resultat);

        // Charger les catégories et sous-catégories
        this.userService.getAllCategorieWithTheirSousCategorie().subscribe({
          next: result => {
            this.ListecategorieSousCategorie = result;
            this.onSelectionChangedd(resultat.id_Categorie);
          },
          error: error => {
            console.error('Erreur lors du chargement des catégories:', error);
            this.toastSrv.error('Erreur lors du chargement des catégories');
          },
        });

        // Remplir le formulaire avec les données existantes
        this.populateForm(resultat);

        // Gérer le fichier existant

        this.snapForm.get('titre')?.setValue(resultat.titre);
        this.snapForm.get('id_Sla')?.setValue(resultat.id_Sla);
        this.snapForm.get('id_Categorie')?.setValue(resultat.id_Categorie);
        this.snapForm.get('id_SousCategorie')?.setValue(resultat.id_SousCategorie);
        this.snapForm.get('dateReception')?.setValue(resultat.dateReception.slice(0, 16));
        this.snapForm.get('dateFin')?.setValue(resultat.dateFin.slice(0, 16));
        this.snapForm.get('dateDebut')?.setValue(resultat.dateDebut.slice(0, 16));
        this.snapForm.get('dateVisibilite')?.setValue(resultat.dateVisibilite.slice(0, 16));
        this.snapForm.get('niveau')?.setValue(resultat.niveau);
        if (resultat.isChecked === true) {
          this.snapForm.get('isChecked')?.setValue(resultat.isChecked);
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
        console.error('Erreur lors du chargement de la fiche:', error);
        this.toastSrv.error('Erreur lors du chargement de la fiche');
      },
    });
  }

  private populateForm(data: any) {
    this.snapForm.patchValue({
      titre: data.titre,
      id_Sla: data.id_Sla,
      id_Categorie: data.id_Categorie,
      id_SousCategorie: data.id_SousCategorie,
      dateReception: data.dateReception?.slice(0, 16),
      dateFin: data.dateFin?.slice(0, 16),
      dateDebut: data.dateDebut?.slice(0, 16),
      dateVisibilite: data.dateVisibilite?.slice(0, 16),
      niveau: data.niveau,
      isChecked: data.isChecked,
      AccesSite: data.AccesSite,
      Utilite: data.Utilite,
    });

    // Gérer le questionnaire si activé
    if (data.isChecked === true && data.Quiz && data.Quiz.length >= 4) {
      this.showQuestionnaireValue = true;
      this.snapForm.patchValue({
        Quiz1: {
          Question1: data.Quiz[0]?.libelleQuestion,
          Reponse1: data.Quiz[0]?.reponseQuestion,
        },
        Quiz2: {
          Question2: data.Quiz[1]?.libelleQuestion,
          Reponse2: data.Quiz[1]?.reponseQuestion,
        },
        Quiz3: {
          Question3: data.Quiz[2]?.libelleQuestion,
          Reponse3: data.Quiz[2]?.reponseQuestion,
        },
        Quiz4: {
          Question4: data.Quiz[3]?.libelleQuestion,
          Reponse4: data.Quiz[3]?.reponseQuestion,
        },
      });
    }
  }

  onFileSelected(event: any) {
    const selectedFile = event.target.files[0];

    if (!selectedFile) {
      return;
    }

    // Vérifier le type de fichier
    if (!this.allowedTypes.includes(selectedFile.type)) {
      this.toastSrv.warning(
        'Veuillez sélectionner un fichier au format PDF, Word, Excel ou PowerPoint.'
      );
      this.selectedFileName = this.existingFileName || 'Aucun fichier choisi';
      this.file = null;
      this.isFileChanged = false;
      // Réinitialiser l'input
      event.target.value = '';
      return;
    }

    // Vérifier la taille du fichier (max 10MB par exemple)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (selectedFile.size > maxSize) {
      this.toastSrv.warning('Le fichier est trop volumineux. Taille maximale : 10MB');
      this.selectedFileName = this.existingFileName || 'Aucun fichier choisi';
      this.file = null;
      this.isFileChanged = false;
      event.target.value = '';
      return;
    }

    this.file = selectedFile;
    this.selectedFileName = selectedFile.name;
    this.isFileChanged = true;
    console.log('Nouveau fichier sélectionné:', this.file);
  }

  removeFile() {
    this.file = null;
    this.isFileChanged = false;
    this.selectedFileName = this.existingFileName || 'Aucun fichier choisi';

    // Réinitialiser l'input file
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  downloadExistingFile() {
    if (this.existingFileUrl) {
      window.open(this.existingFileUrl, '_blank');
    } else {
      this.toastSrv.info('URL du fichier non disponible');
    }
  }

  handleOnSumit() {
    if (this.snapForm.invalid) {
      this.toastSrv.warning('Veuillez remplir tous les champs obligatoires');
      Object.keys(this.snapForm.controls).forEach(key => {
        const control = this.snapForm.get(key);
        if (control && control.invalid) {
          control.markAsTouched();
        }
      });
      return;
    }

    this.isSubmitting = true;
    const formdata = new FormData();

    // Ajouter le fichier seulement s'il a été modifié
    if (this.isFileChanged && this.file) {
      formdata.append('file', this.file);
      console.log('Nouveau fichier ajouté au FormData');
    } else if (!this.existingFileName && !this.file) {
      // Si aucun fichier existant et aucun nouveau fichier
      this.toastSrv.warning('Veuillez sélectionner un fichier');
      this.isSubmitting = false;
      return;
    }

    // Ajouter les données du formulaire
    const formValue = this.snapForm.value;
    console.log('Données du formulaire:', formValue);
    formdata.append('data', JSON.stringify(formValue));

    // Utiliser updateFiche au lieu de addFiche
  }

  checkValue(event: any) {
    this.showQuestionnaireValue = !this.showQuestionnaireValue;
  }

  toggleValue(event: any) {
    this.showAccesValue = !this.showAccesValue;
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

    this.snapForm
      .get('siteAutorisation')
      ?.setValue(this.selectedAccesSite.length > 0 ? this.selectedAccesSite.join(',') : '');
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

    this.snapForm
      .get('commentaireAutorisation')
      ?.setValue(
        this.selectedAccesCommentaire.length > 0 ? this.selectedAccesCommentaire.join(',') : ''
      );
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

    this.snapForm
      .get('quizAutorisation')
      ?.setValue(this.selectedQuizProfiles.length > 0 ? this.selectedQuizProfiles.join(',') : '');
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

    this.snapForm
      .get('utiliteAutorisation')
      ?.setValue(
        this.selectedUtiliteProfiles.length > 0 ? this.selectedUtiliteProfiles.join(',') : ''
      );
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

    this.snapForm
      .get('accesAutorisation')
      ?.setValue(this.selectedAccesProfiles.length > 0 ? this.selectedAccesProfiles.join(',') : '');
  }

  initializeCheckboxes() {
    // Initialiser les checkboxes par défaut si aucune autorisation n'est définie
    if (this.selectedQuizProfiles.length === 0) {
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
        }
      });
    }

    if (this.selectedUtiliteProfiles.length === 0) {
      this.ListeProfil.forEach(role => {
        if (
          !(
            role.Role_Associe === 'R_ADMI' ||
            role.Role_Associe === 'R_SUPE' ||
            role.Role_Associe === 'R_GB'
          )
        ) {
          if (!this.selectedUtiliteProfiles.includes(role.id)) {
            this.selectedUtiliteProfiles.push(role.id);
          }
        }
      });
    }

    if (this.selectedAccesCommentaire.length === 0) {
      this.ListeProfil.forEach(role => {
        if (
          !(
            role.Role_Associe === 'R_ADMI' ||
            role.Role_Associe === 'R_SUPE' ||
            role.Role_Associe === 'R_GB'
          )
        ) {
          if (!this.selectedAccesCommentaire.includes(role.id)) {
            this.selectedAccesCommentaire.push(role.id);
          }
        }
      });
    }

    if (this.selectedAccesProfiles.length === 0) {
      this.ListeProfil.forEach(role => {
        if (!this.selectedAccesProfiles.includes(role.id)) {
          this.selectedAccesProfiles.push(role.id);
        }
      });
    }

    if (this.selectedAccesSite.length === 0 && this.ListeSite) {
      this.ListeSite.forEach(site => {
        if (!this.selectedAccesSite.includes(site.id)) {
          this.selectedAccesSite.push(site.id);
        }
      });
    }

    // Mettre à jour les valeurs du formulaire
    this.snapForm.patchValue({
      quizAutorisation: this.selectedQuizProfiles.join(','),
      utiliteAutorisation: this.selectedUtiliteProfiles.join(','),
      accesAutorisation: this.selectedAccesProfiles.join(','),
      siteAutorisation: this.selectedAccesSite.join(','),
      commentaireAutorisation: this.selectedAccesCommentaire.join(','),
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

    if (value.length > 0) {
      this.ListeSousCategorie = value[0].Sous_Categorie;
      // Réinitialiser la sous-catégorie sélectionnée
      this.snapForm.get('id_SousCategorie')?.setValue(null);
    }
  }

  onSelectionChangedd(id_Categorie: number) {
    const value = this.ListecategorieSousCategorie.filter(item => item.id === id_Categorie);

    if (value.length > 0) {
      this.ListeSousCategorie = value[0].Sous_Categorie;
    }
  }

  resetForm() {
    this.snapForm.reset();
    this.file = null;
    this.isFileChanged = false;
    this.selectedFileName = 'Aucun fichier choisi';
    this.selectedQuizProfiles = [];
    this.selectedUtiliteProfiles = [];
    this.selectedAccesProfiles = [];
    this.selectedAccesSite = [];
    this.selectedAccesCommentaire = [];
  }
}
