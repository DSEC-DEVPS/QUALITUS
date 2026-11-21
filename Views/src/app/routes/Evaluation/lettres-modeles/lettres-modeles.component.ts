import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ToastrService } from 'ngx-toastr';
import { forkJoin } from 'rxjs';
import { EvalSuitesService } from '../eval-suites.service';
import { ChargementComponent } from '@shared/components/chargement/chargement.component';

type TypeLettre = 'FELICITATION' | 'DEBRIEFING';
interface Modele { introduction: string; cloture: string; initial: string; }

/**
 * Évaluation › Modèles de lettres (evaluation.parametrer) : texte d'introduction
 * et formule de clôture des lettres de félicitation et de débriefing, avec
 * variables et aperçu. Le reste de la lettre (résultats, points à travailler,
 * synthèse, signature) est construit automatiquement.
 */
@Component({
  selector: 'app-lettres-modeles',
  standalone: true,
  imports: [
    FormsModule, MatCardModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule,
    MatButtonToggleModule, MatTooltipModule, ChargementComponent,
  ],
  template: `
    <mat-card class="cal-panel">
      <mat-card-header class="cal-band"><span class="cal-band-title"><mat-icon>mail</mat-icon> Modèles de lettres</span></mat-card-header>
      <mat-card-content>
        <p class="aide">
          Personnalisez le début et la fin des lettres envoyées après une évaluation. Les résultats, les points à travailler,
          la synthèse et la signature de l'évaluateur sont ajoutés automatiquement entre les deux.
          Laissez une ligne vide pour commencer un nouveau paragraphe.
        </p>
        @if (chargement) { <app-chargement /> } @else {
          <mat-button-toggle-group [(ngModel)]="type" name="type" class="choix-type">
            <mat-button-toggle value="FELICITATION"><mat-icon>emoji_events</mat-icon> Lettre de félicitation</mat-button-toggle>
            <mat-button-toggle value="DEBRIEFING"><mat-icon>forum</mat-icon> Lettre de débriefing</mat-button-toggle>
          </mat-button-toggle-group>

          <div class="grille">
            <div class="edition">
              <div class="variables">
                <span>Variables :</span>
                @for (v of variables; track v.cle) {
                  <button mat-stroked-button type="button" class="variable" [matTooltip]="'Insérer ' + v.libelle" (click)="inserer(v.cle)">{{ '{{' + v.cle + '}}' }}</button>
                }
              </div>
              <mat-form-field appearance="outline" class="plein">
                <mat-label>Introduction</mat-label>
                <textarea matInput rows="7" name="introduction" [(ngModel)]="courant.introduction" (focus)="champ = 'introduction'"
                          (select)="memoriserCurseur($event)" (click)="memoriserCurseur($event)" (keyup)="memoriserCurseur($event)"></textarea>
                <mat-hint align="end">{{ courant.introduction.length }} / 4000</mat-hint>
              </mat-form-field>
              <mat-form-field appearance="outline" class="plein">
                <mat-label>Formule de clôture</mat-label>
                <textarea matInput rows="4" name="cloture" [(ngModel)]="courant.cloture" (focus)="champ = 'cloture'"
                          (select)="memoriserCurseur($event)" (click)="memoriserCurseur($event)" (keyup)="memoriserCurseur($event)"></textarea>
                <mat-hint align="end">{{ courant.cloture.length }} / 4000</mat-hint>
              </mat-form-field>
              <div class="actions">
                <button mat-button type="button" (click)="annuler()" [disabled]="!modifie || enregistrement">Annuler les modifications</button>
                <button mat-flat-button color="primary" type="button" (click)="enregistrer()" [disabled]="!valide || !modifie || enregistrement">
                  <mat-icon>save</mat-icon> Enregistrer
                </button>
              </div>
            </div>

            <div class="apercu">
              <div class="apercu-titre">Aperçu (exemple)</div>
              <div class="papier" [class.felicitation]="type === 'FELICITATION'">
                <div class="entete">{{ type === 'FELICITATION' ? 'Lettre de félicitation' : 'Lettre de débriefing' }}</div>
                @for (p of paragraphes(courant.introduction); track $index) { <p>{{ p }}</p> }
                <div class="bloc-auto"><mat-icon>auto_awesome</mat-icon> Résultats, points à travailler, synthèse… (ajoutés automatiquement)</div>
                @for (p of paragraphes(courant.cloture); track $index) { <p>{{ p }}</p> }
                <p class="signature">Cordialement,<br /><strong>{{ exemple.evaluateur }}</strong></p>
              </div>
            </div>
          </div>
        }
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .aide { color: #666; font-size: 0.9rem; margin: 4px 0 14px; }
    .choix-type { margin-bottom: 16px; }
    .choix-type mat-icon { margin-right: 4px; vertical-align: middle; font-size: 18px; width: 18px; height: 18px; }
    .grille { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 24px; align-items: start; }
    @media (max-width: 1100px) { .grille { grid-template-columns: 1fr; } }
    .plein { width: 100%; }
    .variables { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-bottom: 12px; font-size: 0.85rem; color: #666; }
    .variable { font-family: monospace; font-size: 12px; line-height: 26px; min-height: 26px; padding: 0 8px; }
    .actions { display: flex; justify-content: flex-end; gap: 8px; }
    .apercu-titre { font-size: 0.8rem; color: #888; margin-bottom: 6px; text-transform: uppercase; letter-spacing: .04em; }
    .papier { background: #fff; border-radius: 8px; box-shadow: 0 2px 12px rgba(0,0,0,.08); border-top: 5px solid #ff7900; padding: 16px 20px; line-height: 1.55; font-size: 0.92rem; }
    .papier.felicitation { border-top-color: #2e7d32; }
    .papier .entete { font-weight: 600; font-size: 1.05rem; color: #ff7900; margin-bottom: 10px; }
    .papier.felicitation .entete { color: #2e7d32; }
    .papier p { margin: 0 0 8px; }
    .bloc-auto { display: flex; align-items: center; gap: 6px; margin: 12px 0; padding: 10px; border: 1px dashed #ccc; border-radius: 6px; color: #999; font-size: 0.85rem; }
    .bloc-auto mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .signature { margin-top: 12px !important; }
  `],
})
export class LettresModelesComponent implements OnInit {
  private readonly service = inject(EvalSuitesService);
  private readonly toastr = inject(ToastrService);

