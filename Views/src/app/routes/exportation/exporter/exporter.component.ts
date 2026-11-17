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
import { PermissionsService } from '../../../core/authorization/permissions.service';
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
  sites: any[] = [];
  statuts = ['ACTIF', 'INACTIF'];
  type_donnes = [
    { label: 'Chargements', permissions: ['R_ADMI', 'R_GB', 'R_GE', 'R_SUP'] },
    { label: 'Commentaires', permissions: ['R_ADMI', 'R_GB', 'R_GE', 'R_SUP'] },
    { label: 'Exactitude', permissions: ['R_ADMI', 'R_GE', 'SUP'] },
    { label: 'Utilité', permissions: ['R_ADMI', 'R_GB', 'R_GE', 'R_SUP'] },
    { label: 'Quiz', permissions: ['R_ADMI', 'R_GB', 'R_GE', 'R_SUP'] },
    { label: 'Ma voix compte', permissions: ['R_ADMI', 'R_GB', 'R_GE,SUP'] },
    // Exports Reporting (cahier) — Lot 1
    // ECOUTES / ECOUTES ITEMS : visibles pour qui peut voir le menu Exportations
    // (déjà garanti par l'accès à la page) ET créer une évaluation.
    { label: 'ECOUTES', permissions: ['evaluation.creer'] },
    { label: 'ECOUTES ITEMS', permissions: ['evaluation.creer'] },
    { label: 'LISTE DES AGENTS', permissions: ['R_ADMI', 'R_GB', 'R_GE', 'R_SUP'] },
    { label: 'COACHING AGENT', permissions: ['R_ADMI', 'R_GE', 'R_SUP'] },
    // Exports Reporting (cahier) — Lot 2
    { label: 'PÔLE DE PERFECTIONNEMENT', permissions: ['R_ADMI', 'R_GE', 'R_SUP'] },
    { label: 'CONTRE EVALUATION', permissions: ['R_ADMI', 'R_GE', 'R_SUP'] },
    { label: 'CALIBRAGES', permissions: ['R_ADMI', 'R_GE', 'R_SUP'] },
    { label: "PLAN D'ACTIONS", permissions: ['R_ADMI', 'R_GE', 'R_SUP'] },
  ];
  // Types d'export qui n'utilisent PAS l'intervalle de dates.
  private readonly sansDates = ['LISTE DES AGENTS'];
  // Types qui proposent le filtre Site.
  private readonly avecSite = [
    'ECOUTES', 'ECOUTES ITEMS', 'LISTE DES AGENTS', 'COACHING AGENT',
    'PÔLE DE PERFECTIONNEMENT', 'CONTRE EVALUATION', 'CALIBRAGES', "PLAN D'ACTIONS",
  ];
  // Types qui proposent le filtre Statut.
  private readonly avecStatut = ['LISTE DES AGENTS'];

  needsDates(): boolean {
    return !this.sansDates.includes(this.exportForm?.value?.dataType);
  }
  showSite(): boolean {
    const dt = this.exportForm?.value?.dataType;
    if (!this.avecSite.includes(dt)) return false;
    // ECOUTES / ECOUTES ITEMS : le choix du site n'est offert qu'au site DSFO
    // (ou admin). Les autres sites exportent uniquement les agents de leur site.
    if (dt === 'ECOUTES' || dt === 'ECOUTES ITEMS') return this.perms.estDSFO();
    return true;
  }
  showStatut(): boolean {
    return this.avecStatut.includes(this.exportForm?.value?.dataType);
  }

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private datePipe: DatePipe,
    private toast: ToastrService,
    private perms: PermissionsService
  ) {}

  ngOnInit(): void {
    this.exportForm = this.fb.group({
      dataType: ['Chargements', [Validators.required]],
      dateDebut: [null, [Validators.required]],
      dateFin: [null, [Validators.required]],
      site: [null],
      statut: [null],
      isActive: [false],
      format: ['EXCEL', [Validators.required]],
    });

    // Charge la liste des sites pour le filtre.
    this.userService.getAllSite().subscribe({
      next: sites => (this.sites = sites || []),
      error: () => (this.sites = []),
    });

    // Les dates sont requises sauf pour les exports qui ne les utilisent pas.
    this.exportForm.get('dataType')!.valueChanges.subscribe(() => this.majValidationDates());
  }

  // Active/désactive la validation des dates selon le type d'export sélectionné.
  private majValidationDates(): void {
    const debut = this.exportForm.get('dateDebut')!;
    const fin = this.exportForm.get('dateFin')!;
    if (this.needsDates()) {
      debut.setValidators([Validators.required]);
      fin.setValidators([Validators.required]);
    } else {
      debut.clearValidators();
      fin.clearValidators();
    }
    debut.updateValueAndValidity({ emitEvent: false });
    fin.updateValueAndValidity({ emitEvent: false });
  }

  onPreview(): void {}

  onExport(): void {
    if (this.exportForm.invalid) return;
    const demande = { ...this.exportForm.value };
    if (this.needsDates()) {
      const debut = this.datePipe.transform(demande.dateDebut, 'yyyy-MM-dd');
      const fin = this.datePipe.transform(demande.dateFin, 'yyyy-MM-dd');
      if (!debut || !fin || debut > fin) {
        this.toast.error('La date de fin doit être égale ou postérieure à la date de début.');
        return;
      }
      demande.dateDebut = debut;
      demande.dateFin = fin;
    }
    // N'envoie les filtres site/statut que lorsqu'ils sont pertinents.
    if (!this.showSite()) demande.site = null;
    if (!this.showStatut()) demande.statut = null;
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
