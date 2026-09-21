import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ToastrService } from 'ngx-toastr';
import { CalibrageService } from '../calibrage.service';

@Component({
  selector: 'app-cal-session',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule,
    MatCheckboxModule, MatTooltipModule, MatSlideToggleModule, MatButtonToggleModule,
    MatFormFieldModule, MatInputModule,
  ],
  templateUrl: './session.component.html',
  styleUrl: './session.component.scss',
})
export class SessionComponent implements OnInit, OnDestroy {
  private readonly service = inject(CalibrageService);
  private readonly toastr = inject(ToastrService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  id!: number;
  role: 'jauge' | 'participant' | null = null;
  session: any = null;
  accessible = true;
  transactions: any[] = [];
  participants: any[] = [];
  referenceComplete = false;
  statutParticipation = '';
  tempsRestant = 0;
  private timer: any = null;

  vueJauge: 'transactions' | 'evaluateurs' = 'transactions';
  rafraichissement = false;

  txSel: any = null;
  categories: any[] = [];
  catActive = 0;
  evaluationSel: any = null;
  lectureSeule = false;
  erreurDepliee: number | null = null;

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.charger();
  }
  ngOnDestroy(): void { this.stopTimer(); }

  charger(): void {
    this.service.getTravail(this.id).subscribe({
      next: d => {
        this.role = d.role;
        this.session = d.session;
        this.transactions = d.transactions || [];
        this.participants = d.participants || [];
        this.referenceComplete = !!d.reference_complete;
        if (this.role === 'participant') {
          this.accessible = d.accessible;
          this.statutParticipation = d.statut_participation;
          this.tempsRestant = d.temps_restant_secondes || 0;
          if (this.accessible) this.demarrerTimer();
        }
        if (this.transactions.length && (this.role === 'jauge' || this.accessible)) {
          const garder = this.txSel && this.transactions.find(t => t.id === this.txSel.id);
          this.selectionner(garder || this.transactions[0]);
        }
      },
      error: () => this.toastr.error('Session inaccessible.'),
    });
  }

  // --- Chrono ---
  demarrerTimer(): void {
    this.stopTimer();
    if (this.statutParticipation === 'CLOSE') return;
    this.timer = setInterval(() => {
      if (this.tempsRestant > 0) this.tempsRestant--;
      else { this.stopTimer(); this.charger(); } // expiration -> recharge (auto-clôture serveur)
    }, 1000);
  }
  stopTimer(): void { if (this.timer) { clearInterval(this.timer); this.timer = null; } }
  get chrono(): string {
    const s = Math.max(0, this.tempsRestant);
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    const p = (n: number) => String(n).padStart(2, '0');
    return `${p(h)}:${p(m)}:${p(sec)}`;
  }
  get participationClose(): boolean { return this.statutParticipation === 'CLOSE'; }

  // --- Sélection transaction / grille ---
  selectionner(tx: any): void {
    this.txSel = tx;
    this.service.getGrilleTransaction(tx.id).subscribe({
      next: d => {
        this.categories = d.categories || [];
        this.evaluationSel = d.evaluation;
        this.lectureSeule = d.lecture_seule;
        this.catActive = 0;
        this.erreurDepliee = null;
      },
      error: err => this.toastr.error(err?.error?.message || 'Grille inaccessible.'),
    });
  }
  get erreursActives(): any[] { return this.categories[this.catActive]?.erreurs || []; }

  // Jauge : à chaque bascule transactions/évaluateurs, recharger l'état courant
  // (avancement des évaluateurs, états des transactions) sans rafraîchir la page.
  changerVue(v: 'transactions' | 'evaluateurs'): void {
    this.vueJauge = v;
    this.rafraichir();
  }
  rafraichir(): void {
    this.rafraichissement = true;
    this.service.getTravail(this.id).subscribe({
      next: d => {
        this.session = d.session;
        this.transactions = d.transactions || [];
        this.participants = d.participants || [];
        this.referenceComplete = !!d.reference_complete;
        this.rafraichissement = false;
      },
      error: () => { this.rafraichissement = false; },
    });
  }

  toggle(err: any): void {
    if (this.lectureSeule) return;
    const nouveau = err.coche ? 0 : 1;
    this.service.toggleErreur(this.evaluationSel.id, err.id, { coche: !!nouveau, commentaire: err.commentaire }).subscribe({
      next: () => { err.coche = nouveau; if (this.txSel) this.txSel.etat = 'EN_COURS'; },
      error: e => this.toastr.error(e?.error?.message || 'Modification impossible.'),
    });
  }
  enregistrerCommentaire(err: any): void {
    if (this.lectureSeule) return;
    this.service.toggleErreur(this.evaluationSel.id, err.id, { coche: !!err.coche, commentaire: err.commentaire }).subscribe({
      next: () => this.toastr.success('Commentaire enregistré.'),
      error: () => this.toastr.error('Erreur.'),
    });
  }

  // --- Actions ---
  terminerTx(tx: any): void {
    this.service.terminerTransaction(tx.id).subscribe({
      next: () => { tx.etat = 'TERMINEE'; this.toastr.success('Transaction terminée.'); },
      error: () => this.toastr.error('Erreur.'),
    });
  }
  cloturerParticipation(): void {
    if (!confirm('Clôturer votre participation ? Toutes vos transactions seront déclarées terminées et vous ne pourrez plus les modifier.')) return;
    this.service.cloturerParticipation(this.id).subscribe({
      next: () => { this.toastr.success('Participation close.'); this.stopTimer(); this.charger(); },
      error: e => this.toastr.error(e?.error?.message || 'Erreur.'),
    });
  }
  cloturerReference(): void {
    if (!confirm('Clôturer votre évaluation de référence ?')) return;
    this.service.cloturerReference(this.id).subscribe({
      next: (r: any) => { this.toastr.success('Référence clôturée.'); this.charger(); },
      error: e => this.toastr.error(e?.error?.message || 'Erreur.'),
    });
  }
  basculerVisibilite(): void {
    this.service.setVisibilite(this.id, !this.session.visibilite).subscribe({
      next: (r: any) => { this.toastr.success(r.message); this.charger(); },
      error: () => this.toastr.error('Erreur.'),
    });
  }
  reinitialiser(p: any): void {
    if (!confirm(`Réinitialiser la participation de ${p.prenom} ${p.nom} ?`)) return;
    this.service.reinitialiser(p.id).subscribe({
      next: () => { this.toastr.success('Participation réinitialisée.'); this.charger(); },
      error: e => this.toastr.error(e?.error?.message || 'Réinitialisation impossible.'),
    });
  }
  accederResultats(): void { this.router.navigate(['/mon-espace/calibrage/resultats', this.id]); }
  retour(): void { this.router.navigate(['/mon-espace/calibrage/sessions']); }

  etatLabel(e: string): string {
    return e === 'TERMINEE' ? 'Terminée' : e === 'EN_COURS' ? 'En cours' : 'Non commencée';
  }
}
