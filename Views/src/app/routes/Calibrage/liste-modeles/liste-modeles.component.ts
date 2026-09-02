import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import {
  AppearanceAnimation,
  ConfirmBoxInitializer,
  DialogLayoutDisplay,
  DisappearanceAnimation,
} from '@costlydeveloper/ngx-awesome-popup';
import { CalibrageService } from '@shared/services/calibrage.service';
import { ModeleGrille } from '../interfaces';
import { AjouterModeleComponent } from '../ajouter-modele/ajouter-modele.component';
import { AssocierCategoriesComponent } from '../associer-categories/associer-categories.component';
import { ImportModeleComponent } from '../import-modele/import-modele.component';

@Component({
  selector: 'app-liste-modeles',
  standalone: true,
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatTooltipModule,
    DatePipe,
  ],
  templateUrl: './liste-modeles.component.html',
  styleUrl: './liste-modeles.component.scss',
})
export class ListeModelesComponent implements OnInit {
  private readonly calibrage = inject(CalibrageService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastrService);

  dataSource = new MatTableDataSource<ModeleGrille>([]);
  displayedColumns = ['id', 'nom', 'description', 'Etat', 'dateCreation', 'actions'];
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  ngOnInit(): void {
    this.charger();
  }

  charger() {
    this.calibrage.getAllModeles().subscribe({
      next: data => {
        this.dataSource.data = data;
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
      },
      error: () => this.toast.error('Impossible de charger les modeles'),
    });
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  nouveau() {
    const ref = this.dialog.open(AjouterModeleComponent, {
      width: 'calc(100% - 30px)',
      maxWidth: '600px',
    });
    ref.afterClosed().subscribe(created => {
      if (created) {
        this.charger();
      }
    });
  }

  importer() {
    const ref = this.dialog.open(ImportModeleComponent, {
      width: 'calc(100% - 30px)',
      maxWidth: '600px',
    });
    ref.afterClosed().subscribe(imported => {
      if (imported) {
        this.charger();
      }
    });
  }

  editer(modele: ModeleGrille) {
    this.router.navigate(['/mon-espace/calibrage/editeur', modele.id]);
  }

  associer(modele: ModeleGrille) {
    const ref = this.dialog.open(AssocierCategoriesComponent, {
      width: 'calc(100% - 30px)',
      maxWidth: '600px',
      data: {
        id_ModeleGrille: modele.id,
        nomModele: modele.nom,
        selection: (modele.categoriesRessources || []).map(c => c.id),
      },
    });
    ref.afterClosed().subscribe(saved => {
      if (saved) {
        this.charger();
      }
    });
  }

  supprimer(modele: ModeleGrille) {
    const confirmBox = new ConfirmBoxInitializer();
    confirmBox.setTitle('Suppression !');
    confirmBox.setMessage(
      `Supprimer le modele "${modele.nom}" et toute sa grille ?`
    );
    confirmBox.setConfig({
      layoutType: DialogLayoutDisplay.DANGER,
      animationIn: AppearanceAnimation.BOUNCE_IN,
      animationOut: DisappearanceAnimation.BOUNCE_OUT,
      buttonPosition: 'right',
    });
    confirmBox.setButtonLabels('OUI', 'NON');
    confirmBox.openConfirmBox$().subscribe(resp => {
      if (resp.success) {
        this.calibrage.deleteModele(modele.id).subscribe({
          next: r => {
            this.toast.success(r.message);
            this.charger();
          },
          error: () => this.toast.error('Suppression impossible'),
        });
      }
    });
  }
}
