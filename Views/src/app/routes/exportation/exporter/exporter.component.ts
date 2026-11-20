import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, Validators } from '@angular/forms';
import { FormBuilder, FormGroup } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { UserService } from '@shared/services/user.service';
import {
  ContexteExportEval,
  ExportEvalService,
  ResultatExportEval,
  TypeExportEval,
} from '@shared/services/export-eval.service';
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
import { toYMD } from '@shared/date-utils';
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
  private readonly exportEval = inject(ExportEvalService);

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

  /** Exports Évaluation autorisés (droits + périmètre de site), fournis par le serveur. */
  contexte: ContexteExportEval | null = null;
  readonly statuts = [
    { valeur: 'TOUS', libelle: 'Tous' },
    { valeur: 'ACTIF', libelle: 'Actifs' },
    { valeur: 'INACTIF', libelle: 'Inactifs' },
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
      id_site: [null],
      statut: ['TOUS'],
    });
    this.exportForm.get('dataType')!.valueChanges.subscribe(() => this.ajusterDates());
    this.exportEval.contexte().subscribe({
      next: c => {
        this.contexte = c;
        // Hors vision globale : le site est imposé (celui de l'utilisateur).
        this.exportForm.patchValue({ id_site: c.vision_globale ? 'TOUS' : c.id_site });
      },
      error: () => (this.contexte = null),
    });
  }

  /** Type d'export Évaluation sélectionné (null pour les exports historiques). */
  get typeEval(): TypeExportEval | null {
    const code = this.exportForm?.get('dataType')?.value;
    return this.contexte?.types.find(t => t.code === code) ?? null;
  }

  get avecDates(): boolean {
    return !this.typeEval?.sans_dates;
  }

  get siteImpose(): string {
    const c = this.contexte;
    return c?.sites.find(s => s.id === c.id_site)?.nom ?? '';
  }

  /** Les dates ne sont exigées que pour les exports qui en ont. */
  private ajusterDates(): void {
    for (const nom of ['dateDebut', 'dateFin']) {
      const ctrl = this.exportForm.get(nom)!;
      ctrl.setValidators(this.avecDates ? [Validators.required] : []);
      ctrl.updateValueAndValidity({ emitEvent: false });
    }
  }

  onPreview(): void {}

  onExport(): void {
    if (this.exportForm.invalid) return;
    if (this.typeEval) {
      this.exporterEval(this.typeEval);
      return;
    }
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

  /* ----------------------- Exports Évaluation ----------------------- */
  private exporterEval(type: TypeExportEval): void {
    const v = this.exportForm.value;
    // toYMD : accepte les dates Moment du sélecteur comme les Date natives.
    const du = type.sans_dates ? null : toYMD(v.dateDebut);
    const au = type.sans_dates ? null : toYMD(v.dateFin);
    if (!type.sans_dates && (!du || !au || du > au)) {
      this.toast.error('La date de fin doit être égale ou postérieure à la date de début.');
      return;
    }
    this.isLoading = true;
    this.exportEval
      .exporter({ type: type.code, du, au, id_site: v.id_site === 'TOUS' ? null : v.id_site ?? null, statut: v.statut })
      .subscribe({
        next: r => {
          this.isLoading = false;
          if (!r.feuilles.some(f => f.lignes.length)) {
            this.toast.info('Aucune donnée pour ces critères.');
            return;
          }
          this.telechargerEval(r, v.format, du, au);
        },
        error: err => {
          this.isLoading = false;
          this.toast.error(err?.error?.message || "Impossible de générer l’export.");
        },
      });
  }

  private nomFichier(r: ResultatExportEval, du: string | null, au: string | null, feuille?: string): string {
    const propre = (s: string) =>
      s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '');
    const site = this.contexte?.sites.find(s => s.id === this.exportForm.value.id_site)?.nom;
    return [
      'Export',
      propre(r.libelle),
      feuille ? propre(feuille) : null,
      site ? propre(site) : this.contexte?.vision_globale ? 'tous_sites' : null,
      du && au ? `${du}_au_${au}` : null,
    ]
      .filter(Boolean)
      .join('_');
  }

  private telechargerEval(r: ResultatExportEval, format: string, du: string | null, au: string | null): void {
    if (format === 'CSV') {
      // Un fichier CSV par feuille (séparateur « ; », BOM pour Excel).
      for (const f of r.feuilles) {
        const csv = XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet(f.lignes), { FS: ';' });
        const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = this.nomFichier(r, du, au, r.feuilles.length > 1 ? f.nom : undefined) + '.csv';
        a.click();
        URL.revokeObjectURL(a.href);
      }
      return;
    }
    const classeur = XLSX.utils.book_new();
    for (const f of r.feuilles) {
      // Nom d'onglet Excel : 31 caractères au plus, sans : \ / ? * [ ]
      XLSX.utils.book_append_sheet(classeur, XLSX.utils.json_to_sheet(f.lignes), f.nom.replace(/[:\\/?*[\]]/g, ' ').slice(0, 31));
    }
    XLSX.writeFile(classeur, this.nomFichier(r, du, au) + '.xlsx');
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
