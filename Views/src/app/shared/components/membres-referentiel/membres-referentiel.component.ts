import { AfterViewInit, Component, Input, OnChanges, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ecrireClasseur } from '../../../routes/Quiz/export-quiz';

/** Utilisateur rattaché à un site ou un programme (pages de détail). */
export interface MembreReferentiel {
  id: number;
  nom: string | null;
  prenom: string | null;
  login: string;
  statut: string;
  dateCreation: string | null;
  fonction: string | null;
  site: string | null;
  programme: string | null;
}

const SANS = '(non renseigné)';

/**
 * Liste des utilisateurs d'un site ou d'un programme : recherche, filtres (fonction,
 * statut, et programme ou site selon la page), compteurs, tri, pagination et export
 * Excel des lignes filtrées (filtres rappelés en tête du fichier).
 */
@Component({
  selector: 'app-membres-referentiel',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatSelectModule,
    MatSortModule,
    MatTableModule,
    MatTooltipModule,
  ],
  templateUrl: './membres-referentiel.component.html',
  styleUrl: './membres-referentiel.component.scss',
})
export class MembresReferentielComponent implements OnChanges, AfterViewInit {
  @Input() membres: MembreReferentiel[] = [];
  /** Page courante : « site » (filtre par programme) ou « programme » (filtre par site). */
  @Input() contexte: 'site' | 'programme' = 'site';
  /** Nom du site / programme (en-tête et nom du fichier exporté). */
  @Input() nomReferentiel = '';

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  readonly dataSource = new MatTableDataSource<MembreReferentiel>([]);

  recherche = '';
  fonction = '';
  statut = '';
  /** Programme (page Site) ou site (page Programme). */
  axe = '';

  /** Colonne « autre référentiel » : programme sur la page Site, site sur la page Programme. */
  get cleAxe(): 'programme' | 'site' {
    return this.contexte === 'site' ? 'programme' : 'site';
  }
  get libelleAxe(): string {
    return this.contexte === 'site' ? 'Programme' : 'Site';
  }
  get colonnes(): string[] {
    return ['nom', 'prenom', 'login', 'fonction', this.cleAxe, 'statut', 'dateCreation'];
  }

  fonctions: { nom: string; nb: number }[] = [];
  valeursAxe: { nom: string; nb: number }[] = [];

  ngOnChanges(): void {
    const parCle = (cle: 'fonction' | 'site' | 'programme') => {
      const m = new Map<string, number>();
      for (const u of this.membres || []) {
        const v = u[cle] || SANS;
        m.set(v, (m.get(v) || 0) + 1);
      }
      return [...m.entries()].map(([nom, nb]) => ({ nom, nb })).sort((a, b) => b.nb - a.nb || a.nom.localeCompare(b.nom));
    };
    this.fonctions = parCle('fonction');
    this.valeursAxe = parCle(this.cleAxe);
    this.appliquer();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    this.dataSource.sortingDataAccessor = (u, col) => String((u as any)[col] ?? '').toLowerCase();
  }

  private normaliser(s: string | null | undefined): string {
    return (s || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  /** Lignes retenues par les filtres (aussi utilisées pour l'export). */
  get filtres(): MembreReferentiel[] {
    const mots = this.normaliser(this.recherche).split(/\s+/).filter(Boolean);
    return (this.membres || []).filter(u => {
      if (this.fonction && (u.fonction || SANS) !== this.fonction) return false;
      if (this.statut && this.statutDe(u) !== this.statut) return false;
      if (this.axe && (u[this.cleAxe] || SANS) !== this.axe) return false;
      if (!mots.length) return true;
      const texte = this.normaliser(`${u.nom} ${u.prenom} ${u.login}`);
      return mots.every(m => texte.includes(m));
    });
  }

  appliquer(): void {
    this.dataSource.data = this.filtres;
    this.paginator?.firstPage();
  }

  statutDe(u: MembreReferentiel): 'ACTIF' | 'INACTIF' {
    return (u.statut || 'ACTIF').toUpperCase() === 'ACTIF' ? 'ACTIF' : 'INACTIF';
  }

  get nbActifs(): number {
    return (this.membres || []).filter(u => this.statutDe(u) === 'ACTIF').length;
  }

  get filtresActifs(): boolean {
    return !!(this.recherche.trim() || this.fonction || this.statut || this.axe);
  }

  reinitialiser(): void {
    this.recherche = '';
    this.fonction = '';
    this.statut = '';
    this.axe = '';
    this.appliquer();
  }

  /** Clic sur une fonction de la synthèse : filtre (ou retire le filtre). */
  basculerFonction(nom: string): void {
    this.fonction = this.fonction === nom ? '' : nom;
    this.appliquer();
  }

  libelleStatut(u: MembreReferentiel): string {
    return this.statutDe(u) === 'ACTIF' ? 'Actif' : 'Inactif';
  }

  /** Export Excel des lignes filtrées, filtres rappelés en tête. */
  exporter(): void {
    const lignes = this.dataSource.sortData(this.filtres.slice(), this.sort).map(u => ({
      Nom: u.nom || '',
      Prénom: u.prenom || '',
      Login: u.login,
      Fonction: u.fonction || '',
      [this.libelleAxe]: u[this.cleAxe] || '',
      Statut: this.libelleStatut(u),
      'Créé le': u.dateCreation || '',
    }));
    const filtres = [
      this.recherche.trim() ? `Recherche : « ${this.recherche.trim()} »` : '',
      this.fonction ? `Fonction : ${this.fonction}` : '',
      this.axe ? `${this.libelleAxe} : ${this.axe}` : '',
      this.statut ? `Statut : ${this.statut === 'ACTIF' ? 'Actifs' : 'Inactifs'}` : '',
    ].filter(Boolean);
    const entete = [
      `${this.contexte === 'site' ? 'Site' : 'Programme'} : ${this.nomReferentiel}`,
      `Filtres : ${filtres.length ? filtres.join(' ; ') : 'aucun'}`,
      `${lignes.length} utilisateur${lignes.length > 1 ? 's' : ''} sur ${this.membres.length} · export du ${new Date().toLocaleString('fr-FR')}`,
    ];
    const nomFichier = `Utilisateurs_${this.contexte}_${(this.nomReferentiel || '').replace(/[^\p{L}\p{N}]+/gu, '_')}.xlsx`;
    ecrireClasseur(nomFichier, [{ nom: 'Utilisateurs', entete, lignes }]);
  }
}
