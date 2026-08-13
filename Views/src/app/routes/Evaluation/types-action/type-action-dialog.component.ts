import { Component, Inject, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MAT_DIALOG_DATA, MatDialogClose, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ActionType } from '../interfaces';

export interface TypeActionDialogData {
  mode: 'add' | 'edit';
  type?: ActionType;
}

@Component({
  selector: 'app-type-action-dialog',
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
  templateUrl: './type-action-dialog.component.html',
})
export class TypeActionDialogComponent implements OnInit {
  readonly dialogRef = inject(MatDialogRef<TypeActionDialogComponent>);
  private readonly fb = inject(FormBuilder);
  form!: FormGroup;
  titre = '';

  constructor(@Inject(MAT_DIALOG_DATA) public data: TypeActionDialogData) {}

  ngOnInit(): void {
    this.titre = (this.data.mode === 'add' ? 'Ajouter' : 'Modifier') + " un type d'action";
    this.form = this.fb.group({ libelle: [this.data.type?.libelle ?? null, Validators.required] });
  }

  valider() {
    if (this.form.invalid) {
      return;
    }
    this.dialogRef.close(this.form.value);
  }
}
