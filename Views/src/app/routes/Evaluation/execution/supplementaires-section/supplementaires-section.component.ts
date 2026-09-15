import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ToastrService } from 'ngx-toastr';
import { EvalSuitesService, SupplementairesResult } from '../../eval-suites.service';

@Component({
  selector: 'app-supplementaires-section',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  templateUrl: './supplementaires-section.component.html',
  styleUrl: './supplementaires-section.component.scss',
})
export class SupplementairesSectionComponent implements OnInit {
  private readonly service = inject(EvalSuitesService);
  private readonly router = inject(Router);
  private readonly toastr = inject(ToastrService);

  @Input() idEvaluation!: number;
  data?: SupplementairesResult;

  ngOnInit(): void { this.charger(); }

  charger(): void {
    this.service.getSupplementaires(this.idEvaluation).subscribe({
      next: d => (this.data = d),
      error: () => this.toastr.error('Impossible de charger les évaluations supplémentaires.'),
    });
  }

  creer(): void {
    this.service.creerSupplementaire(this.idEvaluation).subscribe({
      next: r => { this.toastr.success('Évaluation supplémentaire créée.'); this.router.navigate(['/mon-espace/evaluation/executer', r.id]); },
      error: err => this.toastr.error(err?.error?.message || 'Erreur.'),
    });
  }

  ouvrir(id: number): void {
    this.router.navigate(['/mon-espace/evaluation/executer', id]);
  }
}
