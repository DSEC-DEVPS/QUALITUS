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
import { BI3 } from '@shared/modeles/businessIntelligence/BI3';
import { BI3Interface } from '@shared/interfaces/businessIntelligence/BI3';
import { BI4 } from '@shared/modeles/businessIntelligence/BI4';
@Component({
  selector: 'app-create-bi4',
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
  templateUrl: './create-bi4.component.html',
  styleUrl: './create-bi4.component.scss',
})
export class CreateBI4Component {
  readonly dialogRef = inject(MatDialogRef<CreateBI4Component>);
  fb = inject(FormBuilder);
  private readonly toastSrv = inject(ToastrService);

  formGroup = this.fb.group({
    id: [0, [Validators.required]],
    options: ['', [Validators.required]],
    id_BI_3: [0, [Validators.required]],
  });
  isSubmitting = false;
  businessIntelligences: BI3Interface[] = [];
  data: any;
  constructor(
    private businessIntelligenceService: BusinessIntelligenceService,
    @Inject(MAT_DIALOG_DATA) data: any
  ) {
    this.data = data;
  }
  ngOnInit(): void {
    this.businessIntelligences?.unshift(this.data.bi3);
    console.log('businessIntelligences');
    console.log(this.businessIntelligences);
  }
  bi4: BI4 = Object.assign(new BI4(), this.formGroup.value);
  createBI4() {
    this.bi4.fromData(this.formGroup.value);
    console.log('Valeur du formulaire');
    console.log(this.bi4);
    this.businessIntelligenceService.addBI4(this.bi4).subscribe({
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
