import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import {
  AppearanceAnimation,
  ConfirmBoxInitializer,
  DialogLayoutDisplay,
  DisappearanceAnimation,
} from '@costlydeveloper/ngx-awesome-popup';
import { EvaluationService } from '@shared/services/evaluation.service';
import { ActionCorrective, Coaching, Evaluation, ResultatTerminer } from '../interfaces';
import { ActionDialogComponent, ActionDialogData } from './action-dialog.component';

@Component({
  selector: 'app-executer-evaluation',
  standalone: true,
  imports: [
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatExpansionModule,
    MatCheckboxModule,
    MatRadioModule,
    MatChipsModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './executer-evaluation.component.html',
  styleUrl: './executer-evaluation.component.scss',
})
export class ExecuterEvaluationComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly srv = inject(EvaluationService);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastrService);

  evalId!: number;
  evaluation?: Evaluation;
  conforme: Record<number, boolean> = {};
  resolution: 'OUI' | 'NON' | null = null;
  resultat: ResultatTerminer | null = null;
  chargement = true;
  readOnly = false;

  // Phase 3 : suivi (visible si evaluation en echec)
  coaching: Coaching = {};
  actions: ActionCorrective[] = [];

  get estEchec(): boolean {
    const c = this.resultat ? this.resultat.conclusion : this.evaluation?.conclusion;
    return this.readOnly && c === 'ECHEC';
  }

  ngOnInit(): void {
    this.evalId = Number(this.route.snapshot.paramMap.get('id'));
    this.charger();
  }

  charger() {
    this.chargement = true;
    this.srv.getEvaluation(this.evalId).subscribe({
      next: e => {
        this.evaluation = e;
        this.readOnly = e.statut === 'TERMINE';
        this.resolution = (e.resolution as 'OUI' | 'NON') || null;
        const dejaRepondu = new Map((e.resultats || []).map(r => [r.id_SousItem, r.conforme]));
        for (const cat of e.grille || []) {
          for (const err of cat.erreurs || []) {
            for (const it of err.items || []) {
              for (const si of it.sousItems || []) {
                this.conforme[si.id] = dejaRepondu.has(si.id) ? dejaRepondu.get(si.id) === 1 : true;
              }
            }
          }
        }
        this.chargement = false;
        if (this.readOnly) {
          this.chargerSuivi();
        }
      },
      error: () => {
        this.toast.error('Evaluation introuvable');
        this.chargement = false;
      },
    });
  }

  chargerSuivi() {
    this.srv.getCoaching(this.evalId).subscribe({ next: c => (this.coaching = c || {}), error: () => {} });
    this.srv.getActions(this.evalId).subscribe({ next: a => (this.actions = a), error: () => {} });
  }

  enregistrerCoaching() {
    this.srv.saveCoaching(this.evalId, this.coaching).subscribe({
      next: () => this.toast.success('Coaching enregistre'),
      error: () => this.toast.error("Une erreur s'est produite"),
    });
  }

  ajouterAction() {
    const data: ActionDialogData = { mode: 'add' };
    this.dialog.open(ActionDialogComponent, { width: '720px', data }).afterClosed().subscribe((r: ActionCorrective | undefined) => {
      if (r) {
        this.srv.addAction({ ...r, id_Evaluation: this.evalId }).subscribe({
          next: () => { this.toast.success('Action ajoutee'); this.chargerSuivi(); },
          error: () => this.toast.error("Une erreur s'est produite"),
        });
      }
    });
  }

  modifierAction(a: ActionCorrective) {
    const data: ActionDialogData = { mode: 'edit', action: a };
    this.dialog.open(ActionDialogComponent, { width: '720px', data }).afterClosed().subscribe((r: ActionCorrective | undefined) => {
      if (r && a.id) {
        this.srv.updateAction(a.id, r).subscribe({
          next: () => { this.toast.success('Action modifiee'); this.chargerSuivi(); },
          error: () => this.toast.error("Une erreur s'est produite"),
        });
      }
    });
  }

  supprimerAction(a: ActionCorrective) {
    const box = new ConfirmBoxInitializer();
    box.setTitle('Suppression !');
    box.setMessage('Supprimer cette action ?');
    box.setConfig({
      layoutType: DialogLayoutDisplay.DANGER,
      animationIn: AppearanceAnimation.BOUNCE_IN,
      animationOut: DisappearanceAnimation.BOUNCE_OUT,
      buttonPosition: 'right',
    });
    box.setButtonLabels('OUI', 'NON');
    box.openConfirmBox$().subscribe(resp => {
      if (resp.success && a.id) {
        this.srv.deleteAction(a.id).subscribe({
          next: () => { this.toast.success('Action supprimee'); this.chargerSuivi(); },
          error: () => this.toast.error('Suppression impossible'),
        });
      }
    });
  }

  evalSupplementaire() {
    this.router.navigate(['/mon-espace/evaluation/creer'], {
      queryParams: { agent: this.evaluation?.id_Agent },
    });
  }

  get tousSousItems(): number[] {
    const ids: number[] = [];
    for (const cat of this.evaluation?.grille || []) {
      for (const err of cat.erreurs || []) {
        for (const it of err.items || []) {
          for (const si of it.sousItems || []) {
            ids.push(si.id);
          }
        }
      }
    }
    return ids;
  }

  get nbNonConforme(): number {
    return this.tousSousItems.filter(id => !this.conforme[id]).length;
  }

  terminer() {
    if (!this.resolution) {
      this.toast.warning('Merci de renseigner la Resolution (OUI/NON)');
      return;
    }
    const resultats = this.tousSousItems.map(id => ({
      id_SousItem: id,
      conforme: this.conforme[id] ? 1 : 0,
    }));
    this.srv.terminerEvaluation(this.evalId, this.resolution, resultats).subscribe({
      next: r => {
        this.resultat = r;
        this.readOnly = true;
        this.toast.success(`Evaluation terminee : ${r.conclusion}`);
        this.chargerSuivi();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      error: () => this.toast.error("Une erreur s'est produite"),
    });
  }

  retour() {
    this.router.navigate(['/mon-espace/evaluation/evaluations']);
  }
}
