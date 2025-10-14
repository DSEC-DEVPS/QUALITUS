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
  templateUrl: './ajouter-sla.component.html',
  styleUrl: './ajouter-sla.component.scss',
})
export class AjouterSlaComponent implements OnInit {
  readonly dialogRef = inject(MatDialogRef<AjouterSlaComponent>);
  private readonly fb = inject(FormBuilder);
  formSla!: FormGroup;
  isSubmitting = false;
  constructor(
    private userService: UserService,
    private toastSrv: ToastrService
  ) {}
  ngOnInit(): void {
    this.formSla = this.fb.group({
      source: [null, Validators.required],
      type: [null, Validators.required],
      delai: [null, Validators.required],
      priorite: [null, Validators.required],
    });
  }
  handleOnSumit() {
    this.isSubmitting = true;
    this.userService.addSla(this.formSla.value).subscribe({
      error: () => {
        this.toastSrv.error("Il y'a eu lieu une erreur");
        this.isSubmitting = false;
      },
      next: () => {
        this.toastSrv.success("Vous venez d'ajouter un nouveau SLA avec succès");
        this.isSubmitting = false;
        this.dialogRef.close();
      },
    });
    this.isSubmitting = false;
  }
  onNoClick(): void {
    this.dialogRef.close();
  }
}
