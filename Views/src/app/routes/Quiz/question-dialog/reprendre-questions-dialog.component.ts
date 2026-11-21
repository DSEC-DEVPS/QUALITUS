import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Subject, Subscription, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { QuizService } from '@shared/services/quiz.service';
import { QuestionSource, QuizSource } from '../interfaces';

export interface ReprendreQuestionsData {
  /** Quiz cible (celui qu'on édite). */
  quizId: number;
}

export interface ReprendreQuestionsResult {
  id_source: number;
  ids_questions: number[];
}

/**
 * Reprise des questions d'un ancien quiz (créé par l'utilisateur ou par son site) :
 * recherche du quiz par titre, puis sélection des questions (toutes cochées par
 * défaut ; celles déjà présentes dans le quiz cible sont ignorées).
 */
@Component({
  selector: 'app-reprendre-questions-dialog',
  standalone: true,
  imports: [
    FormsModule,
    DatePipe,
    MatDialogModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
  ],
  template: `
    <h2 mat-dialog-title>Reprendre des questions</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" class="w-100">
        <mat-label>Quiz source</mat-label>
        <input
          matInput
          [(ngModel)]="recherche"
          (ngModelChange)="rechercher($event)"
          [matAutocomplete]="auto"
          placeholder="Rechercher par titre…"
          autocomplete="off"
        />
        <mat-icon matSuffix>search</mat-icon>
        <mat-autocomplete #auto="matAutocomplete" (optionSelected)="choisir($event)" [displayWith]="afficher">
          @for (s of sources; track s.id) {
            <mat-option [value]="s">
              <div class="src-titre">{{ s.titre }}</div>
              <div class="src-meta">
                {{ s.nb_questions }} question(s) · {{ s.Etat === 'CLOTURER' ? 'Clôturé' : 'Ouvert' }} ·
                {{ s.dateCreation | date: 'dd/MM/yyyy' }}
              </div>
            </mat-option>
          } @empty {
            <mat-option disabled>Aucun quiz trouvé</mat-option>
          }
        </mat-autocomplete>
        <mat-hint>Quiz actifs créés par vous ou par votre site</mat-hint>
      </mat-form-field>

      @if (chargement) {
        <mat-progress-bar mode="indeterminate" />
      }

      @if (source && questions.length) {
        <div class="entete-liste">
          <mat-checkbox [checked]="toutCoche" [indeterminate]="partiel" (change)="cocherTout($event.checked)">
            Tout sélectionner
          </mat-checkbox>
          <span class="text-muted">{{ nbCoches }} / {{ selectionnables }} sélectionnée(s)</span>
        </div>
        <div class="liste">
          @for (q of questions; track q.id; let i = $index) {
            <div class="ligne" [class.presente]="q.deja_presente">
              <mat-checkbox [(ngModel)]="coches[q.id]" [disabled]="!!q.deja_presente">
                <span class="lib">{{ i + 1 }}. {{ q.libelle }}</span>
              </mat-checkbox>
              <div class="infos">
                <span>{{ q.points }} pt(s)</span>
                <span>· {{ bonnesReponses(q) }}</span>
                @if (q.deja_presente) {
                  <span class="deja">Déjà présente : ignorée</span>
                }
              </div>
            </div>
          }
        </div>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="ref.close()">Annuler</button>
      <button mat-flat-button color="primary" [disabled]="!nbCoches" (click)="valider()">
        Reprendre ({{ nbCoches }})
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .w-100 { width: 100%; }
      .src-titre { font-weight: 500; line-height: 1.2; }
      .src-meta { font-size: 12px; color: var(--qx-texte-2, #757575); line-height: 1.2; }
      .entete-liste { display: flex; align-items: center; justify-content: space-between; margin: 12px 0 4px; }
      .liste { max-height: 340px; overflow: auto; border: 1px solid var(--qx-bordure, rgba(0,0,0,0.08)); border-radius: 6px; }
      .ligne { padding: 6px 10px; border-bottom: 1px solid var(--qx-bordure, rgba(0,0,0,0.06)); }
      .ligne.presente { opacity: 0.6; }
      .infos { margin-left: 40px; font-size: 12px; color: var(--qx-texte-2, #6b6b6b); display: flex; gap: 6px; flex-wrap: wrap; }
      .deja { color: var(--qx-orange-texte, #e65100); }
      .lib { white-space: normal; }
    `,
  ],
})
export class ReprendreQuestionsDialogComponent implements OnInit, OnDestroy {
  readonly ref = inject(MatDialogRef<ReprendreQuestionsDialogComponent, ReprendreQuestionsResult>);
  readonly data = inject<ReprendreQuestionsData>(MAT_DIALOG_DATA);
  private readonly quizSrv = inject(QuizService);

  recherche: string | QuizSource = '';
  sources: QuizSource[] = [];
  source: QuizSource | null = null;
  questions: QuestionSource[] = [];
  coches: Record<number, boolean> = {};
  chargement = false;
  private readonly saisie$ = new Subject<string>();
  private abo?: Subscription;

  ngOnInit(): void {
    this.abo = this.saisie$
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap(t => this.quizSrv.getSourcesQuestions(this.data.quizId, t))
      )
      .subscribe({ next: s => (this.sources = s), error: () => (this.sources = []) });
    this.saisie$.next('');
  }

  ngOnDestroy(): void {
    this.abo?.unsubscribe();
  }

  afficher = (s: QuizSource | string | null): string => (s && typeof s === 'object' ? s.titre : s || '');

  rechercher(v: string | QuizSource) {
    if (typeof v === 'string') {
      this.saisie$.next(v.trim());
    }
  }

  choisir(e: MatAutocompleteSelectedEvent) {
    const s = e.option.value as QuizSource;
    this.source = s;
    this.questions = [];
    this.chargement = true;
    this.quizSrv.getQuestionsSource(this.data.quizId, s.id).subscribe({
      next: q => {
        this.questions = q;
        // Toutes cochées par défaut, sauf celles déjà présentes (ignorées).
        this.coches = {};
        q.forEach(x => (this.coches[x.id] = !x.deja_presente));
        this.chargement = false;
      },
      error: () => (this.chargement = false),
    });
  }

  get selectionnables(): number {
    return this.questions.filter(q => !q.deja_presente).length;
  }
  get nbCoches(): number {
    return this.questions.filter(q => !q.deja_presente && this.coches[q.id]).length;
  }
  get toutCoche(): boolean {
    return this.selectionnables > 0 && this.nbCoches === this.selectionnables;
  }
  get partiel(): boolean {
    return this.nbCoches > 0 && this.nbCoches < this.selectionnables;
  }

  cocherTout(v: boolean) {
    this.questions.filter(q => !q.deja_presente).forEach(q => (this.coches[q.id] = v));
  }

  bonnesReponses(q: QuestionSource): string {
    const b = (q.options || []).filter(o => o.est_correcte).map(o => o.libelle);
    return b.length ? `Bonne(s) réponse(s) : ${b.join(', ')}` : 'Aucune bonne réponse';
  }

  valider() {
    if (!this.source || !this.nbCoches) {
      return;
    }
    this.ref.close({
      id_source: this.source.id,
      ids_questions: this.questions.filter(q => !q.deja_presente && this.coches[q.id]).map(q => q.id),
    });
  }
}
