import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { UserService } from '@shared/services/user.service';

/** Données passées à la fenêtre : l'utilisateur dont on modifie le programme. */
export interface ModifierProgrammeData {
  id: number;
  nom_utilisateur: string;
  nom?: string;
  prenom?: string;
  id_Programme?: number | null;
  programme?: string;
}

/** Résultat renvoyé à la fermeture quand le programme a été modifié. */
export interface ModifierProgrammeResultat {
  id_Programme: number;
  programme: string;
  message: string;
}

/**
 * Fenêtre « Modifier le programme » (menu Gérer les comptes du RO).
 * Les erreurs de l'API sont affichées par l'intercepteur global.
 */
@Component({
  selector: 'app-modifier-programme-dialog',
  standalone: true,
  imports: [FormsModule, MatDialogModule, MatFormFieldModule, MatSelectModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Modifier le programme</h2>
    <mat-dialog-content>
      <p class="qui">
        {{ libelleUtilisateur }}<br />
        <span class="actuel">Programme actuel : {{ data.programme || 'aucun' }}</span>
      </p>
      <mat-form-field appearance="outline" class="w-100">
        <mat-label>Nouveau programme</mat-label>
        <mat-select [(ngModel)]="idSelectionne" [disabled]="chargement || enregistrement">
          @for (p of programmes; track p.id) {
            <mat-option [value]="p.id">{{ p.nom }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      @if (!chargement && programmes.length === 0) {
        <p class="vide">Aucun programme actif disponible.</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close [disabled]="enregistrement">Annuler</button>
      <button
        mat-raised-button
        color="primary"
        (click)="enregistrer()"
        [disabled]="!modifiable || enregistrement"
      >
        Enregistrer
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .w-100 { width: 100%; }
      .qui { margin-bottom: 12px; }
      .actuel { color: #666; font-size: 13px; }
      .vide { color: #b00020; }
    `,
  ],
})
export class ModifierProgrammeDialogComponent implements OnInit {
  readonly data = inject<ModifierProgrammeData>(MAT_DIALOG_DATA);
  private readonly dialogRef =
    inject<MatDialogRef<ModifierProgrammeDialogComponent, ModifierProgrammeResultat>>(MatDialogRef);
  private readonly userService = inject(UserService);

  programmes: { id: number; nom: string }[] = [];
  idSelectionne: number | null = this.data.id_Programme ?? null;
  chargement = true;
  enregistrement = false;

  get libelleUtilisateur(): string {
    const nomComplet = [this.data.nom, this.data.prenom].filter(Boolean).join(' ');
    return nomComplet ? `${nomComplet} (${this.data.nom_utilisateur})` : this.data.nom_utilisateur;
  }

  /** Enregistrable seulement si un programme différent de l'actuel est choisi. */
  get modifiable(): boolean {
    return this.idSelectionne != null && this.idSelectionne !== this.data.id_Programme;
  }

  ngOnInit(): void {
    this.userService.getProgrammesPourRo().subscribe({
      next: programmes => {
        this.programmes = programmes;
        this.chargement = false;
      },
      error: () => (this.chargement = false),
    });
  }

  enregistrer(): void {
    if (!this.modifiable || this.idSelectionne == null) return;
    this.enregistrement = true;
    this.userService.updateProgrammeAgentParRo(this.data.id, this.idSelectionne).subscribe({
      next: res => this.dialogRef.close(res),
      error: () => (this.enregistrement = false),
    });
  }
}
