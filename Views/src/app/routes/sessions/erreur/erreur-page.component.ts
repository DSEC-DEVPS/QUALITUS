import { Component, inject } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

/**
 * Page d'erreur (403 / 404 / 500), affichée par l'intercepteur quand le
 * chargement d'une page échoue. L'adresse d'origine est conservée
 * (skipLocationChange) : « Retour » ramène à la page précédente.
 */
@Component({
  selector: 'app-erreur-page',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  template: `
    <div class="erreur-page">
      <div class="carte">
        <span class="icone" [class.alerte]="code === 500"><mat-icon>{{ info.icone }}</mat-icon></span>
        <div class="code">{{ code }}</div>
        <h2>{{ info.titre }}</h2>
        @if (motif) { <p class="motif"><mat-icon>info</mat-icon><span>{{ motif }}</span></p> }
        <p>{{ info.texte }}</p>
        <div class="actions">
          <button mat-stroked-button (click)="retour()"><mat-icon>arrow_back</mat-icon> Retour</button>
          <button mat-flat-button color="primary" (click)="accueil()"><mat-icon>home</mat-icon> Accueil</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .erreur-page { display: flex; justify-content: center; padding: 48px 16px; }
    .carte { max-width: 520px; text-align: center; background: #fff; border-radius: 12px; padding: 32px 28px;
             box-shadow: 0 4px 18px rgba(0,0,0,.08); }
    .icone { display: inline-flex; align-items: center; justify-content: center; width: 72px; height: 72px; border-radius: 50%;
             background: rgba(255,121,0,.12); }
    .icone mat-icon { font-size: 38px; width: 38px; height: 38px; color: #ff7900; }
    .icone.alerte { background: rgba(198,40,40,.1); }
    .icone.alerte mat-icon { color: #c62828; }
    .code { margin-top: 10px; font-size: 0.85rem; font-weight: 600; color: #999; letter-spacing: .08em; }
    h2 { margin: 4px 0 8px; font-size: 1.35rem; font-weight: 600; color: #333; }
    p { color: #666; margin: 0 0 20px; line-height: 1.5; }
    .motif { display: flex; align-items: flex-start; gap: 8px; text-align: left; margin: 4px 0 14px; padding: 10px 12px;
             border-radius: 8px; background: #fff4ea; border: 1px solid #f6d2b0; color: #5a3a1a; font-weight: 500; }
    .motif mat-icon { color: #ff7900; flex: none; font-size: 20px; width: 20px; height: 20px; }
    .actions { display: flex; justify-content: center; gap: 10px; flex-wrap: wrap; }
  `],
})
export class ErreurPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);

  readonly code: number = Number(this.route.snapshot.data['code']) || 404;
  /** Motif précis renvoyé par le serveur (transmis par l'intercepteur), s'il apporte une information. */
  readonly motif: string = (() => {
    const m = String(this.router.getCurrentNavigation()?.extras.state?.['motif'] ?? history.state?.motif ?? '').trim();
    const generiques = ['accès refusé', 'ressource introuvable', 'erreur serveur, veuillez réessayer'];
    return m && !generiques.includes(m.toLowerCase()) && !/^\d{3}\b/.test(m) ? m : '';
  })();
  private static readonly TEXTES: Record<number, { icone: string; titre: string; texte: string }> = {
    403: { icone: 'lock', titre: 'Accès refusé', texte: "Vous n'avez pas accès à cette page ou à cet élément. Si vous pensez qu'il s'agit d'une erreur, contactez votre responsable." },
    404: { icone: 'search_off', titre: 'Introuvable', texte: "L'élément demandé n'existe pas ou n'existe plus." },
    500: { icone: 'error_outline', titre: 'Erreur du serveur', texte: 'Une erreur est survenue. Réessayez dans quelques instants ; si le problème persiste, prévenez le support.' },
  };
  get info() { return ErreurPageComponent.TEXTES[this.code] || ErreurPageComponent.TEXTES[404]; }

  retour(): void { this.location.back(); }
  accueil(): void { this.router.navigateByUrl('/mon-espace'); } // page d'arrivée calculée
}
