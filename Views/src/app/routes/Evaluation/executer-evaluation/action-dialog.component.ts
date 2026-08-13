import { Component, Inject, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MAT_DIALOG_DATA, MatDialogClose, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { EvaluationService } from '@shared/services/evaluation.service';
import { ActionCorrective, ActionType } from '../interfaces';

export interface ActionDialogData {
  mode: 'add' | 'edit';
  action?: ActionCorrective;
}

@Component({
  selector: 'app-action-dialog',
  standalone: true,
  imports: [
    MatFormFieldModule,
    MatDialogClose,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
  ],
  templateUrl: './action-dialog.component.html',
})
export class ActionDialogComponent implements OnInit {
  readonly dialogRef = inject(MatDialogRef<ActionDialogComponent>);
  private readonly fb = inject(FormBuilder);
  private readonly srv = inject(EvaluationService);

  form!: FormGroup;
  titre = '';
  types: ActionType[] = [];
  statuts = ['A_FAIRE', 'EN_COURS', 'TERMINE'];

  constructor(@Inject(MAT_DIALOG_DATA) public data: ActionDialogData) {}

  ngOnInit(): void {
    this.titre = (this.data.mode === 'add' ? 'Ajouter' : 'Modifier') + ' une action corrective';
    const a = this.data.action;
    this.form = this.fb.group({
      id_ActionType: [a?.id_ActionType ?? null],
      porteur: [a?.porteur ?? null],
      contributeurs: [a?.contributeurs ?? null],
      date_debut: [a?.date_debut ?? null],
      date_attendue: [a?.date_attendue ?? null],
      date_realisation: [a?.date_realisation ?? null],
      statut: [a?.statut ?? 'A_FAIRE'],
      kpi: [a?.kpi ?? null],
      commentaire: [a?.commentaire ?? null],
    });
    this.srv.getActionTypes().subscribe({ next: t => (this.types = t), error: () => {} });
  }

  valider() {
    this.dialogRef.close(this.form.value);
  }
}
