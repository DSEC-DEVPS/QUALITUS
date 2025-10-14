import { Component, inject, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialogClose, MatDialogRef } from '@angular/material/dialog';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatOptionModule } from '@angular/material/core';
import { MtxButtonModule } from '@ng-matero/extensions/button';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { UserService } from '@shared/services/user.service';
import { ToastrService } from 'ngx-toastr';
import { categorie } from '@core';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-ajouter-sla',
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
    CommonModule,
  ],
  templateUrl: './ajouter-sous-categorie.component.html',
  styleUrl: './ajouter-sous-categorie.component.scss',
})
export class AjouterSousCategorieComponent implements OnInit {
  readonly dialogRef = inject(MatDialogRef<AjouterSousCategorieComponent>);
  private readonly fb = inject(FormBuilder);
  formSousCategorie!: FormGroup;
  isSubmitting = false;
  table_categorie!: categorie[];
  constructor(
    private userService: UserService,
    private toastSrv: ToastrService
  ) {}
  ngOnInit(): void {
    this.formSousCategorie = this.fb.group({
      nom: [null, Validators.required],
      id_Categorie: [null, Validators.required],
    });
    this.userService.getAllCategorie().subscribe({
      next: resultat => {
        console.log(resultat);
        this.table_categorie = resultat;
      },
      error: error => {
        console.log(error);
      },
    });
  }
  handleOnSumit() {
    this.isSubmitting = true;
    this.userService.addSousCategorie(this.formSousCategorie.value).subscribe({
      error: () => {
        this.toastSrv.error("Il y'a eu lieu une erreur");
        this.isSubmitting = false;
      },
      next: () => {
        this.toastSrv.success("Vous venez d'ajouter une nouvelle sous catégorie avec succès");
        this.isSubmitting = false;
        this.dialogRef.close();
      },
    });
  }
}
