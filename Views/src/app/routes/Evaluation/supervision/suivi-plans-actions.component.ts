import { Component, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ModifierActionDialogComponent } from './modifier-action-dialog.component';
import { ToastrService } from 'ngx-toastr';
import { PaginationServeur } from '@shared/utils/pagination-serveur';
import { toYMD } from '@shared/date-utils';
import { ChargementComponent } from '@shared/components/chargement/chargement.component';
import { ActionSuivi, EvalSuitesService } from '../eval-suites.service';

type Etat = '' | 'en_cours' | 'en_retard' | 'proche' | 'realisee' | 'sans_porteur';
const ETATS: { code: Etat; libelle: string }[] = [
  { code: '', libelle: 'Toutes' },
  { code: 'en_cours', libelle: 'En cours' },
  { code: 'en_retard', libelle: 'En retard' },
  { code: 'proche', libelle: 'Échéance proche (7 j)' },
  { code: 'realisee', libelle: 'Réalisées' },
  { code: 'sans_porteur', libelle: 'Sans porteur' },
];
/** Cartes du haut (un clic filtre, un second clic retire le filtre ; « Réinitialiser » remet tout). */
const CARTES: Etat[] = ['en_cours', 'en_retard', 'proche', 'realisee'];
/** Filtre Porteur : actions sans porteur (anciennes ; le porteur est obligatoire depuis out106). */
const NON_ATTRIBUE = -1;

/**
 * « Suivi des plans d'actions » : toutes les actions des évaluations que
 * l'utilisateur peut voir (et celles dont il est porteur ou contributeur), sans
 * ouvrir chaque évaluation. Lecture seule ; un clic ouvre l'évaluation.
 * Filtres : état, site (out124), statut, porteur, agent, période d'échéance, recherche,
 * « Celles que je porte » (porteur ou contributeur). Ouvert depuis le tableau
 * de bord avec ses filtres (paramètres d'URL).
 * out113 : filtres, cartes et pagination calculés par le serveur (seule la page
 * affichée est chargée) ; par défaut, les actions en cours (non closes) ; l'export
 * se fait depuis le menu Exportations (« Plan d'actions »).
 */
