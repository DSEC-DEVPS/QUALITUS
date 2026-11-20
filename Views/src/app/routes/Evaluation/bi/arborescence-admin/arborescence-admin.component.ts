import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ToastrService } from 'ngx-toastr';
import { PermissionsService } from '../../../../core/authorization/permissions.service';
import { EvalBiService, Arborescence, BiOption } from '../../eval-bi.service';
import { EvalGrilleService, Grille } from '../../eval-grille.service';
import { ConfirmationService } from '@shared/services/confirmation.service';
import { finalize } from 'rxjs';
import { ChargementComponent } from '@shared/components/chargement/chargement.component';
import { ArbreOptionsComponent, DemandeAjout, DemandeDeplacement, OptionArbre } from '../../arbre-options/arbre-options.component';
import { correspondRecherche } from '@shared/utils/recherche';

@Component({
  selector: 'app-arborescence-admin',
  standalone: true,
  imports: [ArbreOptionsComponent, ChargementComponent, CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  templateUrl: './arborescence-admin.component.html',
  styleUrl: './arborescence-admin.component.scss',
})
export class ArborescenceAdminComponent implements OnInit {
  chargementOptions = false;
  chargement = true;
  private readonly confirmation = inject(ConfirmationService);
  private readonly perms = inject(PermissionsService);
  /** Paramétrage réservé à evaluation.parametrer (lecture seule sinon). */
  get peutParametrer(): boolean {
    return this.perms.can('evaluation.parametrer');
  }
  private readonly service = inject(EvalBiService);
  private readonly grilleService = inject(EvalGrilleService);
  private readonly http = inject(HttpClient);
  private readonly toastr = inject(ToastrService);

  grilles: Grille[] = [];
  sites: { id: number; nom: string }[] = [];
  arborescences: Arborescence[] = [];
  /** Recherche dans la liste des arborescences (grille, site, point de départ). */
  rechercheArbo = '';
  get arborescencesFiltrees(): Arborescence[] {
    return this.arborescences.filter(a => correspondRecherche(this.rechercheArbo, [a.grille, a.site, a.point_depart_libelle]));
  }

  nouvelle = { id_grille: null as number | null, id_site: null as number | null, point_depart_libelle: '' };

  arboSelectionnee?: Arborescence;
  options: BiOption[] = [];

  ngOnInit(): void {
    this.grilleService.getGrilles().subscribe({ next: g => (this.grilles = g) });
    this.http.get<{ id: number; nom: string }[]>('/api/v1/site/all').subscribe({ next: s => (this.sites = s || []) });
    this.charger();
  }

  charger(): void {
    this.chargement = true;
    this.service.getArborescences().pipe(finalize(() => (this.chargement = false))).subscribe({ next: a => (this.arborescences = a) });
  }

  creer(): void {
    if (!this.nouvelle.id_grille || !this.nouvelle.id_site || !this.nouvelle.point_depart_libelle.trim()) {
      this.toastr.warning('Grille, site et point de départ obligatoires.'); return;
    }
    this.service.addArborescence({
      id_grille: this.nouvelle.id_grille, id_site: this.nouvelle.id_site,
      point_depart_libelle: this.nouvelle.point_depart_libelle.trim(),
    }).subscribe({
      next: () => { this.toastr.success('Arborescence créée.'); this.nouvelle = { id_grille: null, id_site: null, point_depart_libelle: '' }; this.charger(); },
      error: err => this.toastr.error(err?.error?.message || 'Erreur.'),
    });
  }

  ouvrir(a: Arborescence): void {
    this.arboSelectionnee = a;
    this.chargerOptions();
  }

  chargerOptions(): void {
    if (!this.arboSelectionnee) return;
    this.chargementOptions = true;
    this.service.getArbreOptions(this.arboSelectionnee.id).pipe(finalize(() => (this.chargementOptions = false))).subscribe({ next: o => (this.options = o) });
  }




  // ---------- arbre (composant commun) ----------
  ajouterOptionArbre(d: DemandeAjout): void {
    if (!this.arboSelectionnee) return;
    this.service.addOption({ id_arborescence: this.arboSelectionnee.id, ...d }).subscribe({
      next: () => { this.toastr.success('Option ajoutée.'); this.chargerOptions(); },
      error: err => this.toastr.error(err?.error?.message || 'Erreur.'),
    });
  }
  renommerOptionArbre(d: { id: number; libelle: string }): void {
    this.service.updateOption(d.id, d.libelle).subscribe({
      next: () => { this.toastr.success('Option renommée.'); this.chargerOptions(); },
      error: err => this.toastr.error(err?.error?.message || 'Erreur.'),
    });
  }
  async supprimerOptionArbre(d: { option: OptionArbre; nbDescendantes: number }): Promise<void> {
    const sous = d.nbDescendantes ? ` et ses ${d.nbDescendantes} sous-option${d.nbDescendantes > 1 ? 's' : ''}` : '';
    if (!(await this.confirmation.confirmer({ titre: 'Supprimer l\'option', message: `Supprimer « ${d.option.libelle} »${sous} ?`, type: 'danger' }))) return;
    this.service.deleteOption(d.option.id).subscribe({
      next: () => { this.toastr.success('Supprimée.'); this.chargerOptions(); },
      error: err => this.toastr.error(err?.error?.message || 'Erreur.'),
    });
  }
  async deplacerOptionArbre(d: DemandeDeplacement): Promise<void> {
    const sous = d.nbDescendantes ? ` (avec ses ${d.nbDescendantes} sous-option${d.nbDescendantes > 1 ? 's' : ''})` : '';
    const cible = d.parent ? `sous « ${d.parent.libelle} » (niveau ${d.parent.niveau + 1})` : 'au niveau 1';
    if (!(await this.confirmation.confirmer({ titre: 'Déplacer l\'option', message: `Déplacer « ${d.option.libelle} »${sous} ${cible} ?`, type: 'attention' }))) return;
    this.service.deplacerOption(d.option.id, d.parent ? d.parent.id : null).subscribe({
      next: () => { this.toastr.success('Option déplacée.'); this.chargerOptions(); },
      error: err => this.toastr.error(err?.error?.message || 'Erreur.'),
    });
  }
}
