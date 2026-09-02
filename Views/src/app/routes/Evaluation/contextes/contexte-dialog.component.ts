import { Component, Inject, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MAT_DIALOG_DATA, MatDialogClose, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Contexte } from '../interfaces';

export interface ContexteDialogData {
  mode: 'add' | 'edit';
  contexte?: Contexte;
}

@Component({
  selector: 'app-contexte-dialog',
  standalone: true,
  imports: [
    MatFormFieldModule,
    MatDialogClose,
    MatInputModule,
    MatButtonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
  ],
  templateUrl: './contexte-dialog.component.html',
})
export class ContexteDialogComponent implements OnInit {
  readonly dialogRef = inject(MatDialogRef<ContexteDialogComponent>);
  private readonly fb = inject(FormBuilder);
  form!: FormGroup;
  titre = '';

  constructor(@Inject(MAT_DIALOG_DATA) public data: ContexteDialogData) {}

  ngOnInit(): void {
    this.titre = (this.data.mode === 'add' ? 'Ajouter' : 'Modifier') + ' un contexte';
    this.form = this.fb.group({
      libelle: [this.data.contexte?.libelle ?? null, Validators.required],
    });
  }

  valider() {
    if (this.form.invalid) {
      return;
    }
    this.dialogRef.close(this.form.value);
  }
}