@Component({
  selector: 'app-suivi-plans-actions',
  standalone: true,
  imports: [ChargementComponent, CommonModule, FormsModule, MatCardModule, MatButtonModule, MatButtonToggleModule, MatIconModule,
    MatTableModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatDatepickerModule, MatPaginatorModule, MatTooltipModule,
    MatMenuModule, MatDialogModule],
  template: `
    <div class="cal-page qx-liste suivi-pa">
      <mat-card class="cal-panel">
        <mat-card-header class="cal-band">
          <span class="cal-band-title"><mat-icon>assignment</mat-icon> Suivi des plans d'actions</span>
        </mat-card-header>
        <mat-card-content>
          <div class="compteurs">
            @for (c of compteurs; track c.code) {
              <button type="button" class="compte" [class.actif]="etat === c.code" [attr.data-e]="c.code" (click)="choisirEtat(c.code)">
                <span class="n">{{ c.n }}</span><span class="l">{{ c.libelle }}</span>
              </button>
            }
          </div>
          <div class="cal-filtres-row">
            <mat-button-toggle-group [value]="mesActions" (change)="mesActions = $event.value; appliquer()" hideSingleSelectionIndicator>
              <mat-button-toggle [value]="false" matTooltip="Toutes les actions que vous pouvez voir">Toutes les actions visibles</mat-button-toggle>
              <mat-button-toggle [value]="true" matTooltip="Actions dont vous êtes porteur ou contributeur">Celles que je porte</mat-button-toggle>
            </mat-button-toggle-group>
            <mat-form-field appearance="outline"><mat-label>Échéance du</mat-label>
              <input matInput [matDatepicker]="pd" [(ngModel)]="du" (dateChange)="appliquer()" name="du" /><mat-datepicker-toggle matSuffix [for]="pd"></mat-datepicker-toggle><mat-datepicker #pd></mat-datepicker>
            </mat-form-field>
            <mat-form-field appearance="outline"><mat-label>au</mat-label>
              <input matInput [matDatepicker]="pf" [(ngModel)]="au" (dateChange)="appliquer()" name="au" /><mat-datepicker-toggle matSuffix [for]="pf"></mat-datepicker-toggle><mat-datepicker #pf></mat-datepicker>
            </mat-form-field>
          </div>
          <div class="cal-filtres-row">
            @if (sites.length > 1 || idSite) {
              <mat-form-field appearance="outline"><mat-label>Site</mat-label>
                <mat-select [(ngModel)]="idSite" (selectionChange)="appliquer()" name="si">
                  <mat-option [value]="null">Tous</mat-option>
                  @for (s of sites; track s.id) { <mat-option [value]="s.id">{{ s.nom }} ({{ s.n }})</mat-option> }
                </mat-select>
              </mat-form-field>
            }
            <mat-form-field appearance="outline"><mat-label>Statut</mat-label>
              <mat-select [(ngModel)]="idStatut" (selectionChange)="appliquer()" name="st">
                <mat-option [value]="null">Tous</mat-option>
                @for (s of statuts; track s.id) { <mat-option [value]="s.id">{{ s.libelle }}</mat-option> }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Porteur</mat-label>
              <mat-select [(ngModel)]="idPorteur" (selectionChange)="appliquer()" name="po">
                <mat-option [value]="null">Tous</mat-option>
                @if (nbSansPorteur) { <mat-option [value]="NON_ATTRIBUE">Non attribué ({{ nbSansPorteur }})</mat-option> }
                @for (p of porteurs; track p.id) { <mat-option [value]="p.id">{{ p.nom }}</mat-option> }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Contributeur</mat-label>
              <mat-select [(ngModel)]="idContributeur" (selectionChange)="appliquer()" name="co">
                <mat-option [value]="null">Tous</mat-option>
                @for (c of contributeurs; track c.id) { <mat-option [value]="c.id">{{ c.nom }}</mat-option> }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" class="recherche"><mat-label>Rechercher</mat-label>
              <mat-icon matPrefix>search</mat-icon>
              <input matInput [(ngModel)]="recherche" (ngModelChange)="rechercher()" name="q" placeholder="Action, synthèse, agent, porteur" autocomplete="off" />
            </mat-form-field>
            <button mat-button (click)="reinitialiser()">Réinitialiser</button>
          </div>
          @if (filtreTableau) {
            <p class="filtre-tdb"><mat-icon>dashboard</mat-icon> {{ filtreTableau }}
              <button mat-button (click)="retirerFiltreTableau()">Retirer</button></p>
          }
          @if (chargement) { <app-chargement /> }
          @else if (totalPerimetre === 0) { <p class="vide">Aucune action à suivre.</p> }
          @else if (pag.length === 0) { <p class="vide">Aucune action ne correspond aux filtres.</p> }
          @else {
            <p class="compteur">{{ pag.length }} action{{ pag.length > 1 ? 's' : '' }} sur {{ totalPerimetre }}</p>
            <div class="table-cadre">
              <table mat-table [dataSource]="pag.page" class="table">
                <ng-container matColumnDef="agent">
                  <th mat-header-cell *matHeaderCellDef>Agent</th>
                  <td mat-cell *matCellDef="let a"><span class="fort">{{ a.agent_nom }} {{ a.agent_prenom }}</span>
                    @if (a.agent_login) { <div class="discret">{{ a.agent_login }}</div> }</td>
                </ng-container>
                <ng-container matColumnDef="evaluation">
                  <th mat-header-cell *matHeaderCellDef>Évaluation</th>
                  <td mat-cell *matCellDef="let a"><a class="lien" (click)="ouvrir(a, $event)">Appel du {{ a.date_appel ? (a.date_appel | date: 'dd/MM/yyyy') : '—' }}</a>
                    @if (a.site) { <div class="discret">{{ a.site }}</div> }</td>
                </ng-container>
                <ng-container matColumnDef="action">
                  <th mat-header-cell *matHeaderCellDef>Action</th>
                  <td mat-cell *matCellDef="let a" class="col-texte">{{ a.action }}</td>
                </ng-container>
                <ng-container matColumnDef="porteur">
                  <th mat-header-cell *matHeaderCellDef>Porteur</th>
                  <td mat-cell *matCellDef="let a">
                    @if (a.porteur_nom) { {{ a.porteur_nom }} {{ a.porteur_prenom }} } @else { <span class="pastille neutre">Non attribué</span> }
                  </td>
                </ng-container>
                <ng-container matColumnDef="contributeurs">
                  <th mat-header-cell *matHeaderCellDef>Contributeurs</th>
                  <td mat-cell *matCellDef="let a" class="col-contrib">
                    @for (c of contributeursDe(a); track $index) { <div>{{ c }}</div> } @empty { <span class="discret">—</span> }
                  </td>
                </ng-container>
                <ng-container matColumnDef="echeance">
                  <th mat-header-cell *matHeaderCellDef>Échéance</th>
                  <td mat-cell *matCellDef="let a">
                    {{ a.date_attendue ? (a.date_attendue | date: 'dd/MM/yyyy') : '—' }}
                    @if (a.en_retard) { <div><span class="pastille echec"><mat-icon>warning</mat-icon> En retard</span></div> }
                    @else if (a.echeance_proche) { <div><span class="pastille attente"><mat-icon>schedule</mat-icon> Échéance proche</span></div> }
                  </td>
                </ng-container>
                <ng-container matColumnDef="statut">
                  <th mat-header-cell *matHeaderCellDef>Statut</th>
                  <td mat-cell *matCellDef="let a">
                    @if (a.realisee) { <span class="pastille succes"><mat-icon>check_circle</mat-icon> {{ a.statut || 'Réalisé' }}</span> }
                    @else if (a.close) { <span class="pastille neutre"><mat-icon>lock</mat-icon> {{ a.statut }}</span> }
                    @else { {{ a.statut || '—' }} }
                  </td>
                </ng-container>
                <ng-container matColumnDef="synthese">
                  <th mat-header-cell *matHeaderCellDef>Synthèse</th>
                  <td mat-cell *matCellDef="let a" class="col-texte discret-txt">{{ a.synthese || '—' }}</td>
                </ng-container>
                <ng-container matColumnDef="ouvrir">
                  <th mat-header-cell *matHeaderCellDef></th>
                  <td mat-cell *matCellDef="let a" class="col-ouvrir"><mat-icon>chevron_right</mat-icon></td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="colonnes"></tr>
                <tr mat-row *matRowDef="let row; columns: colonnes" class="ligne" (click)="choisir(row, $event)"
                    [class.choisie]="ligneMenu?.id === row.id" title="Ouvrir l'évaluation ou modifier l'action"></tr>
              </table>
            </div>
            <!-- Menu ouvert à l'endroit du clic sur une ligne -->
            <span class="ancre-menu" [style.left.px]="menuX" [style.top.px]="menuY" [matMenuTriggerFor]="menuLigne" #declencheur="matMenuTrigger"></span>
            <mat-menu #menuLigne="matMenu" (closed)="ligneMenu = null">
              @if (ligneMenu; as l) {
                <button mat-menu-item (click)="ouvrir(l)"><mat-icon>open_in_new</mat-icon> Ouvrir l'évaluation</button>
                @if (l.peut_modifier) {
                  <button mat-menu-item (click)="modifier(l)"><mat-icon>edit</mat-icon> Mettre à jour (statut, synthèse)</button>
                } @else if (l.close) {
                  <button mat-menu-item disabled><mat-icon>lock</mat-icon> Action close : plus modifiable</button>
                } @else {
                  <button mat-menu-item disabled><mat-icon>lock</mat-icon> Modification non autorisée</button>
                }
              }
            </mat-menu>
            <mat-paginator [length]="pag.length" [pageIndex]="pag.pageIndex" [pageSize]="pag.pageSize"
                           [pageSizeOptions]="pag.tailles" showFirstLastButtons (page)="changerPage($event)" />
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: `
    .compteurs { display: flex; flex-wrap: wrap; gap: 10px; margin: 4px 0 14px; }
    .compte { display: flex; flex-direction: column; align-items: flex-start; min-width: 120px; padding: 10px 14px; cursor: pointer;
      border: 1px solid var(--qx-bordure, #ece7e1); border-left: 4px solid var(--qx-texte-3, #bbb); border-radius: 8px;
      background: var(--qx-surface, #fff); color: var(--qx-texte, #2b2b2b); font: inherit; transition: box-shadow .12s, transform .12s; }
    .compte:hover { box-shadow: 0 2px 8px rgba(0, 0, 0, .08); transform: translateY(-1px); }
    .compte .n { font-size: 22px; font-weight: 700; line-height: 1.1; }
    .compte .l { font-size: 12.5px; color: var(--qx-texte-2, #666); }
    .compte.actif { border-color: #ff8e36; box-shadow: 0 0 0 1px #ff8e36 inset; }
    .compte[data-e="en_cours"] { border-left-color: #1976d2; }
    .compte[data-e="en_retard"] { border-left-color: var(--qx-rouge, #c62828); }
    .compte[data-e="proche"] { border-left-color: #f57c00; }
    .compte[data-e="realisee"] { border-left-color: var(--qx-vert, #2e7d32); }
    .col-contrib { font-size: 13px; min-width: 140px; }
    tr.choisie { background: var(--qx-orange-pale, #fff6ee); }
    .ancre-menu { position: fixed; width: 0; height: 0; pointer-events: none; }
    .recherche { width: 280px !important; }
    .col-texte { max-width: 320px; white-space: pre-line; }
    .discret-txt { color: var(--qx-texte-2, #666); font-size: 13px; }
    .lien { color: #f57c00; cursor: pointer; text-decoration: underline; text-underline-offset: 2px; }
    .filtre-tdb { display: flex; align-items: center; gap: 6px; color: var(--qx-texte-2, #666); font-size: 13px; margin: 0 0 8px; }
    .filtre-tdb mat-icon { font-size: 18px; width: 18px; height: 18px; }
    td.mat-mdc-cell { padding-top: 8px; padding-bottom: 8px; vertical-align: top; }
  `,
})
export class SuiviPlansActionsComponent implements OnInit, OnDestroy {
  private readonly service = inject(EvalSuitesService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toastr = inject(ToastrService);

  readonly colonnes = ['agent', 'evaluation', 'action', 'porteur', 'contributeurs', 'echeance', 'statut', 'synthese', 'ouvrir'];
  readonly NON_ATTRIBUE = NON_ATTRIBUE;
  private readonly dialog = inject(MatDialog);
  @ViewChild('declencheur') declencheur?: MatMenuTrigger;
  /** Ligne dont le menu (ouvrir / modifier) est affiché, et position du clic. */
  ligneMenu: ActionSuivi | null = null;
  menuX = 0;
  menuY = 0;
  nbSansPorteur = 0;
  /** Pagination côté serveur : seule la page affichée est chargée. */
  readonly pag = new PaginationServeur<ActionSuivi>();
  /** Actions du périmètre (avant filtres d'écran), pour « n actions sur N ». */
  totalPerimetre = 0;
  chargement = false;
  private minuterie: any = null;
  /** Numéro de la dernière requête : une réponse plus ancienne est ignorée. */
  private requete = 0;
  /** Tous les statuts d'action (route /eval/plan-action/statuts, permission evaluation.lire). */
  statuts: { id: number; libelle: string }[] = [];
  porteurs: { id: number; nom: string }[] = [];
  /** Contributeurs présents dans les actions (filtre). */
  contributeurs: { id: number; nom: string }[] = [];
  /** Sites des actions visibles (filtre Site, out124) ; -1 = sans site. */
  sites: { id: number; nom: string; n: number }[] = [];
  compteurs: { code: Etat; libelle: string; n: number }[] = [];

  /** Par défaut : les actions en cours (non closes). */
  etat: Etat = 'en_cours';
  mesActions = false;
  du: any = null;
  au: any = null;
  idStatut: number | null = null;
  idPorteur: number | null = null;
  idContributeur: number | null = null;
  idSite: number | null = null;
  recherche = '';
  /** Filtres venus du tableau de bord (périmètre, période de réalisation). */
  private tdb: { equipe?: 1; id_programme?: number; periode?: string; du?: string; au?: string } | null = null;
  filtreTableau = '';

  ngOnInit(): void {
    // Filtre Statut : tous les statuts du référentiel des plans d'actions (même sans action).
    this.service.getStatuts().subscribe({ next: s => (this.statuts = s || []) });
    const q = this.route.snapshot.queryParamMap;
    const e = q.get('etat') as Etat;
    if (ETATS.some(x => x.code === e) && q.has('etat')) this.etat = e;
    this.mesActions = q.get('mes_actions') === '1';
    const t: any = {};
    // Site venu du tableau de bord : pré-remplit le filtre Site (modifiable), sans bandeau.
    if (/^\d+$/.test(q.get('id_site') || '')) this.idSite = Number(q.get('id_site'));
    if (q.get('equipe') === '1') t.equipe = 1;
    if (/^\d+$/.test(q.get('id_programme') || '')) t.id_programme = Number(q.get('id_programme'));
    if (q.get('periode') === 'realisation' && q.get('du') && q.get('au')) { t.periode = 'realisation'; t.du = q.get('du'); t.au = q.get('au'); }
    else {
      if (q.get('du')) this.du = new Date(q.get('du') + 'T00:00:00');
      if (q.get('au')) this.au = new Date(q.get('au') + 'T00:00:00');
    }
    if (Object.keys(t).length) {
      this.tdb = t;
      const morceaux = [t.equipe ? (q.get('perimetre_libelle') || 'Mon équipe') : '',
        t.id_programme ? `Programme : ${q.get('programme_libelle') || t.id_programme}` : '',
        t.periode ? `réalisées du ${this.fr(t.du)} au ${this.fr(t.au)}` : ''].filter(Boolean);
      this.filtreTableau = 'Depuis le tableau de bord' + (morceaux.length ? ' : ' + morceaux.join(' · ') : '');
    }
    this.charger();
  }

  ngOnDestroy(): void { clearTimeout(this.minuterie); }

  /** Charge la page courante (filtres, cartes, listes Porteur / Contributeur : calculés par le serveur). */
  charger(): void {
    this.chargement = true;
    const f: Record<string, any> = { ...(this.tdb || {}) };
    if (this.mesActions) f['mes_actions'] = 1;
    if (!f['periode']) {
      if (this.du) f['du'] = toYMD(this.du);
      if (this.au) f['au'] = toYMD(this.au);
    }
    if (this.etat) f['etat'] = this.etat;
    if (this.idStatut) f['id_statut'] = this.idStatut;
    if (this.idPorteur) f['id_porteur'] = this.idPorteur;
    if (this.idContributeur) f['id_contributeur'] = this.idContributeur;
    if (this.idSite) f['site'] = this.idSite;
    if (this.recherche.trim()) f['q'] = this.recherche.trim();
    const n = ++this.requete;
    this.service.getSuiviPage(f, this.pag.params()).subscribe({
      next: r => {
        if (n !== this.requete) return;
        this.pag.recevoir(r);
        // la dernière page a été vidée (action passée close, par exemple) : page précédente
        if (this.pag.pageVideApresRetrait) { this.pag.pageIndex--; this.charger(); return; }
        this.totalPerimetre = r.total_perimetre;
        this.nbSansPorteur = r.nb_sans_porteur;
        this.porteurs = r.porteurs || [];
        this.contributeurs = r.contributeurs || [];
        this.sites = r.sites || [];
        this.compteurs = ETATS.filter(e => CARTES.includes(e.code)).map(e => ({ ...e, n: (r.compteurs as any)[e.code] ?? 0 }));
        this.chargement = false;
      },
      error: () => { if (n !== this.requete) return; this.toastr.error('Impossible de charger le suivi des plans d’actions.'); this.chargement = false; },
    });
  }

  /** Changement d'un filtre : première page, rechargement. */
  appliquer(): void { clearTimeout(this.minuterie); this.pag.premiere(); this.charger(); }
  /** Recherche : envoyée au serveur après une courte pause de frappe. */
  rechercher(): void { clearTimeout(this.minuterie); this.minuterie = setTimeout(() => this.appliquer(), 350); }
  changerPage(e: PageEvent): void { this.pag.changer(e); this.charger(); }

  /** Carte : filtre sur l'état ; un second clic sur la carte active retire le filtre. */
  choisirEtat(e: Etat): void { this.etat = this.etat === e ? '' : e; this.appliquer(); }

  /** Clic sur une ligne : menu « Ouvrir l'évaluation » / « Modifier l'action » à l'endroit du clic. */
  choisir(a: ActionSuivi, ev: MouseEvent): void {
    this.ligneMenu = a;
    this.menuX = ev.clientX;
    this.menuY = ev.clientY;
    setTimeout(() => this.declencheur?.openMenu());
  }

  modifier(a: ActionSuivi): void {
    this.dialog.open(ModifierActionDialogComponent, { data: a, panelClass: 'dlg-ref', width: '720px', maxWidth: '96vw', autoFocus: false })
      .afterClosed().subscribe(ok => { if (ok) this.charger(); });
  }

  /** Noms des contributeurs (une ligne chacun). */
  contributeursDe(a: ActionSuivi): string[] { return a.contributeurs ? a.contributeurs.split(', ') : []; }

  retirerFiltreTableau(): void {
    this.tdb = null; this.filtreTableau = '';
    this.router.navigate([], { queryParams: {}, replaceUrl: true });
    this.appliquer();
  }

  reinitialiser(): void {
    this.etat = 'en_cours'; this.mesActions = false; this.du = null; this.au = null;
    this.idStatut = null; this.idPorteur = null; this.idContributeur = null; this.idSite = null; this.recherche = '';
    this.retirerFiltreTableau();
  }


  ouvrir(a: ActionSuivi, ev?: Event): void {
    ev?.stopPropagation();
    this.router.navigate(['/mon-espace/evaluation/executer', a.id_evaluation]);
  }

  private fr(iso?: string | null): string { return iso ? iso.split('-').reverse().join('/') : ''; }
}
