import { Component, Inject, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import {
  MAT_DIALOG_DATA,
  MatDialogClose,
  MatDialogRef,
} from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { ToastrService } from 'ngx-toastr';
import { CalibrageService } from '@shared/services/calibrage.service';
import { CategorieRessource } from '../interfaces';

export interface AssocierData {
  id_ModeleGrille: number;
  nomModele: string;
  selection: number[]; // ids deja associes
}

@Component({
  selector: 'app-associer-categories',
  standalone: true,
  imports: [
    MatFormFieldModule,
    MatSelectModule,
    MatDialogClose,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatIconModule,
    FormsModule,
  ],
  templateUrl: './associer-categories.component.html',
})
export class AssocierCategoriesComponent implements OnInit {
  readonly dialogRef = inject(MatDialogRef<AssocierCategoriesComponent>);
  private readonly calibrage = inject(CalibrageService);
  private readonly toast = inject(ToastrService);

  categories: CategorieRessource[] = [];
  selection: number[] = [];
  isSubmitting = false;

  constructor(@Inject(MAT_DIALOG_DATA) public data: AssocierData) {}

  ngOnInit(): void {
    this.selection = [...(this.data.selection || [])];
    this.calibrage.getAllCategoriesRessources().subscribe({
      next: cats => (this.categories = cats),
      error: () => this.toast.error('Impossible de charger les categories'),
    });
  }

  estSelectionnee(id: number): boolean {
    return this.selection.includes(id);
  }

  basculer(id: number, checked: boolean) {
    if (checked) {
      if (!this.selection.includes(id)) {
        this.selection.push(id);
      }
    } else {
      this.selection = this.selection.filter(x => x !== id);
    }
  }

  enregistrer() {
    this.isSubmitting = true;
    this.calibrage
      .setCategoriesRessources(this.data.id_ModeleGrille, this.selection)
      .subscribe({
        next: () => {
          this.toast.success('Associations mises a jour');
          this.isSubmitting = false;
          this.dialogRef.close(true);
        },
        error: () => {
          this.toast.error("Une erreur s'est produite");
          this.isSubmitting = false;
        },
      });
  }
}
