import { Component, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { ToastrService } from 'ngx-toastr';
import { QuizService } from '@shared/services/quiz.service';
import { RetestEchec } from '../interfaces';

@Component({
  selector: 'app-retests',
  standalone: true,
  imports: [MatCardModule, MatButtonModule, MatIconModule, MatTableModule, MatChipsModule, DatePipe],
  templateUrl: './retests.component.html',
  styleUrl: './retests.component.scss',
})
export class RetestsComponent implements OnInit {
  private readonly quizSrv = inject(QuizService);
  private readonly toast = inject(ToastrService);

  dataSource = new MatTableDataSource<RetestEchec>([]);
  colonnes = ['agent', 'quiz', 'score', 'essai', 'date', 'actions'];

  ngOnInit(): void {
    this.charger();
  }

  charger() {
    this.quizSrv.getRetestEchecs().subscribe({
      next: d => (this.dataSource.data = d),
      error: () => this.toast.error('Impossible de charger les echecs'),
    });
  }

  autoriser(e: RetestEchec) {
    this.quizSrv.autoriserRetest(e.id_Quiz, e.id_UTILISATEUR).subscribe({
      next: r => {
        this.toast.success(r.message);
        this.charger();
      },
      error: () => this.toast.error("Une erreur s'est produite"),
    });
  }
}
