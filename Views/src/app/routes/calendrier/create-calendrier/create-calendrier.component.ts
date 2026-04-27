import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatOptionModule } from '@angular/material/core';
import { MatDialogClose, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MtxButtonModule } from '@ng-matero/extensions/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { CalendrierService } from '@shared/services/calendrierService/calendrier.service';
import { CommonModule } from '@angular/common';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-create-calendrier',
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
  templateUrl: './create-calendrier.component.html',
  styleUrl: './create-calendrier.component.scss',
})
export class CreateCalendrierComponent implements OnInit {
  readonly dialogRef = inject(MatDialogRef<CreateCalendrierComponent>);
  fb = inject(FormBuilder);
  private readonly toastSrv = inject(ToastrService);

  formGroup = this.fb.group({
    date_debut: [new Date(), [Validators.required]],
    date_fin: [new Date(), [Validators.required]],
    id_Site: [0],
  });
  isSubmitting = false;
  sites: any;
  constructor(private calendrierService: CalendrierService) {}
  ngOnInit(): void {
    this.getAllSite();
  }
  createCalendars() {
    console.log(this.formGroup.value);
    if (this.formGroup.invalid) return;

    const raw = this.formGroup.value;

    const payload = {
      date_debut: raw.date_debut!.toISOString().split('T')[0],
      date_fin: raw.date_fin!.toISOString().split('T')[0],
      id_Site: raw.id_Site!,
    };

    this.calendrierService.addCalendars(payload).subscribe({
      next: response => {
        console.log('response nextttttttttttttttttttttttttttt');
        console.log(response);
        this.toastSrv.success(response?.message);
        this.dialogRef.close();
      },
      error: error => {
        console.log('error');
        console.log(error);
        this.toastSrv.error(error?.error.message);
        this.dialogRef.close();
      },
    });
  }
  getAllSite() {
    this.calendrierService.getAllSite().subscribe({
      next: response => {
        console.log('response');
        console.log(response);
        this.sites = response;
      },
      error: error => {
        console.log('error');
        console.log(error);
      },
    });
  }
}
