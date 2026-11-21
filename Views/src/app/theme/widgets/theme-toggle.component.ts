import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SettingsService } from '@core';

/**
 * Bascule clair / sombre en un clic (en-tête). Le choix est mémorisé ; le
 * réglage « Auto » (suivre le système) reste disponible dans le panneau des
 * réglages (engrenage).
 */
@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatTooltipModule],
  template: `
    <button mat-icon-button class="bascule-theme" (click)="basculer()"
            [matTooltip]="sombre ? 'Passer en mode clair' : 'Passer en mode sombre'"
            [attr.aria-label]="sombre ? 'Passer en mode clair' : 'Passer en mode sombre'">
      <mat-icon>{{ sombre ? 'light_mode' : 'dark_mode' }}</mat-icon>
    </button>
  `,
})
export class ThemeToggleComponent implements OnInit, OnDestroy {
  private readonly settings = inject(SettingsService);
  private abo?: { unsubscribe(): void };
  sombre = false;

  ngOnInit(): void {
    this.sombre = this.settings.getThemeColor() === 'dark';
    this.abo = this.settings.notify.subscribe(() => (this.sombre = this.settings.getThemeColor() === 'dark'));
  }
  ngOnDestroy(): void { this.abo?.unsubscribe(); }

  basculer(): void {
    this.settings.setTheme(this.sombre ? 'light' : 'dark');
    this.sombre = this.settings.getThemeColor() === 'dark';
  }
}
