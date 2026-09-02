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
import { FicheRecente, Question, Quiz, SiteOption } from '../interfaces';
import {
  QuestionDialogComponent,
  QuestionDialogData,
  QuestionDialogResult,
} from '../question-dialog/question-dialog.component';

@Component({
  selector: 'app-editeur-quiz',
  standalone: true,
  imports: [
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
  sites: SiteOption[] = [];
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
      sites: [[]],
    });

    this.quizSrv.getFichesRecentes().subscribe({
      next: f => (this.fiches = f),
      error: () => {},
    });

    this.quizSrv.getSites().subscribe({
      next: s => (this.sites = s),
      error: () => {},
    });

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.quizId = Number(idParam);
      this.charger();
    }
  }

  charger() {
    if (!this.quizId) {
      return;
    }
    this.quizSrv.getOne(this.quizId).subscribe({
      next: q => {
        this.quiz = q;
        this.questions = q.questions || [];
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
          sites: q.sites || [],
        });
      },
      error: () => this.toast.error('Quiz introuvable'),
    });
  }

  private payload(): Partial<Quiz> {
    const v = this.form.value;
    return {
      titre: v.titre,
      type: v.type,
      duree: v.duree,
      date_fermeture: v.date_fermeture,
      note_passage: v.note_passage,
      acces: v.acces,
      alterner_questions: v.alterner_questions ? 1 : 0,
      autoriser_machines: v.autoriser_machines ? 1 : 0,
      fiches: v.fiches || [],
      sites: v.sites || [],
    };
  }

  enregistrerEntete() {
    if (this.form.invalid) {
      this.toast.warning('Merci de renseigner au moins le titre');
      return;
    }
    if (this.quizId) {
      this.quizSrv.update(this.quizId, this.payload()).subscribe({
        next: () => this.toast.success('Quiz enregistre'),
        error: () => this.toast.error("Une erreur s'est produite"),
      });
    } else {
      this.quizSrv.add(this.payload()).subscribe({
        next: r => {
          this.toast.success('Quiz cree - ajoutez maintenant des questions');
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

  notifierParticipants() {
    if (!this.quizId) {
      return;
    }
    if (!this.questions.length) {
      this.toast.warning('Ajoutez au moins une question avant de notifier');
      return;
    }
    this.quizSrv.notifier(this.quizId).subscribe({
      next: r => this.toast.success(r.message),
      error: () => this.toast.error("Une erreur s'est produite"),
    });
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
  private ko() {
    this.toast.error("Une erreur s'est produite");
  }

  ajouterQuestion() {
    if (!this.quizId) {
      return;
    }
    const data: QuestionDialogData = { mode: 'add' };
    this.dialog
      .open(QuestionDialogComponent, { width: 'calc(100% - 30px)', maxWidth: '640px', data })
      .afterClosed()
      .subscribe((r: QuestionDialogResult | undefined) => {
        if (r) {
          this.quizSrv
            .addQuestion({ id_Quiz: this.quizId!, ...r })
            .subscribe({ next: () => this.ok('Question ajoutee'), error: () => this.ko() });
        }
      });
  }

  modifierQuestion(q: Question) {
    const data: QuestionDialogData = { mode: 'edit', question: q };
    this.dialog
      .open(QuestionDialogComponent, { width: 'calc(100% - 30px)', maxWidth: '640px', data })
      .afterClosed()
      .subscribe((r: QuestionDialogResult | undefined) => {
        if (r) {
          this.quizSrv
            .updateQuestion(q.id, r)
            .subscribe({ next: () => this.ok('Question modifiee'), error: () => this.ko() });
        }
      });
  }

  supprimerQuestion(q: Question) {
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
        this.quizSrv
          .deleteQuestion(q.id)
          .subscribe({ next: () => this.ok('Question supprimee'), error: () => this.ko() });
      }
    });
  }
}
