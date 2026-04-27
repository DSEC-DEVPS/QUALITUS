import { CommonModule } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, Component, Inject, inject, OnInit } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardHeader, MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogClose, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatLabel, MatFormField, MatFormFieldModule } from '@angular/material/form-field';
import { ToastrService } from 'ngx-toastr';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatOptionModule } from '@angular/material/core';
import { MtxButtonModule } from '@ng-matero/extensions/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { EvaluationsService } from '@shared/services/EvalutionsService/evaluations.service';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { LoginService } from '@core';
import { Router } from '@angular/router';
import { SupplementairesComponent } from '../supplementaires/supplementaires.component';
import { Supplementaires } from '@shared/modeles/supplementaires/Supplementaires';
import { SupplementairesService } from '@shared/services/SupplementairesService/supplementaires.service';
@Component({
  selector: 'app-create-supplementaires',
  standalone: true,
  imports: [
    MatCardHeader,
    MatCardModule,
    MatIconModule,
    CommonModule,
    MatCheckboxModule,
    MatTooltipModule,
    FormsModule,
    MatLabel,
    MatFormField,
    MatAutocompleteModule,
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
  templateUrl: './create-supplementaires.component.html',
  styleUrl: './create-supplementaires.component.scss',
})
export class CreateSupplementairesComponent {
  fb = inject(FormBuilder);
  private readonly toastSrv = inject(ToastrService);
  private searchSubject = new Subject<string>(); // Sujet pour gérer les saisies
  private readonly router = inject(Router);
  readonly dialogRef = inject(MatDialogRef<CreateSupplementairesComponent>);
  readonly dialogRefSupplementaire = inject(MatDialogRef<SupplementairesComponent>);

  formGroup = this.fb.group({
    id: [0, [Validators.required]],
    contexte: ['', [Validators.required]],
    identifiant_appel: ['', [Validators.required]],
    numero_case: ['', [Validators.required]],
    numero_appel: ['', [Validators.required]],
    date_appel: [new Date(), [Validators.required]],
    dmt: ['00:00:00', [Validators.required]],
    motif_appel: ['', [Validators.required]],
    id_Evaluateur: [0, [Validators.required]],
    id_Agent: ['', [Validators.required]],
  });
  isSubmitting: any;
  supplementaires: Supplementaires = new Supplementaires();
  recherche: string = '';
  usernameError: string = '';
  inputStart = false;
  agent: any;
  me: any;
  id_Evaluations: number = 0;
  constructor(
    private supplementairesService: SupplementairesService,
    private cdRef: ChangeDetectorRef,
    private loginService: LoginService,
    @Inject(MAT_DIALOG_DATA) data: any
  ) {
    this.searchSubject
      .pipe(
        debounceTime(1000) // Attend 300ms après la dernière frappe
      )
      .subscribe(searchTerm => {
        this.performSearch(searchTerm.trim()); // Appel de la méthode de recherche
      });
    this.id_Evaluations = data.id_Evaluations;
  }
  ngAfterViewInit(): void {
    this.loadAgent();
  }
  ngOnInit(): void {
    console.log('this.supplementaires.dmt');
    console.log(this.supplementaires);

    console.log('this.formGroup.value');
    console.log(this.formGroup.value);
    this.loadMe();
  }
  onInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchSubject.next(input.value);
  }
  performSearch(term: string): void {
    this.recherche = term;
    this.ngAfterViewInit();
  }

  createEvaluations() {
    this.supplementaires.fromData(this.formGroup.value);
    console.log('this.agent');
    console.log(this.agent);
    this.supplementaires.id_Agent = this.agent.id;
    this.supplementaires.id_Evaluateur = this.me.id;
    this.supplementaires.id_Evaluations = this.id_Evaluations;
    if (!this.me?.id) {
      this.toastSrv.error("L'utilisateur courant n'est pas charger !");
      return;
    }
    console.log('this.supplementaires');
    console.log(this.supplementaires);
    this.supplementairesService.addSupplementaire(this.supplementaires).subscribe({
      next: response => {
        this.toastSrv.success(response.message);
        console.log('response');
        console.log(response);
        if (response.id) {
          this.router.navigateByUrl(
            `mon-espace/Evaluations/Supplementaire/Completion/${response?.id}`
          );
          this.dialogRef.close();
          this.dialogRefSupplementaire.close();
          console.log('Ca passe ');
        }
      },
      error: error => {
        console.log(error);
        this.toastSrv.error(error.error.message);
      },
    });
  }
  loadAgent() {
    this.supplementairesService.getAgentByUsername(this.recherche).subscribe({
      next: response => {
        if (response) {
          console.log('InputStart2');
          console.log(this.inputStart);
          console.log('response');
          console.log(response);
          this.agent = response;
          this.usernameError = '';
          this.inputStart = false;
        } else {
          if (this.recherche === '') {
            this.inputStart = false;
            this.agent = null;
          } else {
            this.inputStart = true;
            this.usernameError = "Aucun agent trouvé avec ce nom d'utilisateur";
            this.agent = null;
          }
        }
      },
      error: error => {
        console.log(error);
      },
    });
  }

  loadMe() {
    this.loginService.me().subscribe({
      next: response => {
        this.me = response;
      },
      error: error => {
        console.log(error);
      },
    });
  }
}
