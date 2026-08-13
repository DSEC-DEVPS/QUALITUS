import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { ToastrService } from 'ngx-toastr';
import { QuizService } from '@shared/services/quiz.service';
import { QuizNotification } from '../interfaces';

@Component({
  selector: 'app-nouveautes',
  standalone: true,
  imports: [MatCardModule, MatButtonModule, MatIconModule, MatListModule, DatePipe],
  templateUrl: './nouveautes.component.html',
  styleUrl: './nouveautes.component.scss',
})
export class NouveautesComponent implements OnInit {
  private readonly quizSrv = inject(QuizService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastrService);

  notifications: QuizNotification[] = [];

  ngOnInit(): void {
    this.charger();
  }

  charger() {
    this.quizSrv.getMesNotifications().subscribe({
      next: n => (this.notifications = n),
      error: () => this.toast.error('Impossible de charger les nouveautes'),
    });
  }

  get nbNonLues(): number {
    return this.notifications.filter(n => !n.lu).length;
  }

  ouvrir(n: QuizNotification) {
    if (!n.lu) {
      this.quizSrv.marquerLu(n.id).subscribe({ next: () => (n.lu = 1) });
    }
    this.router.navigate(['/mon-espace/quiz/participer', n.id_Quiz]);
  }

  toutLire() {
    this.quizSrv.marquerToutLu().subscribe({
      next: () => {
        this.notifications.forEach(n => (n.lu = 1));
        this.toast.success('Toutes les notifications sont lues');
      },
    });
  }
}
