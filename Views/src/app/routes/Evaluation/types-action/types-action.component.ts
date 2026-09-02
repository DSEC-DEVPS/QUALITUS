import { Component, OnInit, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import {
  AppearanceAnimation,
  ConfirmBoxInitializer,
  DialogLayoutDisplay,
  DisappearanceAnimation,
} from '@costlydeveloper/ngx-awesome-popup';
import { EvaluationService } from '@shared/services/evaluation.service';
import { ActionType } from '../interfaces';
import { TypeActionDialogComponent, TypeActionDialogData } from './type-action-dialog.component';

@Component({
  selector: 'app-types-action',
  standalone: true,
  imports: [MatCardModule, MatButtonModule, MatIconModule, MatTableModule],
  templateUrl: './types-action.component.html',
  styleUrl: './types-action.component.scss',
})
export class TypesActionComponent implements OnInit {
  private readonly srv = inject(EvaluationService);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastrService);

  dataSource = new MatTableDataSource<ActionType>([]);
  colonnes = ['id', 'libelle', 'actions'];

  ngOnInit(): void {
    this.charger();
  }

  charger() {
    this.srv.getActionTypes().subscribe({
      next: d => (this.dataSource.data = d),
      error: () => this.toast.error('Impossible de charger les types'),
    });
  }

  private ouvrir(mode: 'add' | 'edit', type?: ActionType) {
    const data: TypeActionDialogData = { mode, type };
    return this.dialog.open(TypeActionDialogComponent, { width: '480px', data }).afterClosed();
  }

  ajouter() {
    this.ouvrir('add').subscribe((r: { libelle: string } | undefined) => {
      if (r) {
        this.srv.addActionType(r).subscribe({
          next: () => { this.toast.success('Type ajoute'); this.charger(); },
          error: () => this.toast.error("Une erreur s'est produite"),
        });
      }
    });
  }

  modifier(t: ActionType) {
    this.ouvrir('edit', t).subscribe((r: { libelle: string } | undefined) => {
      if (r) {
        this.srv.updateActionType(t.id, r).subscribe({
          next: () => { this.toast.success('Type modifie'); this.charger(); },
          error: () => this.toast.error("Une erreur s'est produite"),
        });
      }
    });
  }

  supprimer(t: ActionType) {
    const box = new ConfirmBoxInitializer();
    box.setTitle('Suppression !');
    box.setMessage(`Supprimer le type "${t.libelle}" ?`);
    box.setConfig({
      layoutType: DialogLayoutDisplay.DANGER,
      animationIn: AppearanceAnimation.BOUNCE_IN,
      animationOut: DisappearanceAnimation.BOUNCE_OUT,
      buttonPosition: 'right',
    });
    box.setButtonLabels('OUI', 'NON');
    box.openConfirmBox$().subscribe(resp => {
      if (resp.success) {
        this.srv.deleteActionType(t.id).subscribe({
          next: r => { this.toast.success(r.message); this.charger(); },
          error: () => this.toast.error('Suppression impossible'),
        });
      }
    });
  }
}
