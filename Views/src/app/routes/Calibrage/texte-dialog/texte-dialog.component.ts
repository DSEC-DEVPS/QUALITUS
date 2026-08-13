import { Component, Inject, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import {
  MAT_DIALOG_DATA,
  MatDialogClose,
  MatDialogRef,
} from '@angular/material/dialog';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

export interface TexteDialogData {
  titre: string;
  label?: string;
  valeur?: string;
}

@Component({
  selector: 'app-texte-dialog',
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
  templateUrl: './texte-dialog.component.html',
})
export class TexteDialogComponent implements OnInit {
  readonly dialogRef = inject(MatDialogRef<TexteDialogComponent>);
  private readonly fb = inject(FormBuilder);

  form!: FormGroup;

  constructor(@Inject(MAT_DIALOG_DATA) public data: TexteDialogData) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      valeur: [this.data.valeur ?? null, Validators.required],
    });
  }

  valider() {
    if (this.form.invalid) {
      return;
    }
    this.dialogRef.close(this.form.value.valeur);
  }
}
