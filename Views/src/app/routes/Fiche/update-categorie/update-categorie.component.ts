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
  templateUrl: './update-categorie.component.html',
  styleUrl: './update-categorie.component.scss',
})
export class UpdateCategorieComponent implements OnInit {
  readonly dialogRef = inject(MatDialogRef<UpdateCategorieComponent>);
  private readonly fb = inject(FormBuilder);
  formCategorie!: FormGroup;
  id!: any;
  isSubmitting = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) data: any,
    private userService: UserService,
    private toastSrv: ToastrService
  ) {
    this.id = data.id;
  }
  ngOnInit(): void {
    this.formCategorie = this.fb.group({
      nom: [null, Validators.required],
    });
    this.userService.getOneCatgorie(this.id).subscribe({
      next: resultat => {
        this.formCategorie.get('nom')?.setValue(resultat.nom);
      },
      error: error => {
        console.log(error);
      },
    });
  }
  handleOnSumit() {
    this.isSubmitting = true;
    this.userService.updateCategorie(this.id, this.formCategorie.value).subscribe({
      error: error => {
        console.log(error);
        this.isSubmitting = false;
      },
      next: resultat => {
        this.toastSrv.success(resultat.message);
        this.isSubmitting = false;
        this.dialogRef.close();
      },
    });
  }
}
