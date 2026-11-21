import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { Subject, debounceTime, distinctUntilChanged, switchMap, finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { HabilitationService, UserLite, DroitItem, ResumeDroits, Sens } from '../habilitation.service';
import { libelleModule, libellePermission } from '../libelles-habilitations';
import { ChargementComponent } from '@shared/components/chargement/chargement.component';
import { ConfirmationService } from '@shared/services/confirmation.service';

interface GroupeDroits { module: string; libelle: string; items: DroitItem[]; }
type Filtre = 'tout' | 'derogations' | 'effectifs';

/**
 * Droits complémentaires d'un utilisateur : ce que lui donne son rôle, ses
 * dérogations (en plus / en moins, motivées, éventuellement temporaires) et ce
 * qu'il peut effectivement faire.
 */
@Component({
  selector: 'app-droits-utilisateur',
  standalone: true,
  imports: [ChargementComponent,
    CommonModule, FormsModule, MatCardModule, MatIconModule, MatButtonModule,
    MatFormFieldModule, MatInputModule, MatButtonToggleModule, MatTooltipModule, MatMenuModule,
  ],
  templateUrl: './droits-utilisateur.component.html',
  styleUrl: './droits-utilisateur.component.scss',
})
export class DroitsUtilisateurComponent implements OnInit {
  chargement = false;
  private readonly service = inject(HabilitationService);
  private readonly toastr = inject(ToastrService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly confirmation = inject(ConfirmationService);

  private readonly recherche$ = new Subject<string>();
  resultats: UserLite[] = [];
  terme = '';

  selection: UserLite | null = null;
  admin = false;
  resume: ResumeDroits | null = null;
  modules: GroupeDroits[] = [];

  // Présentation
  filtre: Filtre = 'tout';
  rechercheDroit = '';
  replies = new Set<string>();

  // Paramètres appliqués aux dérogations posées ensuite
  motif = '';
  dateFin = '';
  readonly aujourdhui = this.iso(new Date());

  readonly libellePermission = libellePermission;

  constructor() {
    this.recherche$
      .pipe(debounceTime(250), distinctUntilChanged(), switchMap(q => this.service.rechercherUtilisateurs(q)))
      .subscribe({ next: r => (this.resultats = r), error: () => {} });
  }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.queryParamMap.get('id'));
    if (id) this.chargerParId(id);
  }

  chercher(q: string): void { this.terme = q; this.recherche$.next(q); }

  choisir(u: UserLite): void {
    this.resultats = [];
    this.terme = `${u.prenom} ${u.nom}`;
    // L'adresse garde l'utilisateur choisi (rechargement, lien partagé).
    this.router.navigate([], { queryParams: { id: u.id }, replaceUrl: true });
    this.chargerParId(u.id);
  }

  private chargerParId(id: number, silencieux = false): void {
    if (!silencieux) this.chargement = true;
    this.service.getDroitsUtilisateur(id).pipe(finalize(() => (this.chargement = false))).subscribe({
      next: d => {
        this.selection = d.utilisateur;
        this.admin = d.admin;
        this.resume = d.resume;
        if (!this.terme) this.terme = `${d.utilisateur.prenom} ${d.utilisateur.nom}`;
        const map = new Map<string, DroitItem[]>();
        for (const p of d.permissions) {
          if (!map.has(p.module)) map.set(p.module, []);
          map.get(p.module)!.push(p);
        }
        this.modules = Array.from(map.entries())
          .map(([module, items]) => ({ module, libelle: libelleModule(module), items }))
          .sort((a, b) => a.libelle.localeCompare(b.libelle, 'fr'));
      },
      error: () => this.toastr.error('Impossible de charger les droits.'),
    });
  }

  private recharger(): void {
    if (this.selection) this.chargerParId(this.selection.id, true);
  }

  // ---------------------------------------------------------------- affichage
  private correspond(it: DroitItem, g: GroupeDroits): boolean {
    if (this.filtre === 'derogations' && !it.sens) return false;
    if (this.filtre === 'effectifs' && !it.effectif) return false;
    const t = this.rechercheDroit.trim().toLowerCase();
    if (!t) return true;
    return [it.code, it.libelle, g.libelle, g.module].some(x => (x || '').toLowerCase().includes(t));
  }
  visibles(g: GroupeDroits): DroitItem[] { return g.items.filter(it => this.correspond(it, g)); }
  get modulesVisibles(): GroupeDroits[] { return this.modules.filter(g => this.visibles(g).length > 0); }
  nbDerogations(g: GroupeDroits): number { return g.items.filter(i => i.sens && !i.expiree).length; }
  nbEffectifs(g: GroupeDroits): number { return g.items.filter(i => i.effectif).length; }
  estReplie(g: GroupeDroits): boolean { return !this.rechercheDroit.trim() && this.filtre === 'tout' && this.replies.has(g.module); }
  basculerModule(g: GroupeDroits): void { if (this.replies.has(g.module)) this.replies.delete(g.module); else this.replies.add(g.module); }
  toutDeplier(): void { this.replies.clear(); }
  toutReplier(): void { this.replies = new Set(this.modules.map(g => g.module)); }

  /** Valeur du sélecteur 3 états pour une permission. */
  etat(it: DroitItem): Sens { return it.sens ?? 'NONE'; }
  classeLigne(it: DroitItem): string {
    if (!it.sens) return 'herite';
    if (it.expiree) return 'expiree';
    return it.sens === 'GRANT' ? 'plus' : 'moins';
  }
  formatDate(iso: string | null): string {
    if (!iso) return '';
    const d = iso.length === 10 ? new Date(iso + 'T00:00:00') : new Date(iso);
    const p = (n: number) => String(n).padStart(2, '0');
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
  }
  private get options() {
    return { motif: this.motif.trim() || null, date_fin: this.dateFin || null };
  }

  // ---------------------------------------------------------------- modifications
  changer(it: DroitItem, sens: Sens): void {
    if (!this.selection) return;
    if (sens !== 'NONE' && this.dateFin && this.dateFin < this.aujourdhui) {
      this.toastr.warning('La date de fin ne peut pas être dans le passé.');
      return;
    }
    this.service.setDroit(this.selection.id, it.id, sens, sens === 'NONE' ? {} : this.options).subscribe({
      next: () => {
        this.toastr.success(
          sens === 'NONE' ? `${libellePermission(it)} : remis au rôle.`
            : `${libellePermission(it)} : ${sens === 'GRANT' ? 'autorisé' : 'refusé'}${this.dateFin ? ' jusqu\'au ' + this.formatDate(this.dateFin) : ''}.`);
        this.recharger();
      },
      error: e => { this.toastr.error(e?.error?.message || 'Modification impossible.'); this.recharger(); },
    });
  }

  async appliquerModule(g: GroupeDroits, sens: Sens): Promise<void> {
    if (!this.selection) return;
    const quoi = sens === 'GRANT' ? 'autoriser' : sens === 'DENY' ? 'refuser' : 'remettre au rôle';
    if (!(await this.confirmation.confirmer({
      titre: `Module « ${g.libelle} »`,
      message: `${quoi.charAt(0).toUpperCase() + quoi.slice(1)} les ${g.items.length} permissions de ce module pour ${this.selection.prenom} ${this.selection.nom} ?`,
      type: sens === 'NONE' ? 'attention' : 'attention',
    }))) return;
    this.service.setModuleUtilisateur(this.selection.id, g.module, sens, sens === 'NONE' ? {} : this.options).subscribe({
      next: x => { this.toastr.success(`${g.libelle} : ${x?.modifiees ?? 0} permission(s) mise(s) à jour.`); this.recharger(); },
      error: e => this.toastr.error(e?.error?.message || 'Modification impossible.'),
    });
  }

  async toutRemettreAuRole(): Promise<void> {
    if (!this.selection || !this.resume) return;
    const n = this.resume.plus + this.resume.moins + this.resume.expirees;
    if (!n) { this.toastr.info('Cet utilisateur n\'a aucune dérogation.'); return; }
    if (!(await this.confirmation.confirmer({
      titre: 'Tout remettre au rôle',
      message: `Supprimer les ${n} dérogation(s) de ${this.selection.prenom} ${this.selection.nom} ? Il retrouvera exactement les droits de son rôle.`,
      type: 'danger',
      oui: 'Tout remettre au rôle',
    }))) return;
    this.service.resetDroits(this.selection.id).subscribe({
      next: x => { this.toastr.success(`${x?.supprimees ?? 0} dérogation(s) supprimée(s).`); this.recharger(); },
      error: () => this.toastr.error('Opération impossible.'),
    });
  }

  trackModule = (_: number, g: GroupeDroits) => g.module;
  trackItem = (_: number, it: DroitItem) => it.id;

  private iso(d: Date): string {
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }
}
