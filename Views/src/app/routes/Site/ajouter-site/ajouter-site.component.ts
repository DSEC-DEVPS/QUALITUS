import { Component, inject, model, OnInit } from '@angular/core';
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
  selector: 'app-ajouter-site',
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
  templateUrl: './ajouter-site.component.html',
  styleUrl: './ajouter-site.component.scss',
})
export class AjouterSiteComponent implements OnInit {
  readonly dialogRef = inject(MatDialogRef<AjouterSiteComponent>);
  private readonly fb = inject(FormBuilder);
  formSite!: FormGroup;
  isSubmitting = false;
  constructor(
    private userService: UserService,
    private toastSrv: ToastrService
  ) {}
  ngOnInit(): void {
    this.formSite = this.fb.group({
      nom: [null, Validators.required],
      description: [null, Validators.required],
    });
  }
  handleOnSumit() {
    this.isSubmitting = true;
    console.log(this.formSite.value);
    this.userService.addSite(this.formSite.value).subscribe({
      error: () => {
        this.toastSrv.error('Il y a eu lieu une erreur');
        this.isSubmitting = false;
      },
      next: () => {
        this.toastSrv.success('Nouvelle Fonction ajoutée avec succès');
        this.isSubmitting = false;
        this.dialogRef.close();
      },
    });
  }
  onNoClick(): void {
    this.dialogRef.close();
  }
}
