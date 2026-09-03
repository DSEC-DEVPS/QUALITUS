import { Component, Inject, inject, OnInit } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatOptionModule } from '@angular/material/core';
import { MAT_DIALOG_DATA, MatDialogClose, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MtxButtonModule } from '@ng-matero/extensions/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { CommonModule } from '@angular/common';
import { ToastrService } from 'ngx-toastr';
import { BusinessIntelligenceService } from '@shared/services/businessIntelligenceService/business-intelligence.service';
import { BI2 } from '@shared/modeles/businessIntelligence/BI2';
import { BI1Interface } from '@shared/interfaces/businessIntelligence/BI1';

@Component({
  selector: 'app-edit-bi2',
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
    MatDatepickerModule,
    CommonModule,
  ],
  templateUrl: './edit-bi2.component.html',
  styleUrl: './edit-bi2.component.scss',
})
export class EditBI2Component {
  readonly dialogRef = inject(MatDialogRef<EditBI2Component>);
  fb = inject(FormBuilder);
  private readonly toastSrv = inject(ToastrService);

  formGroup = this.fb.group({
    id: [0, [Validators.required]],
    options: ['', [Validators.required]],
    id_BI_1: [0, [Validators.required]],
  });
  isSubmitting = false;
  businessIntelligences: BI1Interface[] = [];
  data: any;
  constructor(
    private businessIntelligenceService: BusinessIntelligenceService,
    @Inject(MAT_DIALOG_DATA) data: any
  ) {
    this.data = data;
  }
  ngOnInit(): void {
    console.log('this.data');
    console.log(this.data);
    console.log(this.data.bi1);
    console.log(this.data.bi2);

    this.businessIntelligences?.unshift(this.data.bi1);
    console.log('this.businessIntelligences');
    console.log(this.businessIntelligences);

    this.formGroup.patchValue({
      id: this.data.bi2.id,
      options: this.data.bi2.options,
      id_BI_1: this.data.bi2.id_BI_1,
    });
  }
  bi2: BI2 = Object.assign(new BI2(), this.formGroup.value);
  updateBI2() {
    this.bi2.fromData(this.formGroup.value);
    console.log('Valeur du formulaire');
    console.log(this.bi2);
    this.businessIntelligenceService.updateBI2(this.bi2.id, this.bi2).subscribe({
      next: response => {
        this.toastSrv.success(response.message);
        this.dialogRef.close();
      },
      error: error => {
        console.log(error);
        this.toastSrv.error(error.error.message);
      },
    });
  }
}
