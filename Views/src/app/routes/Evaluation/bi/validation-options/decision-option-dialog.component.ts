import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';

export interface OptionDecision {
  source: 'BI' | 'COACHING';
  libelle: string;
  niveau: number;
  parent_libelle: string | null;
  contexte: string;
  id_evaluation: number;
  agent: string;
  proposeur: string;
  dateCreation: string;
}
export interface DonneesDecision { mode: 'valider' | 'rejeter'; options: OptionDecision[]; }
/** Résultat : libellé reformulé (validation d'une seule option) ou motif (rejet). */
export interface ResultatDecision { libelle?: string; motif?: string; }

/**
 * Fenêtre de décision sur une ou plusieurs options proposées : validation (avec
 * reformulation possible quand il n'y en a qu'une) ou rejet (motif commun obligatoire).
 */
@Component({
  selector: 'app-decision-option-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule],
  template: `
    <h2 class="dlg-titre">{{ titre }}</h2>
    <mat-dialog-content class="decision">
      @if (d.options.length === 1) {
        @let o = d.options[0];
        <div class="fiche">
          <div class="ligne"><span class="src" [class.co]="o.source === 'COACHING'">{{ o.source === 'BI' ? 'BI' : 'Coaching' }}</span>
            <strong>« {{ o.libelle }} »</strong></div>
          <div class="meta">Niveau {{ o.niveau }}@if (o.parent_libelle) { · sous « {{ o.parent_libelle }} » } · {{ o.contexte }}</div>
          <div class="meta">Évaluation #{{ o.id_evaluation }}@if (o.agent) { · {{ o.agent }} } · proposé par {{ o.proposeur }} le {{ o.dateCreation | date: 'dd/MM/yyyy' }}</div>
        </div>
        @if (d.mode === 'valider') {
          <mat-form-field appearance="outline" class="plein">
            <mat-label>Libellé validé</mat-label>
            <input matInput [(ngModel)]="libelle" maxlength="255" cdkFocusInitial />
            <mat-hint>Reformulez si besoin : les évaluations qui l'utilisent seront mises à jour.</mat-hint>
          </mat-form-field>
        }
      } @else {
        <p>{{ d.options.length }} options sélectionnées :</p>
        <ul class="liste">
          @for (o of d.options.slice(0, 8); track $index) { <li><strong>{{ o.libelle }}</strong> <span class="meta">· {{ o.contexte }} · #{{ o.id_evaluation }}</span></li> }
          @if (d.options.length > 8) { <li class="meta">… et {{ d.options.length - 8 }} autre{{ d.options.length - 8 > 1 ? 's' : '' }}</li> }
        </ul>
      }
      @if (d.mode === 'rejeter') {
        <mat-form-field appearance="outline" class="plein">
          <mat-label>Motif du rejet{{ d.options.length > 1 ? ' (commun)' : '' }}</mat-label>
          <textarea matInput rows="3" [(ngModel)]="motif" maxlength="1000" cdkFocusInitial></textarea>
          <mat-hint>Envoyé au proposeur et à l'évaluateur.</mat-hint>
        </mat-form-field>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Annuler</button>
      @if (d.mode === 'valider') {
        <button mat-flat-button color="primary" [disabled]="d.options.length === 1 && !libelle.trim()" (click)="ok()"><mat-icon>check</mat-icon> Valider</button>
      } @else {
        <button mat-flat-button color="warn" [disabled]="!motif.trim()" (click)="ok()"><mat-icon>close</mat-icon> Rejeter</button>
      }
    </mat-dialog-actions>
  `,
  styles: `
    .decision { min-width: 460px; }
    .fiche { padding: 10px 12px; margin-bottom: 14px; border-radius: 8px; background: var(--qx-surface-2, #f6f4f1); }
    .ligne { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
    .meta { color: var(--qx-texte-2, #666); font-size: 13px; }
    .src { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 10px; background: #e3f2fd; color: #1565c0; }
    .src.co { background: #f3e5f5; color: #7b1fa2; }
    .plein { width: 100%; margin-top: 6px; }
    .liste { margin: 0 0 12px; padding-left: 18px; max-height: 220px; overflow: auto; }
  `,
})
export class DecisionOptionDialogComponent {
  readonly d = inject<DonneesDecision>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<DecisionOptionDialogComponent, ResultatDecision>);
  libelle = this.d.options.length === 1 ? this.d.options[0].libelle : '';
  motif = '';
  get titre(): string {
    const n = this.d.options.length;
    const s = n > 1 ? `${n} options` : 'l\'option';
    return this.d.mode === 'valider' ? `Valider ${s}` : `Rejeter ${s}`;
  }
  ok(): void {
    if (this.d.mode === 'valider') {
      const lib = this.libelle.replace(/\s+/g, ' ').trim();
      const origine = this.d.options.length === 1 ? this.d.options[0].libelle : '';
      this.ref.close({ libelle: lib && lib !== origine ? lib : undefined });
    } else {
      this.ref.close({ motif: this.motif.trim() });
    }
  }
}
