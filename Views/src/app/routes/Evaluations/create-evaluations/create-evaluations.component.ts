import { CommonModule } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardHeader, MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogClose, MatDialogRef } from '@angular/material/dialog';
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
import { Evaluations } from '@shared/modeles/evaluations/Evaluations';
import { EvaluationsService } from '@shared/services/EvalutionsService/evaluations.service';
import { ContexteService } from '@shared/services/ContexteService/contexte.service';
import { Contexte } from '@shared/modeles/contexte/Contexte';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { LoginService } from '@core';
import { Router } from '@angular/router';
@Component({
  selector: 'app-create-evaluations',
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
  templateUrl: './create-evaluations.component.html',
  styleUrl: './create-evaluations.component.scss',
})
export class CreateEvaluationsComponent implements OnInit, AfterViewInit {
  fb = inject(FormBuilder);
  private readonly toastSrv = inject(ToastrService);
  private searchSubject = new Subject<string>(); // Sujet pour gérer les saisies
  private readonly router = inject(Router);
  readonly dialogRef = inject(MatDialogRef<CreateEvaluationsComponent>);

  formGroup = this.fb.group({
    id: [0, [Validators.required]],
    id_Contexte: [null as number | null, [Validators.required]],
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
  evaluations: Evaluations = new Evaluations();
  contextes: Contexte[] = [];
  recherche: string = '';
  usernameError: string = '';
  inputStart = false;
  agent: any;
  me: any;
  constructor(
    private evaluationsService: EvaluationsService,
    private contexteService: ContexteService,
    private cdRef: ChangeDetectorRef,
    private loginService: LoginService
  ) {
    this.searchSubject
      .pipe(
        debounceTime(1000) // Attend 300ms après la dernière frappe
      )
      .subscribe(searchTerm => {
        this.performSearch(searchTerm.trim()); // Appel de la méthode de recherche
      });
  }
  ngAfterViewInit(): void {
    this.loadAgent();
  }
  ngOnInit(): void {
    console.log('this.evaluations.dmt');
    console.log(this.evaluations);

    console.log('this.formGroup.value');
    console.log(this.formGroup.value);
    this.loadMe();
    this.loadContextes();
  }
  loadContextes() {
    this.contexteService.getAllContextesActifs().subscribe({
      next: response => {
        this.contextes = response?.data || [];
      },
      error: error => {
        console.log(error);
        this.toastSrv.error('Impossible de charger la liste des contextes');
      },
    });
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
    this.evaluations.fromData(this.formGroup.value);
    console.log('this.agent');
    console.log(this.agent);
    this.evaluations.id_Agent = this.agent.id;
    this.evaluations.id_Evaluateur = this.me.id;
    if (!this.me?.id) {
      this.toastSrv.error("L'utilisateur courant n'est pas charger !");
      return;
    }
    console.log('this.evaluations');
    console.log(this.evaluations);
    this.evaluationsService.addEvaluation(this.evaluations).subscribe({
      next: response => {
        this.toastSrv.success(response.message);
        if (response.id) {
          this.router.navigateByUrl(`mon-espace/Evaluations/Completion/${response?.id}`);
          this.dialogRef.close();
        }
      },
      error: error => {
        console.log(error);
        this.toastSrv.error(error.error.message);
      },
    });
  }
  loadAgent() {
    this.evaluationsService.getAgentByUsername(this.recherche).subscribe({
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
