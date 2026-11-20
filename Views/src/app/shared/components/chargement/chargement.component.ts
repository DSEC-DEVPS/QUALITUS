import { Component, Input } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

/**
 * Indicateur de chargement commun : spinner centré + texte, affiché à la place
 * du contenu tant que les données ne sont pas arrivées.
 *
 *   @if (chargement) { <app-chargement /> } @else { … }
 */
@Component({
  selector: 'app-chargement',
  standalone: true,
  imports: [MatProgressSpinnerModule],
  template: `
    <div class="app-chargement" role="status" aria-live="polite">
      <mat-spinner [diameter]="diametre" />
      @if (texte) { <span class="texte">{{ texte }}</span> }
    </div>
  `,
  styles: [`
    .app-chargement { display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 12px; padding: 32px 16px; width: 100%; }
    .texte { color: rgba(0, 0, 0, 0.6); font-size: 14px; }
  `],
})
export class ChargementComponent {
  @Input() texte = 'Chargement…';
  @Input() diametre = 40;
}
