import { Component, Inject, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import {
  MAT_DIALOG_DATA,
  MatDialogClose,
  MatDialogRef,
} from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { OptionQ, Question } from '../interfaces';

export interface QuestionDialogData {
  mode: 'add' | 'edit';
  question?: Question;
}

export interface QuestionDialogResult {
  type: string;
  libelle: string;
  options: OptionQ[];
}

interface OptionEdit {
  libelle: string;
  correct: boolean;
}

@Component({
  selector: 'app-question-dialog',
  standalone: true,
  imports: [
    MatFormFieldModule,
    MatDialogClose,
    MatInputModule,
    MatRadioModule,
    MatCheckboxModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    FormsModule,
    MatCardModule,
  ],
  templateUrl: './question-dialog.component.html',
  styles: [
    `.options-col { display: flex; flex-direction: column; gap: 4px; }`,
    `.option-ligne { display: flex; align-items: center; gap: 8px; }`,
    `.opt-input { flex: 1; }`,
    `.opt-fixe { font-weight: 500; }`,
    `.m-b-8 { margin-bottom: 8px; } .m-t-8 { margin-top: 8px; } .m-t-16 { margin-top: 16px; }`,
  ],
})
export class QuestionDialogComponent implements OnInit {
  readonly dialogRef = inject(MatDialogRef<QuestionDialogComponent>);

  titre = '';
  type: 'VRAI_FAUX' | 'QCU' | 'QCM' = 'VRAI_FAUX';
  libelle = '';
  options: OptionEdit[] = [];
  bonneIndex = 0; // pour les types a reponse unique (VRAI_FAUX / QCU)

  constructor(@Inject(MAT_DIALOG_DATA) public data: QuestionDialogData) {}

  ngOnInit(): void {
    this.titre = (this.data.mode === 'add' ? 'Ajouter' : 'Modifier') + ' une question';
    const q = this.data.question;
    if (q) {
      this.type = (q.type as any) || 'VRAI_FAUX';
      this.libelle = q.libelle || '';
      const opts = q.options || [];
      this.options = opts.map(o => ({ libelle: o.libelle, correct: !!o.est_correcte }));
      this.bonneIndex = Math.max(0, this.options.findIndex(o => o.correct));
    }
    if (!this.options.length) {
      this.appliquerType();
    }
  }

  get estUnique(): boolean {
    return this.type === 'VRAI_FAUX' || this.type === 'QCU';
  }
  get vraiFaux(): boolean {
    return this.type === 'VRAI_FAUX';
  }

  appliquerType() {
    if (this.type === 'VRAI_FAUX') {
      this.options = [
        { libelle: 'Vrai', correct: true },
        { libelle: 'Faux', correct: false },
      ];
      this.bonneIndex = 0;
    } else {
      // QCU / QCM : au moins 2 options editables
      if (this.options.length < 2 || this.vraiFauxLike()) {
        this.options = [
          { libelle: '', correct: false },
          { libelle: '', correct: false },
        ];
      }
      this.bonneIndex = 0;
    }
  }

  private vraiFauxLike(): boolean {
    const l = this.options.map(o => o.libelle.toLowerCase());
    return l.length === 2 && l.includes('vrai') && l.includes('faux');
  }

  ajouterOption() {
    this.options.push({ libelle: '', correct: false });
  }
  supprimerOption(i: number) {
    this.options.splice(i, 1);
    if (this.bonneIndex >= this.options.length) {
      this.bonneIndex = 0;
    }
  }

  valider() {
    if (!this.libelle.trim()) {
      return;
    }
    // Validation selon le type
    if (this.options.length < 2 || this.options.some(o => !o.libelle.trim())) {
      return;
    }
    let optionsFinales: OptionQ[];
    if (this.estUnique) {
      optionsFinales = this.options.map((o, i) => ({
        libelle: o.libelle.trim(),
        est_correcte: i === this.bonneIndex ? 1 : 0,
      }));
    } else {
      // QCM : au moins une bonne reponse
      if (!this.options.some(o => o.correct)) {
        return;
      }
      optionsFinales = this.options.map(o => ({
        libelle: o.libelle.trim(),
        est_correcte: o.correct ? 1 : 0,
      }));
    }
    this.dialogRef.close({
      type: this.type,
      libelle: this.libelle.trim(),
      options: optionsFinales,
    } as QuestionDialogResult);
  }
}