  chargement = true;
  enregistrement = false;
  type: TypeLettre = 'FELICITATION';
  modeles: Record<TypeLettre, Modele> = {
    FELICITATION: { introduction: '', cloture: '', initial: '' },
    DEBRIEFING: { introduction: '', cloture: '', initial: '' },
  };
  champ: 'introduction' | 'cloture' = 'introduction';
  private curseur: { debut: number; fin: number } | null = null;

  readonly variables = [
    { cle: 'prenom', libelle: 'le prénom de l\'agent' },
    { cle: 'nom', libelle: 'le nom de l\'agent' },
    { cle: 'date_evaluation', libelle: 'la date de l\'évaluation' },
    { cle: 'contexte', libelle: 'le contexte de l\'appel' },
    { cle: 'appel', libelle: 'l\'identifiant de l\'appel' },
    { cle: 'evaluateur', libelle: 'le nom de l\'évaluateur' },
  ];
  readonly exemple: Record<string, string> = {
    prenom: 'Awa', nom: 'Sow', date_evaluation: '18/11/2026', contexte: 'Appel entrant', appel: 'APP-48213', evaluateur: 'Fatoumata Koné',
  };

  get courant(): Modele { return this.modeles[this.type]; }
  get modifie(): boolean { return this.signature(this.courant) !== this.courant.initial; }
  get valide(): boolean {
    const c = this.courant;
    return !!c.introduction.trim() && !!c.cloture.trim() && c.introduction.length <= 4000 && c.cloture.length <= 4000;
  }

  ngOnInit(): void {
    forkJoin({ f: this.service.getModeleLettre('FELICITATION'), d: this.service.getModeleLettre('DEBRIEFING') }).subscribe({
      next: ({ f, d }) => {
        this.modeles.FELICITATION = this.preparer(f.introduction, f.cloture);
        this.modeles.DEBRIEFING = this.preparer(d.introduction, d.cloture);
        this.chargement = false;
      },
      error: () => { this.chargement = false; this.toastr.error('Modèles de lettres indisponibles.'); },
    });
  }

  private preparer(introduction: string | null, cloture: string | null): Modele {
    const m = { introduction: introduction || '', cloture: cloture || '', initial: '' };
    m.initial = this.signature(m);
    return m;
  }
  private signature(m: Modele): string { return JSON.stringify([m.introduction, m.cloture]); }

  memoriserCurseur(ev: Event): void {
    const t = ev.target as HTMLTextAreaElement;
    this.curseur = { debut: t.selectionStart ?? t.value.length, fin: t.selectionEnd ?? t.value.length };
  }

  /** Insère une variable à la position du curseur du dernier champ utilisé. */
  inserer(cle: string): void {
    const jeton = `{{${cle}}}`;
    const texte = this.courant[this.champ];
    const debut = this.curseur?.debut ?? texte.length;
    const fin = this.curseur?.fin ?? texte.length;
    this.courant[this.champ] = texte.slice(0, debut) + jeton + texte.slice(fin);
    this.curseur = { debut: debut + jeton.length, fin: debut + jeton.length };
  }

  /** Paragraphes de l'aperçu, variables remplacées par l'exemple. */
  paragraphes(texte: string): string[] {
    const rempli = texte.replace(/\{\{\s*(\w+)\s*\}\}/g, (m, cle) => this.exemple[cle] ?? m);
    return rempli.split(/\n\s*\n/).map(p => p.trim()).filter(p => p);
  }

  annuler(): void {
    const [introduction, cloture] = JSON.parse(this.courant.initial);
    this.courant.introduction = introduction;
    this.courant.cloture = cloture;
  }

  enregistrer(): void {
    if (!this.valide) return;
    const type = this.type;
    const m = this.modeles[type];
    this.enregistrement = true;
    this.service.enregistrerModeleLettre(type, { introduction: m.introduction.trim(), cloture: m.cloture.trim() }).subscribe({
      next: r => {
        this.enregistrement = false;
        m.introduction = m.introduction.trim(); m.cloture = m.cloture.trim(); m.initial = this.signature(m);
        this.toastr.success(r.message || 'Modèle enregistré.');
      },
      error: e => { this.enregistrement = false; this.toastr.error(e?.error?.message || 'Enregistrement impossible.'); },
    });
  }
}
