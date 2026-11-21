import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { UserService } from '@shared/services/user.service';
import { ChargementComponent } from '@shared/components/chargement/chargement.component';
import { correspondRecherche } from '@shared/utils/recherche';

/** Données passées à la fenêtre : le compte à modifier. */
export interface ModifierCompteData {
  id: number;
  nom_utilisateur: string;
}

/**
 * Fenêtre « Modifier le compte » (Gérer les comptes, permission Jauge).
 * Tous les champs du compte sauf le mot de passe. Sur son propre compte, la
 * fonction, le site et le statut sont verrouillés (contrôlé aussi côté serveur).
 * Les erreurs de l'API sont affichées par l'intercepteur global.
 */
@Component({
  selector: 'app-modifier-compte-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatButtonModule, MatIconModule, ChargementComponent,
  ],
  template: `
    <h2 mat-dialog-title>Modifier le compte — {{ data.nom_utilisateur }}</h2>
    <mat-dialog-content>
      @if (chargement) {
        <app-chargement />
      } @else if (u) {
        @if (estMoi) {
          <p class="info"><mat-icon>lock</mat-icon> Votre propre compte : la fonction, le site et le statut ne sont pas modifiables ici.</p>
        }
        <form #f="ngForm" class="grille">
          <h3>Identité</h3>
          <mat-form-field appearance="outline"><mat-label>Nom</mat-label>
            <input matInput name="nom" [(ngModel)]="u.nom" required /></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Prénom</mat-label>
            <input matInput name="prenom" [(ngModel)]="u.prenom" required /></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Login</mat-label>
            <input matInput name="nom_utilisateur" [(ngModel)]="u.nom_utilisateur" required autocomplete="off" /></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Genre</mat-label>
            <mat-select name="genre" [(ngModel)]="u.genre">
              <mat-option [value]="null">—</mat-option>
              @for (gn of genres; track gn) { <mat-option [value]="gn">{{ gn }}</mat-option> }
            </mat-select></mat-form-field>

          <h3>Coordonnées</h3>
          <mat-form-field appearance="outline"><mat-label>E-mail</mat-label>
            <input matInput type="email" name="email" [(ngModel)]="u.email" required email /></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Téléphone</mat-label>
            <input matInput name="telephone" [(ngModel)]="u.telephone" pattern="[0-9]{1,10}" inputmode="numeric" /></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Ville</mat-label>
            <input matInput name="ville" [(ngModel)]="u.ville" /></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Adresse</mat-label>
            <input matInput name="adresse" [(ngModel)]="u.adresse" /></mat-form-field>

          <h3>Affectation</h3>
          <mat-form-field appearance="outline"><mat-label>Fonction</mat-label>
            <mat-select name="id_Fonction" [(ngModel)]="u.id_Fonction" [disabled]="estMoi" required>
              @for (fc of ref.fonctions; track fc.id) { <mat-option [value]="fc.id">{{ fc.nom }}</mat-option> }
            </mat-select></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Site</mat-label>
            <mat-select name="id_Site" [(ngModel)]="u.id_Site" (selectionChange)="siteChange()" [disabled]="estMoi || ref.sites.length < 2" required>
              @for (s of ref.sites; track s.id) { <mat-option [value]="s.id">{{ s.nom }}</mat-option> }
            </mat-select></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Programme</mat-label>
            <mat-select name="id_Programme" [(ngModel)]="u.id_Programme" required>
              @for (p of programmesProposes; track p.id) { <mat-option [value]="p.id">{{ p.nom }}</mat-option> }
            </mat-select></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Grille d'évaluation</mat-label>
            <mat-select name="id_EvalGrille" [(ngModel)]="u.id_EvalGrille">
              <mat-option [value]="null">Aucune</mat-option>
              @for (gr of ref.grilles; track gr.id) { <mat-option [value]="gr.id">{{ gr.nom }}</mat-option> }
            </mat-select></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Superviseur</mat-label>
            <mat-select name="id_superviseur" [(ngModel)]="u.id_superviseur" (openedChange)="rechercheSup = ''">
              <div class="rech-select">
                <input matInput placeholder="Rechercher…" [(ngModel)]="rechercheSup" name="rechSup"
                       (keydown)="$event.stopPropagation()" autocomplete="off" />
              </div>
              <mat-option [value]="null">Aucun</mat-option>
              @for (s of superviseursFiltres; track s.id) {
                <mat-option [value]="s.id">{{ s.prenom }} {{ s.nom }} ({{ s.nom_utilisateur }})</mat-option>
              }
            </mat-select>
            @if (!ref.superviseurs.length) { <mat-hint>Aucun superviseur actif sur ce site.</mat-hint> }
          </mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Statut</mat-label>
            <mat-select name="status" [(ngModel)]="u.status" [disabled]="estMoi" required>
              <mat-option value="ACTIF">Actif</mat-option>
              <mat-option value="INACTIF">Inactif</mat-option>
            </mat-select></mat-form-field>
        </form>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close [disabled]="enregistrement">Annuler</button>
      <button mat-raised-button color="primary" (click)="enregistrer()" [disabled]="!valide || enregistrement">
        Enregistrer
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .grille { display: grid; grid-template-columns: 1fr 1fr; column-gap: 12px; }
      .grille h3 { grid-column: 1 / -1; margin: 8px 0 6px; font-size: 14px; color: #ff8e36; font-weight: 600; }
      .info { display: flex; align-items: center; gap: 6px; background: #fff3e0; color: #8a4b00;
              padding: 8px 10px; border-radius: 6px; font-size: 13px; }
      .info mat-icon { font-size: 18px; width: 18px; height: 18px; }
      .rech-select { padding: 6px 12px; position: sticky; top: 0; background: #fff; z-index: 1; }
      .rech-select input { width: 100%; border: 1px solid #ddd; border-radius: 4px; padding: 6px 8px; }
    `,
  ],
})
export class ModifierCompteDialogComponent implements OnInit {
  readonly data = inject<ModifierCompteData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<ModifierCompteDialogComponent, boolean>>(MatDialogRef);
  private readonly userService = inject(UserService);

