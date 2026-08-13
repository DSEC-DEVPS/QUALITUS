import { Component, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import {
  AppearanceAnimation,
  ConfirmBoxInitializer,
  DialogLayoutDisplay,
  DisappearanceAnimation,
} from '@costlydeveloper/ngx-awesome-popup';
import { EvaluationService } from '@shared/services/evaluation.service';
import { Contexte } from '../interfaces';
import { ContexteDialogComponent, ContexteDialogData } from './contexte-dialog.component';

@Component({
  selector: 'app-contextes',
  standalone: true,
  imports: [MatCardModule, MatButtonModule, MatIconModule, MatTableModule, MatChipsModule, DatePipe],
  templateUrl: './contextes.component.html',
  styleUrl: './contextes.component.scss',
})
export class ContextesComponent implements OnInit {
  private readonly srv = inject(EvaluationService);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastrService);

  dataSource = new MatTableDataSource<Contexte>([]);
  colonnes = ['id', 'libelle', 'Etat', 'actions'];

  ngOnInit(): void {
    this.charger();
  }

  charger() {
    this.srv.getContextes().subscribe({
      next: d => (this.dataSource.data = d),
      error: () => this.toast.error('Impossible de charger les contextes'),
    });
  }

  private ouvrir(mode: 'add' | 'edit', contexte?: Contexte) {
    const data: ContexteDialogData = { mode, contexte };
    return this.dialog
      .open(ContexteDialogComponent, { width: '480px', data })
      .afterClosed();
  }

  ajouter() {
    this.ouvrir('add').subscribe((r: { libelle: string } | undefined) => {
      if (r) {
        this.srv.addContexte(r).subscribe({
          next: () => { this.toast.success('Contexte ajoute'); this.charger(); },
          error: () => this.toast.error("Une erreur s'est produite"),
        });
      }
    });
  }

  modifier(c: Contexte) {
    this.ouvrir('edit', c).subscribe((r: { libelle: string } | undefined) => {
      if (r) {
        this.srv.updateContexte(c.id, r).subscribe({
          next: () => { this.toast.success('Contexte modifie'); this.charger(); },
          error: () => this.toast.error("Une erreur s'est produite"),
        });
      }
    });
  }

  supprimer(c: Contexte) {
    const box = new ConfirmBoxInitializer();
    box.setTitle('Suppression !');
    box.setMessage(`Supprimer le contexte "${c.libelle}" ?`);
    box.setConfig({
      layoutType: DialogLayoutDisplay.DANGER,
      animationIn: AppearanceAnimation.BOUNCE_IN,
      animationOut: DisappearanceAnimation.BOUNCE_OUT,
      buttonPosition: 'right',
    });
    box.setButtonLabels('OUI', 'NON');
    box.openConfirmBox$().subscribe(resp => {
      if (resp.success) {
        this.srv.deleteContexte(c.id).subscribe({
          next: r => { this.toast.success(r.message); this.charger(); },
          error: () => this.toast.error('Suppression impossible'),
        });
      }
    });
  }
}
