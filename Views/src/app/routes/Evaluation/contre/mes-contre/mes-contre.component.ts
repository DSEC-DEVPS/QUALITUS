import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ToastrService } from 'ngx-toastr';
import { toYMD } from '@shared/date-utils';
import { Pagination } from '@shared/utils/pagination';
import { correspondRecherche } from '@shared/utils/recherche';
import { ConfirmationService } from '@shared/services/confirmation.service';
import { ChargementComponent } from '@shared/components/chargement/chargement.component';
import { PermissionsService } from '@core/authorization/permissions.service';
import { EvalContreService, ContreListe } from '../../eval-contre.service';

type CodeOnglet = 'miennes' | 'autres' | 'me';
interface Onglet {
  code: CodeOnglet;
  libelle: string;
  icone: string;
  description: string;
  colonnes: string[];
  toutes: ContreListe[];
  pag: Pagination<ContreListe>;
  dateDebut: any;
  dateFin: any;
  recherche: string;
  charge: boolean;
  chargement: boolean;
}

/**
 * « Mes contre-évaluations », en trois onglets (chacun : dates, recherche, compteur) :
 *  - Créées par moi (contre_evaluation.creer) : désactiver / supprimer ;
 *  - Créées par d'autres (contre_evaluation.voir_tous) : celles de son périmètre ;
 *  - Me concernant : celles qui portent sur ses évaluations, visibles après la date fixée.
 */
