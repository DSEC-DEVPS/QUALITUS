import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BadgeUtilisateur } from '../interfaces';

interface GroupeBadges { code: string; libelle: string; badges: BadgeUtilisateur[]; }

/**
 * Badges quiz d'un utilisateur, regroupés par catégorie (Découverte,
 * Progression, Qualité, Mensuel), avec la rareté (« détenu par N % des
 * participants ») et le nombre d'obtentions des badges mensuels.
 * `compact` : version réduite (page détail agent), badges obtenus seulement.
 */
@Component({
  selector: 'app-badges-quiz',
  standalone: true,
  imports: [MatIconModule, MatTooltipModule],
  template: `
    @if (compact) {
      <div class="compact">
        @for (b of obtenus; track b.code) {
          <span class="mini" [matTooltip]="infobulle(b)">
            <mat-icon>{{ b.icone }}</mat-icon>{{ b.nom }}
            @if ((b.nb_obtentions || 0) > 1) { <b>×{{ b.nb_obtentions }}</b> }
          </span>
        } @empty {
          <span class="vide">Aucun badge obtenu pour l'instant.</span>
        }
        @if (badges.length) { <span class="total">{{ obtenus.length }} / {{ badges.length }} badges</span> }
      </div>
    } @else {
      @for (g of groupes; track g.code) {
        <div class="groupe">
          <div class="groupe-titre">{{ g.libelle }} <span>{{ nbObtenus(g) }} / {{ g.badges.length }}</span></div>
          <div class="bq-liste">
            @for (b of g.badges; track b.code) {
              <div class="bq" [class.gagne]="b.obtenu === 1" [matTooltip]="infobulle(b)">
                <mat-icon>{{ b.icone }}</mat-icon>
                <div class="badge-nom">{{ b.nom }}</div>
                @if ((b.nb_obtentions || 0) > 1) { <div class="compteur">×{{ b.nb_obtentions }}</div> }
                <div class="rarete" [class.rare]="(b.rarete ?? 100) <= 10">détenu par {{ b.rarete ?? 0 }} %</div>
                @if (b.obtenu !== 1) { <div class="verrou"><mat-icon>lock</mat-icon></div> }
              </div>
            }
          </div>
        </div>
      } @empty {
        <span class="text-muted">Aucun badge configuré.</span>
      }
    }
  `,
  styles: [`
    .groupe { margin-bottom: 14px; }
    .groupe-titre { font-size: 13px; font-weight: 600; color: #ff7900; margin-bottom: 8px; }
    .groupe-titre span { color: #888; font-weight: 400; margin-left: 6px; }
    .bq-liste { display: flex; flex-wrap: wrap; gap: 14px; }
    .bq { position: relative; width: 116px; text-align: center; padding: 10px 6px 8px; border: 1px solid rgba(0,0,0,.1);
             border-radius: 10px; opacity: .45; filter: grayscale(1); }
    .bq.gagne { opacity: 1; filter: none; border-color: #ff7900; box-shadow: 0 2px 8px rgba(255,121,0,.2); }
    .bq mat-icon { font-size: 38px; width: 38px; height: 38px; color: #ff7900; }
    .badge-nom { font-size: .8rem; font-weight: 600; margin-top: 4px; }
    .compteur { position: absolute; top: 6px; left: 8px; font-size: 12px; font-weight: 700; color: #ff7900; }
    .rarete { font-size: 11px; color: #888; margin-top: 2px; }
    .rarete.rare { color: #8e24aa; font-weight: 600; }
    .verrou { position: absolute; top: 6px; right: 6px; }
    .verrou mat-icon { font-size: 16px; width: 16px; height: 16px; color: #999; }
    .compact { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    .mini { display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px 3px 6px; border-radius: 14px;
            background: #fff3e0; border: 1px solid #ffcc80; font-size: 12px; font-weight: 600; }
    .mini mat-icon { font-size: 18px; width: 18px; height: 18px; color: #ff7900; }
    .mini b { color: #ff7900; }
    .vide { color: #888; font-size: 13px; }
    .total { margin-left: auto; color: #888; font-size: 12px; }
  `],
})
export class BadgesQuizComponent {
  @Input() badges: BadgeUtilisateur[] = [];
  @Input() compact = false;

  private static readonly CATEGORIES: [string, string][] = [
    ['DECOUVERTE', 'Découverte'], ['PROGRESSION', 'Progression'], ['QUALITE', 'Qualité'], ['MENSUEL', 'Mensuel'],
  ];

  get groupes(): GroupeBadges[] {
    const connues = BadgesQuizComponent.CATEGORIES.map(c => c[0]);
    return BadgesQuizComponent.CATEGORIES
      .map(([code, libelle]) => ({ code, libelle, badges: this.badges.filter(b => (b.categorie || 'DECOUVERTE') === code) }))
      .concat([{ code: 'AUTRE', libelle: 'Autres', badges: this.badges.filter(b => b.categorie && !connues.includes(b.categorie)) }])
      .filter(g => g.badges.length);
  }
  get obtenus(): BadgeUtilisateur[] { return this.badges.filter(b => b.obtenu === 1); }
  nbObtenus(g: GroupeBadges): number { return g.badges.filter(b => b.obtenu === 1).length; }

  infobulle(b: BadgeUtilisateur): string {
    const parts = [b.description];
    if ((b.periodes || []).length) parts.push(`Obtenu : ${(b.periodes || []).map(p => this.mois(p)).join(', ')}`);
    else if (b.obtenu === 1 && b.dateObtention) parts.push(`Obtenu le ${new Date(b.dateObtention).toLocaleDateString('fr-FR')}`);
    parts.push(`Détenu par ${b.rarete ?? 0} % des participants`);
    return parts.join(' — ');
  }
  private mois(p: string): string {
    const [a, m] = p.split('-');
    const d = new Date(Number(a), Number(m) - 1, 1);
    return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  }
}
