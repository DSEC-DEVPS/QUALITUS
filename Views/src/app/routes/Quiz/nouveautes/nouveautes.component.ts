import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { ToastrService } from 'ngx-toastr';
import {
  AppearanceAnimation,
  ConfirmBoxInitializer,
  DialogLayoutDisplay,
  DisappearanceAnimation,
} from '@costlydeveloper/ngx-awesome-popup';
import { QuizService } from '@shared/services/quiz.service';
import { QuizNotification, ReinitialisationDemande } from '../interfaces';
import { iconeNotification } from '../../../theme/widgets/notification-icon';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UserService as NotificationsService } from '../../../theme/widgets/notification.service';
import { ChargementComponent } from '@shared/components/chargement/chargement.component';

@Component({
  selector: 'app-nouveautes',
  standalone: true,
  imports: [ChargementComponent, MatCardModule, MatButtonModule, MatIconModule, MatListModule, DatePipe],
  templateUrl: './nouveautes.component.html',
  styleUrl: './nouveautes.component.scss',
})
export class NouveautesComponent implements OnInit {
  chargement = true;
  private readonly quizSrv = inject(QuizService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastrService);

  notifications: QuizNotification[] = [];
  /** Demandes de réinitialisation en attente de ma confirmation. */
  reinitialisations: ReinitialisationDemande[] = [];
  /** Quiz mis en évidence (lien depuis la cloche : ?reinitialisation=<id quiz>). */
  quizEnEvidence: number | null = null;

  private readonly notifSrv = inject(NotificationsService);
  /** Lue depuis la cloche pendant qu'on est sur la page : la liste se met à jour. */
  private readonly sync = this.notifSrv.lecture$.pipe(takeUntilDestroyed()).subscribe(o => {
    if (o === 'cloche') this.charger(false);
  });

  ngOnInit(): void {
    this.charger();
    this.route.queryParamMap.subscribe(qp => {
      const q = Number(qp.get('reinitialisation'));
      this.quizEnEvidence = q || null;
      this.chargerReinitialisations(true);
    });
  }

  chargerReinitialisations(depuisLien = false) {
    this.quizSrv.getMesReinitialisations().subscribe({
      next: r => {
        this.reinitialisations = r;
        if (depuisLien && this.quizEnEvidence && !r.some(d => d.id_Quiz === this.quizEnEvidence)) {
          this.toast.info("Cette demande de réinitialisation n'est plus en attente (traitée, annulée ou quiz clôturé).");
        }
      },
      error: () => {},
    });
  }

  repondre(d: ReinitialisationDemande, decision: 'CONFIRMER' | 'REFUSER') {
    const confirmer = decision === 'CONFIRMER';
    const box = new ConfirmBoxInitializer();
    box.setTitle(confirmer ? 'Confirmer la réinitialisation' : 'Refuser la réinitialisation');
    box.setMessage(
      confirmer
        ? `Votre essai sur « ${d.quiz_titre} » sera supprimé et vous pourrez repasser le quiz. Confirmez-vous ?`
        : `Votre essai sur « ${d.quiz_titre} » sera conservé. Refusez-vous la réinitialisation ?`
    );
    box.setConfig({
      layoutType: confirmer ? DialogLayoutDisplay.WARNING : DialogLayoutDisplay.INFO,
      animationIn: AppearanceAnimation.BOUNCE_IN,
      animationOut: DisappearanceAnimation.BOUNCE_OUT,
      buttonPosition: 'right',
    });
    box.setButtonLabels(confirmer ? 'Oui, je confirme' : 'Oui, je refuse', 'Non');
    box.openConfirmBox$().subscribe(resp => {
      if (!resp.success) return;
      this.quizSrv.repondreReinitialisation(d.id, decision).subscribe({
        next: r => {
          this.toast.success(r.message);
          this.chargerReinitialisations();
        },
        error: err => {
          this.toast.error(err?.error?.message || "Une erreur s'est produite");
          this.chargerReinitialisations();
        },
      });
    });
  }

  /**
   * Seules les notifications NON LUES sont affichées. Une notification ouverte
   * ici est marquée lue (et retirée de la cloche) mais reste visible, grisée,
   * jusqu'à ce qu'on quitte la page ; au prochain passage elle n'apparaît plus.
   */
  charger(avecIndicateur = true) {
    if (avecIndicateur) this.chargement = true;
    const deja = new Set(this.notifications.filter(n => n.lu).map(n => n.id));
    this.quizSrv.getMesNotifications().pipe(finalize(() => (this.chargement = false))).subscribe({
      next: n => (this.notifications = n.filter(x => !x.lu || deja.has(x.id))),
      error: () => this.toast.error('Impossible de charger les nouveautés'),
    });
  }

  get nbNonLues(): number {
    return this.notifications.filter(n => !n.lu).length;
  }

  /** Icône selon le type de notification quiz (même règle que la cloche). */
  icone(n: QuizNotification): string {
    return iconeNotification({ titre: n.titre, source: 'QUIZ' });
  }

  ouvrir(n: QuizNotification) {
    if (!n.lu) {
      this.quizSrv.marquerLu(n.id).subscribe({ next: () => { n.lu = 1; this.notifSrv.lecture$.next('page'); } });
    }
    // Réinitialisation demandée (agent) : la confirmation se fait ici même.
    if (n.titre === 'Réinitialisation demandée') {
      this.router.navigate([], { queryParams: { reinitialisation: n.id_Quiz } });
      return;
    }
    // Barème modifié : le nouveau score est visible dans Mes scores.
    if (n.titre === 'Score recalculé') {
      this.router.navigate(['/mon-espace/quiz/mes-scores']);
      return;
    }
    // Réponse à une réinitialisation (demandeur) : détail du quiz.
    if (n.titre === 'Réinitialisation confirmée' || n.titre === 'Réinitialisation refusée') {
      this.router.navigate(['/mon-espace/quiz/detail', n.id_Quiz]);
      return;
    }
    // Autorisation (site invité) : elle porte sur l'ouverture du DÉTAIL du quiz,
    // pas sur la participation -> on ouvre le détail.
    if (n.titre === 'Autorisation quiz') {
      this.router.navigate(['/mon-espace/quiz/detail', n.id_Quiz]);
      return;
    }
    // Quiz privé : l'accès passe par le code PIN -> page Participer (qui ouvre la
    // saisie du PIN et affiche le message, comme depuis la cloche).
    if ((n.quiz_acces || 'PRIVATE') !== 'PUBLIC') {
      this.router.navigate(['/mon-espace/quiz/participer'], {
        queryParams: { pin: 'saisir', ...(n.quiz_titre ? { quiz: n.quiz_titre } : {}) },
      });
      return;
    }
    this.router.navigate(['/mon-espace/quiz/participer', n.id_Quiz]);
  }

}
