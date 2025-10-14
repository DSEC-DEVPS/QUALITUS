import { Component, Inject, inject, model, OnInit } from '@angular/core';
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
  selector: 'app-update-site',
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
  templateUrl: './update-site.component.html',
  styleUrl: './update-site.component.scss',
})
export class UpdateSiteComponent implements OnInit {
  readonly dialogRef = inject(MatDialogRef<UpdateSiteComponent>);
  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(UserService);
  private readonly toastSrv = inject(ToastrService);
  id!: any;
  formSite!: FormGroup;
  isSubmitting = false;
  constructor(@Inject(MAT_DIALOG_DATA) private data: any) {
    this.id = data.id;
  }
  ngOnInit(): void {
    this.formSite = this.fb.group({
      nom: [null, Validators.required],
      description: [null, Validators.required],
    });
    this.userService.getOneSite(this.id).subscribe({
      next: resultat => {
        console.log(resultat);
        this.formSite.get('nom')?.setValue(resultat.nom);
        this.formSite.get('description')?.setValue(resultat.description);
      },
    });
  }
  handleOnSumit() {
    this.isSubmitting = true;
    console.log(this.formSite.value);
    this.userService.updateSite(this.id, this.formSite.value).subscribe({
      error: () => {
        this.toastSrv.error('Il y a eu lieu une erreur');
        this.isSubmitting = false;
      },
      next: () => {
        this.toastSrv.success('Le site a été modifié avec succès.');
        this.isSubmitting = false;
        this.dialogRef.close();
      },
    });
  }
  onNoClick(): void {
    this.dialogRef.close();
  }
}
