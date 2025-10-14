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
  templateUrl: './update-sla.component.html',
  styleUrl: './update-sla.component.scss',
})
export class UpdateSlaComponent implements OnInit {
  readonly dialogRef = inject(MatDialogRef<UpdateSlaComponent>);
  private readonly fb = inject(FormBuilder);
  id!: any;
  formSla!: FormGroup;
  isSubmitting = false;
  constructor(
    @Inject(MAT_DIALOG_DATA) data: any,
    private userService: UserService,
    private toastSrv: ToastrService
  ) {
    this.id = data.id;
  }
  ngOnInit(): void {
    this.formSla = this.fb.group({
      source: [null, Validators.required],
      type: [null, Validators.required],
      delai: [null, Validators.required],
      priorite: [null, Validators.required],
    });
    this.userService.getSlaById(this.id).subscribe({
      next: resultat => {
        this.formSla.get('source')?.setValue(resultat.source);
        this.formSla.get('type')?.setValue(resultat.type);
        this.formSla.get('delai')?.setValue(resultat.delai);
        this.formSla.get('priorite')?.setValue(resultat.priorite);
      },
      error: error => {
        console.log(error);
      },
    });
  }
  handleOnSumit() {
    this.isSubmitting = true;
    this.userService.updateSla(this.id, this.formSla.value).subscribe({
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
    this.isSubmitting = false;
  }
  onNoClick(): void {
    this.dialogRef.close();
  }
}
