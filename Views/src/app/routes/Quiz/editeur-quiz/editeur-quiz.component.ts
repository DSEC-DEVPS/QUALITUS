import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import {
  AppearanceAnimation,
  ConfirmBoxInitializer,
  DialogLayoutDisplay,
  DisappearanceAnimation,
} from '@costlydeveloper/ngx-awesome-popup';
import { QuizService } from '@shared/services/quiz.service';
import { FicheRecente, Question, Quiz } from '../interfaces';
import {
  QuestionDialogComponent,
  QuestionDialogData,
  QuestionDialogResult,
} from '../question-dialog/question-dialog.component';
import {
  actionModification,
  confirmerImpact,
  exporterTentativesQuiz,
  MSG_QUIZ_FERME,
  quizDejaPasse,
} from '../question-dialog/questions-impact';
import {
  ReprendreQuestionsDialogComponent,
  ReprendreQuestionsResult,
} from '../question-dialog/reprendre-questions-dialog.component';
import { finalize } from 'rxjs';
import { ConfirmationService } from '@shared/services/confirmation.service';
import { BAREME_TOTAL, confirmerRepartition, proposerRepartition, totalPoints } from '../bareme';
import { ChargementComponent } from '@shared/components/chargement/chargement.component';

@Component({
  selector: 'app-editeur-quiz',
  standalone: true,
  imports: [ChargementComponent,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatTooltipModule,
    MatChipsModule,
  ],
  templateUrl: './editeur-quiz.component.html',
  styleUrl: './editeur-quiz.component.scss',
})
export class EditeurQuizComponent implements OnInit {
  chargement = false;
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly quizSrv = inject(QuizService);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastrService);

  quizId: number | null = null;
  quiz?: Quiz;
  questions: Question[] = [];
  fiches: FicheRecente[] = [];
  form!: FormGroup;

  ngOnInit(): void {
    this.form = this.fb.group({
      titre: [null, Validators.required],
      type: [null],
      duree: [null, [Validators.min(0)]],
      date_fermeture: [null],
      note_passage: [70, [Validators.required, Validators.min(0), Validators.max(100)]],
      acces: ['PRIVATE'],
      alterner_questions: [0],
      autoriser_machines: [1],
      fiches: [[]],
      // État (OUVERT / CLOTURER) : site propriétaire et utilisateurs autorisés.
      Etat: ['OUVERT'],
      // Statut (ACTIF / INACTIF) : site propriétaire uniquement.
      statut: ['ACTIF'],
    });

    this.quizSrv.getFichesRecentes().subscribe({
      next: f => (this.fiches = f),
      error: () => {},
    });

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.quizId = Number(idParam);
      this.chargement = true;
      this.charger();
    }
  }

  charger() {
    if (!this.quizId) {
      return;
    }
    this.quizSrv.getOne(this.quizId).pipe(finalize(() => (this.chargement = false))).subscribe({
      next: q => {
        this.quiz = q;
        this.questions = q.questions || [];
        if (this.proposerApresChargement) {
          this.proposerApresChargement = false;
          setTimeout(async () => { if (await proposerRepartition(this.confirmation, this.questions)) this.repartirPoints(false); });
        }
        this.form.patchValue({
          titre: q.titre,
          type: q.type,
          duree: q.duree,
          date_fermeture: q.date_fermeture ? String(q.date_fermeture).slice(0, 16) : null,
          note_passage: q.note_passage,
          acces: q.acces || 'PRIVATE',
          alterner_questions: q.alterner_questions ? 1 : 0,
          autoriser_machines: q.autoriser_machines ? 1 : 0,
          fiches: q.fiches || [],
          Etat: q.Etat || 'OUVERT',
          statut: q.statut || 'ACTIF',
        });
        // Utilisateur autorisé (site invité) : seuls la durée, la date de fermeture
        // et l'état restent modifiables ; les champs désactivés ne sont pas envoyés.
        if (!this.coteProprietaire) {
          for (const champ of ['titre', 'type', 'note_passage', 'acces', 'alterner_questions',
                               'autoriser_machines', 'fiches', 'statut']) {
            this.form.get(champ)?.disable({ emitEvent: false });
          }
        }
      },
      error: () => this.toast.error('Quiz introuvable'),
    });
  }

  /** Côté propriétaire (admin, créateur, site propriétaire) ; vrai en création. */
  get coteProprietaire(): boolean {
    return !this.quizId || !this.quiz || this.quiz.cote_proprietaire === 1;
  }

  /**
   * Seuls les champs ACTIFS du formulaire sont envoyés : l'API ne modifie que les
   * paramètres reçus (rien n'est écrasé) et, pour un utilisateur autorisé, se
   * limite à la durée, la date de fermeture et l'état.
   */
  private payload(): Partial<Quiz> {
    const v: any = this.form.value; // exclut les champs désactivés
    const p: any = { ...v };
    if ('alterner_questions' in v) p.alterner_questions = v.alterner_questions ? 1 : 0;
    if ('autoriser_machines' in v) p.autoriser_machines = v.autoriser_machines ? 1 : 0;
    if ('fiches' in v) p.fiches = v.fiches || [];
    return p;
  }

  enregistrerEntete() {
    if (this.form.invalid) {
      this.toast.warning('Merci de renseigner au moins le titre');
      return;
    }
    if (this.quizId) {
      this.quizSrv.update(this.quizId, this.payload()).subscribe({
        next: () => this.toast.success('Quiz enregistré'),
        // Le message précis du serveur est affiché par l'intercepteur global.
        error: () => {},
      });
    } else {
      this.quizSrv.add(this.payload()).subscribe({
        next: r => {
          this.toast.success('Quiz créé - ajoutez maintenant des questions');
          this.quizId = r.id;
          // Passe en mode edition pour permettre l'ajout de questions
          this.router.navigate(['/mon-espace/quiz/editer', r.id]);
        },
        error: () => this.toast.error("Une erreur s'est produite"),
      });
    }
  }

  retour() {
    this.router.navigate(['/mon-espace/quiz/gestion']);
  }

  /** Ouvre le détail du quiz (onglet Diffusion : désignation des participants). */
  diffusion() {
    if (!this.quizId) {
      return;
    }
    this.router.navigate(['/mon-espace/quiz/detail', this.quizId]);
  }

  typeLabel(q: Question): string {
    switch (q.type) {
      case 'QCU':
        return 'QCU';
      case 'QCM':
        return 'QCM';
      default:
        return 'Vrai / Faux';
    }
  }

  bonnesReponses(q: Question): string {
    const c = (q.options || []).filter(o => o.est_correcte).map(o => o.libelle);
    return c.length ? c.join(', ') : '-';
  }

  private ok(msg: string) {
    this.toast.success(msg);
    this.charger();
  }

  // ---------- Barème : 100 points répartis entre les questions ----------
  private readonly confirmation = inject(ConfirmationService);
  /** Après un ajout (ou une reprise) de questions : proposer de répartir. */
  private proposerApresChargement = false;
  get totalPoints(): number { return totalPoints(this.questions); }
  get baremeConforme(): boolean { return this.totalPoints === BAREME_TOTAL; }
  private pointsAutres(sauf?: Question): number { return totalPoints(this.questions, sauf); }
  /** Répartition équitable (le reste de la division va aux premières questions). */
  async repartirPoints(demander = true): Promise<void> {
    if (!this.quizId || !this.questions.length) return;
    if (quizDejaPasse(this.quiz)) {
      if (!(await confirmerImpact(this.quiz, 'POINTS', () => this.exporterAvantModification()))) return;
    } else if (demander && !(await confirmerRepartition(this.confirmation, this.questions.length))) {
      return;
    }
    this.quizSrv.repartirPoints(this.quizId).subscribe({ next: res => this.ok(res.message), error: err => this.koMessage(err) });
  }
  private ko() {
    this.toast.error("Une erreur s'est produite");
  }

  ajouterQuestion() {
    if (!this.quizId) {
      return;
    }
    // Quiz déjà passé : l'ajout réinitialise les tentatives -> quiz disponible requis.
    if (quizDejaPasse(this.quiz) && !this.quiz?.disponible) {
      this.toast.warning(MSG_QUIZ_FERME);
      return;
    }
    const data: QuestionDialogData = { mode: 'add', pointsAutres: this.pointsAutres() };
    this.dialog
      .open(QuestionDialogComponent, { width: 'calc(100% - 30px)', maxWidth: '640px', data })
      .afterClosed()
      .subscribe(async (r: QuestionDialogResult | undefined) => {
        if (!r || !(await confirmerImpact(this.quiz, 'AJOUT', () => this.exporterAvantModification()))) {
          return;
        }
        this.quizSrv
          .addQuestion({ id_Quiz: this.quizId!, ...r })
          .subscribe({ next: res => { this.proposerApresChargement = true; this.ok(res.message); }, error: err => this.koMessage(err) });
      });
  }

  modifierQuestion(q: Question) {
    const data: QuestionDialogData = { mode: 'edit', question: q, pointsAutres: this.pointsAutres(q) };
    this.dialog
      .open(QuestionDialogComponent, { width: 'calc(100% - 30px)', maxWidth: '640px', data })
      .afterClosed()
      .subscribe(async (r: QuestionDialogResult | undefined) => {
        if (!r) {
          return;
        }
        // Réponses modifiées -> réinitialisation ; points modifiés -> recalcul.
        const action = actionModification(q, r);
        if (action === 'REPONSES' && quizDejaPasse(this.quiz) && !this.quiz?.disponible) {
          this.toast.warning(MSG_QUIZ_FERME);
          return;
        }
        if (action && !(await confirmerImpact(this.quiz, action, () => this.exporterAvantModification()))) {
          return;
        }
        this.quizSrv
          .updateQuestion(q.id, r)
          .subscribe({ next: res => this.ok(res.message), error: err => this.koMessage(err) });
      });
  }

  async supprimerQuestion(q: Question) {
    const supprimer = () =>
      this.quizSrv
        .deleteQuestion(q.id)
        .subscribe({ next: res => this.ok(res.message), error: err => this.koMessage(err) });
    // Quiz déjà passé : la suppression recalcule les scores (avertissement dédié).
    if (quizDejaPasse(this.quiz)) {
      if (await confirmerImpact(this.quiz, 'SUPPRESSION', () => this.exporterAvantModification())) {
        supprimer();
      }
      return;
    }
    const box = new ConfirmBoxInitializer();
    box.setTitle('Suppression !');
    box.setMessage('Supprimer cette question ?');
    box.setConfig({
      layoutType: DialogLayoutDisplay.DANGER,
      animationIn: AppearanceAnimation.BOUNCE_IN,
      animationOut: DisappearanceAnimation.BOUNCE_OUT,
      buttonPosition: 'right',
    });
    box.setButtonLabels('OUI', 'NON');
    box.openConfirmBox$().subscribe(resp => {
      if (resp.success) {
        supprimer();
      }
    });
  }

  /** Reprise des questions d'un ancien quiz (le mien ou de mon site). */
  reprendreQuestions() {
    if (!this.quizId) {
      return;
    }
    if (quizDejaPasse(this.quiz) && !this.quiz?.disponible) {
      this.toast.warning(MSG_QUIZ_FERME);
      return;
    }
    this.dialog
      .open(ReprendreQuestionsDialogComponent, {
        width: 'calc(100% - 30px)',
        maxWidth: '720px',
        data: { quizId: this.quizId },
      })
      .afterClosed()
      .subscribe(async (r: ReprendreQuestionsResult | undefined) => {
        // Quiz déjà passé : la reprise vaut un ajout de questions (réinitialisation).
        if (!r || !(await confirmerImpact(this.quiz, 'AJOUT', () => this.exporterAvantModification()))) {
          return;
        }
        this.quizSrv
          .reprendreQuestions(this.quizId!, r)
          .subscribe({ next: res => { this.proposerApresChargement = true; this.ok(res.message); }, error: err => this.koMessage(err) });
      });
  }

  /** Export des tentatives avant une réinitialisation (bouton de l'avertissement). */
  private exporterAvantModification() {
    if (this.quiz) {
      exporterTentativesQuiz(this.quizSrv, this.quiz, () => this.ko());
    }
  }

  private koMessage(err: any) {
    this.toast.error(err?.error?.message || "Une erreur s'est produite");
  }
}
