import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
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
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import * as XLSX from 'xlsx';
import {
  HabilitationService, UtilisateurSpecial, Role, Permission, Derogation, FiltresSpeciaux, PageSpeciaux,
} from '../habilitation.service';
import { libelleModule, libellePermission } from '../libelles-habilitations';
import { ChargementComponent } from '@shared/components/chargement/chargement.component';
import { ConfirmationService } from '@shared/services/confirmation.service';

/**
 * Utilisateurs spéciaux : personnes dont les droits diffèrent de leur rôle
 * (au moins une dérogation). Détail dépliable, compteurs, filtres (site, rôle,
 * type, module, permission), actions directes et export Excel.
 */
@Component({
  selector: 'app-utilisateurs-speciaux',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatPaginatorModule, MatTooltipModule, ChargementComponent,
  ],
  templateUrl: './utilisateurs-speciaux.component.html',
  styleUrl: './utilisateurs-speciaux.component.scss',
})
export class UtilisateursSpeciauxComponent implements OnInit {
  private readonly service = inject(HabilitationService);
  private readonly router = inject(Router);
  private readonly toastr = inject(ToastrService);
  private readonly confirmation = inject(ConfirmationService);

  items: UtilisateurSpecial[] = [];
  compteurs: PageSpeciaux['compteurs'] = { utilisateurs: 0, plus: 0, moins: 0, expirees: 0 };
  roles: Role[] = [];
  sites: { id: number; nom: string }[] = [];
  permissions: Permission[] = [];
  modulesListe: { code: string; libelle: string }[] = [];
  total = 0;
  page = 0;      // 0-based (mat-paginator)
  taille = 10;
  chargement = false;
  ouverts = new Set<number>();

  // Filtres
  q = '';
  role: string | null = null;
  site: number | null = null;
  type: 'plus' | 'moins' | 'expirees' | null = null;
  module: string | null = null;
  permission: string | null = null;

  readonly libelleModule = libelleModule;
  readonly libellePermission = libellePermission;
  private readonly recherche$ = new Subject<string>();

  ngOnInit(): void {
    this.service.getRoles().subscribe({ next: r => (this.roles = r || []), error: () => {} });
    this.service.getSites().subscribe({ next: s => (this.sites = s || []), error: () => {} });
    this.service.getPermissions().subscribe({
      next: p => {
        this.permissions = (p || []).filter(x => !x.etat || x.etat === 'ACTIF');
        const mods = Array.from(new Set(this.permissions.map(x => x.module)));
        this.modulesListe = mods.map(code => ({ code, libelle: libelleModule(code) })).sort((a, b) => a.libelle.localeCompare(b.libelle, 'fr'));
      },
      error: () => {},
    });
    this.recherche$.pipe(debounceTime(250), distinctUntilChanged()).subscribe(() => this.recharger(0));
    this.recharger(0);
  }

  /** Permissions proposées dans le filtre (restreintes au module choisi). */
  get permissionsFiltre(): Permission[] {
    return this.permissions
      .filter(p => !this.module || p.module === this.module)
      .sort((a, b) => (libelleModule(a.module) + libellePermission(a)).localeCompare(libelleModule(b.module) + libellePermission(b), 'fr'));
  }
  get filtresActifs(): boolean {
    return !!(this.q || this.role || this.site || this.type || this.module || this.permission);
  }

  rechercheChange(): void { this.recherche$.next(this.q); }
  moduleChange(): void {
    if (this.permission && !this.permissionsFiltre.some(p => p.code === this.permission)) this.permission = null;
    this.recharger(0);
  }
  reinitialiser(): void {
    this.q = ''; this.role = null; this.site = null; this.type = null; this.module = null; this.permission = null;
    this.recharger(0);
  }

  private filtres(): FiltresSpeciaux {
    return {
      q: this.q || undefined, role: this.role || undefined, site: this.site || undefined, type: this.type || undefined,
      module: this.module || undefined, permission: this.permission || undefined,
    };
  }

  recharger(pageIndex = this.page): void {
    this.page = pageIndex;
    this.chargement = true;
    this.service.getUtilisateursSpeciaux({ ...this.filtres(), page: this.page + 1, taille: this.taille }).subscribe({
      next: r => {
        this.items = r.items;
        this.total = r.total;
        this.compteurs = r.compteurs || this.compteurs;
        this.chargement = false;
      },
      error: () => { this.toastr.error('Erreur de chargement.'); this.chargement = false; },
    });
  }

