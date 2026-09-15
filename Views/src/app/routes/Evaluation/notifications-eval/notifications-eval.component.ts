import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { ToastrService } from 'ngx-toastr';
import { EvalAdminService, NotificationEval } from '../eval-admin.service';

@Component({
  selector: 'app-notifications-eval',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatListModule],
  templateUrl: './notifications-eval.component.html',
  styleUrl: './notifications-eval.component.scss',
})
export class NotificationsEvalComponent implements OnInit {
  private readonly service = inject(EvalAdminService);
  private readonly router = inject(Router);
  private readonly toastr = inject(ToastrService);

  notifications: NotificationEval[] = [];
  chargement = false;

  ngOnInit(): void { this.charger(); }

  charger(): void {
    this.chargement = true;
    this.service.getMesNotifications().subscribe({
      next: n => { this.notifications = n; this.chargement = false; },
      error: () => { this.toastr.error('Impossible de charger les notifications.'); this.chargement = false; },
    });
  }

  ouvrir(n: NotificationEval): void {
    if (!n.lu) this.service.marquerLu(n.id).subscribe({ next: () => (n.lu = 1) });
    if (n.id_evaluation) this.router.navigate(['/mon-espace/evaluation/executer', n.id_evaluation]);
  }

  toutLire(): void {
    this.service.marquerToutLu().subscribe({
      next: () => { this.toastr.success('Toutes marquées comme lues.'); this.charger(); },
      error: () => this.toastr.error('Erreur.'),
    });
  }
}
