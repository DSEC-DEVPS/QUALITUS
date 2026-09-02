import { Component, Inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { TentativeDetail } from '../interfaces';

/** Dialog affichant le detail d'une tentative (resultat + conformite par question). */
@Component({
  selector: 'app-tentative-detail-dialog',
  standalone: true,
  imports: [DatePipe, MatDialogModule, MatButtonModule, MatIconModule, MatChipsModule],
  template: `
    <h2 mat-dialog-title>Détail de la tentative</h2>
    <mat-dialog-content>
      <div class="entete">
        <div class="nom">{{ data.prenom }} {{ data.nom }}</div>
        <div class="sous">
          {{ data.quiz_titre }} · Site : {{ data.site || '—' }} · Essai n°{{ data.num_essai }}
        </div>
        <mat-chip-set>
          <mat-chip [class.ok]="data.reussi" [class.ko]="!data.reussi">
            {{ data.reussi ? 'Réussi' : 'Échec' }}
          </mat-chip>
          <mat-chip>Score : {{ data.score }}%</mat-chip>
          <mat-chip>Temps : {{ tempsLabel }}</mat-chip>
        </mat-chip-set>
        <div class="dates">
          Début : {{ data.date_debut ? (data.date_debut | date: 'dd-MM-yyyy HH:mm:ss') : '—' }} ·
          Fin : {{ data.date_fin ? (data.date_fin | date: 'dd-MM-yyyy HH:mm:ss') : '—' }}
        </div>
      </div>

      <h4>Questions</h4>
      <ul class="questions">
        @for (r of data.reponses; track r.id_Question; let i = $index) {
          <li>
            <mat-icon [class.ok]="r.est_correcte" [class.ko]="!r.est_correcte">
              {{ r.est_correcte ? 'check_circle' : 'cancel' }}
            </mat-icon>
            <span>{{ i + 1 }}. {{ r.libelle }}</span>
          </li>
        } @empty {
          <li class="muted">Aucune réponse enregistrée.</li>
        }
      </ul>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-flat-button color="primary" mat-dialog-close>Fermer</button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .entete { margin-bottom: 12px; }
      .nom { font-weight: 600; font-size: 1.1rem; }
      .sous { color: #6b6b6b; margin-bottom: 8px; }
      .dates { color: #8a8a8a; font-size: 0.85rem; margin-top: 6px; }
      mat-chip.ok { --mdc-chip-label-text-color: #1b5e20; }
      mat-chip.ko { --mdc-chip-label-text-color: #b71c1c; }
      h4 { margin: 14px 0 6px; }
      .questions { list-style: none; padding: 0; margin: 0; }
      .questions li { display: flex; align-items: flex-start; gap: 8px; padding: 6px 0; border-bottom: 1px solid rgba(0,0,0,0.06); }
      .questions mat-icon.ok { color: #2e7d32; }
      .questions mat-icon.ko { color: #c62828; }
      .muted { color: #8a8a8a; }
    `,
  ],
})
export class TentativeDetailDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: TentativeDetail) {}

  get tempsLabel(): string {
    const sec = this.data.temps_secondes;
    if (sec == null) return '—';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m ? `${m} min ${s}s` : `${s}s`;
  }
}
