import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ToastrService } from 'ngx-toastr';
import { EvalSuitesService, LettreData } from '../../eval-suites.service';

/**
 * Lettre de félicitation / débriefing (F.39sexies) — restitution à l'agent.
 * Affichée en lecture ; imprimable.
 */
@Component({
  selector: 'app-lettre-section',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  templateUrl: './lettre-section.component.html',
  styleUrl: './lettre-section.component.scss',
})
export class LettreSectionComponent implements OnInit {
  private readonly service = inject(EvalSuitesService);
  private readonly toastr = inject(ToastrService);

  @Input() idEvaluation!: number;
  lettre?: LettreData;

  ngOnInit(): void {
    this.service.getLettre(this.idEvaluation).subscribe({
      next: l => (this.lettre = l),
      error: err => this.toastr.error(err?.error?.message || 'Lettre indisponible.'),
    });
  }

  imprimer(): void { window.print(); }
}
