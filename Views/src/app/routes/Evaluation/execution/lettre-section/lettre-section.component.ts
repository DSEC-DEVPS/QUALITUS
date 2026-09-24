import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ToastrService } from 'ngx-toastr';
import { EvalSuitesService, LettreData } from '../../eval-suites.service';

/**
 * Lettre de félicitation / débriefing (F.39sexies) — restitution à l'agent.
 * Affichée en lecture ; imprimable.
 */
@Component({
  selector: 'app-lettre-section',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  templateUrl: './lettre-section.component.html',
  styleUrl: './lettre-section.component.scss',
})
export class LettreSectionComponent implements OnInit {
  private readonly service = inject(EvalSuitesService);
  private readonly toastr = inject(ToastrService);

  @Input() idEvaluation!: number;
  /** L'agent évalué peut saisir son avis directement dans la lettre. */
  @Input() avisModifiable = false;
  @Output() avisEnregistre = new EventEmitter<string>();

  lettre?: LettreData;
  avis = '';
  enregistrement = false;

  ngOnInit(): void {
    this.service.getLettre(this.idEvaluation).subscribe({
      next: l => { this.lettre = l; this.avis = l.avis_agent || ''; },
      error: err => this.toastr.error(err?.error?.message || 'Lettre indisponible.'),
    });
  }

  enregistrerAvis(): void {
    this.enregistrement = true;
    this.service.setAvis(this.idEvaluation, this.avis || '').subscribe({
      next: r => {
        this.enregistrement = false;
        if (this.lettre) this.lettre.avis_agent = this.avis;
        this.toastr.success('Avis enregistré.');
        this.avisEnregistre.emit(r.statut_apres_evaluation);
      },
      error: err => { this.enregistrement = false; this.toastr.error(err?.error?.message || 'Erreur.'); },
    });
  }

  imprimer(): void { window.print(); }
}
