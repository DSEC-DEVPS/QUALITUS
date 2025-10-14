import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, Validators } from '@angular/forms';
import { FormBuilder, FormGroup } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { UserService } from '@shared/services/user.service';
import { MatTableModule } from '@angular/material/table';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDividerModule } from '@angular/material/divider';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { NgxPermissionsModule } from 'ngx-permissions';
import { MatButtonModule } from '@angular/material/button';
import * as XLSX from 'xlsx';
@Component({
  selector: 'app-exporter',
  templateUrl: './exporter.component.html',
  styleUrls: ['./exporter.component.scss'],
  providers: [DatePipe],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatDatepickerModule,
    MatInputModule,
    MatSlideToggleModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatDividerModule,
    MatCheckboxModule,
    NgxPermissionsModule,
    MatButtonModule,
  ],
})
export class ExporterComponent implements OnInit {
  exportForm!: FormGroup;
  isLoading = false;
  dataPreview: any[] = [];
  columnsToDisplay: string[] = [];
  formats = ['EXCEL', 'CSV'];
  type_donnes = [
    { label: 'Chargements', permissions: ['R_ADMI', 'R_GB', 'R_GE', 'R_SUP'] },
    { label: 'Commentaires', permissions: ['R_ADMI', 'R_GB', 'R_GE', 'R_SUP'] },
    { label: 'Exactitude', permissions: ['R_ADMI', 'R_GB', 'R_GE', 'SUP'] },
    { label: 'Utilité', permissions: ['R_ADMI', 'R_GB', 'R_GE', 'R_SUP'] },
    { label: 'Quiz', permissions: ['R_ADMI', 'R_GB', 'R_GE', 'R_SUP'] },
    { label: 'Ma voix compte', permissions: ['R_ADMI', 'R_GB', 'R_GE,SUP'] },
  ];

  constructor(
    private fb: FormBuilder,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.exportForm = this.fb.group({
      dataType: ['Chargements', [Validators.required]],
      dateDebut: [null, [Validators.required]],
      dateFin: [null, [Validators.required]],
      format: ['EXCEL', [Validators.required]],
    });
  }

  onPreview(): void {}

  onExport(): void {
    this.userService.export_ma_voix_compte(this.exportForm.value).subscribe({
      next: resultat => {
        this.download(resultat);
      },
      error: error => {
        console.log(error);
      },
    });
  }
  download(table: any[]) {
    const data = table;
    const ws1: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws1, this.exportForm.get('dataType')?.value);
    XLSX.writeFile(wb, `Export_de_${this.exportForm.get('dataType')?.value}.xlsx`);
  }
}
