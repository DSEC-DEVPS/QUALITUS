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
  selector: 'app-ajouter-fonction',
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
  templateUrl: './update-fonction.component.html',
  styleUrl: './update-fonction.component.scss',
})
export class UpdateFonctionComponent implements OnInit {
  readonly dialogRef = inject(MatDialogRef<UpdateFonctionComponent>);
  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(UserService);
  private readonly toastSrv = inject(ToastrService);
  id!: any;
  formFonction!: FormGroup;
  isSubmitting = false;
  constructor(@Inject(MAT_DIALOG_DATA) private data: any) {
    this.id = data.id;
  }
  ngOnInit(): void {
    this.formFonction = this.fb.group({
      nom: [null, Validators.required],
    });
    this.userService.getOneFonction(this.id).subscribe({
      next: resultat => {
        this.formFonction.get('nom')?.setValue(resultat.nom);
      },
      error: error => {
        console.log(error);
      },
    });
  }
  handleOnSumit() {
    this.isSubmitting = true;
    console.log(this.formFonction.value);
    this.userService.update_fonction(this.id, this.formFonction.value).subscribe({
      error: error => {
        console.log(error);
      },
      next: result => {
        this.toastSrv.success(result.message);
        this.isSubmitting = false;
        this.dialogRef.close();
      },
    });
  }
  onNoClick(): void {
    this.dialogRef.close();
  }
}
