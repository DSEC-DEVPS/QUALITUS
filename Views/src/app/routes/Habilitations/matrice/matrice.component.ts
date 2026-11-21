import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ToastrService } from 'ngx-toastr';
import { HabilitationService, Matrice, Observation, Permission } from '../habilitation.service';
import { libelleModule, libellePermission } from '../libelles-habilitations';
import { ChargementComponent } from '@shared/components/chargement/chargement.component';

type RoleM = Matrice['roles'][number];
interface GroupeModule { module: string; libelle: string; permissions: Permission[]; }
type EtatCase = 'enregistrement' | 'ok' | 'erreur';

/**
 * Matrice des droits (rôle × permission).
 * - en-têtes figés (rôles en haut, permissions à gauche) et repère croisé au survol ;
 * - modules repliables, compteur et case à trois états par rôle (tout cocher / décocher) ;
 * - recherche, choix des rôles affichés, « seulement les lignes où les rôles diffèrent » ;
 * - vue « Par rôle » : un rôle, une colonne d'interrupteurs ;
 * - chaque changement est enregistré tout de suite, avec confirmation ou retour arrière.
 */
@Component({
  selector: 'app-matrice-droits',
  standalone: true,
  imports: [ChargementComponent,
    CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule,
    MatCheckboxModule, MatButtonToggleModule, MatTooltipModule, MatTabsModule, MatTableModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatSlideToggleModule,
  ],
  templateUrl: './matrice.component.html',
  styleUrl: './matrice.component.scss',
})
export class MatriceComponent implements OnInit {
  private readonly service = inject(HabilitationService);
  private readonly toastr = inject(ToastrService);

  matrice: Matrice | null = null;
  modules: GroupeModule[] = [];
  mode = 'OBSERVATION';
  observations: Observation[] = [];
  chargement = true;

  // Présentation
  vue: 'matrice' | 'role' = 'matrice';
  recherche = '';
  rolesAffiches: number[] = [];
  seulementDifferences = false;
  replies = new Set<string>();
  roleVue: number | null = null;

  // Repère croisé et retour visuel des enregistrements
  survolPerm: number | null = null;
  survolRole: number | null = null;
  private readonly etats = new Map<string, EtatCase>();

  readonly libelleModule = libelleModule;
  readonly libellePermission = libellePermission;

  ngOnInit(): void { this.charger(); }

  charger(): void {
    this.chargement = true;
    this.service.getMatrice().subscribe({
      next: m => {
        this.matrice = m;
        const map = new Map<string, Permission[]>();
        for (const p of m.permissions) {
          if (!map.has(p.module)) map.set(p.module, []);
          map.get(p.module)!.push(p);
        }
        this.modules = Array.from(map.entries())
          .map(([module, permissions]) => ({ module, libelle: libelleModule(module), permissions }))
          .sort((a, b) => a.libelle.localeCompare(b.libelle, 'fr'));
        if (!this.rolesAffiches.length) this.rolesAffiches = m.roles.map(r => r.id);
        if (this.roleVue == null) this.roleVue = (m.roles.find(r => r.code !== 'R_ADMI') || m.roles[0])?.id ?? null;
        this.chargement = false;
      },
      error: () => { this.toastr.error('Impossible de charger la matrice.'); this.chargement = false; },
    });
    this.service.getMode().subscribe({ next: r => (this.mode = r.mode), error: () => {} });
    this.chargerObservations();
  }

  chargerObservations(): void {
    this.service.getObservations().subscribe({ next: o => (this.observations = o), error: () => {} });
  }

  // ---------------------------------------------------------------- affichage
  get roles(): RoleM[] {
    if (!this.matrice) return [];
    const ids = new Set(this.rolesAffiches);
    return this.matrice.roles.filter(r => ids.has(r.id));
  }
  get roleSelectionne(): RoleM | undefined {
    return this.matrice?.roles.find(r => r.id === this.roleVue);
  }

  private correspond(p: Permission, g: GroupeModule): boolean {
    const t = this.recherche.trim().toLowerCase();
    if (!t) return true;
    return [p.code, p.libelle, p.action, g.module, g.libelle].some(x => (x || '').toLowerCase().includes(t));
  }
  private differe(p: Permission): boolean {
    const vals = this.roles.filter(r => r.code !== 'R_ADMI').map(r => this.estActif(r.id, p.id));
    return vals.some(v => v) && vals.some(v => !v);
  }
  /** Permissions visibles d'un module (recherche + filtre « différences »). */
  visibles(g: GroupeModule): Permission[] {
    return g.permissions.filter(p => this.correspond(p, g) && (!this.seulementDifferences || this.vue !== 'matrice' || this.differe(p)));
  }
  get modulesVisibles(): GroupeModule[] {
    return this.modules.filter(g => this.visibles(g).length > 0);
  }
  estReplie(g: GroupeModule): boolean {
    // Une recherche en cours déplie les modules qui ont un résultat.
    return !this.recherche.trim() && this.replies.has(g.module);
  }
  basculerModule(g: GroupeModule): void {
    if (this.replies.has(g.module)) this.replies.delete(g.module); else this.replies.add(g.module);
  }
  toutDeplier(): void { this.replies.clear(); }
  toutReplier(): void { this.replies = new Set(this.modules.map(g => g.module)); }

