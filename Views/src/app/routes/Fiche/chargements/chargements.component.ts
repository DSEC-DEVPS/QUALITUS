import { AfterViewInit, Component, OnInit, ViewChild, inject } from '@angular/core';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { UserService } from '@shared/services/user.service';
import { AuthService, Fiche, fiche_by_gestionnaire, User } from '@core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { Router } from '@angular/router';
import * as XLSX from 'xlsx';
import { finalize } from 'rxjs';
import { ChargementComponent } from '@shared/components/chargement/chargement.component';
@Component({
  selector: 'app-chargements',
  standalone: true,
  imports: [ChargementComponent,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatGridListModule,
    MatTooltipModule,
    MatIcon,
    TitleCasePipe,
    DatePipe,
  ],
  templateUrl: './chargements.component.html',
  styleUrl: './chargements.component.scss',
})
export class ChargementsComponent implements OnInit {
  chargement = true;
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  displayedColumns: string[] = [
    'titre',
    'type',
    'dateDebut',
    'dateFin',
    'ETAT',
    'on_time',
    'action',
  ];
  filename = 'La_liste_de_mes_chargements.xlsx';
  filename_global = 'Tous_les_chargements_de_BASECO.xlsx';
  // initialisé vide : ngAfterViewInit s\'exécute avant l\'arrivée des données
  dataSource = new MatTableDataSource<Fiche>([]);
  downloadData!: Fiche[];
  user!: User;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  ngOnInit(): void {
    this.chargement = true;
    this.auth.user().subscribe({
      next: user => {
        this.user = user;
      },
      error: error => {
        console.log(error);
      },
    });
    this.userService.getAllFicheByGestionnaire().pipe(finalize(() => (this.chargement = false))).subscribe({
      next: result => {
        this.dataSource = new MatTableDataSource(result);
        this.downloadData = result;
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
      },
      error: error => {
        console.log(error);
      },
    });
  }
  // ngAfterViewInit() {
  // //   this.dataSource.paginator = this.paginator;
  // // }
  lire_fiche(id: number) {
    this.router.navigateByUrl(`lecture-fiche/${id}`);
  }
  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }
  download() {
    const data = this.downloadData;
    const ws1: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws1, 'LISTE');
    XLSX.writeFile(wb, this.filename);
  }

  router_on_details_user(id: number) {
    this.router.navigateByUrl(`mon-espace/Fiche/details/${id}`);
  }
}
