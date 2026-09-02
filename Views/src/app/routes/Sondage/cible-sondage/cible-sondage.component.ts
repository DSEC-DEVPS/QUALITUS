import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ToastrService } from 'ngx-toastr';
import {
  AppearanceAnimation,
  ConfirmBoxInitializer,
  DialogLayoutDisplay,
  DisappearanceAnimation,
} from '@costlydeveloper/ngx-awesome-popup';
import { SondageService } from '@shared/services/sondage.service';
import { CibleSondage, OptionRef, Sondage, UtilisateurCible } from '../interfaces';

@Component({
  selector: 'app-cible-sondage',
  standalone: true,
  imports: [
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    MatCheckboxModule,
    MatChipsModule,
    MatTooltipModule,
  ],
  templateUrl: './cible-sondage.component.html',
  styleUrl: './cible-sondage.component.scss',
})
export class CibleSondageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly srv = inject(SondageService);
  private readonly toast = inject(ToastrService);

  sondageId!: number;
  sondage?: Sondage;

  sites: OptionRef[] = [];
  fonctions: OptionRef[] = [];
  sitesSel: number[] = [];
  fonctionsSel: number[] = [];
  ancienneteMin: number | null = null;

  resultats: UtilisateurCible[] = [];
  selection = new Set<number>();
  colsResultats = ['sel', 'nom', 'fonction', 'site', 'anciennete'];

  cibles: CibleSondage[] = [];
  colsCibles = ['nom', 'email', 'telephone', 'source', 'envoi', 'actions'];

  fichier: File | null = null;
  importEnCours = false;

  ngOnInit(): void {
    this.sondageId = Number(this.route.snapshot.paramMap.get('id'));
    this.srv.getOne(this.sondageId).subscribe({
      next: s => (this.sondage = s),
      error: () => this.toast.error('Sondage introuvable'),
    });
    this.srv.getSites().subscribe({ next: s => (this.sites = s), error: () => {} });
    this.srv.getFonctions().subscribe({ next: f => (this.fonctions = f), error: () => {} });
    this.chargerCibles();
  }

  get modifiable(): boolean {
    return this.sondage?.statut !== 'ACTIF';
  }

  chargerCibles() {
    this.srv.getCibles(this.sondageId).subscribe({
      next: c => (this.cibles = c),
      error: () => {},
    });
  }

  /* ----- Recherche annuaire ----- */
  rechercher() {
    this.srv
      .rechercherUtilisateurs({
        sites: this.sitesSel,
        fonctions: this.fonctionsSel,
        anciennete_min: this.ancienneteMin || undefined,
      })
      .subscribe({
        next: r => {
          this.resultats = r;
          this.selection.clear();
        },
        error: () => this.toast.error('Recherche impossible'),
      });
  }
  estSel(id: number): boolean {
    return this.selection.has(id);
  }
  basculerSel(id: number, checked: boolean) {
    if (checked) this.selection.add(id);
    else this.selection.delete(id);
  }
  toutSelectionner(checked: boolean) {
    if (checked) this.resultats.forEach(r => this.selection.add(r.id));
    else this.selection.clear();
  }
  ajouterSelection() {
    if (!this.selection.size) {
      this.toast.warning('Sélectionnez au moins un utilisateur');
      return;
    }
    this.srv.addCibleUtilisateurs(this.sondageId, [...this.selection]).subscribe({
      next: r => {
        this.toast.success(r.message);
        this.selection.clear();
        this.chargerCibles();
      },
      error: err => this.toast.error(err?.error?.message || "Une erreur s'est produite"),
    });
  }

  /* ----- Import Excel ----- */
  onFile(e: Event) {
    const input = e.target as HTMLInputElement;
    this.fichier = input.files && input.files.length ? input.files[0] : null;
  }
  importer() {
    if (!this.fichier) {
      this.toast.warning('Choisissez un fichier Excel');
      return;
    }
    this.importEnCours = true;
    this.srv.importCibles(this.sondageId, this.fichier).subscribe({
      next: r => {
        this.toast.success(r.message);
        this.fichier = null;
        this.importEnCours = false;
        this.chargerCibles();
      },
      error: err => {
        this.importEnCours = false;
        this.toast.error(err?.error?.message || "Échec de l'import");
      },
    });
  }

  /* ----- Cibles ----- */
  supprimerCible(c: CibleSondage) {
    const box = new ConfirmBoxInitializer();
    box.setTitle('Retirer !');
    box.setMessage(`Retirer ${c.prenom || ''} ${c.nom || c.email || ''} de la cible ?`);
    box.setConfig({
      layoutType: DialogLayoutDisplay.DANGER,
      animationIn: AppearanceAnimation.BOUNCE_IN,
      animationOut: DisappearanceAnimation.BOUNCE_OUT,
      buttonPosition: 'right',
    });
    box.setButtonLabels('OUI', 'NON');
    box.openConfirmBox$().subscribe(resp => {
      if (resp.success) {
        this.srv.deleteCible(c.id).subscribe({
          next: r => {
            this.toast.success(r.message);
            this.chargerCibles();
          },
          error: err => this.toast.error(err?.error?.message || "Une erreur s'est produite"),
        });
      }
    });
  }

  /* ----- Diffusion ----- */
  diffuser(canaux: string[]) {
    this.srv.diffuser(this.sondageId, canaux).subscribe({
      next: r => {
        this.toast.success(r.message);
        this.chargerCibles();
      },
      error: err => this.toast.error(err?.error?.message || 'Diffusion impossible'),
    });
  }

  retour() {
    this.router.navigate(['/mon-espace/sondage/gestion']);
  }
}
