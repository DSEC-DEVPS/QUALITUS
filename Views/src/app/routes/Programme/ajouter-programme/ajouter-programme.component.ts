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
  templateUrl: './ajouter-programme.component.html',
  styleUrl: './ajouter-programme.component.scss',
})
export class AjouterProgrammeComponent implements OnInit {
  readonly dialogRef = inject(MatDialogRef<AjouterProgrammeComponent>);
  private readonly userService = inject(UserService);
  private readonly toastSrv = inject(ToastrService);

  private readonly fb = inject(FormBuilder);
  formProgramme!: FormGroup;
  isSubmitting = false;

  ngOnInit(): void {
    this.formProgramme = this.fb.group({
      nom: [null, Validators.required],
      description: [null, Validators.required],
    });
  }
  handleOnSumit() {
    this.isSubmitting = true;
    this.userService.addProgramme(this.formProgramme.value).subscribe({
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