  /** Valeurs du formulaire de création ; une valeur existante différente est conservée. */
  get genres(): string[] {
    const base = ['Femme', 'Homme'];
    return this.u?.genre && !base.includes(this.u.genre) ? [...base, this.u.genre] : base;
  }
  u: any = null;
  estMoi = false;
  ref: { fonctions: any[]; sites: any[]; programmes: any[]; grilles: any[]; superviseurs: any[] } = {
    fonctions: [], sites: [], programmes: [], grilles: [], superviseurs: [],
  };
  rechercheSup = '';
  chargement = true;
  enregistrement = false;
  private programmeInitial: number | null = null;

  /** Programmes actifs + le programme actuel (même s'il est inactif). */
  get programmesProposes(): any[] {
    return this.ref.programmes.filter(p => p.Etat === 'ACTIF' || p.id === this.programmeInitial);
  }
  get superviseursFiltres(): any[] {
    return this.ref.superviseurs.filter(s => correspondRecherche(this.rechercheSup, [s.nom, s.prenom, s.nom_utilisateur]));
  }
  get valide(): boolean {
    const u = this.u;
    return !!u && !!String(u.nom || '').trim() && !!String(u.prenom || '').trim() && !!String(u.nom_utilisateur || '').trim()
      && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(u.email || '').trim())
      && (!u.telephone || /^\d{1,10}$/.test(String(u.telephone)))
      && !!u.id_Fonction && !!u.id_Site && !!u.id_Programme && !!u.status;
  }

  ngOnInit(): void {
    this.userService.getCompteEdition(this.data.id).subscribe({
      next: d => {
        this.estMoi = !!d.est_moi;
        this.u = { ...d.utilisateur, status: (d.utilisateur.status || 'ACTIF').toUpperCase() };
        this.programmeInitial = this.u.id_Programme ?? null;
        this.chargerReferentiels(true);
      },
      error: () => this.dialogRef.close(false),
    });
  }

  private chargerReferentiels(initial: boolean): void {
    this.userService.getReferentielsCompte(this.u.id_Site, this.u.id).subscribe({
      next: r => {
        if (initial) this.ref = r;
        else this.ref = { ...this.ref, superviseurs: r.superviseurs };
        // superviseur actuel absent de la liste du site (changement de site) : on le retire
        if (this.u.id_superviseur && !this.ref.superviseurs.some(s => s.id === this.u.id_superviseur)) this.u.id_superviseur = null;
        this.chargement = false;
      },
      error: () => (this.chargement = false),
    });
  }

  /** Le superviseur doit appartenir au site choisi : on recharge la liste. */
  siteChange(): void { this.chargerReferentiels(false); }

  enregistrer(): void {
    if (!this.valide) return;
    this.enregistrement = true;
    const u = this.u;
    this.userService.modifierCompte(this.data.id, {
      nom: u.nom, prenom: u.prenom, nom_utilisateur: u.nom_utilisateur, genre: u.genre, email: u.email,
      telephone: u.telephone ?? '', ville: u.ville, adresse: u.adresse, id_Fonction: u.id_Fonction, id_Site: u.id_Site,
      id_Programme: u.id_Programme, id_EvalGrille: u.id_EvalGrille ?? null, id_superviseur: u.id_superviseur ?? null,
      status: u.status,
    }).subscribe({
      next: () => this.dialogRef.close(true),
      error: () => (this.enregistrement = false),
    });
  }
}
