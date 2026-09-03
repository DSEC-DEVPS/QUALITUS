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
  selector: 'app-edit-bi1',
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
  templateUrl: './edit-bi1.component.html',
  styleUrl: './edit-bi1.component.scss',
})
export class EditBI1Component {
  readonly dialogRef = inject(MatDialogRef<EditBI1Component>);
  fb = inject(FormBuilder);
  private readonly toastSrv = inject(ToastrService);

  formGroup = this.fb.group({
    id: [0, [Validators.required]],
    options: ['', [Validators.required]],
    id_Business_Intelligence: [0, [Validators.required]],
  });
  isSubmitting = false;
  businessIntelligences: BusinessIntelligenceInterface[] | undefined;
  data: any;
  constructor(
    private businessIntelligenceService: BusinessIntelligenceService,
    @Inject(MAT_DIALOG_DATA) data: any
  ) {
    this.data = data;
  }
  ngOnInit(): void {
    this.getAllBusinessIntelligence();

    this.formGroup.patchValue({
      id: this.data.bi1.id,
      options: this.data.bi1.options,
      id_Business_Intelligence: this.data.bi1.id_Business_Intelligence,
    });
  }
  bi1: BI1 = Object.assign(new BI1(), this.formGroup.value);
  updateBI1() {
    this.bi1.fromData(this.formGroup.value);
    console.log('Valeur du formulaire');
    console.log(this.bi1);
    this.businessIntelligenceService.updateBI1(this.bi1.id, this.bi1).subscribe({
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

  getAllBusinessIntelligence() {
    this.businessIntelligenceService.getAllBusinessIntelligence().subscribe({
      next: response => {
        console.log('response');
        console.log(response);
        this.businessIntelligences = response;
      },
      error: error => {
        console.log('error');
        console.log(error);
      },
    });
  }
}
