import { Component, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
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
  selector: 'app-import-modele',
  standalone: true,
  imports: [
    MatFormFieldModule,
    MatDialogClose,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MtxButtonModule,
  ],
  templateUrl: './import-modele.component.html',
})
export class ImportModeleComponent implements OnInit {
  readonly dialogRef = inject(MatDialogRef<ImportModeleComponent>);
  private readonly fb = inject(FormBuilder);
  private readonly calibrage = inject(CalibrageService);
  private readonly toast = inject(ToastrService);

  form!: FormGroup;
  fichier: File | null = null;
  isSubmitting = false;

  ngOnInit(): void {
    this.form = this.fb.group({
      nom: [null, Validators.required],
      description: [null],
    });
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    this.fichier = input.files && input.files.length ? input.files[0] : null;
  }

  handleImport() {
    if (this.form.invalid || !this.fichier) {
      this.toast.warning('Selectionnez un fichier et renseignez le nom');
      return;
    }
    const formData = new FormData();
    formData.append('nom', this.form.value.nom);
    if (this.form.value.description) {
      formData.append('description', this.form.value.description);
    }
    formData.append('file', this.fichier);

    this.isSubmitting = true;
    this.calibrage.importModele(formData).subscribe({
      next: res => {
        const r = res.resume;
        this.toast.success(
          `Import reussi : ${r.categories} categories, ${r.erreurs} erreurs, ${r.items} items, ${r.sousItems} sous-items, ${r.regles} regles`
        );
        this.isSubmitting = false;
        this.dialogRef.close(true);
      },
      error: () => {
        this.toast.error("Echec de l'import Excel");
        this.isSubmitting = false;
      },
    });
  }
}
