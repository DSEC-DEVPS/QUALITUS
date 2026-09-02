import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import {
  AppearanceAnimation,
  ConfirmBoxInitializer,
  DialogLayoutDisplay,
  DisappearanceAnimation,
} from '@costlydeveloper/ngx-awesome-popup';
import { CalibrageService } from '@shared/services/calibrage.service';
import {
  CategorieErreur,
  CritereRegle,
  Erreur,
  Item,
  ModeleGrille,
  NiveauCalibrage,
  SousItem,
} from '../interfaces';
import {
  ElementDialogComponent,
  ElementDialogData,
  ElementDialogResult,
} from '../element-dialog/element-dialog.component';
import { AssocierCategoriesComponent } from '../associer-categories/associer-categories.component';
import {
  CritereDialogComponent,
  CritereDialogData,
} from '../critere-dialog/critere-dialog.component';
import { PourquoiEditorComponent } from '../pourquoi-editor/pourquoi-editor.component';

@Component({
  selector: 'app-editeur-grille',
  standalone: true,
  imports: [
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatExpansionModule,
    MatTooltipModule,
    MatChipsModule,
    PourquoiEditorComponent,
  ],
  templateUrl: './editeur-grille.component.html',
  styleUrl: './editeur-grille.component.scss',
})
export class EditeurGrilleComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly calibrage = inject(CalibrageService);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastrService);

  modeleId!: number;
  modele?: ModeleGrille;
  criteres: CritereRegle[] = [];
  chargement = true;

  ngOnInit(): void {
    this.modeleId = Number(this.route.snapshot.paramMap.get('id'));
    this.charger();
    this.chargerCriteres();
  }

  charger() {
    this.chargement = true;
    this.calibrage.getModele(this.modeleId).subscribe({
      next: m => {
        this.modele = m;
        this.chargement = false;
      },
      error: () => {
        this.toast.error('Modele introuvable');
        this.chargement = false;
      },
    });
  }

  chargerCriteres() {
    this.calibrage.getCriteres(this.modeleId).subscribe({
      next: c => (this.criteres = c),
      error: () => this.toast.error('Impossible de charger les criteres'),
    });
  }

  retour() {
    this.router.navigate(['/mon-espace/calibrage/modeles']);
  }

  pourcentage(poids: number | undefined): string {
    if (!poids) {
      return '0%';
    }
    return (poids * 100).toFixed(2).replace(/\.00$/, '') + '%';
  }

  /* ---------- Helpers dialog / confirmation ---------- */

  private ouvrirDialog(
    niveau: NiveauCalibrage,
    mode: 'add' | 'edit',
    initial?: { nom?: string; poids?: number; referentiel?: string }
  ): Observable<ElementDialogResult | undefined> {
    const data: ElementDialogData = { niveau, mode, ...initial };
    return this.dialog
      .open(ElementDialogComponent, {
        width: 'calc(100% - 30px)',
        maxWidth: '640px',
        data,
      })
      .afterClosed();
  }

  private confirmer(message: string, action: () => void) {
    const box = new ConfirmBoxInitializer();
    box.setTitle('Suppression !');
    box.setMessage(message);
    box.setConfig({
      layoutType: DialogLayoutDisplay.DANGER,
      animationIn: AppearanceAnimation.BOUNCE_IN,
      animationOut: DisappearanceAnimation.BOUNCE_OUT,
      buttonPosition: 'right',
    });
    box.setButtonLabels('OUI', 'NON');
    box.openConfirmBox$().subscribe(resp => {
      if (resp.success) {
        action();
      }
    });
  }

  private ok(msg: string) {
    this.toast.success(msg);
    this.charger();
  }
  private ko() {
    this.toast.error("Une erreur s'est produite");
  }

  /* ---------- Modele (entete) ---------- */

  associerCategories() {
    const ref = this.dialog.open(AssocierCategoriesComponent, {
      width: 'calc(100% - 30px)',
      maxWidth: '600px',
      data: {
        id_ModeleGrille: this.modeleId,
        nomModele: this.modele?.nom,
        selection: (this.modele?.categoriesRessources || []).map(c => c.id),
      },
    });
    ref.afterClosed().subscribe(saved => {
      if (saved) {
        this.charger();
      }
    });
  }

  /* ---------- Niveau 1 : Categorie d'erreur ---------- */

  ajouterCategorie() {
    this.ouvrirDialog('categorie', 'add').subscribe(r => {
      if (r) {
        this.calibrage
          .addCategorieErreur({ id_ModeleGrille: this.modeleId, nom: r.nom, poids: r.poids })
          .subscribe({ next: () => this.ok('Categorie ajoutee'), error: () => this.ko() });
      }
    });
  }
  modifierCategorie(c: CategorieErreur) {
    this.ouvrirDialog('categorie', 'edit', { nom: c.nom, poids: c.poids }).subscribe(r => {
      if (r) {
        this.calibrage
          .updateCategorieErreur(c.id, { nom: r.nom, poids: r.poids })
          .subscribe({ next: () => this.ok('Categorie modifiee'), error: () => this.ko() });
      }
    });
  }
  supprimerCategorie(c: CategorieErreur) {
    this.confirmer(`Supprimer la categorie "${c.nom}" et tout son contenu ?`, () => {
      this.calibrage
        .deleteCategorieErreur(c.id)
        .subscribe({ next: () => this.ok('Categorie supprimee'), error: () => this.ko() });
    });
  }

  /* ---------- Niveau 2 : Erreur ---------- */

  ajouterErreur(c: CategorieErreur) {
    this.ouvrirDialog('erreur', 'add').subscribe(r => {
      if (r) {
        this.calibrage
          .addErreur({ id_CategorieErreur: c.id, nom: r.nom, poids: r.poids })
          .subscribe({ next: () => this.ok('Erreur ajoutee'), error: () => this.ko() });
      }
    });
  }
  modifierErreur(e: Erreur) {
    this.ouvrirDialog('erreur', 'edit', { nom: e.nom, poids: e.poids }).subscribe(r => {
      if (r) {
        this.calibrage
          .updateErreur(e.id, { nom: r.nom, poids: r.poids })
          .subscribe({ next: () => this.ok('Erreur modifiee'), error: () => this.ko() });
      }
    });
  }
  supprimerErreur(e: Erreur) {
    this.confirmer(`Supprimer l'erreur "${e.nom}" et tout son contenu ?`, () => {
      this.calibrage
        .deleteErreur(e.id)
        .subscribe({ next: () => this.ok('Erreur supprimee'), error: () => this.ko() });
    });
  }

  /* ---------- Niveau 3 : Item ---------- */

  ajouterItem(e: Erreur) {
    this.ouvrirDialog('item', 'add').subscribe(r => {
      if (r) {
        this.calibrage
          .addItem({ id_Erreur: e.id, nom: r.nom, poids: r.poids })
          .subscribe({ next: () => this.ok('Item ajoute'), error: () => this.ko() });
      }
    });
  }
  modifierItem(it: Item) {
    this.ouvrirDialog('item', 'edit', { nom: it.nom, poids: it.poids }).subscribe(r => {
      if (r) {
        this.calibrage
          .updateItem(it.id, { nom: r.nom, poids: r.poids })
          .subscribe({ next: () => this.ok('Item modifie'), error: () => this.ko() });
      }
    });
  }
  supprimerItem(it: Item) {
    this.confirmer(`Supprimer l'item "${it.nom}" et ses sous-items ?`, () => {
      this.calibrage
        .deleteItem(it.id)
        .subscribe({ next: () => this.ok('Item supprime'), error: () => this.ko() });
    });
  }

  /* ---------- Niveau 4 : Sous-item ---------- */

  ajouterSousItem(it: Item) {
    this.ouvrirDialog('sousItem', 'add').subscribe(r => {
      if (r) {
        this.calibrage
          .addSousItem({ id_Item: it.id, nom: r.nom, poids: r.poids, referentiel: r.referentiel })
          .subscribe({ next: () => this.ok('Sous-item ajoute'), error: () => this.ko() });
      }
    });
  }
  modifierSousItem(s: SousItem) {
    this.ouvrirDialog('sousItem', 'edit', {
      nom: s.nom,
      poids: s.poids,
      referentiel: s.referentiel,
    }).subscribe(r => {
      if (r) {
        this.calibrage
          .updateSousItem(s.id, { nom: r.nom, poids: r.poids, referentiel: r.referentiel })
          .subscribe({ next: () => this.ok('Sous-item modifie'), error: () => this.ko() });
      }
    });
  }
  supprimerSousItem(s: SousItem) {
    this.confirmer(`Supprimer le sous-item "${s.nom}" ?`, () => {
      this.calibrage
        .deleteSousItem(s.id)
        .subscribe({ next: () => this.ok('Sous-item supprime'), error: () => this.ko() });
    });
  }

  /* ---------- Phase 2 : Criteres de reussite / echec ---------- */

  private okCritere(msg: string) {
    this.toast.success(msg);
    this.chargerCriteres();
  }

  ajouterCritere() {
    const data: CritereDialogData = { mode: 'add' };
    this.dialog
      .open(CritereDialogComponent, { width: 'calc(100% - 30px)', maxWidth: '640px', data })
      .afterClosed()
      .subscribe((r: Partial<CritereRegle> | undefined) => {
        if (r) {
          this.calibrage
            .addCritere({ ...r, id_ModeleGrille: this.modeleId } as CritereRegle & { id_ModeleGrille: number })
            .subscribe({ next: () => this.okCritere('Critere ajoute'), error: () => this.ko() });
        }
      });
  }

  modifierCritere(c: CritereRegle) {
    const data: CritereDialogData = { mode: 'edit', critere: c };
    this.dialog
      .open(CritereDialogComponent, { width: 'calc(100% - 30px)', maxWidth: '640px', data })
      .afterClosed()
      .subscribe((r: Partial<CritereRegle> | undefined) => {
        if (r) {
          this.calibrage
            .updateCritere(c.id, r)
            .subscribe({ next: () => this.okCritere('Critere modifie'), error: () => this.ko() });
        }
      });
  }

  supprimerCritere(c: CritereRegle) {
    this.confirmer(`Supprimer le critere "${c.type_ecart}" ?`, () => {
      this.calibrage
        .deleteCritere(c.id)
        .subscribe({ next: () => this.okCritere('Critere supprime'), error: () => this.ko() });
    });
  }
}
