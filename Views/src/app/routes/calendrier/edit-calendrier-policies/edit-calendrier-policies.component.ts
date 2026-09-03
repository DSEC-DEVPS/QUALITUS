import { CommonModule } from '@angular/common';
import { Component, Inject, inject, OnInit } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatOptionModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialogClose, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MtxButtonModule } from '@ng-matero/extensions/button';
import { CalendarsPolicies } from '@shared/modeles/calendars/CalendarsPolicies';
import { CalendrierService } from '@shared/services/calendrierService/calendrier.service';
import { ToastrService } from 'ngx-toastr';
import { MatRadioButton, MatRadioChange, MatRadioGroup } from '@angular/material/radio';

@Component({
  selector: 'app-edit-calendrier-policies',
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
    MatRadioButton,
    MatRadioGroup,
  ],
  templateUrl: './edit-calendrier-policies.component.html',
  styleUrl: './edit-calendrier-policies.component.scss',
})
export class EditCalendrierPoliciesComponent implements OnInit {
  readonly dialogRef = inject(MatDialogRef<EditCalendrierPoliciesComponent>);
  private readonly toastSrv = inject(ToastrService);
  fb = inject(FormBuilder);
  formGroup = this.fb.group({
    id: [0, [Validators.required]],
    mois_courant_et_posterieurs: [0, [Validators.required]],
    mois_courant: [0, [Validators.required]],
    tous_les_mois: [0, [Validators.required]],
    id_Site: [0, [Validators.required]],
  });
  isSubmitting = false;
  sites: any;
  data: any;
  constructor(
    private calendrierService: CalendrierService,
    @Inject(MAT_DIALOG_DATA) data: any
  ) {
    this.data = data;
  }
  ngOnInit(): void {
    console.log('this.data');
    console.log(this.data.calendarsPolicies);

    this.getAllSite();
    this.formGroup.patchValue({
      id: this.data.calendarsPolicies.id,
      mois_courant_et_posterieurs: this.data.calendarsPolicies.mois_courant_et_posterieurs,
      mois_courant: this.data.calendarsPolicies.mois_courant,
      tous_les_mois: this.data.calendarsPolicies.tous_les_mois,
      id_Site: this.data.calendarsPolicies.id_Site,
    });
    console.log('this.formGroup.value');
    console.log(this.formGroup.value);
  }
  calendarsPolicies: CalendarsPolicies = Object.assign(
    new CalendarsPolicies(),
    this.formGroup.value
  );
  updateCalendarsPolicies() {
    console.log(this.formGroup.value);
    if (this.formGroup.invalid) return;
    this.calendarsPolicies.fromData(this.formGroup.value);

    this.calendrierService
      .updateCalendarsPolicies(this.calendarsPolicies.id, this.calendarsPolicies)
      .subscribe({
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
  selectMois(event: MatRadioChange) {
    switch (event.value) {
      case 'mois_courant_et_posterieurs':
        this.formGroup.patchValue({
          mois_courant_et_posterieurs: 1,
          mois_courant: 0,
          tous_les_mois: 0,
        });
        break;
      case 'mois_courant':
        this.formGroup.patchValue({
          mois_courant_et_posterieurs: 0,
          mois_courant: 1,
          tous_les_mois: 0,
        });
        break;
      case 'tous_les_mois':
        this.formGroup.patchValue({
          mois_courant_et_posterieurs: 0,
          mois_courant: 0,
          tous_les_mois: 1,
        });
        break;
      default:
        break;
    }
    console.log('Valeur sélectionnée:', this.formGroup.value);
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
