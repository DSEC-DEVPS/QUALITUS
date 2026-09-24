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

  // L'évaluation supplémentaire n'est PAS une duplication : on ouvre le
  // formulaire de création normal, lié au parent (même agent).
  creer(): void {
    this.router.navigate(['/mon-espace/evaluation/creation/unitaire'], { queryParams: { parent: this.idEvaluation } });
  }

  ouvrir(id: number): void {
    this.router.navigate(['/mon-espace/evaluation/executer', id]);
  }
}
