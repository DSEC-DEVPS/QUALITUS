import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { ToastrService } from 'ngx-toastr';
import { QuizService } from '@shared/services/quiz.service';
import { QuizDisponible } from '../interfaces';

@Component({
  selector: 'app-participer-liste',
  standalone: true,
  imports: [MatCardModule, MatButtonModule, MatIconModule, MatChipsModule],
  templateUrl: './participer-liste.component.html',
  styleUrl: './participer-liste.component.scss',
})
export class ParticiperListeComponent implements OnInit {
  private readonly quizSrv = inject(QuizService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastrService);

  quizzes: QuizDisponible[] = [];
  chargement = true;

  ngOnInit(): void {
    this.quizSrv.getDisponibles().subscribe({
      next: q => {
        this.quizzes = q;
        this.chargement = false;
      },
      error: () => {
        this.toast.error('Impossible de charger les quiz');
        this.chargement = false;
      },
    });
  }

  estReussi(q: QuizDisponible): boolean {
    return q.derniere_reussi === 1;
  }
  retestAutorise(q: QuizDisponible): boolean {
    return (q.retest_autorise || 0) > 0;
  }
  // Bloque : deja tente, non reussi, sans autorisation de retest
  estBloque(q: QuizDisponible): boolean {
    return q.nb_essais > 0 && q.derniere_reussi !== 1 && !this.retestAutorise(q);
  }
  peutJouer(q: QuizDisponible): boolean {
    return q.nb_essais === 0 || (q.derniere_reussi !== 1 && this.retestAutorise(q));
  }

  commencer(q: QuizDisponible) {
    this.router.navigate(['/mon-espace/quiz/participer', q.id]);
  }
}
