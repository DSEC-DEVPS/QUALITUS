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
import { BusinessIntelligence } from '@shared/modeles/businessIntelligence/BusinessIntelligence';
import { SiteService } from '@shared/services/SiteService/site.service';
import { GrilleService } from '@shared/services/GrilleService/grille.service';
@Component({
  selector: 'app-edit-business-intelligence',
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
  templateUrl: './edit-business-intelligence.component.html',
  styleUrl: './edit-business-intelligence.component.scss',
})
export class EditBusinessIntelligenceComponent {
  readonly dialogRef = inject(MatDialogRef<EditBusinessIntelligenceComponent>);
  fb = inject(FormBuilder);
  private readonly toastSrv = inject(ToastrService);

  formGroup = this.fb.group({
    id: [0],
    nom: ['', [Validators.required]],
    id_Site: [0, [Validators.required]],
    id_Grille: [0, [Validators.required]],
  });
  isSubmitting = false;
  sites: any;
  grilles: any;
  data : any;
  constructor(
    @Inject(MAT_DIALOG_DATA) data: any,
    private businessIntelligenceService: BusinessIntelligenceService,
    private siteService: SiteService,
    private grilleService: GrilleService
  ) {
    this.data = data;
  }
  ngOnInit(): void {
    this.getAllGrille();
    this.getAllSite();
    console.log('Data');
    console.log(this.data.businessIntelligence);
    console.log('this.data.id');
    console.log(this.data?.id);

    this.formGroup.patchValue({
      id: this.data.businessIntelligence.id,
      nom: this.data.businessIntelligence.nom,
      id_Site: this.data.businessIntelligence.id_Site,
      id_Grille: this.data.businessIntelligence.id_Grille,
    });
    console.log('Valeur formulaire');
    console.log(this.formGroup.value);
  }
  businessIntelligence: BusinessIntelligence = Object.assign(
    new BusinessIntelligence(),
    this.formGroup.value
  );
  editBusinessIntelligence() {
    this.businessIntelligence.fromData(this.formGroup.value);
    console.log('Valeur du formulaire');
    console.log(this.businessIntelligence);
    this.businessIntelligenceService
      .updateBusinessIntelligence(this.businessIntelligence.id, this.businessIntelligence)
      .subscribe({
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
  getAllSite() {
    this.siteService.getAllSite().subscribe({
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
  getAllGrille() {
    this.grilleService.getAllGrille().subscribe({
      next: response => {
        console.log('response');
        console.log(response);
        this.grilles = response;
      },
      error: error => {
        console.log('error');
        console.log(error);
      },
    });
  }
}
