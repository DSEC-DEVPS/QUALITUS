import { Component, inject, model, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import {
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatOptionModule } from '@angular/material/core';
import { MtxButtonModule } from '@ng-matero/extensions/button';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { UserService } from '@shared/services/user.service';
import { ToastrService } from 'ngx-toastr';
@Component({
  selector: 'app-ajouter-fonction',
  standalone: true,
  imports: [
    MatFormFieldModule,
    MatDialogActions,
    MatDialogClose,
    MatDialogContent,
    MatInputModule,
    MatSelectModule,
    MatDialogTitle,
    MatButtonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatOptionModule,
    MtxButtonModule,
  ],
  templateUrl: './ajouter-fonction.component.html',
  styleUrl: './ajouter-fonction.component.scss',
})
export class AjouterFonctionComponent {
  readonly dialogRef = inject(MatDialogRef<AjouterFonctionComponent>);
  private readonly fb = inject(FormBuilder);
  formFonction!: FormGroup;
  isSubmitting = false;
  constructor(
    private userService: UserService,
    private toastSrv: ToastrService
  ) {}
  ngOnInit(): void {
    this.formFonction = this.fb.group({
      nom: [null, Validators.required],
    });
  }
  handleOnSumit() {
    this.isSubmitting = true;
    console.log(this.formFonction.value);
    this.userService.addFonction(this.formFonction.value).subscribe({
      error: () => {
        this.toastSrv.error('Il y a eu lieu une erreur');
        this.isSubmitting = false;
      },
      next: () => {
        this.toastSrv.success('Nouvelle Fonction ajoutée avec succès');
        this.isSubmitting = false;
        this.dialogRef.close();
      },
    });
  }
  onNoClick(): void {
    this.dialogRef.close();
  }
}
