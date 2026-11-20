import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatExpansionModule } from '@angular/material/expansion';
import { ToastrService } from 'ngx-toastr';
import { PermissionsService } from '../../../../core/authorization/permissions.service';
import { EvalCoachingService, CoachingOption } from '../../eval-coaching.service';
import { ConfirmationService } from '@shared/services/confirmation.service';
import { ArbreOptionsComponent, DemandeAjout, DemandeDeplacement, OptionArbre } from '../../arbre-options/arbre-options.component';
import { ChargementComponent } from '@shared/components/chargement/chargement.component';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-coaching-arbre',
  standalone: true,
  imports: [ArbreOptionsComponent, ChargementComponent, CommonModule, MatCardModule, MatIconModule],
  templateUrl: './coaching-arbre.component.html',
  styleUrl: './coaching-arbre.component.scss',
})
export class CoachingArbreComponent implements OnInit {
  private readonly confirmation = inject(ConfirmationService);
  private readonly perms = inject(PermissionsService);
  /** Paramétrage réservé à evaluation.parametrer (lecture seule sinon). */
  get peutParametrer(): boolean {
    return this.perms.can('evaluation.parametrer');
  }
  private readonly service = inject(EvalCoachingService);
  private readonly toastr = inject(ToastrService);

  options: CoachingOption[] = [];
  chargement = true;

  ngOnInit(): void { this.charger(); }

  charger(): void {
    this.service.getArbre().pipe(finalize(() => (this.chargement = false)))
      .subscribe({ next: o => (this.options = o), error: () => this.toastr.error('Erreur de chargement.') });
  }




  // ---------- arbre (composant commun) ----------
  ajouterOptionArbre(d: DemandeAjout): void {
    this.service.addOption(d).subscribe({
      next: () => { this.toastr.success('Option ajoutée.'); this.charger(); },
      error: err => this.toastr.error(err?.error?.message || 'Erreur.'),
    });
  }
  renommerOptionArbre(d: { id: number; libelle: string }): void {
    this.service.updateOption(d.id, d.libelle).subscribe({
      next: () => { this.toastr.success('Option renommée.'); this.charger(); },
      error: err => this.toastr.error(err?.error?.message || 'Erreur.'),
    });
  }
  async supprimerOptionArbre(d: { option: OptionArbre; nbDescendantes: number }): Promise<void> {
    const sous = d.nbDescendantes ? ` et ses ${d.nbDescendantes} sous-option${d.nbDescendantes > 1 ? 's' : ''}` : '';
    if (!(await this.confirmation.confirmer({ titre: 'Supprimer l\'option', message: `Supprimer « ${d.option.libelle} »${sous} ?`, type: 'danger' }))) return;
    this.service.deleteOption(d.option.id).subscribe({
      next: () => { this.toastr.success('Supprimée.'); this.charger(); },
      error: err => this.toastr.error(err?.error?.message || 'Erreur.'),
    });
  }
  async deplacerOptionArbre(d: DemandeDeplacement): Promise<void> {
    const sous = d.nbDescendantes ? ` (avec ses ${d.nbDescendantes} sous-option${d.nbDescendantes > 1 ? 's' : ''})` : '';
    const cible = d.parent ? `sous « ${d.parent.libelle} » (niveau ${d.parent.niveau + 1})` : 'au niveau 1';
    if (!(await this.confirmation.confirmer({ titre: 'Déplacer l\'option', message: `Déplacer « ${d.option.libelle} »${sous} ${cible} ?`, type: 'attention' }))) return;
    this.service.deplacerOption(d.option.id, d.parent ? d.parent.id : null).subscribe({
      next: () => { this.toastr.success('Option déplacée.'); this.charger(); },
      error: err => this.toastr.error(err?.error?.message || 'Erreur.'),
    });
  }
}
