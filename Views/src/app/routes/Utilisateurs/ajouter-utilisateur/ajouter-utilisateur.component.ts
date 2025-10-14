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
import { MatDialogClose, MatDialogRef } from '@angular/material/dialog';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { fonction, grille, programme, site } from '@core';
@Component({
  selector: 'app-forms-elements',
  templateUrl: './ajouter-utilisateur.component.html',
  styleUrl: './ajouter-utilisateur.component.scss',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogClose,
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
    TitleCasePipe,
  ],
})
export class AjouterUtilisateurComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(UserService);
  private readonly toastSrv = inject(ToastrService);
  readonly dialogRef = inject(MatDialogRef<AjouterUtilisateurComponent>);
  snapForm!: FormGroup;
  isSubmitting = false;
  table_fonction!: fonction[];
  table_programme!: programme[];
  table_site!: site[];
  table_grille!: grille[];
  ngOnInit() {
    this.snapForm = this.fb.group({
      nom: [null, [Validators.required]],
      prenom: [null, [Validators.required]],
      nom_utilisateur: [null, [Validators.required]],
      genre: [null, [Validators.required]],
      email: [null, [Validators.required, Validators.email]],
      telephone: [null, [Validators.required]],
      ville: [null],
      adresse: [null],
      id_Fonction: [null, [Validators.required]],
      id_Site: [null, [Validators.required]],
      id_Programme: [null, [Validators.required]],
      id_Grille: [null, [Validators.required]],
    });
    this.userService.getAllFonction().subscribe({
      next: fonctions => {
        this.table_fonction = fonctions;
      },
      error: error => {
        console.log(error);
      },
    });
    this.userService.getAllProgramme().subscribe({
      next: programmes => {
        this.table_programme = programmes;
      },
      error: error => {
        console.log(error);
      },
    });
    this.userService.getAllSite().subscribe({
      next: sites => {
        this.table_site = sites;
      },
      error: error => {
        console.log(error);
      },
    });
    this.userService.getAllGrile().subscribe({
      next: grile => {
        this.table_grille = grile;
      },
      error: error => {
        console.log(error);
      },
    });
  }

  handleOnSumit() {
    this.isSubmitting = true;
    console.log(this.snapForm.value);
    this.userService
      .addUser(this.snapForm.value)
      .pipe()
      .subscribe({
        error: () => {
          this.toastSrv.error('Addresse mail ou login existe déjà');
          this.isSubmitting = false;
        },
        next: () => {
          this.toastSrv.success('Utilisateur a été cré avec succes');
          this.snapForm.reset();
          this.isSubmitting = false;
          //window.location.reload();
          /*this.router.navigateByUrl('Utilisateurs/Liste', { skipLocationChange: true }).then(() => {
            this.router.navigate([ListeUtilisateurComponent]);
          });*/
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
  onSelectionChanged({ value }: any) {
    if (value == 1 || value == 2) {
      console.log('La value est :' + value);
      this.snapForm.get('id_Grille')?.disable();
    } else {
      this.snapForm.get('id_Grille')?.enable();
    }
  }
  onNoClick(): void {
    this.dialogRef.close();
  }
}
