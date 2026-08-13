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
import { MtxButtonModule } from '@ng-matero/extensions/button';
import { NiveauCalibrage } from '../interfaces';

export interface ElementDialogData {
  niveau: NiveauCalibrage;
  mode: 'add' | 'edit';
  // Valeurs initiales en mode edition
  nom?: string;
  poids?: number;
  referentiel?: string;
}

export interface ElementDialogResult {
  nom: string;
  poids: number;
  referentiel?: string;
}

const LIBELLES: Record<NiveauCalibrage, string> = {
  categorie: "Categorie d'erreur",
  erreur: 'Erreur',
  item: 'Item',
  sousItem: 'Sous-item',
};

@Component({
  selector: 'app-element-dialog',
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
  templateUrl: './element-dialog.component.html',
})
export class ElementDialogComponent implements OnInit {
  readonly dialogRef = inject(MatDialogRef<ElementDialogComponent>);
  private readonly fb = inject(FormBuilder);

  form!: FormGroup;
  titre = '';
  estSousItem = false;

  constructor(@Inject(MAT_DIALOG_DATA) public data: ElementDialogData) {}

  ngOnInit(): void {
    this.estSousItem = this.data.niveau === 'sousItem';
    const libelle = LIBELLES[this.data.niveau];
    this.titre =
      (this.data.mode === 'add' ? 'Ajouter' : 'Modifier') + ' : ' + libelle;

    this.form = this.fb.group({
      nom: [this.data.nom ?? null, Validators.required],
      poids: [this.data.poids ?? 0],
      referentiel: [this.data.referentiel ?? null],
    });
  }

  valider() {
    if (this.form.invalid) {
      return;
    }
    const value = this.form.value;
    const result: ElementDialogResult = {
      nom: value.nom,
      poids: Number(value.poids) || 0,
      referentiel: this.estSousItem ? value.referentiel : undefined,
    };
    this.dialogRef.close(result);
  }
}
