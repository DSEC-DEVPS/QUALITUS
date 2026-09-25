import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ToastrService } from 'ngx-toastr';
import { CalibrageService } from '../calibrage.service';

@Component({
  selector: 'app-cal-resultats',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule,
    MatCheckboxModule, MatTooltipModule, MatExpansionModule, MatFormFieldModule, MatInputModule,
  ],
  templateUrl: './resultats.component.html',
  styleUrl: './resultats.component.scss',
})
export class ResultatsComponent implements OnInit {
  private readonly service = inject(CalibrageService);
  private readonly toastr = inject(ToastrService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  id!: number;
  role: 'jauge' | 'participant' | null = null;
  provisoire = true;
  statut = '';
  nom = '';
  resultatPublie = false;
  visibilite = false;
  transactions: any[] = [];
  participants: any[] = [];
  grid: any = {};
  global: any = {};
  conclusions = '';

  // confrontation
  selPid: number | null = null;
  selNom = '';
  confrontation: any[] = [];
  focusTx: number | null = null;

  get estJauge(): boolean { return this.role === 'jauge'; }
  // Le jauge peut ajuster le résultat tant qu'il n'est pas figé (CLOTUREE) :
  // en révision comme après validation (VALIDEE).
  get modifiable(): boolean { return this.estJauge && this.statut !== 'CLOTUREE'; }
  get fige(): boolean { return this.statut === 'CLOTUREE'; }
  get statutLibelle(): string {
    return ({
      BROUILLON: 'Brouillon', OUVERTE: 'Ouverte',
      RESULTATS_EN_REVISION: 'Résultats en révision',
      VALIDEE: 'Validée', CLOTUREE: 'Figée',
    } as any)[this.statut] || this.statut;
  }

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.charger();
  }

  charger(): void {
    this.service.getResultats(this.id).subscribe({
      next: d => {
        this.role = d.role; this.provisoire = d.provisoire; this.statut = d.statut;
        this.nom = d.nom || ''; this.resultatPublie = !!d.resultat_publie; this.visibilite = !!d.visibilite;
        this.transactions = d.transactions; this.participants = d.participants;
        this.grid = d.grid; this.global = d.global; this.conclusions = d.conclusions || '';
        // participant : ouvre directement sa confrontation
        if (this.role === 'participant' && this.participants.length) this.ouvrirConfrontation(this.participants[0], null);
      },
      error: err => { this.toastr.error(err?.error?.message || 'Résultats indisponibles.'); },
    });
  }

  cellule(pid: number, tid: number): string { return this.grid[pid]?.[tid] || '—'; }

  ouvrirConfrontation(p: any, tid: number | null): void {
    this.selPid = p.id_evaluateur; this.selNom = `${p.prenom} ${p.nom}`; this.focusTx = tid;
    this.service.getConfrontation(this.id, p.id_evaluateur).subscribe({
      next: d => { this.confrontation = d.transactions; },
      error: err => this.toastr.error(err?.error?.message || 'Confrontation indisponible.'),
    });
  }
  fermerConfrontation(): void { this.selPid = null; this.confrontation = []; this.focusTx = null; }

  txAffichees(): any[] {
    return this.focusTx ? this.confrontation.filter(t => t.transaction.id === this.focusTx) : this.confrontation;
  }

  // --- Révision (jauge) ---
  toggleCote(t: any, err: any, cote: 'REFERENCE' | 'PARTICIPANT'): void {
    if (!this.modifiable) return;
    const actuel = cote === 'REFERENCE' ? err.reference.coche : err.participant?.coche;
    this.service.modifierCote(this.id, {
      cote, id_transaction: t.transaction.id,
      id_participant: cote === 'PARTICIPANT' ? this.selPid! : undefined,
      id_erreur_origine: err.id_erreur_origine, coche: !actuel,
    }).subscribe({
      next: () => { this.rafraichir(); },
      error: e => this.toastr.error(e?.error?.message || 'Modification impossible.'),
    });
  }
  enregistrerAppreciation(t: any, err: any): void {
    if (!this.modifiable) return;
    this.service.setAppreciation(this.id, {
      id_transaction: t.transaction.id, id_erreur_origine: err.id_erreur_origine,
      appreciation: err.reference.appreciation_jauge || '',
    }).subscribe({ next: () => this.toastr.success('Appréciation enregistrée.'), error: () => this.toastr.error('Erreur.') });
  }
  // Le jauge ne modifie que SON propre commentaire (côté référence)
  enregistrerCommentaireJauge(t: any, err: any): void {
    if (!this.modifiable) return;
    this.service.setCommentaireJauge(this.id, {
      id_transaction: t.transaction.id, id_erreur_origine: err.id_erreur_origine,
      commentaire: err.reference?.commentaire || '',
    }).subscribe({ next: () => this.toastr.success('Commentaire enregistré.'), error: () => this.toastr.error('Erreur.') });
  }

  private rafraichir(): void {
    // recalcul immédiat : table + confrontation courante
    this.service.getResultats(this.id).subscribe({ next: d => { this.grid = d.grid; this.global = d.global; } });
    if (this.selPid) {
      this.service.getConfrontation(this.id, this.selPid).subscribe({ next: d => (this.confrontation = d.transactions) });
    }
  }

  enregistrerConclusions(): void {
    this.service.setConclusions(this.id, this.conclusions).subscribe({
      next: () => this.toastr.success('Conclusions enregistrées.'),
      error: e => this.toastr.error(e?.error?.message || 'Erreur.'),
    });
  }
  valider(): void {
    if (!confirm('Valider le résultat ? Il devient visible par les participants (si la visibilité est activée). Vous pourrez encore l’ajuster.')) return;
    this.service.valider(this.id).subscribe({
      next: (r: any) => { this.toastr.success(r?.message || 'Résultat validé.'); this.charger(); },
      error: e => this.toastr.error(e?.error?.message || 'Validation impossible.'),
    });
  }
  figer(): void {
    if (!confirm('Figer le résultat ? Cette action est définitive : plus aucune modification ne sera possible.')) return;
    this.service.figer(this.id).subscribe({
      next: (r: any) => { this.toastr.success(r?.message || 'Résultat figé.'); this.charger(); },
      error: e => this.toastr.error(e?.error?.message || 'Figement impossible.'),
    });
  }
  // Relancer un participant même depuis l'écran des résultats (session validée
  // ou figée) : sa participation est remise à zéro et la session ré-ouverte pour
  // qu'il puisse recommencer (ex. coupure réseau ayant clos sa session).
  relancer(p: any, ev: Event): void {
    ev.stopPropagation();
    if (!confirm(`Relancer la session de ${p.prenom} ${p.nom} ? La session sera ré-ouverte pour permettre la reprise.`)) return;
    this.service.reinitialiser(p.id).subscribe({
      next: (r: any) => {
        this.toastr.success(r?.message || 'Participation réinitialisée.');
        this.router.navigate(['/mon-espace/calibrage/session', this.id]);
      },
      error: e => this.toastr.error(e?.error?.message || 'Relance impossible.'),
    });
  }

  retour(): void { this.router.navigate(['/mon-espace/calibrage/sessions']); }
}
