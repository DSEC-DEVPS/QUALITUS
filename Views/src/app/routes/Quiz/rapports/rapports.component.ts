import { Component, OnInit, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ToastrService } from 'ngx-toastr';
import * as XLSX from 'xlsx';
import { QuizService } from '@shared/services/quiz.service';
import { RapportQuestion, RapportQuiz } from '../interfaces';

@Component({
  selector: 'app-rapports',
  standalone: true,
  imports: [
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatExpansionModule,
    MatProgressBarModule,
  ],
  templateUrl: './rapports.component.html',
  styleUrl: './rapports.component.scss',
})
export class RapportsComponent implements OnInit {
  private readonly quizSrv = inject(QuizService);
  private readonly toast = inject(ToastrService);

  rapport: RapportQuiz[] = [];
  colonnes = ['titre', 'fiche_titre', 'nb_tentatives', 'nb_reussis', 'taux_reussite', 'score_moyen'];
  detailParQuiz: Record<number, RapportQuestion[]> = {};

  ngOnInit(): void {
    this.quizSrv.getRapportDifficulte().subscribe({
      next: r => (this.rapport = r),
      error: () => this.toast.error('Impossible de charger le rapport'),
    });
  }

  chargerDetail(q: RapportQuiz) {
    if (this.detailParQuiz[q.id]) {
      return;
    }
    this.quizSrv.getRapportQuestions(q.id).subscribe({
      next: d => (this.detailParQuiz[q.id] = d),
      error: () => this.toast.error('Impossible de charger le detail'),
    });
  }

  classeTaux(taux: number | null): string {
    if (taux == null) {
      return '';
    }
    if (taux < 50) {
      return 'rouge';
    }
    if (taux < 75) {
      return 'orange';
    }
    return 'vert';
  }

  exporter() {
    const data = this.rapport.map(r => ({
      Quiz: r.titre,
      'Contenu associe': r.fiche_titre || '',
      Tentatives: r.nb_tentatives,
      Reussites: r.nb_reussis,
      'Taux de reussite (%)': r.taux_reussite ?? '',
      'Score moyen (%)': r.score_moyen ?? '',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rapport Quiz');
    XLSX.writeFile(wb, `Rapport_Quiz_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }
}
