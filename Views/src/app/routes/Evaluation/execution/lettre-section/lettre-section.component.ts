import { Component, ElementRef, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ToastrService } from 'ngx-toastr';
import { EvalSuitesService, LettreData } from '../../eval-suites.service';
import { finalize } from 'rxjs';
import { ChargementComponent } from '@shared/components/chargement/chargement.component';

/**
 * Lettre de félicitation / débriefing (F.39sexies) — restitution à l'agent.
 * Affichée en lecture ; imprimable.
 */
@Component({
  selector: 'app-lettre-section',
  standalone: true,
  imports: [ChargementComponent, CommonModule, FormsModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  templateUrl: './lettre-section.component.html',
  styleUrl: './lettre-section.component.scss',
})
export class LettreSectionComponent implements OnInit {
  chargement = true;
  private readonly service = inject(EvalSuitesService);
  private readonly toastr = inject(ToastrService);
  private readonly hote = inject<ElementRef<HTMLElement>>(ElementRef);

  @Input() idEvaluation!: number;
  /** L'agent évalué peut saisir son avis directement dans la lettre. */
  @Input() avisModifiable = false;
  @Output() avisEnregistre = new EventEmitter<string>();

  lettre?: LettreData;
  avis = '';
  enregistrement = false;

  ngOnInit(): void {
    this.chargement = true;
    this.service.getLettre(this.idEvaluation).pipe(finalize(() => (this.chargement = false))).subscribe({
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

  get felicitation(): boolean { return this.lettre?.type === 'FELICITATION'; }
  get nomEvaluateur(): string {
    const e = this.lettre?.evaluateur;
    return e ? [e.prenom, e.nom].filter(Boolean).join(' ') : '';
  }
  /** Découpe un texte du modèle en paragraphes (ligne vide = nouveau paragraphe). */
  paragraphes(texte?: string | null): string[] {
    return String(texte || '').split(/\n\s*\n/).map(p => p.trim()).filter(p => p);
  }
  /** Pourcentage borné 0–100 pour les barres de score. */
  borne(v: number): number { return Math.max(0, Math.min(100, Number(v) || 0)); }

  /**
   * N'imprime que la lettre : elle est copiée dans une zone dédiée, seule
   * affichée à l'impression (voir styles.scss : #zone-impression-lettre).
   * La zone est retirée à la fermeture de la fenêtre d'impression.
   */
  imprimer(): void {
    const papier = this.hote.nativeElement.querySelector('.lettre-papier');
    if (!papier) return;
    document.getElementById('zone-impression-lettre')?.remove();
    const zone = document.createElement('div');
    zone.id = 'zone-impression-lettre';
    zone.appendChild(papier.cloneNode(true));
    document.body.appendChild(zone);
    document.body.classList.add('impression-lettre');
    const fin = () => {
      zone.remove();
      document.body.classList.remove('impression-lettre');
      window.removeEventListener('afterprint', fin);
    };
    window.addEventListener('afterprint', fin);
    window.print();
  }
}
