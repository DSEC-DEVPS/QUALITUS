import { Component, Input, OnInit, inject } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import {
  AppearanceAnimation,
  ConfirmBoxInitializer,
  DialogLayoutDisplay,
  DisappearanceAnimation,
} from '@costlydeveloper/ngx-awesome-popup';
import { CalibrageService } from '@shared/services/calibrage.service';
import { PourquoiNode } from '../interfaces';
import {
  TexteDialogComponent,
  TexteDialogData,
} from '../texte-dialog/texte-dialog.component';

@Component({
  selector: 'app-pourquoi-editor',
  standalone: true,
  imports: [NgTemplateOutlet, MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './pourquoi-editor.component.html',
  styleUrl: './pourquoi-editor.component.scss',
})
export class PourquoiEditorComponent implements OnInit {
  @Input({ required: true }) modeleId!: number;

  private readonly calibrage = inject(CalibrageService);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastrService);

  readonly NIVEAU_MAX = 5;
  racines: PourquoiNode[] = [];

  ngOnInit(): void {
    this.charger();
  }

  charger() {
    this.calibrage.getPourquoi(this.modeleId).subscribe({
      next: data => (this.racines = data),
      error: () => this.toast.error('Impossible de charger les 5 Pourquoi'),
    });
  }

  private ouvrirTexte(titre: string, valeur?: string) {
    const data: TexteDialogData = { titre, label: 'Libelle', valeur };
    return this.dialog
      .open(TexteDialogComponent, { width: '480px', data })
      .afterClosed();
  }

  private ok(msg: string) {
    this.toast.success(msg);
    this.charger();
  }
  private ko() {
    this.toast.error("Une erreur s'est produite");
  }

  ajouterRacine() {
    this.ouvrirTexte('Ajouter un Pourquoi (niveau 1)').subscribe(v => {
      if (v) {
        this.calibrage
          .addPourquoi({ id_ModeleGrille: this.modeleId, niveau: 1, libelle: v, id_parent: null })
          .subscribe({ next: () => this.ok('Valeur ajoutee'), error: () => this.ko() });
      }
    });
  }

  ajouterEnfant(parent: PourquoiNode) {
    if (parent.niveau >= this.NIVEAU_MAX) {
      return;
    }
    this.ouvrirTexte(`Ajouter un Pourquoi (niveau ${parent.niveau + 1})`).subscribe(v => {
      if (v) {
        this.calibrage
          .addPourquoi({
            id_ModeleGrille: this.modeleId,
            niveau: parent.niveau + 1,
            libelle: v,
            id_parent: parent.id,
          })
          .subscribe({ next: () => this.ok('Valeur ajoutee'), error: () => this.ko() });
      }
    });
  }

  modifier(node: PourquoiNode) {
    this.ouvrirTexte('Modifier le Pourquoi', node.libelle).subscribe(v => {
      if (v) {
        this.calibrage
          .updatePourquoi(node.id, { libelle: v })
          .subscribe({ next: () => this.ok('Valeur modifiee'), error: () => this.ko() });
      }
    });
  }

  supprimer(node: PourquoiNode) {
    const box = new ConfirmBoxInitializer();
    box.setTitle('Suppression !');
    box.setMessage(`Supprimer "${node.libelle}" et ses valeurs liees ?`);
    box.setConfig({
      layoutType: DialogLayoutDisplay.DANGER,
      animationIn: AppearanceAnimation.BOUNCE_IN,
      animationOut: DisappearanceAnimation.BOUNCE_OUT,
      buttonPosition: 'right',
    });
    box.setButtonLabels('OUI', 'NON');
    box.openConfirmBox$().subscribe(resp => {
      if (resp.success) {
        this.calibrage
          .deletePourquoi(node.id)
          .subscribe({ next: () => this.ok('Valeur supprimee'), error: () => this.ko() });
      }
    });
  }
}
