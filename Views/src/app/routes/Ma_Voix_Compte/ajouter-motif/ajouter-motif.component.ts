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
  templateUrl: './ajouter-motif.component.html',
  styleUrl: './ajouter-motif.component.scss',
})
export class AjouterMotifComponent implements OnInit {
  readonly dialogRef = inject(MatDialogRef<AjouterMotifComponent>);
  private readonly fb = inject(FormBuilder);
  formMotifMaVoixCompte!: FormGroup;
  isSubmitting = false;

  constructor(
    private userService: UserService,
    private toastSrv: ToastrService
  ) {}
  ngOnInit(): void {
    this.formMotifMaVoixCompte = this.fb.group({
      nom: [null, Validators.required],
    });
  }
  handleOnSumit() {
    this.isSubmitting = true;
    this.userService.addMotifMaVoixCompte(this.formMotifMaVoixCompte.value).subscribe({
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
