import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LettreSectionComponent } from '../lettre-section/lettre-section.component';

export interface LettreDialogData {
  idEvaluation: number;
  /** true : lettre de félicitation ; false : lettre de débriefing. */
  felicitation: boolean;
  /** L'agent évalué peut saisir son approbation dans la lettre. */
  avisModifiable: boolean;
  /** Appelé après l'enregistrement de l'avis (statut après évaluation). */
  onAvis?: (statutApres: string) => void;
}

/** Boîte de dialogue affichant la lettre de félicitation / de débriefing d'une évaluation. */
@Component({
  selector: 'app-lettre-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, MatTooltipModule, LettreSectionComponent],
  template: `
    <div class="entete-dialog">
      <mat-icon class="ico" [class.ok]="data.felicitation">{{ data.felicitation ? 'emoji_events' : 'forum' }}</mat-icon>
      <h2 mat-dialog-title>{{ data.felicitation ? 'Lettre de félicitation' : 'Lettre de débriefing' }}</h2>
      <span class="espace"></span>
      <button mat-icon-button mat-dialog-close matTooltip="Fermer" aria-label="Fermer"><mat-icon>close</mat-icon></button>
    </div>
    <mat-dialog-content>
      <app-lettre-section [idEvaluation]="data.idEvaluation" [avisModifiable]="data.avisModifiable"
                          (avisEnregistre)="data.onAvis?.($event)" />
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Fermer</button>
    </mat-dialog-actions>
  `,
  styles: `
    .entete-dialog { display: flex; align-items: center; gap: 8px; padding: 8px 8px 0 24px; }
    .entete-dialog h2[mat-dialog-title] { margin: 0; padding: 0; flex: 0 1 auto; }
    .entete-dialog .espace { flex: 1 1 auto; }
    .ico { color: #c2560c; }
    .ico.ok { color: #1b8a3a; }
    mat-dialog-content { max-height: 75vh; }
    @media (max-width: 600px) {
      .entete-dialog { padding: 6px 4px 0 16px; }
      mat-dialog-content { padding: 0 8px; max-height: 80vh; }
    }
  `,
})
export class LettreDialogComponent {
  readonly data = inject<LettreDialogData>(MAT_DIALOG_DATA);
  readonly ref = inject(MatDialogRef<LettreDialogComponent>);
}
