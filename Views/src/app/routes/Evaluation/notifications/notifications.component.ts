import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { ToastrService } from 'ngx-toastr';
import { EvaluationService } from '@shared/services/evaluation.service';
import { EvalNotification } from '../interfaces';

@Component({
  selector: 'app-ev-notifications',
  standalone: true,
  imports: [MatCardModule, MatButtonModule, MatIconModule, MatListModule, DatePipe],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.scss',
})
export class EvNotificationsComponent implements OnInit {
  private readonly srv = inject(EvaluationService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastrService);

  notifications: EvalNotification[] = [];

  ngOnInit(): void {
    this.charger();
  }

  charger() {
    this.srv.getMesNotifications().subscribe({
      next: n => (this.notifications = n),
      error: () => this.toast.error('Impossible de charger les notifications'),
    });
  }

  get nbNonLues(): number {
    return this.notifications.filter(n => !n.lu).length;
  }

  ouvrir(n: EvalNotification) {
    if (!n.lu) {
      this.srv.marquerNotifLu(n.id).subscribe({ next: () => (n.lu = 1) });
    }
    this.router.navigate(['/mon-espace/evaluation/executer', n.id_Evaluation]);
  }

  toutLire() {
    this.srv.marquerToutNotifLu().subscribe({
      next: () => {
        this.notifications.forEach(n => (n.lu = 1));
        this.toast.success('Toutes les notifications sont lues');
      },
    });
  }
}
