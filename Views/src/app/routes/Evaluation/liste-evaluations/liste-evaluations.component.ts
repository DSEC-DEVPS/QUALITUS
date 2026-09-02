import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatCheckboxModule } from '@angular/material/checkbox';
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
import { Evaluation } from '../interfaces';
import { MasseEvaluationDialogComponent } from './masse-evaluation-dialog.component';

@Component({
  selector: 'app-liste-evaluations',
  standalone: true,
  imports: [
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatCheckboxModule,
    MatChipsModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    DatePipe,
  ],
  templateUrl: './liste-evaluations.component.html',
  styleUrl: './liste-evaluations.component.scss',
})
export class ListeEvaluationsComponent implements OnInit {
  private readonly srv = inject(EvaluationService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastrService);

  dataSource = new MatTableDataSource<Evaluation>([]);
  colonnes = ['select', 'id', 'agent', 'contexte', 'grille_nom', 'date_creation', 'statut', 'conclusion', 'actif', 'actions'];
  selection = new Set<number>();

  ngOnInit(): void {
    this.charger();
  }

  charger() {
    this.srv.getEvaluations().subscribe({
      next: d => { this.dataSource.data = d; this.selection.clear(); },
      error: () => this.toast.error('Impossible de charger les evaluations'),
    });
  }

  applyFilter(event: Event) {
    this.dataSource.filter = (event.target as HTMLInputElement).value.trim().toLowerCase();
  }

  toggle(id: number, checked: boolean) {
    if (checked) { this.selection.add(id); } else { this.selection.delete(id); }
  }

  nouvelle() {
    this.router.navigate(['/mon-espace/evaluation/creer']);
  }

  masse() {
    this.dialog.open(MasseEvaluationDialogComponent, { width: '640px' })
      .afterClosed().subscribe(done => { if (done) { this.charger(); } });
  }

  executer(ev: Evaluation) {
    this.router.navigate(['/mon-espace/evaluation/executer', ev.id]);
  }

  changerActif(actif: number) {
    if (!this.selection.size) {
      this.toast.warning('Selectionnez au moins une evaluation');
      return;
    }
    this.srv.setActifEvaluation([...this.selection], actif).subscribe({
      next: r => { this.toast.success(r.message); this.charger(); },
      error: () => this.toast.error("Une erreur s'est produite"),
    });
  }

  supprimer(ev: Evaluation) {
    const box = new ConfirmBoxInitializer();
    box.setTitle('Suppression !');
    box.setMessage(`Supprimer l'evaluation #${ev.id} (${ev.agent_nom || ''}) ?`);
    box.setConfig({
      layoutType: DialogLayoutDisplay.DANGER,
      animationIn: AppearanceAnimation.BOUNCE_IN,
      animationOut: DisappearanceAnimation.BOUNCE_OUT,
      buttonPosition: 'right',
    });
    box.setButtonLabels('OUI', 'NON');
    box.openConfirmBox$().subscribe(resp => {
      if (resp.success) {
        this.srv.deleteEvaluation(ev.id).subscribe({
          next: r => { this.toast.success(r.message); this.charger(); },
          error: () => this.toast.error('Suppression impossible'),
        });
      }
    });
  }
}
