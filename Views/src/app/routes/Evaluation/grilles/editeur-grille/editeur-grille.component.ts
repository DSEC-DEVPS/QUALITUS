import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ToastrService } from 'ngx-toastr';
import {
  EvalGrilleService, GrilleDetail, CategorieErreur, SousCategorieErreur, Erreur,
} from '../../eval-grille.service';

@Component({
  selector: 'app-editeur-grille',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule, MatChipsModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatCheckboxModule, MatExpansionModule, MatTooltipModule,
  ],
  templateUrl: './editeur-grille.component.html',
  styleUrl: './editeur-grille.component.scss',
})
export class EditeurGrilleComponent implements OnInit {
  private readonly service = inject(EvalGrilleService);
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly toastr = inject(ToastrService);

  id!: number;
  detail?: GrilleDetail;
  chargement = false;
  afficherArchives = false;

  nouvelleCategorie = this.categorieVide();
  formSousCat: Record<number, { libelle: string; poids_saisi: number | null }> = {};
  formErreur: Record<number, { item: string; sous_item: string; referentiel: string; poids_saisi: number | null }> = {};

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.params['id']);
    this.reload();
  }

  private categorieVide() {
    return { libelle: '', poids: 0, seuil_reussite: 100, comparateur: '>=' as '>' | '>=', critique: false };
  }

  get estManuel(): boolean {
    return this.detail?.grille.mode_ponderation === 'MANUEL';
  }

  reload(): void {
    this.chargement = true;
    this.service.getGrilleDetail(this.id, this.afficherArchives).subscribe({
      next: d => {
        this.detail = d;
        this.chargement = false;
        for (const c of d.categories) {
          if (!this.formSousCat[c.id]) this.formSousCat[c.id] = { libelle: '', poids_saisi: null };
          for (const sc of c.sous_categories || []) {
            if (!this.formErreur[sc.id]) this.formErreur[sc.id] = { item: '', sous_item: '', referentiel: '', poids_saisi: null };
          }
        }
      },
      error: () => { this.toastr.error('Impossible de charger la grille.'); this.chargement = false; },
    });
  }

  private handle(obs: any, okMsg?: string): void {
    obs.subscribe({
      next: (res: any) => {
        if (res?.downgraded) this.toastr.warning('Grille repassée en brouillon : cohérence des poids rompue.');
        else if (okMsg) this.toastr.success(okMsg);
        this.reload();
      },
      error: (err: any) => this.toastr.error(err?.error?.message || 'Une erreur est survenue.'),
    });
  }

  retour(): void { this.location.back(); }

  toggleArchives(): void { this.afficherArchives = !this.afficherArchives; this.reload(); }

  enregistrerEntete(): void {
    if (!this.detail) return;
    const g = this.detail.grille;
    this.handle(this.service.updateGrille(g.id, { nom: g.nom, type_ressource_cible: g.type_ressource_cible }), 'Grille mise à jour.');
  }

  basculerMode(): void {
    if (!this.detail) return;
    const cible = this.detail.grille.mode_ponderation === 'AUTO' ? 'MANUEL' : 'AUTO';
    if (cible === 'AUTO' && !confirm('Les poids saisis ne seront plus appliqués (ils restent conservés). Confirmer le passage en mode Automatique ?')) return;
    this.handle(this.service.changeMode(this.id, cible), `Mode ${cible} appliqué.`);
  }

  activer(): void {
    this.service.activerGrille(this.id).subscribe({
      next: () => { this.toastr.success('Grille activée.'); this.reload(); },
      error: err => { this.toastr.error(err?.error?.message || 'Activation impossible.'); this.reload(); },
    });
  }

  desactiver(): void {
    this.handle(this.service.desactiverGrille(this.id), 'Grille repassée en brouillon.');
  }

  ajouterCategorie(): void {
    if (!this.nouvelleCategorie.libelle.trim()) { this.toastr.warning('Le libellé de la catégorie est obligatoire.'); return; }
    this.service.addCategorie({ id_grille: this.id, ...this.nouvelleCategorie }).subscribe({
      next: () => { this.toastr.success('Catégorie ajoutée.'); this.nouvelleCategorie = this.categorieVide(); this.reload(); },
      error: err => this.toastr.error(err?.error?.message || 'Erreur.'),
    });
  }

  enregistrerCategorie(c: CategorieErreur): void {
    this.handle(this.service.updateCategorie(c.id, {
      libelle: c.libelle, poids: c.poids, seuil_reussite: c.seuil_reussite,
      comparateur: c.comparateur, critique: c.critique, ordre: c.ordre,
    }));
  }
  archiverCategorie(c: CategorieErreur): void { this.handle(this.service.archiverCategorie(c.id), 'Catégorie archivée.'); }
  reactiverCategorie(c: CategorieErreur): void { this.handle(this.service.reactiverCategorie(c.id), 'Catégorie réactivée.'); }
  supprimerCategorie(c: CategorieErreur): void {
    if (!confirm(`Supprimer la catégorie « ${c.libelle} » ?`)) return;
    this.handle(this.service.deleteCategorie(c.id), 'Catégorie supprimée.');
  }

  ajouterSousCat(c: CategorieErreur): void {
    const f = this.formSousCat[c.id];
    if (!f?.libelle.trim()) { this.toastr.warning('Le libellé de la sous-catégorie est obligatoire.'); return; }
    this.service.addSousCategorie({ id_categorie_erreur: c.id, libelle: f.libelle, poids_saisi: this.estManuel ? f.poids_saisi : null }).subscribe({
      next: () => { this.formSousCat[c.id] = { libelle: '', poids_saisi: null }; this.reload(); },
      error: err => this.toastr.error(err?.error?.message || 'Erreur.'),
    });
  }
  enregistrerSousCat(sc: SousCategorieErreur): void {
    this.handle(this.service.updateSousCategorie(sc.id, { libelle: sc.libelle, poids_saisi: sc.poids_saisi }));
  }
  archiverSousCat(sc: SousCategorieErreur): void { this.handle(this.service.archiverSousCategorie(sc.id), 'Sous-catégorie archivée.'); }
  reactiverSousCat(sc: SousCategorieErreur): void { this.handle(this.service.reactiverSousCategorie(sc.id), 'Sous-catégorie réactivée.'); }
  supprimerSousCat(sc: SousCategorieErreur): void {
    if (!confirm(`Supprimer la sous-catégorie « ${sc.libelle} » ?`)) return;
    this.handle(this.service.deleteSousCategorie(sc.id), 'Sous-catégorie supprimée.');
  }

  ajouterErreur(sc: SousCategorieErreur): void {
    const f = this.formErreur[sc.id];
    if (!f?.item.trim()) { this.toastr.warning("L'item de l'erreur est obligatoire."); return; }
    this.service.addErreur({
      id_sous_categorie_erreur: sc.id, item: f.item, sous_item: f.sous_item,
      referentiel: f.referentiel, poids_saisi: this.estManuel ? f.poids_saisi : null,
    }).subscribe({
      next: () => { this.formErreur[sc.id] = { item: '', sous_item: '', referentiel: '', poids_saisi: null }; this.reload(); },
      error: err => this.toastr.error(err?.error?.message || 'Erreur.'),
    });
  }
  enregistrerErreur(e: Erreur): void {
    this.handle(this.service.updateErreur(e.id, { item: e.item, sous_item: e.sous_item, referentiel: e.referentiel, poids_saisi: e.poids_saisi }));
  }
  archiverErreur(e: Erreur): void { this.handle(this.service.archiverErreur(e.id), 'Erreur archivée.'); }
  reactiverErreur(e: Erreur): void { this.handle(this.service.reactiverErreur(e.id), 'Erreur réactivée.'); }
  supprimerErreur(e: Erreur): void {
    if (!confirm(`Supprimer l'erreur « ${e.item} » ?`)) return;
    this.handle(this.service.deleteErreur(e.id), 'Erreur supprimée.');
  }
}
