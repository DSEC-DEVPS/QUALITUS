import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { ToastrService } from 'ngx-toastr';
import {
  AppearanceAnimation,
  ConfirmBoxInitializer,
  DialogLayoutDisplay,
  DisappearanceAnimation,
} from '@costlydeveloper/ngx-awesome-popup';
import { SondageService } from '@shared/services/sondage.service';
import { Sondage } from '../interfaces';

import { CanDirective } from '@core/authorization/can.directive';
import { MatPaginatorModule } from '@angular/material/paginator';
import { Pagination } from '@shared/utils/pagination';
import { finalize } from 'rxjs';
import { ChargementComponent } from '@shared/components/chargement/chargement.component';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Periode } from '@shared/periode';
import { FiltrePeriodeComponent } from '../../Quiz/filtre-periode/filtre-periode.component';

/** Date sur laquelle porte le filtre de période. */
export type ChampDate = 'creation' | 'modification' | 'reponse';

@Component({
  selector: 'app-liste-sondage',
  standalone: true,
  imports: [ChargementComponent, MatPaginatorModule, CanDirective, DatePipe, FormsModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, FiltrePeriodeComponent,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTooltipModule,
    MatMenuModule,
  ],
  templateUrl: './liste-sondage.component.html',
  styleUrl: './liste-sondage.component.scss',
})
export class ListeSondageComponent implements OnInit {
  chargement = true;
  private readonly srv = inject(SondageService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastrService);

  readonly pag = new Pagination<Sondage>();
  /** Sondages renvoyés par le serveur (période et date choisie déjà appliquées). */
  private tous: Sondage[] = [];
  get sondages(): Sondage[] { return this.pag.donnees; }
  cols = ['id', 'nom', 'langue', 'statut', 'nb_questions', 'date', 'actions'];

  // --- Filtres : recherche et statut (sur la liste chargée), période côté serveur
  recherche = '';
  statut: '' | 'ENCOURS' | 'ACTIF' | 'DESACTIF' = '';
  champDate: ChampDate = 'creation';
  periode: Periode = { du: null, au: null };
  readonly champs: { v: ChampDate; l: string; col: string }[] = [
    { v: 'creation', l: 'Date de création', col: 'Créé le' },
    { v: 'modification', l: 'Dernière modification', col: 'Modifié le' },
    { v: 'reponse', l: 'Date de réponse', col: 'Dernière réponse' },
  ];
  get colDate(): string { return this.champs.find(c => c.v === this.champDate)?.col || 'Date'; }
  get filtresActifs(): boolean { return !!(this.recherche.trim() || this.statut || this.periode.du || this.periode.au); }

  ngOnInit(): void {
    this.charger();
  }

  charger() {
    this.chargement = true;
    this.srv.getAll(this.periode, this.champDate).pipe(finalize(() => (this.chargement = false))).subscribe({
      next: d => { this.tous = d || []; this.appliquer(true); },
      error: () => this.toast.error('Impossible de charger les sondages'),
    });
  }

  /** Recherche (nom) et statut, appliqués sur la liste chargée. */
  appliquer(garderPage = false): void {
    const q = this.recherche.trim().toLowerCase();
    this.pag.definir(this.tous.filter(s =>
      (!q || (s.nom || '').toLowerCase().includes(q) || String(s.id) === q) &&
      (!this.statut || (this.statut === 'ENCOURS' ? s.statut !== 'ACTIF' && s.statut !== 'DESACTIF' : s.statut === this.statut))
    ), garderPage);
  }
  changerPeriode(p: Periode): void { this.periode = p; this.charger(); }
  changerChamp(): void { if (this.periode.du || this.periode.au) this.charger(); }
  effacerFiltres(): void {
    this.recherche = ''; this.statut = '';
    const avecPeriode = !!(this.periode.du || this.periode.au);
    this.periode = { du: null, au: null };
    if (avecPeriode) this.charger(); else this.appliquer();
  }
  /** Date affichée : celle sur laquelle porte le filtre. */
  dateDe(s: Sondage): string | null | undefined {
    if (this.champDate === 'reponse') return s.derniere_reponse;
    if (this.champDate === 'modification') return s.dateModification || s.dateCreation;
    return s.dateCreation;
  }

  nouveau() {
    this.router.navigate(['/mon-espace/sondage/creer']);
  }
  editer(s: Sondage) {
    this.router.navigate(['/mon-espace/sondage/editer', s.id]);
  }
  cible(s: Sondage) {
    this.router.navigate(['/mon-espace/sondage/cible', s.id]);
  }
  rapport(s: Sondage) {
    this.router.navigate(['/mon-espace/sondage/rapport', s.id]);
  }

  statutLabel(s: Sondage): string {
    switch (s.statut) {
      case 'ACTIF':
        return 'Actif';
      case 'DESACTIF':
        return 'Désactivé';
      default:
        return 'En cours';
    }
  }

  basculerStatut(s: Sondage) {
    const nouveau = s.statut === 'ACTIF' ? 'DESACTIF' : 'ACTIF';
    this.srv.changerStatut(s.id, nouveau).subscribe({
      next: r => {
        this.toast.success(r.message);
        this.charger();
      },
      error: () => this.toast.error("Une erreur s'est produite"),
    });
  }

  dupliquer(s: Sondage) {
    this.srv.dupliquer(s.id).subscribe({
      next: r => {
        this.toast.success(r.message);
        this.charger();
      },
      error: () => this.toast.error('Duplication impossible'),
    });
  }

  supprimer(s: Sondage) {
    const box = new ConfirmBoxInitializer();
    box.setTitle('Suppression !');
    box.setMessage(`Supprimer le sondage "${s.nom}" et toutes ses questions ?`);
    box.setConfig({
      layoutType: DialogLayoutDisplay.DANGER,
      animationIn: AppearanceAnimation.BOUNCE_IN,
      animationOut: DisappearanceAnimation.BOUNCE_OUT,
      buttonPosition: 'right',
    });
    box.setButtonLabels('OUI', 'NON');
    box.openConfirmBox$().subscribe(resp => {
      if (resp.success) {
        this.srv.delete(s.id).subscribe({
          next: r => {
            this.toast.success(r.message);
            this.charger();
          },
          error: () => this.toast.error('Suppression impossible'),
        });
      }
    });
  }
}
