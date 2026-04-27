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
@Component({
  selector: 'app-create-bi1',
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
  templateUrl: './create-bi1.component.html',
  styleUrl: './create-bi1.component.scss',
})
export class CreateBI1Component implements OnInit {
  readonly dialogRef = inject(MatDialogRef<CreateBI1Component>);
  fb = inject(FormBuilder);
  private readonly toastSrv = inject(ToastrService);

  formGroup = this.fb.group({
    id: [0, [Validators.required]],
    options: ['', [Validators.required]],
    id_Business_Intelligence: [0, [Validators.required]],
  });
  isSubmitting = false;
  businessIntelligences: BusinessIntelligenceInterface[] = [];
  data: any;
  constructor(
    private businessIntelligenceService: BusinessIntelligenceService,
    @Inject(MAT_DIALOG_DATA) data: any
  ) {
    this.data = data;
  }
  ngOnInit(): void {
    console.log('this.data');
    console.log(this.data.bi);

    this.businessIntelligences?.unshift(this.data.bi);
    console.log('businessIntelligences');
    console.log(this.businessIntelligences);
  }
  bi1: BI1 = Object.assign(new BI1(), this.formGroup.value);
  createBI1() {
    this.bi1.fromData(this.formGroup.value);
    console.log('Valeur du formulaire');
    console.log(this.bi1);
    this.businessIntelligenceService.addBI1(this.bi1).subscribe({
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
