import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { ToastrService } from 'ngx-toastr';
import { ConfirmationService } from '@shared/services/confirmation.service';
import { correspondRecherche } from '@shared/utils/recherche';
import { ActionSuivi, EvalSuitesService, RE_STATUT_CLOS, UtilisateurAssignable } from '../eval-suites.service';

/**
 * Mettre à jour une action depuis le suivi (out107) : une fois créée, une action ne
 * change plus que par son statut et sa synthèse (porteur, ou qui coache l'évaluation).
 * Une ancienne action sans porteur peut en recevoir un (une seule fois). Clore
 * l'action (Réalisé, Abandonné…) demande une synthèse et une confirmation : elle est
 * ensuite figée. Seuls les champs changés sont envoyés.
 */
@Component({
  selector: 'app-modifier-action-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatIconModule],
  template: `
    <h2 class="dlg-titre">Mettre à jour l'action</h2>
    <mat-dialog-content class="modif">
      <div class="fiche">
        <div class="action">{{ a.action }}</div>
        <dl>
          <dt>Agent</dt><dd>{{ a.agent_nom }} {{ a.agent_prenom }} · appel du {{ a.date_appel | date: 'dd/MM/yyyy' }}</dd>
          <dt>Porteur</dt><dd>{{ a.porteur_nom ? a.porteur_nom + ' ' + (a.porteur_prenom || '') : 'Non attribué' }}</dd>
          <dt>Contributeurs</dt><dd>{{ a.contributeurs || '—' }}</dd>
          <dt>Échéance</dt><dd>{{ a.date_attendue ? (a.date_attendue | date: 'dd/MM/yyyy') : '—' }}@if (a.date_debut) { · début le {{ a.date_debut | date: 'dd/MM/yyyy' }} }</dd>
          @if (a.kpi) { <dt>KPI</dt><dd>{{ a.kpi }}</dd> }
          @if (a.commentaire) { <dt>Commentaire</dt><dd>{{ a.commentaire }}</dd> }
        </dl>
        <p class="regle"><mat-icon>info</mat-icon> Une fois créée, seuls le statut et la synthèse se mettent à jour.</p>
      </div>

      @if (a.peut_attribuer_porteur) {
        <mat-form-field appearance="outline" class="plein">
          <mat-label>Attribuer un porteur</mat-label>
          <mat-select [(ngModel)]="idPorteur" name="porteur" (openedChange)="rech = ''">
            <div class="recherche-select" (click)="$event.stopPropagation()">
              <mat-icon>search</mat-icon><input [(ngModel)]="rech" name="rech" placeholder="Rechercher…" (keydown)="$event.stopPropagation()" autocomplete="off" />
            </div>
            @for (u of filtres(); track u.id) {
              <mat-option [value]="u.id">{{ u.nom }} {{ u.prenom }}@if (u.site) { <span class="site-opt"> · {{ u.site }}</span> }</mat-option>
            }
          </mat-select>
          <mat-hint>Cette action n'a pas de porteur : il ne pourra plus être changé ensuite.</mat-hint>
        </mat-form-field>
      }
      <mat-form-field appearance="outline" class="plein">
        <mat-label>Statut</mat-label>
        <mat-select [(ngModel)]="idStatut" name="statut">
          @for (s of statuts; track s.id) { <mat-option [value]="s.id">{{ s.libelle }}@if (clot(s.id)) { <span class="site-opt"> · clôt l'action</span> }</mat-option> }
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline" class="plein">
        <mat-label>Synthèse</mat-label>
        <textarea matInput rows="4" [(ngModel)]="synthese" name="syn"></textarea>
        @if (clot(idStatut) && !cle(synthese)) { <mat-hint class="alerte">La synthèse est obligatoire pour clore l'action.</mat-hint> }
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Annuler</button>
      <button mat-flat-button color="primary" [disabled]="enCours || (clot(idStatut) && !cle(synthese))" (click)="enregistrer()">
        <mat-icon>{{ clot(idStatut) && idStatut !== a.id_statut ? 'lock' : 'save' }}</mat-icon>
        {{ clot(idStatut) && idStatut !== a.id_statut ? 'Enregistrer et clore' : 'Enregistrer' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .modif { min-width: 560px; padding-top: 6px !important; }
    .plein { width: 100%; }
    .fiche { padding: 12px 14px; margin-bottom: 14px; border-radius: 10px; background: var(--qx-surface-2, #f6f4f1); }
    .action { font-weight: 700; margin-bottom: 8px; color: var(--qx-texte, #2b2b2b); white-space: pre-line; }
    dl { display: grid; grid-template-columns: max-content 1fr; gap: 4px 14px; margin: 0; font-size: 13px; }
    dt { color: var(--qx-texte-2, #777); }
    dd { margin: 0; color: var(--qx-texte, #2b2b2b); }
    .regle { display: flex; align-items: center; gap: 6px; margin: 10px 0 0; font-size: 12.5px; color: var(--qx-texte-2, #666); }
    .regle mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .alerte { color: #b26a00; }
    .recherche-select { position: sticky; top: 0; z-index: 1; display: flex; align-items: center; gap: 8px; padding: 8px 16px;
      background: var(--mat-select-panel-background-color, #fff); border-bottom: 1px solid var(--qx-bordure, rgba(0, 0, 0, .12)); }
    .recherche-select input { flex: 1; border: none; outline: none; font: inherit; background: transparent; color: inherit; padding: 4px 0; }
    @media (max-width: 640px) { .modif { min-width: 0; } }
  `,
})
export class ModifierActionDialogComponent implements OnInit {
  readonly a = inject<ActionSuivi>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<ModifierActionDialogComponent, boolean>);
  private readonly service = inject(EvalSuitesService);
  private readonly toastr = inject(ToastrService);
  private readonly confirmation = inject(ConfirmationService);

  statuts: { id: number; libelle: string }[] = [];
  users: UtilisateurAssignable[] = [];
  rech = '';
  enCours = false;
  idStatut: number | null = this.a.id_statut;
  synthese = this.a.synthese || '';
  idPorteur: number | null = null;

  ngOnInit(): void {
    this.service.getStatuts().subscribe({ next: s => (this.statuts = s || []) });
    if (this.a.peut_attribuer_porteur) this.service.getUtilisateurs().subscribe({ next: u => (this.users = u || []) });
  }

  filtres(): UtilisateurAssignable[] {
    return this.users.filter(u => u.id === this.idPorteur || correspondRecherche(this.rech, [u.nom, u.prenom, u.login, u.site]));
  }
  cle(v: any): string { return String(v ?? '').replace(/\s+/g, ' ').trim(); }
  clot(id: number | null): boolean { return RE_STATUT_CLOS.test((this.statuts.find(s => s.id === id)?.libelle || '').trim()); }

  async enregistrer(): Promise<void> {
    const c: Record<string, any> = {};
    if (this.cle(this.a.synthese) && !this.cle(this.synthese)) {
      this.toastr.warning('La synthèse ne peut pas être vide.');
      this.synthese = this.a.synthese || '';
      return;
    }
    if (this.cle(this.synthese) !== this.cle(this.a.synthese)) c['synthese'] = this.synthese;
    if ((this.idStatut ?? null) !== (this.a.id_statut ?? null)) c['id_statut'] = this.idStatut;
    if (this.a.peut_attribuer_porteur && this.idPorteur) c['id_porteur'] = this.idPorteur;
    if (!Object.keys(c).length) { this.toastr.info('Aucune modification.'); this.ref.close(false); return; }
    if (c['id_statut'] !== undefined && this.clot(this.idStatut)) {
      const ok = await this.confirmation.confirmer({
        titre: 'Clore l\'action', type: 'attention', oui: 'Clore',
        message: 'Une fois close, l\'action ne pourra plus être modifiée ni supprimée. Continuer ?',
      });
      if (!ok) return;
    }
    this.enCours = true;
    this.service.updateLigne(this.a.id, c).subscribe({
      next: (r: any) => { this.toastr.success(r?.inchange ? 'Aucune modification.' : 'Action mise à jour.'); this.ref.close(!r?.inchange); },
      error: err => { this.enCours = false; this.toastr.error(err?.error?.message || 'Erreur.'); },
    });
  }
}
