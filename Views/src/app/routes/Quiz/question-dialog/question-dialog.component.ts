import { Component, Inject, OnInit, inject } from '@angular/core';
import { fmtPoints, lirePoints, r2 } from '../bareme';
import { PointsPipe } from '../points.pipe';
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
  /** Points des AUTRES questions du quiz (barème total = 100). */
  pointsAutres?: number;
}

export interface QuestionDialogResult {
  type: string;
  libelle: string;
  points: number;
  options: OptionQ[];
}

interface OptionEdit {
  libelle: string;
  correct: boolean;
}

@Component({
  selector: 'app-question-dialog',
  standalone: true,
  imports: [PointsPipe,
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
    `.champ-points { width: 200px; margin-bottom: 16px; } .hint-erreur { color: #c62828; }
     .bareme-apres { font-size: 13px; color: #e65100; background: #fff4e5; border-radius: 6px; padding: 6px 10px; margin: -6px 0 14px; }
     .bareme-apres.ok { color: #1b5e20; background: #e8f5e9; } .bareme-apres.sur { color: #b71c1c; background: #fdecea; }`,
  ],
})
export class QuestionDialogComponent implements OnInit {
  readonly dialogRef = inject(MatDialogRef<QuestionDialogComponent>);

  titre = '';
  type: 'VRAI_FAUX' | 'QCU' | 'QCM' = 'VRAI_FAUX';
  libelle = '';
  /** Barème de la question : de 0,01 à 100, 2 décimales (5 par défaut). Saisie texte (virgule acceptée). */
  points: string = '5';
  options: OptionEdit[] = [];
  bonneIndex = 0; // pour les types a reponse unique (VRAI_FAUX / QCU)

  constructor(@Inject(MAT_DIALOG_DATA) public data: QuestionDialogData) {}

  ngOnInit(): void {
    this.titre = (this.data.mode === 'add' ? 'Ajouter' : 'Modifier') + ' une question';
    const q = this.data.question;
    if (q) {
      this.type = (q.type as any) || 'VRAI_FAUX';
      this.libelle = q.libelle || '';
      this.points = fmtPoints(q.points ?? 5);
      const opts = q.options || [];
      this.options = opts.map(o => ({ libelle: o.libelle, correct: !!o.est_correcte }));
      this.bonneIndex = Math.max(0, this.options.findIndex(o => o.correct));
    }
    // Nouvelle question : on propose les points qui restent à répartir.
    if (!q && this.data.pointsAutres !== undefined) {
      const reste = r2(100 - this.data.pointsAutres);
      if (reste >= 0.01) this.points = fmtPoints(Math.min(100, reste));
    }
    if (!this.options.length) {
      this.appliquerType();
    }
  }

  /** Total du barème si la question est enregistrée avec les points saisis. */
  get totalApres(): number | null {
    if (this.data.pointsAutres === undefined || !this.pointsValides) return null;
    return r2(this.data.pointsAutres + (lirePoints(this.points) ?? 0));
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

  get pointsValides(): boolean {
    return lirePoints(this.points) !== null;
  }

  valider() {
    if (!this.libelle.trim() || !this.pointsValides) {
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
      points: lirePoints(this.points)!,
      options: optionsFinales,
    } as QuestionDialogResult);
  }
}
