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
  selector: 'app-update-programme',
  standalone: true,
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    FormsModule,
    MatDialogClose,
    ReactiveFormsModule,
    MatCardModule,
    MatOptionModule,
    MtxButtonModule,
  ],
  templateUrl: './update-programme.component.html',
  styleUrl: './update-programme.component.scss',
})
export class UpdateProgrammeComponent implements OnInit {
  readonly dialogRef = inject(MatDialogRef<UpdateProgrammeComponent>);
  private readonly userService = inject(UserService);
  private readonly toastSrv = inject(ToastrService);

  private readonly fb = inject(FormBuilder);
  formProgramme!: FormGroup;
  isSubmitting = false;
  id!: any;
  constructor(@Inject(MAT_DIALOG_DATA) private data: any) {
    this.id = data.id;
  }
  ngOnInit(): void {
    this.formProgramme = this.fb.group({
      nom: [null, Validators.required],
      description: [null, Validators.required],
    });
    this.userService.getOneProgramme(this.id).subscribe({
      next: resultat => {
        this.formProgramme.get('nom')?.setValue(resultat.nom);
        this.formProgramme.get('description')?.setValue(resultat.description);
      },
      error: error => {
        console.log(error);
      },
    });
  }
  handleOnSumit() {
    this.isSubmitting = true;
    this.userService.updateProgramme(this.id, this.formProgramme.value).subscribe({
      error: () => {
        this.toastSrv.error('Il y a eu lieu une erreur');
        this.isSubmitting = false;
      },
      next: () => {
        this.toastSrv.success('Nouveau Programme ajouté avec succès');
        this.isSubmitting = false;
        this.dialogRef.close();
      },
    });
  }
}
