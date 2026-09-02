import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ConditionSondage, OptionSondage, QuestionSondage, TYPES_QUESTION } from '../interfaces';

export interface QuestionDialogData {
  mode: 'add' | 'edit';
  question?: QuestionSondage;
  pageParDefaut?: number;
  questionsExistantes?: QuestionSondage[];
}

@Component({
  selector: 'app-question-sondage-dialog',
  standalone: true,
  imports: [
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.mode === 'edit' ? 'Modifier la question' : 'Nouvelle question' }}</h2>
    <mat-dialog-content>
      <div class="row-2">
        <mat-form-field appearance="fill">
          <mat-label>Type</mat-label>
          <mat-select [(ngModel)]="type">
            @for (t of types; track t.value) {
              <mat-option [value]="t.value">{{ t.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="fill">
          <mat-label>Numéro de page</mat-label>
          <input matInput type="number" min="1" [(ngModel)]="page" />
          <span matTextPrefix>P</span>
        </mat-form-field>
      </div>

      <mat-form-field appearance="fill" class="w-100">
        <mat-label>{{ type === 'INFO' ? 'Message d’information' : 'Question' }}</mat-label>
        <textarea matInput rows="2" [(ngModel)]="libelle"></textarea>
      </mat-form-field>

      @if (aOptions()) {
        <div class="options">
          <div class="options-tete">
            <span>Réponses proposées</span>
            <button mat-stroked-button color="primary" type="button" (click)="ajouterOption()">
              <mat-icon>add</mat-icon> Ajouter une réponse
            </button>
          </div>
          @for (o of options; track $index; let i = $index) {
            <div class="option-ligne">
              <mat-form-field appearance="outline" class="w-100">
                <mat-label>Réponse {{ i + 1 }}</mat-label>
                <input matInput [(ngModel)]="options[i].libelle" />
              </mat-form-field>
              <button mat-icon-button color="warn" type="button" (click)="supprimerOption(i)">
                <mat-icon>delete</mat-icon>
              </button>
            </div>
          } @empty {
            <p class="muted">Ajoutez au moins une réponse.</p>
          }
        </div>
      }

      @if (type === 'CURSEUR') {
        <div class="row-2">
          <mat-form-field appearance="fill">
            <mat-label>Valeur min</mat-label>
            <input matInput type="number" [(ngModel)]="curseur_min" />
          </mat-form-field>
          <mat-form-field appearance="fill">
            <mat-label>Valeur max</mat-label>
            <input matInput type="number" [(ngModel)]="curseur_max" />
          </mat-form-field>
        </div>
      }

      @if (type !== 'INFO') {
        <mat-slide-toggle [(ngModel)]="obligatoire">Réponse obligatoire</mat-slide-toggle>
      }

      <!-- Conditions d'affichage (la question est sautée si non remplies) -->
      <div class="conditions">
        <div class="options-tete">
          <span>Conditions d'affichage <small>(la question est sautée si non remplies)</small></span>
          <button
            mat-stroked-button
            type="button"
            (click)="ajouterCondition()"
            [disabled]="!sources.length"
          >
            <mat-icon>add</mat-icon> Ajouter
          </button>
        </div>
        @if (!sources.length) {
          <p class="muted">Aucune question précédente ne permet de définir une condition.</p>
        }
        @for (c of conditions; track $index; let i = $index) {
          <div class="cond-ligne">
            <span class="cond-si">Si</span>
            <mat-form-field appearance="outline" class="cond-q">
              <mat-label>Question</mat-label>
              <mat-select [(ngModel)]="c.id_Question_source" (ngModelChange)="onSourceChange(c)">
                @for (s of sources; track s.id) {
                  <mat-option [value]="s.id">{{ court(s.libelle) }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" class="cond-op">
              <mat-label>Opérateur</mat-label>
              <mat-select [(ngModel)]="c.operateur">
                @for (op of operateursPour(c); track op.value) {
                  <mat-option [value]="op.value">{{ op.label }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            @if (sourceEstChoix(c)) {
              <mat-form-field appearance="outline" class="cond-val">
                <mat-label>Réponse</mat-label>
                <mat-select [(ngModel)]="c.id_Option">
                  @for (o of optionsSource(c); track o.id) {
                    <mat-option [value]="o.id">{{ o.libelle }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
            } @else {
              <mat-form-field appearance="outline" class="cond-val">
                <mat-label>Valeur</mat-label>
                <input matInput [(ngModel)]="c.valeur" />
              </mat-form-field>
            }
            <button mat-icon-button color="warn" type="button" (click)="supprimerCondition(i)">
              <mat-icon>delete</mat-icon>
            </button>
          </div>
        }
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Annuler</button>
      <button mat-flat-button color="primary" (click)="valider()">Enregistrer</button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .w-100 { width: 100%; }
      .row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
      .options, .conditions { margin: 6px 0 12px; }
      .options-tete { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
      .options-tete small { color: #8a8a8a; font-weight: 400; }
      .option-ligne { display: flex; align-items: center; gap: 6px; }
      .cond-ligne { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
      .cond-si { color: #555; }
      .cond-q { min-width: 180px; flex: 1; }
      .cond-op { width: 120px; }
      .cond-val { min-width: 140px; }
      .conditions { border-top: 1px solid rgba(0,0,0,0.08); padding-top: 8px; }
      .muted { color: #8a8a8a; }
      mat-slide-toggle { margin-top: 4px; }
    `,
  ],
})
export class QuestionSondageDialogComponent {
  types = TYPES_QUESTION;

  type = 'CHOIX_UNIQUE';
  page = 1;
  libelle = '';
  obligatoire = true;
  curseur_min = 1;
  curseur_max = 10;
  options: { libelle: string }[] = [];
  conditions: ConditionSondage[] = [];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: QuestionDialogData,
    private ref: MatDialogRef<QuestionSondageDialogComponent>
  ) {
    if (data.mode === 'edit' && data.question) {
      const q = data.question;
      this.type = q.type;
      this.page = q.page || 1;
      this.libelle = q.libelle;
      this.obligatoire = q.obligatoire === 1;
      this.curseur_min = q.curseur_min ?? 1;
      this.curseur_max = q.curseur_max ?? 10;
      this.options = (q.options || []).map(o => ({ libelle: o.libelle }));
      this.conditions = (q.conditions || []).map(c => ({ ...c }));
    } else {
      this.page = data.pageParDefaut || 1;
    }
  }

  /* ----- Options ----- */
  aOptions(): boolean {
    return ['CHOIX_UNIQUE', 'CHOIX_MULTIPLE', 'CLASSEMENT'].includes(this.type);
  }
  ajouterOption() {
    this.options.push({ libelle: '' });
  }
  supprimerOption(i: number) {
    this.options.splice(i, 1);
  }

  /* ----- Conditions ----- */
  get sources(): QuestionSondage[] {
    return (this.data.questionsExistantes || []).filter(
      q => q.type !== 'INFO' && q.id !== this.data.question?.id
    );
  }
  court(t: string): string {
    return t.length > 45 ? t.slice(0, 45) + '…' : t;
  }
  sourceById(id?: number): QuestionSondage | undefined {
    return this.sources.find(s => s.id === id);
  }
  sourceEstChoix(c: ConditionSondage): boolean {
    const s = this.sourceById(c.id_Question_source);
    return !!s && ['CHOIX_UNIQUE', 'CHOIX_MULTIPLE', 'CLASSEMENT'].includes(s.type);
  }
  optionsSource(c: ConditionSondage): OptionSondage[] {
    return this.sourceById(c.id_Question_source)?.options || [];
  }
  operateursPour(c: ConditionSondage): { value: string; label: string }[] {
    const s = this.sourceById(c.id_Question_source);
    if (s && s.type === 'CURSEUR') {
      return [
        { value: 'EGAL', label: '=' },
        { value: 'SUP_EGAL', label: '≥' },
        { value: 'INF_EGAL', label: '≤' },
      ];
    }
    if (s && s.type === 'OUVERTE') {
      return [{ value: 'CONTIENT', label: 'contient' }];
    }
    return [
      { value: 'EGAL', label: 'est' },
      { value: 'DIFFERENT', label: "n'est pas" },
    ];
  }
  onSourceChange(c: ConditionSondage) {
    c.id_Option = null;
    c.valeur = null;
    c.operateur = this.operateursPour(c)[0].value;
  }
  ajouterCondition() {
    const s = this.sources[0];
    if (!s) return;
    const c: ConditionSondage = { id_Question_source: s.id!, operateur: 'EGAL', id_Option: null, valeur: null };
    c.operateur = this.operateursPour(c)[0].value;
    this.conditions.push(c);
  }
  supprimerCondition(i: number) {
    this.conditions.splice(i, 1);
  }

  valider() {
    if (!this.libelle.trim()) {
      return;
    }
    const payload: QuestionSondage = {
      page: this.page || 1,
      type: this.type,
      libelle: this.libelle.trim(),
      obligatoire: this.type === 'INFO' ? 0 : this.obligatoire ? 1 : 0,
      curseur_min: this.type === 'CURSEUR' ? this.curseur_min : null,
      curseur_max: this.type === 'CURSEUR' ? this.curseur_max : null,
      options: this.aOptions() ? this.options.filter(o => o.libelle.trim()) : [],
      conditions: this.conditions.filter(c => c.id_Question_source),
    };
    this.ref.close(payload);
  }
}
