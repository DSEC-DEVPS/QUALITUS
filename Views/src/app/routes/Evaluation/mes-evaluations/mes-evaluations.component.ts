import { Component, OnInit, inject } from '@angular/core';
import { toYMD } from '@shared/date-utils';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { ToastrService } from 'ngx-toastr';
import { EvalInstanceService, EvaluationListe, FiltresEvaluation } from '../eval-instance.service';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { PaginationServeur, debutPeriodeParDefaut } from '@shared/utils/pagination-serveur';
import { ChargementComponent } from '@shared/components/chargement/chargement.component';

@Component({
  selector: 'app-mes-evaluations',
  standalone: true,
  imports: [ChargementComponent, MatPaginatorModule,
    CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule, MatTableModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatDatepickerModule,
  ],
  templateUrl: './mes-evaluations.component.html',
  styleUrl: './mes-evaluations.component.scss',
})
export class MesEvaluationsComponent implements OnInit {
  private readonly service = inject(EvalInstanceService);
  private readonly router = inject(Router);
  private readonly toastr = inject(ToastrService);

  /** Pagination côté serveur : seule la page affichée est chargée. */
  readonly pag = new PaginationServeur<EvaluationListe>();
  get evaluations(): EvaluationListe[] { return this.pag.page; }
  chargement = false;
  /** Par défaut : les 3 derniers mois (modifiable par le filtre « Du »). */
  filtres: FiltresEvaluation = { date_debut: debutPeriodeParDefaut() };
  colonnes = ['date_appel', 'grille', 'type_evaluation', 'statut', 'conclusion', 'actions'];

  ngOnInit(): void { this.charger(); }

  /** Nouveau filtre : retour à la première page. */
  filtrer(): void { this.pag.premiere(); this.charger(); }

  charger(): void {
    this.chargement = true;
    const f: any = { ...this.filtres };
    if (this.filtres.date_debut) f.date_debut = toYMD(this.filtres.date_debut);
    if (this.filtres.date_fin) f.date_fin = toYMD(this.filtres.date_fin);
    this.service.getEvaluationsPage(f, this.pag.params()).subscribe({
      next: r => { this.pag.recevoir(r); this.chargement = false; },
      error: () => { this.toastr.error('Impossible de charger vos évaluations.'); this.chargement = false; },
    });
  }
  changerPage(e: PageEvent): void { this.pag.changer(e); this.charger(); }
  reinitialiser(): void { this.filtres = { date_debut: debutPeriodeParDefaut() }; this.filtrer(); }
  ouvrir(e: EvaluationListe): void { this.router.navigate(['/mon-espace/evaluation/executer', e.id]); }
}
