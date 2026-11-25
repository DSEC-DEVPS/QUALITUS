import { Component, OnInit, inject } from '@angular/core';
import { PointsPipe } from '../points.pipe';
import { DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { PaginationServeur, periodeParDefaut } from '@shared/utils/pagination-serveur';
import { PageEvent } from '@angular/material/paginator';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { ToastrService } from 'ngx-toastr';
import { QuizService } from '@shared/services/quiz.service';
import { Periode } from '@shared/periode';
import { FiltrePeriodeComponent } from '../filtre-periode/filtre-periode.component';
import { BadgeUtilisateur, ScoreHistorique } from '../interfaces';
import { finalize } from 'rxjs';
import { ChargementComponent } from '@shared/components/chargement/chargement.component';
import { BadgesQuizComponent } from '../badges-quiz/badges-quiz.component';

@Component({
  selector: 'app-mes-scores',
  standalone: true,
  imports: [PointsPipe, ChargementComponent, BadgesQuizComponent, MatExpansionModule, MatCardModule, MatTableModule, MatPaginatorModule, MatIconModule, MatChipsModule, MatTooltipModule, DatePipe, FiltrePeriodeComponent],
  templateUrl: './mes-scores.component.html',
  styleUrl: './mes-scores.component.scss',
})
export class MesScoresComponent implements OnInit {
  chargement = true;
  private readonly quizSrv = inject(QuizService);
  private readonly toast = inject(ToastrService);

  /** Pagination côté serveur (out113) : seule la page affichée est chargée. */
  readonly pag = new PaginationServeur<ScoreHistorique>();
  displayedColumns = ['date_tentative', 'quiz_titre', 'num_essai', 'score', 'statut'];
  badges: BadgeUtilisateur[] = [];
  /** Période sur la date de la tentative (filtre serveur) : 3 derniers mois par défaut. */
  periode: Periode = periodeParDefaut();

  /** Panneau des badges : replié par défaut, l'état est mémorisé dans le navigateur. */
  private static readonly CLE_BADGES = 'qualitus.mesScores.badgesOuverts';
  badgesOuverts = (() => { try { return localStorage.getItem(MesScoresComponent.CLE_BADGES) === '1'; } catch { return false; } })();
  get badgesObtenus(): BadgeUtilisateur[] { return this.badges.filter(b => b.obtenu === 1); }
  memoriserBadges(ouvert: boolean): void {
    this.badgesOuverts = ouvert;
    try { localStorage.setItem(MesScoresComponent.CLE_BADGES, ouvert ? '1' : '0'); } catch { /* stockage indisponible */ }
  }

  ngOnInit(): void {
    this.chargerScores();
    this.quizSrv.getMesBadges().subscribe({
      next: b => (this.badges = b),
      error: () => {},
    });
  }

  chargerScores() {
    this.chargement = true;
    this.quizSrv.getMesScoresPage(this.periode, this.pag.params()).pipe(finalize(() => (this.chargement = false))).subscribe({
      next: r => this.pag.recevoir(r),
      error: () => this.toast.error("Impossible de charger l'historique"),
    });
  }

  changerPeriode(p: Periode) {
    this.periode = p;
    this.pag.premiere();
    this.chargerScores();
  }

  changerPage(e: PageEvent) {
    this.pag.changer(e);
    this.chargerScores();
  }
}
