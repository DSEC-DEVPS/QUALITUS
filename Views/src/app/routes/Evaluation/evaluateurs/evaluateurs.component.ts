import { Component, OnInit, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
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
import { Evaluateur } from '../interfaces';
import { EvaluateurDialogComponent, EvaluateurDialogData } from './evaluateur-dialog.component';

@Component({
  selector: 'app-evaluateurs',
  standalone: true,
  imports: [
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './evaluateurs.component.html',
  styleUrl: './evaluateurs.component.scss',
})
export class EvaluateursComponent implements OnInit {
  private readonly srv = inject(EvaluationService);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastrService);

  dataSource = new MatTableDataSource<Evaluateur>([]);
  colonnes = ['id', 'nom', 'prenom', 'login', 'site_nom', 'Etat', 'actions'];

  ngOnInit(): void {
    this.charger();
  }

  charger() {
    this.srv.getEvaluateurs().subscribe({
      next: d => (this.dataSource.data = d),
      error: () => this.toast.error('Impossible de charger les evaluateurs'),
    });
  }

  applyFilter(event: Event) {
    this.dataSource.filter = (event.target as HTMLInputElement).value.trim().toLowerCase();
  }

  private ouvrir(mode: 'add' | 'edit', evaluateur?: Evaluateur) {
    const data: EvaluateurDialogData = { mode, evaluateur };
    return this.dialog.open(EvaluateurDialogComponent, { width: '640px', data }).afterClosed();
  }

  ajouter() {
    this.ouvrir('add').subscribe((r: Partial<Evaluateur> | undefined) => {
      if (r) {
        this.srv.addEvaluateur(r).subscribe({
          next: () => { this.toast.success('Evaluateur ajoute'); this.charger(); },
          error: () => this.toast.error("Une erreur s'est produite"),
        });
      }
    });
  }

  modifier(e: Evaluateur) {
    this.ouvrir('edit', e).subscribe((r: Partial<Evaluateur> | undefined) => {
      if (r) {
        this.srv.updateEvaluateur(e.id, r).subscribe({
          next: () => { this.toast.success('Evaluateur modifie'); this.charger(); },
          error: () => this.toast.error("Une erreur s'est produite"),
        });
      }
    });
  }

  supprimer(e: Evaluateur) {
    const box = new ConfirmBoxInitializer();
    box.setTitle('Suppression !');
    box.setMessage(`Supprimer l'evaluateur "${e.nom} ${e.prenom || ''}" ?`);
    box.setConfig({
      layoutType: DialogLayoutDisplay.DANGER,
      animationIn: AppearanceAnimation.BOUNCE_IN,
      animationOut: DisappearanceAnimation.BOUNCE_OUT,
      buttonPosition: 'right',
    });
    box.setButtonLabels('OUI', 'NON');
    box.openConfirmBox$().subscribe(resp => {
      if (resp.success) {
        this.srv.deleteEvaluateur(e.id).subscribe({
          next: r => { this.toast.success(r.message); this.charger(); },
          error: () => this.toast.error('Suppression impossible'),
        });
      }
    });
  }
}
