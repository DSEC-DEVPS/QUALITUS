import { Component, Inject, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MAT_DIALOG_DATA, MatDialogClose, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { EvaluationService } from '@shared/services/evaluation.service';
import { AgentEvalue, SiteRef, TypeRef } from '../interfaces';

export interface AgentDialogData {
  mode: 'add' | 'edit';
  agent?: AgentEvalue;
}

@Component({
  selector: 'app-agent-dialog',
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
  templateUrl: './agent-dialog.component.html',
})
export class AgentDialogComponent implements OnInit {
  readonly dialogRef = inject(MatDialogRef<AgentDialogComponent>);
  private readonly fb = inject(FormBuilder);
  private readonly srv = inject(EvaluationService);

  form!: FormGroup;
  titre = '';
  sites: SiteRef[] = [];
  types: TypeRef[] = [];

  constructor(@Inject(MAT_DIALOG_DATA) public data: AgentDialogData) {}

  ngOnInit(): void {
    this.titre = (this.data.mode === 'add' ? 'Ajouter' : 'Modifier') + ' un agent';
    const a = this.data.agent;
    this.form = this.fb.group({
      nom: [a?.nom ?? null, Validators.required],
      prenom: [a?.prenom ?? null],
      login_genesys: [a?.login_genesys ?? null, Validators.required],
      id_CategorieRessource: [a?.id_CategorieRessource ?? null],
      id_Site: [a?.id_Site ?? null],
    });
    this.srv.getSites().subscribe({ next: s => (this.sites = s), error: () => {} });
    this.srv.getTypes().subscribe({ next: t => (this.types = t), error: () => {} });
  }

  valider() {
    if (this.form.invalid) {
      return;
    }
    this.dialogRef.close(this.form.value);
  }
}
