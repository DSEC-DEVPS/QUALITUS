import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { PaginationServeur } from '@shared/utils/pagination-serveur';
import { toYMD } from '@shared/date-utils';
import { ToastrService } from 'ngx-toastr';
import { EvalInstanceService, EvaluationListe } from '../eval-instance.service';
import { ChargementComponent } from '@shared/components/chargement/chargement.component';
import { PermissionsService } from '@core/authorization/permissions.service';

/**
 * « Mes coaching » : évaluations terminées en échec à coacher.
 *  - par défaut, celles de ses agents ; avec evaluation.voir_tous, « Tout mon
 *    périmètre » (son site, tous les sites pour le site à vision globale) ;
 *  - filtres : période, état du coaching (à faire, en cours, terminé), recherche ;
 *  - ouvert depuis le tableau de bord avec ses filtres (paramètres d'URL) ;
 *  - filtres et recherche appliqués par le serveur, seule la page affichée est chargée ;
 *  - par défaut, les coachings à faire ou en cours, toutes dates (out113) ; ouverte depuis
 *    le tableau de bord, l'état et la période de la tuile.
 */
@Component({
  selector: 'app-mes-coaching',
  standalone: true,
  imports: [ChargementComponent,
    CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule, MatTableModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatDatepickerModule, MatPaginatorModule,
  ],
  template: `
    <div class="cal-page qx-liste">
      <mat-card class="cal-panel">
        <mat-card-header class="cal-band"><span class="cal-band-title"><mat-icon>psychology</mat-icon> Mes coaching</span></mat-card-header>
        <mat-card-content>
          <p class="cal-desc">Évaluations terminées en échec, qui nécessitent un coaching.</p>
          <div class="cal-filtres-row">
            @if (peutPerimetre) {
              <mat-form-field appearance="outline"><mat-label>Évaluations</mat-label>
                <mat-select [(ngModel)]="etendue" (selectionChange)="appliquer()" name="et">
                  <mat-option value="">Mes agents</mat-option>
                  <mat-option value="perimetre">Tout mon périmètre</mat-option>
                </mat-select>
              </mat-form-field>
            }
            <mat-form-field appearance="outline"><mat-label>{{ dateSur === 'evaluation' ? 'Évaluée du' : 'Du' }}</mat-label>
              <input matInput [matDatepicker]="pd" [(ngModel)]="dateDebut" name="dd" /><mat-datepicker-toggle matSuffix [for]="pd"></mat-datepicker-toggle><mat-datepicker #pd></mat-datepicker>
            </mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Au</mat-label>
              <input matInput [matDatepicker]="pf" [(ngModel)]="dateFin" name="df" /><mat-datepicker-toggle matSuffix [for]="pf"></mat-datepicker-toggle><mat-datepicker #pf></mat-datepicker>
            </mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Coaching</mat-label>
              <mat-select [(ngModel)]="etat" (selectionChange)="appliquer()" name="ct">
                <mat-option value="non_termine">À faire ou en cours</mat-option>
                <mat-option value="">Tous</mat-option>
                <mat-option value="a_faire">À faire</mat-option>
                <mat-option value="en_cours">En cours</mat-option>
                <mat-option value="termine">Terminé</mat-option>
              </mat-select>
            </mat-form-field>
            <button mat-flat-button color="primary" (click)="appliquer()"><mat-icon>search</mat-icon> Filtrer</button>
            <mat-form-field appearance="outline"><mat-label>Rechercher un agent</mat-label>
              <mat-icon matPrefix>search</mat-icon>
              <input matInput [(ngModel)]="recherche" (ngModelChange)="rechercher()" name="rech" placeholder="Login, nom ou prénom" autocomplete="off" />
            </mat-form-field>
            <button mat-button (click)="reinitialiser()">Réinitialiser</button>
          </div>
          @if (idProgramme) {
            <p class="filtre-programme" style="display:flex;align-items:center;gap:6px;font-size:13px;color:var(--qx-texte-2,#666);margin:4px 0 8px"><mat-icon style="font-size:18px;width:18px;height:18px">work_outline</mat-icon> Programme : {{ libelleProgramme || idProgramme }} (depuis le tableau de bord)
              <button mat-button (click)="idProgramme = null; appliquer()">Retirer</button></p>
          }
          @if (chargement) { <app-chargement /> }
          @else if (pag.length === 0) { <p class="vide">{{ recherche.trim() ? 'Aucun agent ne correspond à la recherche.' : 'Aucun coaching à mener' + (dateDebut && !dateFin ? ' depuis le ' + (dateDebut | date: 'dd/MM/yyyy') : '') + '.' }}</p> }
          @else {
            <p class="compteur">{{ pag.length }} évaluation{{ pag.length > 1 ? 's' : '' }}{{ dateDebut && !dateFin ? ' depuis le ' + (dateDebut | date: 'dd/MM/yyyy') : '' }}</p>
            <div class="table-cadre">
              <table mat-table [dataSource]="pag.page" class="table">
                <ng-container matColumnDef="agent">
                  <th mat-header-cell *matHeaderCellDef>Agent</th>
                  <td mat-cell *matCellDef="let e"><span class="fort">{{ e.agent_nom }} {{ e.agent_prenom }}</span>@if (e.agent_login) { <span class="login">({{ e.agent_login }})</span> }</td>
                </ng-container>
                <ng-container matColumnDef="evaluateur">
                  <th mat-header-cell *matHeaderCellDef>Évaluateur</th>
                  <td mat-cell *matCellDef="let e">{{ e.evaluateur_nom }} {{ e.evaluateur_prenom }}</td>
                </ng-container>
                <ng-container matColumnDef="date">
                  <th mat-header-cell *matHeaderCellDef>Date d'appel</th>
                  <td mat-cell *matCellDef="let e">{{ e.date_appel ? (e.date_appel | date: 'dd/MM/yyyy') : '—' }}</td>
                </ng-container>
                <ng-container matColumnDef="coaching">
                  <th mat-header-cell *matHeaderCellDef>Coaching</th>
                  <td mat-cell *matCellDef="let e">
                    @if (e.coaching_statut === 'TERMINE') { <span class="pastille succes"><mat-icon>check_circle</mat-icon> Terminé</span> }
                    @else if (e.coaching_statut) { <span class="pastille attente"><mat-icon>schedule</mat-icon> En cours</span> }
                    @else { <span class="pastille echec"><mat-icon>flag</mat-icon> À faire</span> }
                  </td>
                </ng-container>
                <ng-container matColumnDef="ouvrir">
                  <th mat-header-cell *matHeaderCellDef></th>
                  <td mat-cell *matCellDef="let e" class="col-ouvrir"><mat-icon>chevron_right</mat-icon></td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="colonnes"></tr>
                <tr mat-row *matRowDef="let row; columns: colonnes" class="ligne" (click)="ouvrir(row)" title="Ouvrir l'évaluation"></tr>
              </table>
            </div>
            <mat-paginator [length]="pag.length" [pageIndex]="pag.pageIndex" [pageSize]="pag.pageSize"
                           [pageSizeOptions]="pag.tailles" showFirstLastButtons (page)="changerPage($event)" />
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
})
export class MesCoachingComponent implements OnInit, OnDestroy {
  private readonly service = inject(EvalInstanceService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toastr = inject(ToastrService);
  private readonly perms = inject(PermissionsService);

  /** Pagination côté serveur : seule la page affichée est chargée. */
  readonly pag = new PaginationServeur<EvaluationListe>();
  private minuterie: any = null;
  /** Numéro de la dernière requête : une réponse plus ancienne est ignorée. */
  private requete = 0;
  recherche = '';
  chargement = false;
  colonnes = ['agent', 'evaluateur', 'date', 'coaching', 'ouvrir'];
  dateDebut: any = null;
  dateFin: any = null;
  etat = '';
  etendue = '';
  /** '' = période sur la date d'appel ; 'evaluation' = sur la date d'évaluation (venue du tableau de bord). */
  dateSur = '';
  idSite: number | null = null;
  /** Programme venu du tableau de bord (out124). */
  idProgramme: number | null = null;
  libelleProgramme = '';
  readonly peutPerimetre = this.perms.can('evaluation.voir_tous');

  ngOnInit(): void {
    const q = this.route.snapshot.queryParamMap;
    // Par défaut (accès par le menu) : à faire ou en cours ; depuis le tableau de bord : l'état de la tuile.
    this.etat = ['a_faire', 'en_cours', 'termine', 'non_termine'].includes(q.get('etat') || '') ? q.get('etat')!
      : q.keys.length ? '' : 'non_termine';
    this.etendue = q.get('etendue') === 'perimetre' && this.peutPerimetre ? 'perimetre' : '';
    this.dateSur = q.get('date_sur') === 'evaluation' ? 'evaluation' : '';
    if (q.get('du')) this.dateDebut = new Date(q.get('du') + 'T00:00:00');
    if (q.get('au')) this.dateFin = new Date(q.get('au') + 'T00:00:00');
    this.idSite = /^\d+$/.test(q.get('id_site') || '') ? Number(q.get('id_site')) : null;
    this.idProgramme = /^\d+$/.test(q.get('id_programme') || '') ? Number(q.get('id_programme')) : null;
    this.libelleProgramme = q.get('programme_libelle') || '';
    this.charger();
  }
  ngOnDestroy(): void { clearTimeout(this.minuterie); }

  charger(): void {
    this.chargement = true;
    const f: any = { portee: 'coaching' };
    if (this.etendue) f.etendue = this.etendue;
    if (this.etat) f.coaching_etat = this.etat;
    if (this.dateSur) f.date_sur = this.dateSur;
    if (this.idSite && this.etendue) f.id_site = this.idSite;
    if (this.idProgramme) f.id_programme = this.idProgramme;
    if (this.dateDebut) f.date_debut = toYMD(this.dateDebut);
    if (this.dateFin) f.date_fin = toYMD(this.dateFin);
    if (this.recherche.trim()) f.q = this.recherche.trim();
    const n = ++this.requete;
    this.service.getEvaluationsPage(f, this.pag.params()).subscribe({
      next: r => { if (n !== this.requete) return; this.pag.recevoir(r); this.chargement = false; },
      error: () => { if (n !== this.requete) return; this.toastr.error('Impossible de charger les coaching.'); this.chargement = false; },
    });
  }
  /** Changement d'un filtre : première page, rechargement. */
  appliquer(): void { clearTimeout(this.minuterie); this.pag.premiere(); this.charger(); }
  /** Recherche agent (login, nom, prénom) : envoyée au serveur après une courte pause de frappe. */
  rechercher(): void { clearTimeout(this.minuterie); this.minuterie = setTimeout(() => this.appliquer(), 350); }
  changerPage(e: PageEvent): void { this.pag.changer(e); this.charger(); }
  reinitialiser(): void {
    this.dateDebut = null; this.dateFin = null; this.etat = 'non_termine'; this.recherche = '';
    this.dateSur = ''; this.idSite = null; this.idProgramme = null; this.etendue = '';
    this.router.navigate([], { queryParams: {}, replaceUrl: true });
    this.appliquer();
  }
  ouvrir(e: EvaluationListe): void { this.router.navigate(['/mon-espace/evaluation/executer', e.id]); }
}
