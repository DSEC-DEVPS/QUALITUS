import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTooltipModule } from '@angular/material/tooltip';
import { finalize, switchMap, take } from 'rxjs';
import * as XLSX from 'xlsx';
import { agent_by_superviseur, AuthService } from '@core';
import { UserService } from '@shared/services/user.service';
import { ChargementComponent } from '@shared/components/chargement/chargement.component';

type FiltreStatut = 'ACTIF' | 'INACTIF' | '';

/** Couleurs des pastilles d'initiales (une couleur stable par agent). */
const COULEURS = ['#ff8e36', '#3f7fd8', '#2e9e6b', '#8e5cd6', '#d8513f', '#1f9bb3', '#c2871a', '#5c6bc0'];

@Component({
  selector: 'app-liste-mes-agents',
  standalone: true,
  imports: [
    ChargementComponent, FormsModule, MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatPaginatorModule, MatTooltipModule,
  ],
  templateUrl: './liste-mes-agents.component.html',
  styleUrl: './liste-mes-agents.component.scss',
})
export class ListeMesAgentsComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);

  chargement = true;
  erreur = '';
  agents: agent_by_superviseur[] = [];
  filtres: agent_by_superviseur[] = [];
  page: agent_by_superviseur[] = [];

  recherche = '';
  statut: FiltreStatut = 'ACTIF';
  pageIndex = 0;
  pageSize = 12;

  ngOnInit(): void {
    this.auth.user().pipe(
      take(1),
      switchMap(u => this.userService.getAllAgentBySuperviseur(u.id || 0)),
      finalize(() => (this.chargement = false)),
    ).subscribe({
      next: liste => {
        this.agents = liste || [];
        this.appliquer();
      },
      error: e => (this.erreur = e?.error?.message || 'Impossible de charger vos agents.'),
    });
  }

  get nbActifs(): number { return this.agents.filter(a => this.estActif(a)).length; }
  get nbInactifs(): number { return this.agents.length - this.nbActifs; }

  estActif(a: agent_by_superviseur): boolean {
    return (a.status || '').toUpperCase() === 'ACTIF';
  }

  nomComplet(a: agent_by_superviseur): string {
    return [a.prenom, a.nom].filter(Boolean).join(' ') || a.nom_utilisateur || 'Sans nom';
  }

  initiales(a: agent_by_superviseur): string {
    const i = (s?: string | null) => (s || '').trim().charAt(0).toUpperCase();
    return (i(a.prenom) + i(a.nom)) || i(a.nom_utilisateur) || '?';
  }

  couleur(a: agent_by_superviseur): string {
    return COULEURS[Math.abs(a.id || 0) % COULEURS.length];
  }

  appliquer(revenirDebut = true): void {
    const q = this.normaliser(this.recherche);
    this.filtres = this.agents.filter(a => {
      if (this.statut === 'ACTIF' && !this.estActif(a)) return false;
      if (this.statut === 'INACTIF' && this.estActif(a)) return false;
      if (!q) return true;
      return [a.nom, a.prenom, a.nom_utilisateur, a.email, a.Fonction, a.Site, a.Programme]
        .some(v => this.normaliser(v).includes(q));
    });
    if (revenirDebut) this.pageIndex = 0;
    this.decouper();
  }

  changerPage(e: PageEvent): void {
    this.pageIndex = e.pageIndex;
    this.pageSize = e.pageSize;
    this.decouper();
  }

  effacerRecherche(): void {
    this.recherche = '';
    this.appliquer();
  }

  ouvrir(a: agent_by_superviseur): void {
    this.router.navigateByUrl(`mon-espace/mes-agents/details-agent/${a.id}`);
  }

  /** Export Excel de la liste affichée (recherche et statut appliqués). */
  exporter(): void {
    const lignes = this.filtres.map(a => ({
      Login: a.nom_utilisateur || '',
      Nom: a.nom || '',
      'Prénom': a.prenom || '',
      'E-mail': a.email || '',
      'Téléphone': a.telephone || '',
      Fonction: a.Fonction || '',
      Site: a.Site || '',
      Programme: a.Programme || '',
      Statut: this.estActif(a) ? 'Actif' : 'Inactif',
    }));
    const ws = XLSX.utils.json_to_sheet(lignes);
    ws['!cols'] = [16, 18, 18, 28, 14, 20, 18, 18, 10].map(wch => ({ wch }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Mes agents');
    XLSX.writeFile(wb, 'Mes_agents.xlsx');
  }

  private decouper(): void {
    const max = Math.max(0, Math.ceil(this.filtres.length / this.pageSize) - 1);
    if (this.pageIndex > max) this.pageIndex = max;
    const debut = this.pageIndex * this.pageSize;
    this.page = this.filtres.slice(debut, debut + this.pageSize);
  }

  private normaliser(v?: string | null): string {
    return (v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  }
}
