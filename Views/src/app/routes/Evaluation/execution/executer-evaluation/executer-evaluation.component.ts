import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ToastrService } from 'ngx-toastr';
import {
  EvalExecutionService, EvaluationDetail, CategorieSnap, ErreurSnap,
} from '../../eval-execution.service';
import { BiSectionComponent } from '../bi-section/bi-section.component';
import { CoachingSectionComponent } from '../coaching-section/coaching-section.component';
import { PlanActionSectionComponent } from '../plan-action-section/plan-action-section.component';
import { SupplementairesSectionComponent } from '../supplementaires-section/supplementaires-section.component';
import { LettreSectionComponent } from '../lettre-section/lettre-section.component';

@Component({
  selector: 'app-executer-evaluation',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule, MatChipsModule,
    MatCheckboxModule, MatFormFieldModule, MatInputModule, MatRadioModule, MatExpansionModule, MatTooltipModule,
    BiSectionComponent,
    CoachingSectionComponent,
    PlanActionSectionComponent,
    SupplementairesSectionComponent,
    LettreSectionComponent,
  ],
  templateUrl: './executer-evaluation.component.html',
  styleUrl: './executer-evaluation.component.scss',
})
export class ExecuterEvaluationComponent implements OnInit {
  private readonly service = inject(EvalExecutionService);
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly toastr = inject(ToastrService);

  id!: number;
  detail?: EvaluationDetail;
  categorieActive?: CategorieSnap;
  erreurDepliee: number | null = null;
  chargement = false;

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.params['id']);
    this.charger();
  }

  get terminee(): boolean {
    return this.detail?.evaluation.statut === 'TERMINE';
  }

  charger(): void {
    this.chargement = true;
    this.service.getDetail(this.id).subscribe({
      next: d => {
        this.detail = d;
        const idPrec = this.categorieActive?.id;
        this.categorieActive = d.categories.find(c => c.id === idPrec) || d.categories[0];
        this.chargement = false;
      },
      error: () => { this.toastr.error('Impossible de charger l’évaluation.'); this.chargement = false; },
    });
  }

  selectCategorie(c: CategorieSnap): void {
    this.categorieActive = c;
    this.erreurDepliee = null;
  }

  toggleDepli(e: ErreurSnap): void {
    this.erreurDepliee = this.erreurDepliee === e.id ? null : e.id;
  }

  // Décochage/recochage d'une erreur (calcul au fil de l'eau)
  onToggleCoche(e: ErreurSnap): void {
    if (this.terminee) return;
    const nouveau = e.coche ? 0 : 1;
    e.coche = nouveau; // maj optimiste
    if (nouveau === 0) this.erreurDepliee = e.id; // déplie pour saisir le commentaire
    this.service.toggleErreur(this.id, e.id, nouveau === 1, e.commentaire).subscribe({
      next: r => this.appliquerResultat(r),
      error: err => { this.toastr.error(err?.error?.message || 'Erreur.'); this.charger(); },
    });
  }

  enregistrerCommentaire(e: ErreurSnap): void {
    if (this.terminee) return;
    this.service.toggleErreur(this.id, e.id, e.coche === 1, e.commentaire).subscribe({
      next: r => this.appliquerResultat(r),
      error: err => this.toastr.error(err?.error?.message || 'Erreur.'),
    });
  }

  private appliquerResultat(r: { id_categorie: number; score_categorie: number; nb_decochees: number; reussite_categorie: boolean; conclusion_live: string }): void {
    if (!this.detail) return;
    const cat = this.detail.categories.find(c => c.id === r.id_categorie);
    if (cat) {
      cat.score_obtenu = r.score_categorie;
      cat.nb_erreurs_decochees = r.nb_decochees;
      cat.reussite = r.reussite_categorie;
    }
    this.detail.conclusion_live = r.conclusion_live;
  }

  enregistrerResolution(): void {
    if (!this.detail || this.terminee) return;
    const ev = this.detail.evaluation;
    this.service.setResolution(this.id, ev.resolution, ev.synthese || undefined).subscribe({
      next: () => this.toastr.success('Enregistré.'),
      error: err => this.toastr.error(err?.error?.message || 'Erreur.'),
    });
  }

  terminer(): void {
    if (!this.detail) return;
    if (!this.detail.evaluation.resolution) { this.toastr.warning('La résolution est obligatoire.'); return; }
    if (!confirm('Terminer l’évaluation ? Elle ne sera plus modifiable.')) return;
    this.service.terminer(this.id).subscribe({
      next: r => { this.toastr.success(`Évaluation terminée : ${r.conclusion === 'SUCCES' ? 'Succès' : 'Échec'}.`); this.charger(); },
      error: err => this.toastr.error(err?.error?.message || 'Erreur lors de la clôture.'),
    });
  }

  onAvisEnregistre(statutApres: string): void {
    if (this.detail) this.detail.evaluation.statut_apres_evaluation = statutApres;
  }

  libelleStatutApres(v: string | null): string {
    switch (v) {
      case 'FELICITER': return 'Féliciter';
      case 'DEBRIEFER': return 'Débriefer';
      default: return 'Non validé';
    }
  }

  retour(): void { this.location.back(); }
}
