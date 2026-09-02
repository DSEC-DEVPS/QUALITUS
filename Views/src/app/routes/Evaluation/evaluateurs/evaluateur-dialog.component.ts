import { Component, Inject, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MAT_DIALOG_DATA, MatDialogClose, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { EvaluationService } from '@shared/services/evaluation.service';
import { Evaluateur, SiteRef } from '../interfaces';

export interface EvaluateurDialogData {
  mode: 'add' | 'edit';
  evaluateur?: Evaluateur;
}

@Component({
  selector: 'app-evaluateur-dialog',
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
  templateUrl: './evaluateur-dialog.component.html',
})
export class EvaluateurDialogComponent implements OnInit {
  readonly dialogRef = inject(MatDialogRef<EvaluateurDialogComponent>);
  private readonly fb = inject(FormBuilder);
  private readonly srv = inject(EvaluationService);

  form!: FormGroup;
  titre = '';
  sites: SiteRef[] = [];

  constructor(@Inject(MAT_DIALOG_DATA) public data: EvaluateurDialogData) {}

  ngOnInit(): void {
    this.titre = (this.data.mode === 'add' ? 'Ajouter' : 'Modifier') + ' un evaluateur';
    const e = this.data.evaluateur;
    this.form = this.fb.group({
      nom: [e?.nom ?? null, Validators.required],
      prenom: [e?.prenom ?? null],
      email: [e?.email ?? null],
      login: [e?.login ?? null],
      id_Site: [e?.id_Site ?? null, Validators.required],
    });
    this.srv.getSites().subscribe({ next: s => (this.sites = s), error: () => {} });
  }

  valider() {
    if (this.form.invalid) {
      return;
    }
    this.dialogRef.close(this.form.value);
  }
}