@Component({
  selector: 'app-mes-contre',
  standalone: true,
  imports: [ChargementComponent, CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule, MatTableModule, MatTabsModule,
    MatFormFieldModule, MatInputModule, MatDatepickerModule, MatPaginatorModule, MatTooltipModule],
  template: `
    <div class="cal-page qx-liste mes-contre">
      <mat-card class="cal-panel">
        <mat-card-header class="cal-band">
          <span class="cal-band-title"><mat-icon>compare_arrows</mat-icon> Mes contre-évaluations</span>
        </mat-card-header>
        <mat-card-content>
          <mat-tab-group [selectedIndex]="index" (selectedIndexChange)="changerOnglet($event)" animationDuration="0ms" mat-stretch-tabs="false">
            @for (o of onglets; track o.code) {
              <mat-tab>
                <ng-template mat-tab-label>
                  <mat-icon class="ic-onglet">{{ o.icone }}</mat-icon> {{ o.libelle }}
                  @if (o.charge) { <span class="badge-onglet">{{ o.toutes.length }}</span> }
                </ng-template>
                <!-- Contenu créé à l'ouverture de l'onglet : champs « outline » bien dessinés (libellé, icône) -->
                <ng-template matTabContent>
                <div class="onglet">
                  <p class="cal-desc">{{ o.description }}</p>
                  <div class="cal-filtres-row">
                    <mat-form-field appearance="outline"><mat-label>Du</mat-label>
                      <input matInput [matDatepicker]="pd" [(ngModel)]="o.dateDebut" (dateChange)="charger(o)" [name]="'dd' + o.code" /><mat-datepicker-toggle matSuffix [for]="pd"></mat-datepicker-toggle><mat-datepicker #pd></mat-datepicker>
                    </mat-form-field>
                    <mat-form-field appearance="outline"><mat-label>Au</mat-label>
                      <input matInput [matDatepicker]="pf" [(ngModel)]="o.dateFin" (dateChange)="charger(o)" [name]="'df' + o.code" /><mat-datepicker-toggle matSuffix [for]="pf"></mat-datepicker-toggle><mat-datepicker #pf></mat-datepicker>
                    </mat-form-field>
                    <mat-form-field appearance="outline" class="recherche"><mat-label>Rechercher</mat-label>
                      <mat-icon matPrefix>search</mat-icon>
                      <input matInput [(ngModel)]="o.recherche" (ngModelChange)="appliquer(o)" [name]="'q' + o.code" placeholder="Agent, évaluateur, n° d'évaluation, appel" autocomplete="off" />
                    </mat-form-field>
                    <button mat-button (click)="reinitialiser(o)">Réinitialiser</button>
                  </div>
                  @if (o.chargement) { <app-chargement /> }
                  @else if (o.toutes.length === 0) { <p class="vide">Aucune contre-évaluation.</p> }
                  @else if (o.pag.length === 0) { <p class="vide">Aucune contre-évaluation ne correspond à la recherche.</p> }
                  @else {
                    <p class="compteur">{{ o.pag.length }} contre-évaluation{{ o.pag.length > 1 ? 's' : '' }}{{ o.pag.length !== o.toutes.length ? ' sur ' + o.toutes.length : '' }}</p>
                    <div class="table-cadre">
                      <table mat-table [dataSource]="o.pag.page" class="table">
                        <ng-container matColumnDef="evaluateur">
                          <th mat-header-cell *matHeaderCellDef>Évaluateur contrôlé</th>
                          <td mat-cell *matCellDef="let c"><span class="fort">{{ c.evaluateur_nom }} {{ c.evaluateur_prenom }}</span>
                            @if (c.site) { <div class="discret">{{ c.site }}</div> }</td>
                        </ng-container>
                        <ng-container matColumnDef="agent">
                          <th mat-header-cell *matHeaderCellDef>Agent</th>
                          <td mat-cell *matCellDef="let c">{{ c.agent_nom }} {{ c.agent_prenom }}
                            @if (c.agent_login) { <div class="discret">{{ c.agent_login }}</div> }</td>
                        </ng-container>
                        <ng-container matColumnDef="evaluation">
                          <th mat-header-cell *matHeaderCellDef>Évaluation d'origine</th>
                          <td mat-cell *matCellDef="let c">#{{ c.id_evaluation_initiale }}
                            @if (c.identifiant_appel) { <div class="discret">Appel {{ c.identifiant_appel }}</div> }</td>
                        </ng-container>
                        <ng-container matColumnDef="responsable">
                          <th mat-header-cell *matHeaderCellDef>Contre-évaluée par</th>
                          <td mat-cell *matCellDef="let c">{{ c.responsable_nom }} {{ c.responsable_prenom }}</td>
                        </ng-container>
                        <ng-container matColumnDef="statut">
                          <th mat-header-cell *matHeaderCellDef>Statut</th>
                          <td mat-cell *matCellDef="let c">
                            @if (c.statut === 'TERMINE') { <span class="pastille succes"><mat-icon>task_alt</mat-icon> Terminée</span> }
                            @else { <span class="pastille attente"><mat-icon>schedule</mat-icon> En cours</span> }
                            <div class="discret">créée le {{ c.date_creation | date: 'dd/MM/yyyy' }}</div>
                          </td>
                        </ng-container>
                        <ng-container matColumnDef="conclusion">
                          <th mat-header-cell *matHeaderCellDef>Conclusion</th>
                          <td mat-cell *matCellDef="let c">
                            @if (c.conclusion === 'SUCCES') { <span class="pastille succes"><mat-icon>check_circle</mat-icon> Succès</span> }
                            @else if (c.conclusion === 'ECHEC') { <span class="pastille echec"><mat-icon>cancel</mat-icon> Échec</span> }
                            @else { — }
                          </td>
                        </ng-container>
                        <ng-container matColumnDef="visibilite">
                          <th mat-header-cell *matHeaderCellDef>{{ o.code === 'me' ? 'Visible depuis' : 'Visibilité' }}</th>
                          <td mat-cell *matCellDef="let c">{{ c.date_visibilite ? (c.date_visibilite | date: 'dd/MM/yyyy') : '—' }}</td>
                        </ng-container>
                        <ng-container matColumnDef="actions">
                          <th mat-header-cell *matHeaderCellDef></th>
                          <td mat-cell *matCellDef="let c" class="col-actions" (click)="$event.stopPropagation()">
                            @if (peut(c, 'contre_evaluation.desactiver')) { <button mat-icon-button matTooltip="Désactiver" (click)="desactiver(c)"><mat-icon>block</mat-icon></button> }
                            @if (peut(c, 'contre_evaluation.supprimer')) { <button mat-icon-button color="warn" matTooltip="Supprimer" (click)="supprimer(c)"><mat-icon>delete</mat-icon></button> }
                          </td>
                        </ng-container>
                        <ng-container matColumnDef="ouvrir">
                          <th mat-header-cell *matHeaderCellDef></th>
                          <td mat-cell *matCellDef="let c" class="col-ouvrir"><mat-icon>chevron_right</mat-icon></td>
                        </ng-container>
                        <tr mat-header-row *matHeaderRowDef="o.colonnes"></tr>
                        <tr mat-row *matRowDef="let row; columns: o.colonnes" class="ligne" (click)="ouvrir(row)" title="Ouvrir la contre-évaluation"></tr>
                      </table>
                    </div>
                    <mat-paginator [length]="o.pag.length" [pageIndex]="o.pag.pageIndex" [pageSize]="o.pag.pageSize"
                                   [pageSizeOptions]="o.pag.tailles" showFirstLastButtons (page)="o.pag.changer($event)" />
                  }
                </div>
                </ng-template>
              </mat-tab>
            }
          </mat-tab-group>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: `
    .onglet { padding-top: 14px; }
    .recherche { width: 320px !important; }
    .ic-onglet { margin-right: 6px; font-size: 20px; width: 20px; height: 20px; }
    .badge-onglet { margin-left: 8px; padding: 0 8px; border-radius: 10px; font-size: 12px; font-weight: 600;
      background: var(--qx-orange-pale, #fff1e6); color: var(--qx-orange-texte, #b26a00); }
    .col-actions { white-space: nowrap; width: 96px; text-align: right; }
    td.mat-mdc-cell { padding-top: 8px; padding-bottom: 8px; }
  `,
})
export class MesContreComponent implements OnInit {
  private readonly service = inject(EvalContreService);
  private readonly router = inject(Router);
  private readonly toastr = inject(ToastrService);
  private readonly perms = inject(PermissionsService);
  private readonly confirmation = inject(ConfirmationService);

  onglets: Onglet[] = [];
  index = 0;

  ngOnInit(): void {
    const onglet = (code: CodeOnglet, libelle: string, icone: string, description: string, colonnes: string[]): Onglet => ({
      code, libelle, icone, description, colonnes, toutes: [], pag: new Pagination<ContreListe>(),
      dateDebut: null, dateFin: null, recherche: '', charge: false, chargement: false,
    });
    if (this.perms.can('contre_evaluation.creer')) {
      this.onglets.push(onglet('miennes', 'Créées par moi', 'edit_note', 'Contre-évaluations que vous avez créées (date de création).',
        ['evaluateur', 'agent', 'evaluation', 'statut', 'conclusion', 'visibilite', 'actions', 'ouvrir']));
    }
    if (this.perms.can('contre_evaluation.voir_tous')) {
      this.onglets.push(onglet('autres', 'Créées par d\'autres', 'groups', 'Contre-évaluations de votre périmètre créées par d\'autres responsables (date de création).',
        ['evaluateur', 'agent', 'evaluation', 'responsable', 'statut', 'conclusion', 'visibilite', 'ouvrir']));
    }
    this.onglets.push(onglet('me', 'Me concernant', 'person', 'Contre-évaluations portant sur vos évaluations, visibles après la date fixée par le responsable (date de contre-évaluation).',
      ['agent', 'evaluation', 'responsable', 'conclusion', 'visibilite', 'ouvrir']));
    this.changerOnglet(0);
  }

  changerOnglet(i: number): void {
    this.index = i;
    const o = this.onglets[i];
    if (o && !o.charge) this.charger(o);
  }

  charger(o: Onglet): void {
    o.chargement = true;
    const f = { date_debut: toYMD(o.dateDebut), date_fin: toYMD(o.dateFin) };
    const req = o.code === 'me' ? this.service.getMes(f) : this.service.getAll({ ...f, portee: o.code === 'autres' ? 'autres' : 'miennes' });
    req.subscribe({
      next: l => { o.toutes = l || []; o.charge = true; o.chargement = false; this.appliquer(o); },
      error: () => { o.chargement = false; this.toastr.error('Erreur de chargement.'); },
    });
  }

  appliquer(o: Onglet): void {
    o.pag.definir(o.toutes.filter(c => correspondRecherche(o.recherche,
      [c.agent_nom, c.agent_prenom, c.agent_login, c.evaluateur_nom, c.evaluateur_prenom, c.responsable_nom, c.responsable_prenom, c.identifiant_appel, c.id_evaluation_initiale])));
  }

  reinitialiser(o: Onglet): void { o.dateDebut = null; o.dateFin = null; o.recherche = ''; this.charger(o); }

  /** Créateur : tant que la contre-évaluation n'est pas terminée ; sinon la permission dédiée. */
  peut(c: ContreListe, code: string): boolean {
    return this.perms.can(code) || (!!Number(c.est_createur) && c.statut !== 'TERMINE');
  }

  ouvrir(c: ContreListe): void { this.router.navigate(['/mon-espace/evaluation/contre-executer', c.id]); }

  private rechargerCreees(): void { for (const o of this.onglets) if (o.code !== 'me' && o.charge) this.charger(o); }

  desactiver(c: ContreListe): void {
    this.service.setActif(c.id, false).subscribe({
      next: () => { this.toastr.success('Désactivée.'); this.rechargerCreees(); },
      error: (e: any) => this.toastr.error(e?.error?.message || 'Erreur.'),
    });
  }

  async supprimer(c: ContreListe): Promise<void> {
    if (!(await this.confirmation.confirmer({ titre: 'Supprimer la contre-évaluation', message: 'Supprimer définitivement cette contre-évaluation ?', type: 'danger' }))) return;
    this.service.supprimer(c.id).subscribe({
      next: () => { this.toastr.success('Contre-évaluation supprimée.'); this.rechargerCreees(); },
      error: (e: any) => this.toastr.error(e?.error?.message || 'Suppression impossible.'),
    });
  }
}