  // ---------------------------------------------------------------- état des cases
  estAdmin(r: RoleM | undefined): boolean { return !!r && r.code === 'R_ADMI'; }
  estActif(idRole: number, idPerm: number): boolean {
    return !!(this.matrice && this.matrice.grid[idRole] && this.matrice.grid[idRole][idPerm]);
  }
  coche(r: RoleM, p: Permission): boolean { return this.estAdmin(r) ? true : this.estActif(r.id, p.id); }
  nbCoches(r: RoleM, g: GroupeModule): number {
    return this.estAdmin(r) ? g.permissions.length : g.permissions.filter(p => this.estActif(r.id, p.id)).length;
  }
  etatModule(r: RoleM, g: GroupeModule): 'tout' | 'partiel' | 'rien' {
    const n = this.nbCoches(r, g);
    return n === 0 ? 'rien' : n === g.permissions.length ? 'tout' : 'partiel';
  }
  etatCase(idRole: number, idPerm: number): EtatCase | undefined { return this.etats.get(idRole + ':' + idPerm); }
  bulle(r: RoleM, p: Permission): string {
    return `${r.libelle} — ${libellePermission(p)} : ${this.coche(r, p) ? 'accordé' : 'non accordé'}`;
  }

  survoler(idPerm: number | null, idRole: number | null): void {
    this.survolPerm = idPerm;
    this.survolRole = idRole;
  }

  // ---------------------------------------------------------------- modifications
  basculer(r: RoleM, p: Permission): void {
    if (!this.matrice) return;
    if (this.estAdmin(r)) { this.toastr.info("L'administrateur dispose de toutes les permissions."); return; }
    const cle = r.id + ':' + p.id;
    const avant = this.estActif(r.id, p.id);
    const cible = !avant;
    (this.matrice.grid[r.id] ||= {})[p.id] = cible; // affichage immédiat
    this.etats.set(cle, 'enregistrement');
    this.service.toggle(r.id, p.id, cible).subscribe({
      next: () => {
        this.etats.set(cle, 'ok');
        setTimeout(() => this.etats.get(cle) === 'ok' && this.etats.delete(cle), 1200);
      },
      error: () => {
        (this.matrice!.grid[r.id] ||= {})[p.id] = avant; // retour arrière
        this.etats.set(cle, 'erreur');
        setTimeout(() => this.etats.delete(cle), 2500);
        this.toastr.error(`Modification non enregistrée (${r.libelle} — ${libellePermission(p)}).`);
      },
    });
  }

  /** Case du module : tout cocher si le module n'est pas complet, sinon tout décocher. */
  basculerModuleRole(r: RoleM, g: GroupeModule): void {
    if (!this.matrice || this.estAdmin(r)) return;
    const cible = this.etatModule(r, g) !== 'tout';
    const avant = new Map(g.permissions.map(p => [p.id, this.estActif(r.id, p.id)]));
    for (const p of g.permissions) (this.matrice.grid[r.id] ||= {})[p.id] = cible;
    this.service.setModuleRole(r.id, g.module, cible).subscribe({
      next: x => {
        const n = x?.modifiees ?? 0;
        this.toastr.success(
          n ? `${g.libelle} — ${r.libelle} : ${n} permission${n > 1 ? 's' : ''} ${cible ? 'accordée' : 'retirée'}${n > 1 ? 's' : ''}.`
            : `${g.libelle} — ${r.libelle} : déjà à jour.`);
      },
      error: () => {
        for (const p of g.permissions) (this.matrice!.grid[r.id] ||= {})[p.id] = !!avant.get(p.id);
        this.toastr.error('Modification du module non enregistrée.');
      },
    });
  }

  changerMode(m: string): void {
    this.service.setMode(m).subscribe({
      next: () => { this.mode = m; this.toastr.success('Mode de contrôle : ' + m + ' (propagation ≤ 30 s).'); },
      error: () => this.toastr.error('Impossible de changer le mode.'),
    });
  }

  trackModule = (_: number, g: GroupeModule) => g.module;
  trackPerm = (_: number, p: Permission) => p.id;
  trackRole = (_: number, r: RoleM) => r.id;
}
