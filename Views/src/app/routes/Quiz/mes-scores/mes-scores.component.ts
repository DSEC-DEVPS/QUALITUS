import { Component, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { Pagination } from '@shared/utils/pagination';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ToastrService } from 'ngx-toastr';
import { QuizService } from '@shared/services/quiz.service';
import { Periode } from '@shared/periode';
import { FiltrePeriodeComponent } from '../filtre-periode/filtre-periode.component';
import { BadgeUtilisateur, ScoreHistorique } from '../interfaces';
import { finalize } from 'rxjs';
import { ChargementComponent } from '@shared/components/chargement/chargement.component';

@Component({
  selector: 'app-mes-scores',
  standalone: true,
  imports: [ChargementComponent, MatCardModule, MatTableModule, MatPaginatorModule, MatIconModule, MatChipsModule, MatTooltipModule, DatePipe, FiltrePeriodeComponent],
  templateUrl: './mes-scores.component.html',
  styleUrl: './mes-scores.component.scss',
})
export class MesScoresComponent implements OnInit {
  chargement = true;
  private readonly quizSrv = inject(QuizService);
  private readonly toast = inject(ToastrService);

  readonly pag = new Pagination<ScoreHistorique>();
  displayedColumns = ['date_tentative', 'quiz_titre', 'num_essai', 'score', 'statut'];
  badges: BadgeUtilisateur[] = [];
  /** Période sur la date de la tentative (filtre serveur). */
  periode: Periode = { du: null, au: null };

  ngOnInit(): void {
    this.chargerScores();
    this.quizSrv.getMesBadges().subscribe({
      next: b => (this.badges = b),
      error: () => {},
    });
  }

  chargerScores() {
    this.chargement = true;
    this.quizSrv.getMesScores(this.periode).pipe(finalize(() => (this.chargement = false))).subscribe({
      next: d => this.pag.definir(d),
      error: () => this.toast.error("Impossible de charger l'historique"),
    });
  }

  changerPeriode(p: Periode) {
    this.periode = p;
    this.chargerScores();
  }
}
