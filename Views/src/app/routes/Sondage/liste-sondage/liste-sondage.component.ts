import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { ToastrService } from 'ngx-toastr';
import {
  AppearanceAnimation,
  ConfirmBoxInitializer,
  DialogLayoutDisplay,
  DisappearanceAnimation,
} from '@costlydeveloper/ngx-awesome-popup';
import { SondageService } from '@shared/services/sondage.service';
import { Sondage } from '../interfaces';

@Component({
  selector: 'app-liste-sondage',
  standalone: true,
  imports: [
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTooltipModule,
    MatMenuModule,
  ],
  templateUrl: './liste-sondage.component.html',
  styleUrl: './liste-sondage.component.scss',
})
export class ListeSondageComponent implements OnInit {
  private readonly srv = inject(SondageService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastrService);

  sondages: Sondage[] = [];
  cols = ['id', 'nom', 'langue', 'statut', 'nb_questions', 'actions'];

  ngOnInit(): void {
    this.charger();
  }

  charger() {
    this.srv.getAll().subscribe({
      next: d => (this.sondages = d),
      error: () => this.toast.error('Impossible de charger les sondages'),
    });
  }

  nouveau() {
    this.router.navigate(['/mon-espace/sondage/creer']);
  }
  editer(s: Sondage) {
    this.router.navigate(['/mon-espace/sondage/editer', s.id]);
  }
  cible(s: Sondage) {
    this.router.navigate(['/mon-espace/sondage/cible', s.id]);
  }
  rapport(s: Sondage) {
    this.router.navigate(['/mon-espace/sondage/rapport', s.id]);
  }

  statutLabel(s: Sondage): string {
    switch (s.statut) {
      case 'ACTIF':
        return 'Actif';
      case 'DESACTIF':
        return 'Désactivé';
      default:
        return 'En cours';
    }
  }

  basculerStatut(s: Sondage) {
    const nouveau = s.statut === 'ACTIF' ? 'DESACTIF' : 'ACTIF';
    this.srv.changerStatut(s.id, nouveau).subscribe({
      next: r => {
        this.toast.success(r.message);
        this.charger();
      },
      error: () => this.toast.error("Une erreur s'est produite"),
    });
  }

  dupliquer(s: Sondage) {
    this.srv.dupliquer(s.id).subscribe({
      next: r => {
        this.toast.success(r.message);
        this.charger();
      },
      error: () => this.toast.error('Duplication impossible'),
    });
  }

  supprimer(s: Sondage) {
    const box = new ConfirmBoxInitializer();
    box.setTitle('Suppression !');
    box.setMessage(`Supprimer le sondage "${s.nom}" et toutes ses questions ?`);
    box.setConfig({
      layoutType: DialogLayoutDisplay.DANGER,
      animationIn: AppearanceAnimation.BOUNCE_IN,
      animationOut: DisappearanceAnimation.BOUNCE_OUT,
      buttonPosition: 'right',
    });
    box.setButtonLabels('OUI', 'NON');
    box.openConfirmBox$().subscribe(resp => {
      if (resp.success) {
        this.srv.delete(s.id).subscribe({
          next: r => {
            this.toast.success(r.message);
            this.charger();
          },
          error: () => this.toast.error('Suppression impossible'),
        });
      }
    });
  }
}
