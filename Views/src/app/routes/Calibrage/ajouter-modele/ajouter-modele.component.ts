import { Component, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialogClose, MatDialogRef } from '@angular/material/dialog';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MtxButtonModule } from '@ng-matero/extensions/button';
import { ToastrService } from 'ngx-toastr';
import { CalibrageService } from '@shared/services/calibrage.service';

@Component({
  selector: 'app-ajouter-modele',
  standalone: true,
  imports: [
    MatFormFieldModule,
    MatDialogClose,
    MatInputModule,
    MatButtonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MtxButtonModule,
  ],
  templateUrl: './ajouter-modele.component.html',
})
export class AjouterModeleComponent implements OnInit {
  readonly dialogRef = inject(MatDialogRef<AjouterModeleComponent>);
  private readonly fb = inject(FormBuilder);
  private readonly calibrage = inject(CalibrageService);
  private readonly toast = inject(ToastrService);

  form!: FormGroup;
  isSubmitting = false;

  ngOnInit(): void {
    this.form = this.fb.group({
      nom: [null, Validators.required],
      description: [null],
    });
  }

  handleOnSubmit() {
    if (this.form.invalid) {
      return;
    }
    this.isSubmitting = true;
    this.calibrage.addModele(this.form.value).subscribe({
      next: () => {
        this.toast.success('Modele de grille cree avec succes');
        this.isSubmitting = false;
        this.dialogRef.close(true);
      },
      error: () => {
        this.toast.error("Une erreur s'est produite");
        this.isSubmitting = false;
      },
    });
  }
}
