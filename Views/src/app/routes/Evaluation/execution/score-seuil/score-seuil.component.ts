import { Component, Input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';

/**
 * Score d'une catégorie face à son seuil, présenté comme dans la lettre :
 * « 50 % » + barre de progression avec le repère du seuil + pastille
 * Atteint / À renforcer. Remplace les « 50 / 75 » et « 50 >= 75 ».
 *  - mode « compact » : pourcentage + barre (onglets de catégories) ;
 *  - mode « ligne »   : pourcentage, seuil, barre et pastille.
 */
@Component({
  selector: 'app-score-seuil',
  standalone: true,
  imports: [DecimalPipe, MatTooltipModule],
  template: `
    <div class="score-seuil" [class.compact]="compact" [matTooltip]="regle">
      <div class="valeurs">
        <span class="pct" [class.ok]="reussite"><strong>{{ score | number: '1.0-1' }}</strong> %</span>
        @if (!compact) {
          <span class="seuil">seuil {{ seuil | number: '1.0-1' }} %</span>
          <span class="pastille" [class.ok]="reussite">{{ reussite ? 'Atteint' : 'À renforcer' }}</span>
        }
      </div>
      <div class="barre">
        <div class="remplissage" [class.ok]="reussite" [style.width.%]="borne(score)"></div>
        <div class="repere" [style.left.%]="borne(seuil)"></div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .score-seuil { min-width: 0; }
    .valeurs { display: flex; align-items: baseline; gap: 8px; margin-bottom: 4px; }
    .pct { color: var(--qx-orange-texte, #b45300); font-size: 0.9rem; }
    .pct.ok { color: var(--qx-vert, #2e7d32); }
    .seuil { color: var(--qx-texte-3, #888); font-size: 0.78rem; flex: 1; }
    .pastille { font-size: 0.7rem; font-weight: 600; padding: 1px 8px; border-radius: 10px; background: rgba(255,121,0,.14); color: var(--qx-orange-texte, #b45300); white-space: nowrap; }
    .pastille.ok { background: rgba(46,125,50,.12); color: var(--qx-vert, #2e7d32); }
    .barre { position: relative; height: 6px; border-radius: 3px; background: var(--qx-surface-2, #eceff1); }
    .remplissage { height: 100%; border-radius: 3px; background: #ff7900; }
    .remplissage.ok { background: #2e7d32; }
    .repere { position: absolute; top: -3px; width: 2px; height: 12px; background: #546e7a; border-radius: 1px; }
    .compact .valeurs { margin-bottom: 3px; }
    .compact .pct { font-size: 0.8rem; }
    .compact .barre { height: 4px; }
    .compact .repere { top: -2px; height: 8px; }
  `],
})
export class ScoreSeuilComponent {
  @Input() score = 0;
  @Input() seuil = 0;
  @Input() comparateur = '>=';
  @Input() reussite = false;
  @Input() compact = false;

  /** Règle du seuil, en clair (infobulle). */
  get regle(): string {
    const s = (Number(this.seuil) || 0).toLocaleString('fr-FR', { maximumFractionDigits: 1 });
    return this.comparateur === '>' ? `Réussite si le score dépasse ${s} %` : `Réussite à partir de ${s} %`;
  }
  borne(v: number): number { return Math.max(0, Math.min(100, Number(v) || 0)); }
}
