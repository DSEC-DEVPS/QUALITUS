import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatListModule } from '@angular/material/list';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { ToastrService } from 'ngx-toastr';
import { EvaluationService } from '@shared/services/evaluation.service';
import { EvaluateurSite, EvaluationEvaluateur, SiteRef } from '../interfaces';

@Component({
  selector: 'app-contre-evaluation',
  standalone: true,
  imports: [
    FormsModule,
    DatePipe,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatListModule,
    MatTableModule,
    MatChipsModule,
  ],
  templateUrl: './contre-evaluation.component.html',
  styleUrl: './contre-evaluation.component.scss',
})
export class ContreEvaluationComponent implements OnInit {
  private readonly srv = inject(EvaluationService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastrService);

  sites: SiteRef[] = [];
  siteSelectionne: number | null = null;
  evaluateurs: EvaluateurSite[] = [];
  evaluateurSelectionne: EvaluateurSite | null = null;
  evaluations = new MatTableDataSource<EvaluationEvaluateur>([]);
  colonnes = ['id', 'agent', 'contexte', 'conclusion', 'date_execution', 'actions'];

  ngOnInit(): void {
    this.srv.getSites().subscribe({ next: s => (this.sites = s), error: () => {} });
  }

  onSiteChange() {
    this.evaluateurs = [];
    this.evaluateurSelectionne = null;
    this.evaluations.data = [];
    if (!this.siteSelectionne) {
      return;
    }
    this.srv.getEvaluateursBySite(this.siteSelectionne).subscribe({
      next: e => (this.evaluateurs = e),
      error: () => this.toast.error('Impossible de charger les evaluateurs'),
    });
  }

  choisirEvaluateur(e: EvaluateurSite) {
    this.evaluateurSelectionne = e;
    this.srv.getEvaluationsByEvaluateur(e.id).subscribe({
      next: evals => (this.evaluations.data = evals),
      error: () => this.toast.error('Impossible de charger les evaluations'),
    });
  }

  contreEvaluer(ev: EvaluationEvaluateur) {
    this.srv.creerContre(ev.id).subscribe({
      next: r => this.router.navigate(['/mon-espace/evaluation/contre-executer', r.id]),
      error: () => this.toast.error("Une erreur s'est produite"),
    });
  }
}
