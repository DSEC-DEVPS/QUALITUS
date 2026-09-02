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
import { MatSelectModule } from '@angular/material/select';
import { CritereRegle } from '../interfaces';

export interface CritereDialogData {
  mode: 'add' | 'edit';
  critere?: CritereRegle;
}

@Component({
  selector: 'app-critere-dialog',
  standalone: true,
  imports: [
    MatFormFieldModule,
    MatDialogClose,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
  ],
  templateUrl: './critere-dialog.component.html',
})
export class CritereDialogComponent implements OnInit {
  readonly dialogRef = inject(MatDialogRef<CritereDialogComponent>);
  private readonly fb = inject(FormBuilder);

  form!: FormGroup;
  titre = '';
  operateurs = ['>', '>=', '<', '<=', '='];

  constructor(@Inject(MAT_DIALOG_DATA) public data: CritereDialogData) {}

  ngOnInit(): void {
    const c = this.data.critere;
    this.titre =
      (this.data.mode === 'add' ? 'Ajouter' : 'Modifier') + ' un critere';
    this.form = this.fb.group({
      type_ecart: [c?.type_ecart ?? null, Validators.required],
      operateur: [c?.operateur ?? '>', Validators.required],
      valeur_objectif: [c?.valeur_objectif ?? null],
      libelle_echec: [c?.libelle_echec ?? 'inferieur ou egal a l objectif'],
      libelle_reussite: [c?.libelle_reussite ?? 'strictement superieur a l objectif'],
    });
  }

  valider() {
    if (this.form.invalid) {
      return;
    }
    this.dialogRef.close(this.form.value);
  }
}
