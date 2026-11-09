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
import { ToastrService } from 'ngx-toastr';
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
    { label: 'Exactitude', permissions: ['R_ADMI', 'R_GE', 'SUP'] },
    { label: 'Utilité', permissions: ['R_ADMI', 'R_GB', 'R_GE', 'R_SUP'] },
    { label: 'Quiz', permissions: ['R_ADMI', 'R_GB', 'R_GE', 'R_SUP'] },
    { label: 'Ma voix compte', permissions: ['R_ADMI', 'R_GB', 'R_GE,SUP'] },
  ];

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private datePipe: DatePipe,
    private toast: ToastrService
  ) {}

  ngOnInit(): void {
    this.exportForm = this.fb.group({
      dataType: ['Chargements', [Validators.required]],
      dateDebut: [null, [Validators.required]],
      dateFin: [null, [Validators.required]],
      isActive: [false],
      format: ['EXCEL', [Validators.required]],
    });
  }

  onPreview(): void {}

  onExport(): void {
    if (this.exportForm.invalid) return;
    const demande = this.exportForm.value;
    if (demande.dataType === 'Exactitude') {
      const debut = this.datePipe.transform(demande.dateDebut, 'yyyy-MM-dd');
      const fin = this.datePipe.transform(demande.dateFin, 'yyyy-MM-dd');
      if (!debut || !fin || debut > fin) {
        this.toast.error('La date de fin doit être égale ou postérieure à la date de début.');
        return;
      }
      demande.dateDebut = debut;
      demande.dateFin = fin;
    }
    this.userService.export_ma_voix_compte(demande).subscribe({
      next: resultat => this.download(resultat, demande.dataType, demande.format),
      error: () => this.toast.error("Impossible de générer l’export."),
    });
  }
  download(table: any[], dataType: string, format: string): void {
    const exactitude = dataType === 'Exactitude';
    const header = exactitude
      ? ['id_controle', 'id_fiche', 'titre', 'type_de_controle', 'exactitude', 'date_contrôle']
      : undefined;
    const feuille = XLSX.utils.json_to_sheet(table, { header });
    const classeur = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(classeur, feuille, dataType);
    const extension = exactitude && format === 'CSV' ? 'csv' : 'xlsx';
    XLSX.writeFile(classeur, `Export_de_${dataType}.${extension}`);
  }
}
