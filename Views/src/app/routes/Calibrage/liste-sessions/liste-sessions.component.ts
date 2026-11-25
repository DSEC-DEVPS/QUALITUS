import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { ToastrService } from 'ngx-toastr';
import { UserService } from '@shared/services/user.service';
import { CanDirective } from '@core/authorization/can.directive';
import { PermissionsService } from '@core/authorization/permissions.service';
import { CalibrageService, CalSessionListe, FiltresSession } from '../calibrage.service';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { PaginationServeur } from '@shared/utils/pagination-serveur';
import { ChargementComponent } from '@shared/components/chargement/chargement.component';
import { correspondRecherche } from '@shared/utils/recherche';

@Component({
  selector: 'app-cal-liste-sessions',
  standalone: true,
  imports: [ChargementComponent, MatPaginatorModule,
    CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatDatepickerModule,
    MatTableModule, MatTooltipModule, MatChipsModule, CanDirective,
  ],
  templateUrl: './liste-sessions.component.html',
  styleUrl: './liste-sessions.component.scss',
})
export class ListeSessionsComponent implements OnInit, OnDestroy {
  private readonly service = inject(CalibrageService);
  private readonly userService = inject(UserService);
  private readonly toastr = inject(ToastrService);
  private readonly router = inject(Router);
  private readonly perms = inject(PermissionsService);

  // Organisateur (jauge) : accès aux filtres Site/Statut ; sinon (participant),
  // seul le filtre par période est proposé.
  get peutOrganiser(): boolean { return this.perms.can('calibrage.organiser'); }

  /** Par défaut, l'organisateur voit les sessions non figées (le participant : toutes). */
  filtres: FiltresSession = {};
  /** Pagination côté serveur (out113) : seule la page affichée est chargée. */
  readonly pag = new PaginationServeur<CalSessionListe>();
  get sessions(): CalSessionListe[] { return this.pag.page; }
  /** Une recherche est en cours (message « aucune session ne correspond »). */
  get avecRecherche(): boolean { return !!this.recherche.trim(); }
  recherche = '';
  sites: any[] = [];
  chargement = false;
  colonnes = ['nom', 'date', 'site', 'grille', 'statut', 'participants', 'actions'];
  private minuterie: any = null;
  private requete = 0;

  statuts = [
    { v: 'BROUILLON', l: 'Brouillon' },
    { v: 'OUVERTE', l: 'Ouverte' },
    { v: 'RESULTATS_EN_REVISION', l: 'Résultats en révision' },
    { v: 'VALIDEE', l: 'Validée' },
    { v: 'CLOTUREE', l: 'Figée' },
  ];

  ngOnInit(): void {
    this.userService.getAllSite().subscribe({ next: s => (this.sites = s || []), error: () => {} });
    this.filtres = this.filtresParDefaut();
    this.charger();
  }
  ngOnDestroy(): void { clearTimeout(this.minuterie); }

  private filtresParDefaut(): FiltresSession { return this.peutOrganiser ? { statut: 'NON_FIGEE' } : {}; }

  /** Bouton « Appliquer » : première page. */
  appliquer(): void { clearTimeout(this.minuterie); this.pag.premiere(); this.charger(); }

  charger(): void {
    this.chargement = true;
    const n = ++this.requete;
    this.service.getSessionsPage(this.filtres, this.recherche.trim(), this.pag.params()).subscribe({
      next: r => {
        if (n !== this.requete) return;
        this.pag.recevoir(r);
        if (this.pag.pageVideApresRetrait) { this.pag.pageIndex--; this.charger(); return; }
        this.chargement = false;
      },
      error: () => { if (n !== this.requete) return; this.toastr.error('Impossible de charger les sessions.'); this.chargement = false; },
    });
  }

  /** Recherche (nom, grille, site, statut, jauge) : envoyée au serveur après une courte pause de frappe. */
  filtrer(): void {
    clearTimeout(this.minuterie);
    this.minuterie = setTimeout(() => this.appliquer(), 300);
  }

  changerPage(e: PageEvent): void { this.pag.changer(e); this.charger(); }

  reinitialiser(): void { this.filtres = this.filtresParDefaut(); this.recherche = ''; this.appliquer(); }

  libelleStatut(v: string): string { return this.statuts.find(s => s.v === v)?.l || v; }

  creer(): void { this.router.navigate(['/mon-espace/calibrage/creer']); }
  ouvrirSession(s: CalSessionListe): void {
    // Brouillon -> préparation (jauge) ; Clôturée -> résultats (jauge ET participants) ;
    // sinon -> écran de session (participant/jauge)
    let cible: string;
    if (s.statut === 'BROUILLON') cible = 'preparer';
    else if (s.statut === 'CLOTUREE' || s.statut === 'VALIDEE') cible = 'resultats';
    else cible = 'session';
    this.router.navigate(['/mon-espace/calibrage', cible, s.id]);
  }
  voirResultats(s: CalSessionListe, ev: Event): void {
    ev.stopPropagation();
    this.router.navigate(['/mon-espace/calibrage/resultats', s.id]);
  }
}
