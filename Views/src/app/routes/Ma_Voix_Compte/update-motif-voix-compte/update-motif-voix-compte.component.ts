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
  selector: 'app-ajouter-motif',
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
  templateUrl: './update-motif-voix-compte.component.html',
  styleUrl: './update-motif-voix-compte.component.scss',
})
export class UpdateMotifVoixCompteComponent implements OnInit {
  readonly dialogRef = inject(MatDialogRef<UpdateMotifVoixCompteComponent>);
  private readonly fb = inject(FormBuilder);
  private readonly toastSrv = inject(ToastrService);
  private readonly userService = inject(UserService);
  formMotifMaVoixCompte!: FormGroup;
  isSubmitting = false;
  id!: any;
  constructor(@Inject(MAT_DIALOG_DATA) private data: any) {
    this.id = data.id;
  }
  ngOnInit(): void {
    this.formMotifMaVoixCompte = this.fb.group({
      nomMotif: [null, Validators.required],
    });
    this.userService.getOneMotifMaVoixCompte(this.id).subscribe({
      next: resultat => {
        this.formMotifMaVoixCompte.get('nomMotif')?.setValue(resultat.nomMotif);
      },
      error: error => {
        console.log(error);
      },
    });
  }
  handleOnSumit() {
    this.isSubmitting = true;
    this.userService.updateMotifMaVoixCompte(this.id, this.formMotifMaVoixCompte.value).subscribe({
      error: () => {
        this.toastSrv.error('Il y a eu lieu une erreur');
        this.isSubmitting = false;
      },
      next: () => {
        this.toastSrv.success('Le motif a été modifié avec succès');
        this.isSubmitting = false;
        this.dialogRef.close();
      },
    });
  }
}