  onPage(e: PageEvent): void { this.taille = e.pageSize; this.recharger(e.pageIndex); }

  basculer(u: UtilisateurSpecial): void {
    if (this.ouverts.has(u.id)) this.ouverts.delete(u.id); else this.ouverts.add(u.id);
  }
  toutDeplier(): void { this.items.forEach(u => this.ouverts.add(u.id)); }
  toutReplier(): void { this.ouverts.clear(); }

  ouvrir(u: UtilisateurSpecial): void {
    this.router.navigate(['/mon-espace/habilitations/droits-utilisateur'], { queryParams: { id: u.id } });
  }

  formatDate(iso: string | null): string {
    if (!iso) return '';
    const d = iso.length === 10 ? new Date(iso + 'T00:00:00') : new Date(iso);
    const p = (n: number) => String(n).padStart(2, '0');
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
  }

  async retirer(u: UtilisateurSpecial, d: Derogation): Promise<void> {
    if (!(await this.confirmation.confirmer({
      titre: 'Retirer la dérogation',
      message: `Retirer « ${libellePermission(d)} » (${d.sens === 'GRANT' ? 'en plus' : 'en moins'}) pour ${u.prenom} ${u.nom} ? La personne suivra de nouveau son rôle pour cette permission.`,
      type: 'attention',
      oui: 'Retirer',
    }))) return;
    this.service.setDroit(u.id, d.id_permission, 'NONE').subscribe({
      next: () => { this.toastr.success('Dérogation retirée.'); this.recharger(); },
      error: () => this.toastr.error('Opération impossible.'),
    });
  }

  async remettreAuRole(u: UtilisateurSpecial): Promise<void> {
    const n = u.derogations?.length || 0;
    if (!(await this.confirmation.confirmer({
      titre: 'Remettre au rôle',
      message: `Supprimer les ${n} dérogation(s) de ${u.prenom} ${u.nom} ? Il retrouvera exactement les droits de son rôle.`,
      type: 'danger',
      oui: 'Remettre au rôle',
    }))) return;
    this.service.resetDroits(u.id).subscribe({
      next: x => { this.toastr.success(`${x?.supprimees ?? 0} dérogation(s) supprimée(s).`); this.recharger(); },
      error: () => this.toastr.error('Opération impossible.'),
    });
  }

  /** Export Excel de la liste filtrée : une ligne par dérogation. */
  exporter(): void {
    this.service.getUtilisateursSpeciaux({ ...this.filtres(), export: true }).subscribe({
      next: r => {
        const lignes: Record<string, string>[] = [];
        for (const u of r.items) {
          for (const d of u.derogations || []) {
            lignes.push({
              Nom: u.nom || '', Prénom: u.prenom || '', Identifiant: u.nom_utilisateur || '',
              Rôle: u.fonction || u.role || '', Site: u.site || '',
              Module: libelleModule(d.module), Permission: libellePermission(d), Code: d.code,
              Type: d.sens === 'GRANT' ? 'En plus' : 'En moins', Statut: d.expiree ? 'Expirée' : 'Active',
              Motif: d.motif || '', "Jusqu'au": this.formatDate(d.date_fin), 'Accordée par': d.auteur || '',
              Le: this.formatDate(d.date_maj),
            });
          }
        }
        if (!lignes.length) { this.toastr.info('Rien à exporter avec ces filtres.'); return; }
        const ws = XLSX.utils.json_to_sheet(lignes);
        ws['!cols'] = [14, 14, 16, 22, 18, 20, 36, 26, 10, 10, 34, 12, 20, 12].map(w => ({ wch: w }));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Dérogations');
        const d = new Date();
        const p = (n: number) => String(n).padStart(2, '0');
        XLSX.writeFile(wb, `utilisateurs_speciaux_${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}.xlsx`);
        this.toastr.success(`${lignes.length} dérogation(s) exportée(s).`);
      },
      error: () => this.toastr.error('Export impossible.'),
    });
  }

  trackUser = (_: number, u: UtilisateurSpecial) => u.id;
  trackDer = (_: number, d: Derogation) => d.id_permission;
}
