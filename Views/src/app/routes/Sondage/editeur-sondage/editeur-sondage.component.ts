import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
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
import { SondageService } from '@shared/services/sondage.service';
import { LANGUES, QuestionSondage, Sondage, STATUTS, TYPES_QUESTION } from '../interfaces';
import {
  QuestionSondageDialogComponent,
  QuestionDialogData,
} from '../question-dialog/question-sondage-dialog.component';

interface PageGroupe {
  page: number;
  questions: QuestionSondage[];
}

@Component({
  selector: 'app-editeur-sondage',
  standalone: true,
  imports: [
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
  templateUrl: './editeur-sondage.component.html',
  styleUrl: './editeur-sondage.component.scss',
})
export class EditeurSondageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly srv = inject(SondageService);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastrService);

  langues = LANGUES;
  statuts = STATUTS;

  sondageId: number | null = null;
  sondage?: Sondage;
  questions: QuestionSondage[] = [];
  form!: FormGroup;

  ngOnInit(): void {
    this.form = this.fb.group({
      nom: [null, Validators.required],
      langue: ['Francais'],
      statut: ['ENCOURS'],
      bouton_retour: [false],
    });
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.sondageId = Number(idParam);
      this.charger();
    }
  }

  charger() {
    if (!this.sondageId) {
      return;
    }
    this.srv.getOne(this.sondageId).subscribe({
      next: s => {
        this.sondage = s;
        this.questions = s.questions || [];
        this.form.patchValue({
          nom: s.nom,
          langue: s.langue || 'Francais',
          statut: s.statut || 'ENCOURS',
          bouton_retour: s.bouton_retour === 1,
        });
      },
      error: () => this.toast.error('Sondage introuvable'),
    });
  }

  private payload(): Partial<Sondage> {
    const v = this.form.value;
    return {
      nom: v.nom,
      langue: v.langue,
      statut: v.statut,
      bouton_retour: v.bouton_retour ? 1 : 0,
    };
  }

  enregistrer() {
    if (this.form.invalid) {
      this.toast.warning('Merci de renseigner le nom du sondage');
      return;
    }
    if (this.sondageId) {
      this.srv.update(this.sondageId, this.payload()).subscribe({
        next: () => this.toast.success('Sondage enregistré'),
        error: () => this.toast.error("Une erreur s'est produite"),
      });
    } else {
      this.srv.add(this.payload()).subscribe({
        next: r => {
          this.toast.success('Sondage créé — ajoutez maintenant des questions');
          this.sondageId = r.id;
          this.router.navigate(['/mon-espace/sondage/editer', r.id]);
        },
        error: () => this.toast.error("Une erreur s'est produite"),
      });
    }
  }

  retour() {
    this.router.navigate(['/mon-espace/sondage/gestion']);
  }
  allerCible() {
    if (this.sondageId) {
      this.router.navigate(['/mon-espace/sondage/cible', this.sondageId]);
    }
  }

  get lienPublic(): string {
    return this.sondage?.token
      ? `${window.location.origin}/sondage-public/${this.sondage.token}`
      : '';
  }
  copierLien() {
    if (!this.lienPublic) {
      return;
    }
    navigator.clipboard?.writeText(this.lienPublic);
    this.toast.success('Lien copié dans le presse-papiers');
  }
  previsualiser() {
    if (this.lienPublic) {
      window.open(this.lienPublic, '_blank');
    }
  }

  /* ----- Questions groupées par page ----- */
  get pages(): PageGroupe[] {
    const map = new Map<number, QuestionSondage[]>();
    for (const q of this.questions) {
      const p = q.page || 1;
      if (!map.has(p)) map.set(p, []);
      map.get(p)!.push(q);
    }
    return [...map.keys()]
      .sort((a, b) => a - b)
      .map(page => ({ page, questions: map.get(page)! }));
  }

  private prochainePagePardefaut(): number {
    const pages = this.questions.map(q => q.page || 1);
    return pages.length ? Math.max(...pages) : 1;
  }

  typeLabel(type: string): string {
    return TYPES_QUESTION.find(t => t.value === type)?.label || type;
  }

  private ok(msg: string) {
    this.toast.success(msg);
    this.charger();
  }
  private ko() {
    this.toast.error("Une erreur s'est produite");
  }

  ajouterQuestion() {
    if (!this.sondageId) {
      return;
    }
    const data: QuestionDialogData = {
      mode: 'add',
      pageParDefaut: this.prochainePagePardefaut(),
      questionsExistantes: this.questions,
    };
    this.dialog
      .open(QuestionSondageDialogComponent, { width: 'calc(100% - 30px)', maxWidth: '640px', data })
      .afterClosed()
      .subscribe((r: QuestionSondage | undefined) => {
        if (r) {
          this.srv
            .addQuestion({ ...r, id_Sondage: this.sondageId! })
            .subscribe({ next: () => this.ok('Question ajoutée'), error: () => this.ko() });
        }
      });
  }

  modifierQuestion(q: QuestionSondage) {
    const data: QuestionDialogData = {
      mode: 'edit',
      question: q,
      questionsExistantes: this.questions,
    };
    this.dialog
      .open(QuestionSondageDialogComponent, { width: 'calc(100% - 30px)', maxWidth: '640px', data })
      .afterClosed()
      .subscribe((r: QuestionSondage | undefined) => {
        if (r && q.id) {
          this.srv
            .updateQuestion(q.id, r)
            .subscribe({ next: () => this.ok('Question modifiée'), error: () => this.ko() });
        }
      });
  }

  supprimerQuestion(q: QuestionSondage) {
    if (!q.id) {
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
        this.srv
          .deleteQuestion(q.id!)
          .subscribe({ next: () => this.ok('Question supprimée'), error: () => this.ko() });
      }
    });
  }
}
