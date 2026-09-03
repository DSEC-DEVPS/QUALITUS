import { Component, Inject, inject, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MAT_DIALOG_DATA, MatDialogClose, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatOptionModule } from '@angular/material/core';
import { MtxButtonModule } from '@ng-matero/extensions/button';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ToastrService } from 'ngx-toastr';
import { ContexteService } from '@shared/services/ContexteService/contexte.service';

@Component({
  selector: 'app-update-contexte',
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
    MatOptionModule,
    MtxButtonModule,
  ],
  templateUrl: './update-contexte.component.html',
  styleUrl: './update-contexte.component.scss',
})
export class UpdateContexteComponent implements OnInit {
  readonly dialogRef = inject(MatDialogRef<UpdateContexteComponent>);
  private readonly fb = inject(FormBuilder);
  private readonly contexteService = inject(ContexteService);
  private readonly toastSrv = inject(ToastrService);
  id!: any;
  formContexte!: FormGroup;
  isSubmitting = false;
  etats = ['ACTIF', 'INACTIF'];
  constructor(@Inject(MAT_DIALOG_DATA) private data: any) {
    this.id = data.id;
  }
  ngOnInit(): void {
    this.formContexte = this.fb.group({
      nom: [null, Validators.required],
      description: [null],
      etat: ['ACTIF', Validators.required],
    });
    this.contexteService.getContexteById(this.id).subscribe({
      next: resultat => {
        this.formContexte.get('nom')?.setValue(resultat.nom);
        this.formContexte.get('description')?.setValue(resultat.description);
        this.formContexte.get('etat')?.setValue(resultat.etat);
      },
    });
  }
  handleOnSumit() {
    this.isSubmitting = true;
    this.contexteService.updateContexte(this.id, this.formContexte.value).subscribe({
      error: error => {
        this.toastSrv.error(error?.error?.message || 'Il y a eu lieu une erreur');
        this.isSubmitting = false;
      },
      next: () => {
        this.toastSrv.success('Le contexte a été modifié avec succès.');
        this.isSubmitting = false;
        this.dialogRef.close(true);
      },
    });
  }
  onNoClick(): void {
    this.dialogRef.close();
  }
}
