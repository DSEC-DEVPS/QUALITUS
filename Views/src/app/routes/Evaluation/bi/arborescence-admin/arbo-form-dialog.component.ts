import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { ToastrService } from 'ngx-toastr';
import { Observable } from 'rxjs';
import { Arborescence, EvalBiService } from '../../eval-bi.service';

export interface DonneesFormArbo {
  arbo: Arborescence | null;
  grilles: { id: number; nom: string }[];
  sites: { id: number; nom: string }[];
}

/**
 * Création / modification d'une arborescence. En modification, grille et site ne
 * sont modifiables que tant que l'arborescence n'a aucune option.
 */
@Component({
  selector: 'app-arbo-form-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatIconModule],
  template: `
    <h2 class="dlg-titre">{{ d.arbo ? 'Modifier l\\'arborescence' : 'Nouvelle arborescence' }}</h2>
    <mat-dialog-content class="form-arbo">
      <mat-form-field appearance="outline">
        <mat-label>Grille</mat-label>
        <mat-select [(ngModel)]="idGrille" name="g" [disabled]="verrou">
          @for (g of d.grilles; track g.id) { <mat-option [value]="g.id">{{ g.nom }}</mat-option> }
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Site</mat-label>
        <mat-select [(ngModel)]="idSite" name="s" [disabled]="verrou">
          @for (s of d.sites; track s.id) { <mat-option [value]="s.id">{{ s.nom }}</mat-option> }
        </mat-select>
      </mat-form-field>
      @if (verrou) {
        <p class="info"><mat-icon>lock</mat-icon> Cette arborescence a déjà des options : seul le point de départ est modifiable.</p>
      }
      <mat-form-field appearance="outline">
        <mat-label>Point de départ</mat-label>
        <input matInput [(ngModel)]="point" name="pd" maxlength="200" />
        <mat-hint>Question de départ de l'analyse (niveau 0).</mat-hint>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Annuler</button>
      <button mat-flat-button color="primary" [disabled]="enCours || !idGrille || !idSite || !point.trim()" (click)="enregistrer()">
        <mat-icon>{{ d.arbo ? 'save' : 'add' }}</mat-icon> {{ d.arbo ? 'Enregistrer' : 'Créer' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .form-arbo { display: flex; flex-direction: column; gap: 4px; padding-top: 8px !important; }
    .form-arbo mat-form-field { width: 100%; }
    .info { display: flex; align-items: center; gap: 6px; margin: -6px 0 10px; font-size: 13px; color: var(--qx-texte-2, #666); }
    .info mat-icon { font-size: 18px; width: 18px; height: 18px; }
  `,
})
export class ArboFormDialogComponent {
  readonly d = inject<DonneesFormArbo>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<ArboFormDialogComponent, boolean>);
  private readonly service = inject(EvalBiService);
  private readonly toastr = inject(ToastrService);
  idGrille: number | null = this.d.arbo?.id_grille ?? null;
  idSite: number | null = this.d.arbo?.id_site ?? null;
  point = this.d.arbo?.point_depart_libelle ?? '';
  readonly verrou = !!this.d.arbo && !this.d.arbo.couple_modifiable;
  enCours = false;

  enregistrer(): void {
    const body = { id_grille: this.idGrille!, id_site: this.idSite!, point_depart_libelle: this.point.trim() };
    this.enCours = true;
    const req: Observable<any> = this.d.arbo ? this.service.updateArborescence(this.d.arbo.id, body) : this.service.addArborescence(body);
    req.subscribe({
      next: (r: any) => {
        this.toastr.success(r?.inchange ? 'Aucune modification.' : this.d.arbo ? 'Arborescence modifiée.' : 'Arborescence créée.');
        this.ref.close(!r?.inchange);
      },
      error: (err: any) => { this.enCours = false; this.toastr.error(err?.error?.message || 'Erreur.'); },
    });
  }
}
