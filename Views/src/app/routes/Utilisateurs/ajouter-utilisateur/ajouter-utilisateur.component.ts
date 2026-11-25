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
import { fonction, programme, site } from '@core';
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
  table_eval_grille: { id: number; nom: string }[] = [];
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
      // id_Grille (legacy b_grille) déprécié — la grille d'évaluation est id_EvalGrille
      id_EvalGrille: [null],
    });
    // Listes limitées au périmètre : son site (sauf administrateur / site à vision
    // globale), sans la fonction Administrateur pour un non-administrateur.
    this.userService.getReferentielsCreation().subscribe({
      next: r => {
        this.table_fonction = r.fonctions || [];
        this.table_site = r.sites || [];
        this.table_programme = r.programmes || [];
        this.table_eval_grille = r.grilles || [];
        if (this.table_site.length === 1) this.snapForm.get('id_Site')?.setValue(this.table_site[0].id);
      },
      error: e => this.toastSrv.error(e?.error?.message || 'Impossible de charger les listes du formulaire.'),
    });
  }

  handleOnSumit() {
    this.isSubmitting = true;
    this.userService
      .addUser(this.snapForm.value)
      .pipe()
      .subscribe({
        error: e => {
          this.toastSrv.error(e?.error?.message || 'La création du compte a échoué.');
          this.isSubmitting = false;
        },
        next: () => {
          this.toastSrv.success('Le compte a bien été créé.');
          const site = this.table_site.length === 1 ? this.table_site[0].id : null;
          this.snapForm.reset();
          if (site) this.snapForm.get('id_Site')?.setValue(site);
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
    // La grille d'évaluation ne concerne pas certaines fonctions
    if (value == 1 || value == 2) {
      this.snapForm.get('id_EvalGrille')?.disable();
    } else {
      this.snapForm.get('id_EvalGrille')?.enable();
    }
  }
  onNoClick(): void {
    this.dialogRef.close();
  }
}
