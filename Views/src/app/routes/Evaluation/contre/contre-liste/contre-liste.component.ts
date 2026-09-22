import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { ToastrService } from 'ngx-toastr';
import { EvalContreService, ContreListe } from '../../eval-contre.service';
import { CanDirective } from '@core/authorization/can.directive';

@Component({
  selector: 'app-contre-liste',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule, MatTableModule, MatChipsModule, MatFormFieldModule, MatSelectModule, CanDirective],
  templateUrl: './contre-liste.component.html',
  styleUrl: './contre-liste.component.scss',
})
export class ContreListeComponent implements OnInit {
  private readonly service = inject(EvalContreService);
  private readonly router = inject(Router);
  private readonly toastr = inject(ToastrService);

  liste: ContreListe[] = [];
  colonnes = ['evaluateur', 'agent', 'appel', 'statut', 'conclusion', 'visibilite', 'actions'];

  // assistant de création
  afficherAssistant = false;
  sites: { id: number; nom: string }[] = [];
  evaluateurs: any[] = [];
  evaluations: any[] = [];
  idSite: number | null = null;
  idEvaluateur: number | null = null;
  idEvaluation: number | null = null;

  ngOnInit(): void {
    this.charger();
    this.service.getSites().subscribe({ next: s => (this.sites = s || []) });
  }

  charger(): void {
    this.service.getAll().subscribe({ next: l => (this.liste = l), error: () => this.toastr.error('Erreur de chargement.') });
  }

  onSite(): void {
    this.idEvaluateur = null; this.idEvaluation = null; this.evaluateurs = []; this.evaluations = [];
    if (this.idSite) this.service.getEvaluateurs(this.idSite).subscribe({ next: e => (this.evaluateurs = e) });
  }
  onEvaluateur(): void {
    this.idEvaluation = null; this.evaluations = [];
    if (this.idEvaluateur) this.service.getEvaluations(this.idEvaluateur).subscribe({ next: e => (this.evaluations = e) });
  }

  creer(): void {
    if (!this.idEvaluation) { this.toastr.warning('Sélectionnez une évaluation.'); return; }
    this.service.creer(this.idEvaluation).subscribe({
      next: r => { this.toastr.success('Contre-évaluation créée.'); this.router.navigate(['/mon-espace/evaluation/contre-executer', r.id]); },
      error: err => this.toastr.error(err?.error?.message || 'Erreur.'),
    });
  }

  ouvrir(c: ContreListe): void { this.router.navigate(['/mon-espace/evaluation/contre-executer', c.id]); }

  desactiver(c: ContreListe, ev: Event): void {
    ev.stopPropagation();
    this.service.setActif(c.id, false).subscribe({ next: () => { this.toastr.success('Désactivée.'); this.charger(); }, error: (e: any) => this.toastr.error(e?.error?.message || 'Erreur.') });
  }

  supprimer(c: ContreListe, ev: Event): void {
    ev.stopPropagation();
    if (!confirm('Supprimer définitivement cette contre-évaluation ?')) return;
    this.service.supprimer(c.id).subscribe({
      next: () => { this.toastr.success('Contre-évaluation supprimée.'); this.charger(); },
      error: (e: any) => this.toastr.error(e?.error?.message || 'Suppression impossible.'),
    });
  }
}
