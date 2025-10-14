import { Component, Inject, inject, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MAT_DIALOG_DATA, MatDialogClose, MatDialogRef } from '@angular/material/dialog';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatOptionModule } from '@angular/material/core';
import { MtxButtonModule } from '@ng-matero/extensions/button';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { UserService } from '@shared/services/user.service';
import { ToastrService } from 'ngx-toastr';
@Component({
  selector: 'app-ajouter-sla',
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
  templateUrl: './update-grille.component.html',
  styleUrl: './update-grille.component.scss',
})
export class UpdateGrilleComponent implements OnInit {
  readonly dialogRef = inject(MatDialogRef<UpdateGrilleComponent>);
  private readonly fb = inject(FormBuilder);
  formSla!: FormGroup;
  isSubmitting = false;
  id!: any;
  constructor(
    @Inject(MAT_DIALOG_DATA) data: any,
    private userService: UserService,
    private toastSrv: ToastrService
  ) {
    this.id = data.id;
  }
  ngOnInit(): void {
    this.formSla = this.fb.group({
      nom: [null, Validators.required],
    });
    this.userService.getOneGrile(this.id).subscribe({
      next: resultat => {
        this.formSla.get('nom')?.setValue(resultat.nom);
      },
      error: error => {
        console.log(error);
      },
    });
  }
  handleOnSumit() {
    this.isSubmitting = true;
    this.userService.updateGrille(this.id, this.formSla.value).subscribe({
      error: () => {
        this.toastSrv.error('Il y a eu lieu une erreur');
        this.isSubmitting = false;
      },
      next: () => {
        this.toastSrv.success('Nouvelle Grille ajoutée avec succès');
        this.isSubmitting = false;
        this.dialogRef.close();
      },
    });
  }
}
