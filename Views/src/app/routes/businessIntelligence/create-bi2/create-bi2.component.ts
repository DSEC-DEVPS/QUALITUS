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
import { CalendrierService } from '@shared/services/calendrierService/calendrier.service';
import { CommonModule } from '@angular/common';
import { ToastrService } from 'ngx-toastr';
import { BusinessIntelligenceService } from '@shared/services/businessIntelligenceService/business-intelligence.service';
import { BusinessIntelligenceInterface } from '@shared/interfaces/businessIntelligence/BusinessIntelligence';
import { BI1 } from '@shared/modeles/businessIntelligence/BI1';
import { BI2 } from '@shared/modeles/businessIntelligence/BI2';
import { BI1Interface } from '@shared/interfaces/businessIntelligence/BI1';

@Component({
  selector: 'app-create-bi2',
  standalone: true,
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatDialogClose,
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
  templateUrl: './create-bi2.component.html',
  styleUrl: './create-bi2.component.scss',
})
export class CreateBI2Component {
  readonly dialogRef = inject(MatDialogRef<CreateBI2Component>);
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
    console.log(this.data.bi1);

    this.businessIntelligences?.unshift(this.data.bi1);
    console.log('businessIntelligences');
    console.log(this.businessIntelligences);
  }
  bi2: BI2 = Object.assign(new BI2(), this.formGroup.value);
  createBI2() {
    this.bi2.fromData(this.formGroup.value);
    console.log('Valeur du formulaire');
    console.log(this.bi2);
    this.businessIntelligenceService.addBI2(this.bi2).subscribe({
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
