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
import { BI3 } from '@shared/modeles/businessIntelligence/BI3';
import { BI2Interface } from '@shared/interfaces/businessIntelligence/BI2';
import { BI4 } from '@shared/modeles/businessIntelligence/BI4';

@Component({
  selector: 'app-edit-bi4',
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
  templateUrl: './edit-bi4.component.html',
  styleUrl: './edit-bi4.component.scss',
})
export class EditBI4Component {
  readonly dialogRef = inject(MatDialogRef<EditBI4Component>);
  fb = inject(FormBuilder);
  private readonly toastSrv = inject(ToastrService);

  formGroup = this.fb.group({
    id: [0, [Validators.required]],
    options: ['', [Validators.required]],
    id_BI_3: [0, [Validators.required]],
  });
  isSubmitting = false;
  businessIntelligences: BI2Interface[] = [];
  data: any;
  constructor(
    private businessIntelligenceService: BusinessIntelligenceService,
    @Inject(MAT_DIALOG_DATA) data: any
  ) {
    this.data = data;
  }
  ngOnInit(): void {
    this.businessIntelligences?.unshift(this.data.bi3);
    console.log('this.businessIntelligences');
    console.log(this.businessIntelligences);

    this.formGroup.patchValue({
      id: this.data.bi4.id,
      options: this.data.bi4.options,
      id_BI_3: this.data.bi4.id_BI_3,
    });
  }
  bi4: BI4 = Object.assign(new BI4(), this.formGroup.value);
  updateBI4() {
    this.bi4.fromData(this.formGroup.value);
    console.log('Valeur du formulaire');
    console.log(this.bi4);
    this.businessIntelligenceService.updateBI4(this.bi4.id, this.bi4).subscribe({
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
