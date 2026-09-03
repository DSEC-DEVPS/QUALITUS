import { Component, inject, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialogClose, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatOptionModule } from '@angular/material/core';
import { MtxButtonModule } from '@ng-matero/extensions/button';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ToastrService } from 'ngx-toastr';
import { ContexteService } from '@shared/services/ContexteService/contexte.service';

@Component({
  selector: 'app-ajouter-contexte',
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
  templateUrl: './ajouter-contexte.component.html',
  styleUrl: './ajouter-contexte.component.scss',
})
export class AjouterContexteComponent implements OnInit {
  readonly dialogRef = inject(MatDialogRef<AjouterContexteComponent>);
  private readonly fb = inject(FormBuilder);
  formContexte!: FormGroup;
  isSubmitting = false;
  constructor(
    private contexteService: ContexteService,
    private toastSrv: ToastrService
  ) {}
  ngOnInit(): void {
    this.formContexte = this.fb.group({
      nom: [null, Validators.required],
      description: [null],
    });
  }
  handleOnSumit() {
    this.isSubmitting = true;
    this.contexteService.addContexte(this.formContexte.value).subscribe({
      error: error => {
        this.toastSrv.error(error?.error?.message || 'Il y a eu lieu une erreur');
        this.isSubmitting = false;
      },
      next: () => {
        this.toastSrv.success('Nouveau contexte ajouté avec succès');
        this.isSubmitting = false;
        this.dialogRef.close(true);
      },
    });
  }
  onNoClick(): void {
    this.dialogRef.close();
  }
}
