import { Component, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { PointsPipe } from '../points.pipe';
import { Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSort, MatSortModule, Sort } from '@angular/material/sort';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { ToastrService } from 'ngx-toastr';
import {
  AppearanceAnimation,
  ConfirmBoxInitializer,
  DialogLayoutDisplay,
  DisappearanceAnimation,
} from '@costlydeveloper/ngx-awesome-popup';
import { ConfirmationService } from '@shared/services/confirmation.service';
import { firstValueFrom } from 'rxjs';
import { garantirBareme } from '../bareme';
import { QuizService } from '@shared/services/quiz.service';
import { Periode, libellePeriode, suffixePeriode } from '@shared/periode';
import { FiltrePeriodeComponent } from '../filtre-periode/filtre-periode.component';
import { ecrireClasseur } from '../export-quiz';
import { Quiz } from '../interfaces';

import { CanDirective } from '@core/authorization/can.directive';
import { finalize } from 'rxjs';
import { ChargementComponent } from '@shared/components/chargement/chargement.component';
@Component({
  selector: 'app-liste-quiz',
  standalone: true,
  imports: [PointsPipe, ChargementComponent, CanDirective,
    FiltrePeriodeComponent,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatTooltipModule,
    DatePipe,
    RouterLink,
  ],
  templateUrl: './liste-quiz.component.html',
  styleUrl: './liste-quiz.component.scss',
})
export class ListeQuizComponent implements OnInit, OnDestroy {
  chargement = true;
  private readonly quizSrv = inject(QuizService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastrService);
  private readonly confirmation = inject(ConfirmationService);
  /** Page affichée : filtres, tri et pagination appliqués par le serveur (out113). */
  dataSource: Quiz[] = [];
  total = 0;
  pageIndex = 0;
  pageSize = 5; // comme avant (première taille proposée)
  displayedColumns = ['id', 'titre', 'createur_site', 'code_pin', 'fiche_titre', 'nb_questions', 'note_passage', 'Etat', 'statut', 'actions'];
  @ViewChild(MatSort) sort!: MatSort;
  /** Tri en vigueur (colonne, sens) ; vide = ordre du serveur (plus récent d'abord). */
  tri = '';
  sens: '' | 'asc' | 'desc' = '';
  /** Période sur la date de création du quiz (filtre serveur) ; toutes dates par défaut. */
  periode: Periode = { du: null, au: null };
  /** Recherche texte en vigueur (reprise dans l'export). */
  recherche = '';
  /** Filtre de statut : quiz actifs par défaut ; '' = tous. */
  statut: '' | 'ACTIF' | 'INACTIF' = 'ACTIF';
  /** Filtre « Site du créateur » (out115) : '' = tous ; 'aucun' = sans site. */
  siteCreateur = '';
  /** Sites des créateurs des quiz visibles (fournis par le serveur). */
  sitesCreateurs: { id: string; nom: string }[] = [];
  private minuterie: any = null;
  private requete = 0;

  ngOnInit(): void {
    this.charger();
  }
  ngOnDestroy(): void { clearTimeout(this.minuterie); }

  private filtres() {
    return { q: this.recherche, statut: this.statut, tri: this.sens ? this.tri : '', sens: this.sens, site_createur: this.siteCreateur };
  }

  /** Nouveau filtre : première page. */
  private filtrer(): void {
    clearTimeout(this.minuterie);
    this.pageIndex = 0;
    this.charger();
  }

  changerSiteCreateur(v: string): void {
    this.siteCreateur = v || '';
    this.filtrer();
  }

  changerStatutFiltre(v: '' | 'ACTIF' | 'INACTIF'): void {
    this.statut = v;
    this.filtrer();
  }

  charger() {
    this.chargement = true;
    const n = ++this.requete;
    this.quizSrv.getAllPage(this.periode, this.filtres(), { page: this.pageIndex + 1, taille: this.pageSize })
      .pipe(finalize(() => { if (n === this.requete) this.chargement = false; }))
      .subscribe({
        next: r => {
          if (n !== this.requete) return;
          // la dernière page a été vidée (quiz supprimé / désactivé) : page précédente
          if (!r.lignes.length && this.pageIndex > 0) { this.pageIndex--; this.charger(); return; }
          this.dataSource = r.lignes;
          this.total = r.total;
          this.sitesCreateurs = r.sites_createurs || [];
        },
        error: () => this.toast.error('Impossible de charger les quiz'),
      });
  }

  /** Recherche : envoyée au serveur après une courte pause de frappe. */
  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.recherche = filterValue.trim();
    clearTimeout(this.minuterie);
    this.minuterie = setTimeout(() => this.filtrer(), 300);
  }

  trier(e: Sort) {
    this.tri = e.active;
    this.sens = e.direction;
    this.filtrer();
  }

  changerPage(e: PageEvent) {
    this.pageIndex = e.pageSize !== this.pageSize ? 0 : e.pageIndex;
    this.pageSize = e.pageSize;
    this.charger();
  }

  changerPeriode(p: Periode) {
    this.periode = p;
    this.filtrer();
  }

  nouveau() {
    this.router.navigate(['/mon-espace/quiz/creer']);
  }

  editer(q: Quiz) {
    this.router.navigate(['/mon-espace/quiz/editer', q.id]);
  }

  // Un quiz d'un site invité ne s'ouvre qu'avec une autorisation explicite
  // (cahier Quiz, Partie III) : visibilité dans la liste ≠ ouverture du détail.
  peutOuvrir(q: any): boolean {
    return q?.autorise !== 0 && q?.autorise !== false;
  }

  detail(q: any) {
    if (!this.peutOuvrir(q)) {
      this.toast.warning(
        "Autorisation requise pour ouvrir ce quiz. Demandez-la à un utilisateur du site propriétaire."
      );
      return;
    }
    this.router.navigate(['/mon-espace/quiz/detail', q.id]);
  }

  /** Active / désactive un quiz (site propriétaire) ; met la ligne à jour sans recharger. */
  async basculerStatut(q: Quiz) {
    const statut = q.statut === 'INACTIF' ? 'ACTIF' : 'INACTIF';
    // out114 : activer exige un barème à 100 -> proposer de répartir avant.
    if (statut === 'ACTIF' && !(await garantirBareme(this.confirmation, Number(q.total_points ?? 0), Number(q.nb_questions ?? 0),
        'activer', async () => {
          try { await firstValueFrom(this.quizSrv.repartirPoints(q.id)); return true; } catch { return false; }
        }))) return;
    this.quizSrv.changerStatut(q.id, statut).subscribe({
      next: r => {
        q.statut = r.statut;
        this.toast.success(r.message);
        this.charger(); // le quiz peut sortir du filtre de statut
      },
      // Erreurs : message du serveur affiché par l'intercepteur global.
      error: () => {},
    });
  }

  supprimer(q: Quiz) {
    const box = new ConfirmBoxInitializer();
    box.setTitle('Suppression !');
    box.setMessage(`Supprimer le quiz "${q.titre}" et toutes ses questions ?`);
    box.setConfig({
      layoutType: DialogLayoutDisplay.DANGER,
      animationIn: AppearanceAnimation.BOUNCE_IN,
      animationOut: DisappearanceAnimation.BOUNCE_OUT,
      buttonPosition: 'right',
    });
    box.setButtonLabels('OUI', 'NON');
    box.openConfirmBox$().subscribe(resp => {
      if (resp.success) {
        this.quizSrv.delete(q.id).subscribe({
          next: r => {
            this.toast.success(r.message);
            this.charger();
          },
          error: () => this.toast.error('Suppression impossible'),
        });
      }
    });
  }

  /**
   * Exporte le résultat en vigueur : période + recherche appliquées, dans
   * l'ordre du tri affiché, toutes pages confondues.
   */
  /** out113 : l'export demande au serveur toutes les lignes (filtres et tri en vigueur). */
  exporter() {
    this.quizSrv.getAllPage(this.periode, this.filtres(), null).subscribe({
      next: r => this.ecrireExport(r.lignes),
      error: () => this.toast.error("Impossible de préparer l'export"),
    });
  }

  private ecrireExport(visibles: Quiz[]) {
    if (!visibles.length) {
      this.toast.info('Aucune donnée à exporter');
      return;
    }
    const lignes = visibles.map(q => ({
      Id: q.id,
      Titre: q.titre,
      'Site du créateur': q.createur_site || 'Sans site',
      'Code PIN': q.code_pin || '',
      Description: q.description || '',
      'Contenus associés': (q.fiches_liees || []).map(f => f.titre).join(' ; ') || q.fiche_titre || '',
      'Nb questions': q.nb_questions ?? 0,
      'Note de passage (%)': q.note_passage,
      'Retest auto': q.retest_auto ? 'Oui' : 'Non',
      Etat: q.Etat === 'CLOTURER' ? 'Clôturé' : 'Ouvert',
      Statut: q.statut === 'INACTIF' ? 'Inactif' : 'Actif',
      'Date de création': q.dateCreation ? new Date(q.dateCreation).toLocaleDateString('fr-FR') : '',
    }));
    ecrireClasseur(`Liste_Quiz_${suffixePeriode(this.periode)}.xlsx`, [
      {
        nom: 'Quiz',
        entete: [
          `Période (date de création) : ${libellePeriode(this.periode)}`,
          `Recherche : ${this.recherche || '—'}`,
          `Statut : ${this.statut === 'ACTIF' ? 'Actif' : this.statut === 'INACTIF' ? 'Inactif' : 'Tous'}`,
          `Site du créateur : ${this.sitesCreateurs.find(s => s.id === this.siteCreateur)?.nom || 'Tous les sites'}`,
          `${lignes.length} quiz`,
        ],
        lignes,
      },
    ]);
  }
}
