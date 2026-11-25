import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { ConfirmationService } from '@shared/services/confirmation.service';
import { ChargementComponent } from '@shared/components/chargement/chargement.component';
import { Arborescence, BiOption, EvalBiService } from '../../eval-bi.service';
import { ArbreOptionsComponent, DemandeAjout, DemandeDeplacement, OptionArbre } from '../../arbre-options/arbre-options.component';

export interface DonneesOptionsArbo { arbo: Arborescence; modifiable: boolean; }

/** Visionnage (et, avec evaluation.parametrer, édition) des options d'une arborescence. */
@Component({
  selector: 'app-arbo-options-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, ChargementComponent, ArbreOptionsComponent],
  template: `
    <h2 class="dlg-titre">Options — {{ d.arbo.grille }} / {{ d.arbo.site }}</h2>
    <mat-dialog-content class="opts">
      <p class="depart"><mat-icon>flag</mat-icon> Point de départ : <strong>{{ d.arbo.point_depart_libelle }}</strong>
        @if (d.arbo.etat === 'ARCHIVE') { <span class="pastille-arch">Archivée — lecture seule</span> }</p>
      @if (chargement && !options.length) { <app-chargement /> }
      @else {
        <app-arbre-options [options]="options" [modifiable]="d.modifiable"
                           (ajouter)="ajouter($event)" (renommer)="renommer($event)"
                           (supprimer)="supprimer($event)" (deplacer)="deplacer($event)" />
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-flat-button color="primary" mat-dialog-close>Fermer</button>
    </mat-dialog-actions>
  `,
  styles: `
    .opts { min-height: 320px; }
    .depart { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin: 4px 0 12px; color: var(--qx-texte-2, #555); }
    .depart mat-icon { font-size: 18px; width: 18px; height: 18px; color: #f57c00; }
    .pastille-arch { margin-left: 8px; padding: 2px 10px; border-radius: 10px; font-size: 12px; font-weight: 600;
      background: var(--qx-surface-2, #f1f3f5); color: var(--qx-texte-2, #555); }
  `,
})
export class ArboOptionsDialogComponent implements OnInit {
  readonly d = inject<DonneesOptionsArbo>(MAT_DIALOG_DATA);
  private readonly service = inject(EvalBiService);
  private readonly toastr = inject(ToastrService);
  private readonly confirmation = inject(ConfirmationService);
  options: BiOption[] = [];
  chargement = false;
  /** Vrai si une option a été modifiée (la liste des arborescences se recharge à la fermeture). */
  modifie = false;

  ngOnInit(): void { this.charger(); }

  charger(): void {
    this.chargement = true;
    this.service.getArbreOptions(this.d.arbo.id).pipe(finalize(() => (this.chargement = false))).subscribe({ next: o => (this.options = o) });
  }
  private apres(message: string): void { this.toastr.success(message); this.modifie = true; this.charger(); }

  ajouter(d: DemandeAjout): void {
    this.service.addOption({ id_arborescence: this.d.arbo.id, ...d }).subscribe({
      next: () => this.apres('Option ajoutée.'), error: err => this.toastr.error(err?.error?.message || 'Erreur.'),
    });
  }
  renommer(d: { id: number; libelle: string }): void {
    this.service.updateOption(d.id, d.libelle).subscribe({
      next: () => this.apres('Option renommée.'), error: err => this.toastr.error(err?.error?.message || 'Erreur.'),
    });
  }
  async supprimer(d: { option: OptionArbre; nbDescendantes: number }): Promise<void> {
    const sous = d.nbDescendantes ? ` et ses ${d.nbDescendantes} sous-option${d.nbDescendantes > 1 ? 's' : ''}` : '';
    if (!(await this.confirmation.confirmer({ titre: 'Supprimer l\'option', message: `Supprimer « ${d.option.libelle} »${sous} ?`, type: 'danger' }))) return;
    this.service.deleteOption(d.option.id).subscribe({
      next: () => this.apres('Supprimée.'), error: err => this.toastr.error(err?.error?.message || 'Erreur.'),
    });
  }
  async deplacer(d: DemandeDeplacement): Promise<void> {
    const sous = d.nbDescendantes ? ` (avec ses ${d.nbDescendantes} sous-option${d.nbDescendantes > 1 ? 's' : ''})` : '';
    const cible = d.parent ? `sous « ${d.parent.libelle} » (niveau ${d.parent.niveau + 1})` : 'au niveau 1';
    if (!(await this.confirmation.confirmer({ titre: 'Déplacer l\'option', message: `Déplacer « ${d.option.libelle} »${sous} ${cible} ?`, type: 'attention' }))) return;
    this.service.deplacerOption(d.option.id, d.parent ? d.parent.id : null).subscribe({
      next: () => this.apres('Option déplacée.'), error: err => this.toastr.error(err?.error?.message || 'Erreur.'),
    });
  }
}
