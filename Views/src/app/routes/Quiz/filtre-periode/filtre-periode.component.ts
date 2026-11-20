import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { toYMD } from '@shared/date-utils';
import { Periode } from '@shared/periode';


/**
 * Champs « Du » / « Au » réutilisés par les sous-menus Quiz
 * (Liste, Rapports, Mes scores, Retests). Émet la période à chaque changement
 * valide ; une période inversée (Du > Au) est signalée et n'est pas émise.
 */
@Component({
  selector: 'app-filtre-periode',
  standalone: true,
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
  ],
  template: `
    <div class="filtre-periode">
      <mat-form-field appearance="outline" class="champ-date" subscriptSizing="dynamic">
        <mat-label>Du</mat-label>
        <input matInput [matDatepicker]="pDu" [(ngModel)]="du" (dateChange)="changer()"
               (input)="changerSaisie()" name="periode_du" placeholder="AAAA-MM-JJ" autocomplete="off" />
        <mat-datepicker-toggle matSuffix [for]="pDu"></mat-datepicker-toggle>
        <mat-datepicker #pDu></mat-datepicker>
      </mat-form-field>
      <mat-form-field appearance="outline" class="champ-date" subscriptSizing="dynamic">
        <mat-label>Au</mat-label>
        <input matInput [matDatepicker]="pAu" [(ngModel)]="au" (dateChange)="changer()"
               (input)="changerSaisie()" name="periode_au" placeholder="AAAA-MM-JJ" autocomplete="off" />
        <mat-datepicker-toggle matSuffix [for]="pAu"></mat-datepicker-toggle>
        <mat-datepicker #pAu></mat-datepicker>
      </mat-form-field>
      @if (du || au) {
        <button mat-icon-button type="button" (click)="effacer()" matTooltip="Effacer la période">
          <mat-icon>close</mat-icon>
        </button>
      }
      @if (erreur) {
        <span class="erreur-periode">{{ erreur }}</span>
      }
    </div>
  `,
  styles: [
    `
      .filtre-periode { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
      .champ-date { width: 160px; }
      .erreur-periode { color: #c62828; font-size: 12px; }
    `,
  ],
})
export class FiltrePeriodeComponent {
  @Input() set valeur(v: Periode | null) {
    this.du = v?.du ?? null;
    this.au = v?.au ?? null;
  }
  @Output() periodeChange = new EventEmitter<Periode>();

  du: any = null;
  au: any = null;
  erreur = '';
  private dernier = '';

  /** Saisie clavier : on n'émet que lorsque le champ est vidé (sinon dateChange). */
  changerSaisie() {
    setTimeout(() => {
      if (!this.du || !this.au) this.changer();
    });
  }

  changer() {
    const p: Periode = { du: toYMD(this.du), au: toYMD(this.au) };
    if (p.du && p.au && p.du > p.au) {
      this.erreur = 'La date « Du » doit précéder la date « Au ».';
      return;
    }
    this.erreur = '';
    const cle = `${p.du}|${p.au}`;
    if (cle === this.dernier) return;
    this.dernier = cle;
    this.periodeChange.emit(p);
  }

  effacer() {
    this.du = null;
    this.au = null;
    this.changer();
  }
}
