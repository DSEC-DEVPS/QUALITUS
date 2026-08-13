import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialogClose, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ToastrService } from 'ngx-toastr';
import { EvaluationService } from '@shared/services/evaluation.service';
import { AgentEvalue, Contexte } from '../interfaces';

@Component({
  selector: 'app-masse-evaluation-dialog',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatDialogClose,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './masse-evaluation-dialog.component.html',
})
export class MasseEvaluationDialogComponent implements OnInit {
  readonly dialogRef = inject(MatDialogRef<MasseEvaluationDialogComponent>);
  private readonly fb = inject(FormBuilder);
  private readonly srv = inject(EvaluationService);
  private readonly toast = inject(ToastrService);

  form!: FormGroup;
  contextes: Contexte[] = [];
  agents: AgentEvalue[] = [];
  isSubmitting = false;

  ngOnInit(): void {
    this.form = this.fb.group({
      agents: [[], Validators.required],
      id_Contexte: [null, Validators.required],
      motif_appel: [null],
    });
    this.srv.getContextes().subscribe({ next: c => (this.contextes = c), error: () => {} });
    this.srv.getAgents().subscribe({ next: a => (this.agents = a), error: () => {} });
  }

  creer() {
    if (this.form.invalid || !this.form.value.agents.length) {
      this.toast.warning('Selectionnez au moins un agent et un contexte');
      return;
    }
    this.isSubmitting = true;
    this.srv.addEvaluationMasse(this.form.value).subscribe({
      next: r => {
        this.toast.success(r.message);
        this.isSubmitting = false;
        this.dialogRef.close(true);
      },
      error: () => {
        this.toast.error("Une erreur s'est produite");
        this.isSubmitting = false;
      },
    });
  }
}
