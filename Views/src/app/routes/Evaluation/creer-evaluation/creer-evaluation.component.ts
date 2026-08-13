import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ToastrService } from 'ngx-toastr';
import { EvaluationService } from '@shared/services/evaluation.service';
import { AgentEvalue, Contexte, Evaluateur } from '../interfaces';

@Component({
  selector: 'app-creer-evaluation',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
  ],
  templateUrl: './creer-evaluation.component.html',
  styleUrl: './creer-evaluation.component.scss',
})
export class CreerEvaluationComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly srv = inject(EvaluationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastrService);

  form!: FormGroup;
  contextes: Contexte[] = [];
  agents: AgentEvalue[] = [];
  evaluateurs: Evaluateur[] = [];
  afficherGrille = true;
  isSubmitting = false;

  ngOnInit(): void {
    this.form = this.fb.group({
      id_Contexte: [null, Validators.required],
      id_Agent: [null, Validators.required],
      id_Evaluateur: [null],
      id_appel: [null],
      n_case: [null],
      date_appel: [null],
      dmt: [null],
      motif_appel: [null],
    });
    this.srv.getContextes().subscribe({ next: c => (this.contextes = c), error: () => {} });
    this.srv.getAgents().subscribe({ next: a => (this.agents = a), error: () => {} });
    this.srv.getEvaluateurs().subscribe({ next: e => (this.evaluateurs = e), error: () => {} });

    // Pre-selection de l'agent (evaluation supplementaire depuis un echec)
    const agentParam = this.route.snapshot.queryParamMap.get('agent');
    if (agentParam) {
      this.form.patchValue({ id_Agent: Number(agentParam) });
    }
  }

  get agentSelectionne(): AgentEvalue | undefined {
    return this.agents.find(a => a.id === this.form.value.id_Agent);
  }

  enregistrer() {
    if (this.form.invalid) {
      this.toast.warning('Contexte et agent sont obligatoires');
      return;
    }
    this.isSubmitting = true;
    this.srv.addEvaluation(this.form.value).subscribe({
      next: r => {
        this.isSubmitting = false;
        if (r.grille_manquante) {
          this.toast.warning("Aucune grille n'est associee au type de cet agent");
        } else {
          this.toast.success('Evaluation creee');
        }
        if (this.afficherGrille && !r.grille_manquante) {
          this.router.navigate(['/mon-espace/evaluation/executer', r.id]);
        } else {
          this.router.navigate(['/mon-espace/evaluation/evaluations']);
        }
      },
      error: () => {
        this.toast.error("Une erreur s'est produite");
        this.isSubmitting = false;
      },
    });
  }

  annuler() {
    this.router.navigate(['/mon-espace/evaluation/evaluations']);
  }
}
