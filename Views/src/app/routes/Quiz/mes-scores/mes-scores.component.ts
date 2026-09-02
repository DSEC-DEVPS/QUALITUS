import { Component, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ToastrService } from 'ngx-toastr';
import { QuizService } from '@shared/services/quiz.service';
import { BadgeUtilisateur, ScoreHistorique } from '../interfaces';

@Component({
  selector: 'app-mes-scores',
  standalone: true,
  imports: [MatCardModule, MatTableModule, MatIconModule, MatChipsModule, MatTooltipModule, DatePipe],
  templateUrl: './mes-scores.component.html',
  styleUrl: './mes-scores.component.scss',
})
export class MesScoresComponent implements OnInit {
  private readonly quizSrv = inject(QuizService);
  private readonly toast = inject(ToastrService);

  dataSource = new MatTableDataSource<ScoreHistorique>([]);
  displayedColumns = ['date_tentative', 'quiz_titre', 'num_essai', 'score', 'statut'];
  badges: BadgeUtilisateur[] = [];

  ngOnInit(): void {
    this.quizSrv.getMesScores().subscribe({
      next: d => (this.dataSource.data = d),
      error: () => this.toast.error("Impossible de charger l'historique"),
    });
    this.quizSrv.getMesBadges().subscribe({
      next: b => (this.badges = b),
      error: () => {},
    });
  }
}
