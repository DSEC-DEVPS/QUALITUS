import { Component, inject, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialogClose, MatDialogRef } from '@angular/material/dialog';
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
  templateUrl: './ajouter-categorie.component.html',
  styleUrl: './ajouter-categorie.component.scss',
})
export class AjouterCategorieComponent implements OnInit {
  readonly dialogRef = inject(MatDialogRef<AjouterCategorieComponent>);
  private readonly fb = inject(FormBuilder);
  formCategorie!: FormGroup;
  isSubmitting = false;

  constructor(
    private userService: UserService,
    private toastSrv: ToastrService
  ) {}
  ngOnInit(): void {
    this.formCategorie = this.fb.group({
      nom: [null, Validators.required],
    });
  }
  handleOnSumit() {
    this.isSubmitting = true;
    this.userService.addCategorie(this.formCategorie.value).subscribe({
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
