import { AfterViewInit, Component, inject, OnInit, ViewChild } from '@angular/core';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import * as XLSX from 'xlsx';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule, DatePipe } from '@angular/common';
import { UserService } from '@shared/services/user.service';
import { Quiz_reponse } from '@core';
import { Router } from '@angular/router';
import { MatTooltipModule } from '@angular/material/tooltip';
export interface PeriodicElement {
  fiche: string;
  login: string;
  date_relance: string;
  status: string;
}

const ELEMENT_DATA: PeriodicElement[] = [
  {
    fiche: 'FP_Bonus toutes recharges 200% de Bonus  Cross net du jeudi 20 Mars 2025',
    date_relance: '2025-03-02',
    login: 'Rokia.Knt',
    status: 'Encours...',
  },
  {
    fiche: 'FP_Bonus toutes recharges 200% de Bonus  Cross net du jeudi 20 Mars 2025',
    date_relance: '2025-03-02',
    login: 'Rokia.Knt',
    status: 'Encours...',
  },
  {
    fiche: 'FP_Bonus toutes recharges 200% de Bonus  Cross net du jeudi 20 Mars 2025',
    date_relance: '2025-03-02',
    login: 'Rokia.Knt',
    status: 'Encours...',
  },
  {
    fiche: 'FP_Bonus toutes recharges 200% de Bonus  Cross net du jeudi 20 Mars 2025',
    date_relance: '2025-03-02',
    login: 'Rokia.Knt',
    status: 'Encours...',
  },
  {
    fiche: 'FP_Bonus toutes recharges 200% de Bonus  Cross net du jeudi 20 Mars 2025',
    date_relance: '2025-03-02',
    login: 'Rokia.Knt',
    status: 'Encours...',
  },
  {
    fiche: 'FP_Bonus toutes recharges 200% de Bonus  Cross net du jeudi 20 Mars 2025',
    date_relance: '2025-03-02',
    login: 'Rokia.Knt',
    status: 'Encours...',
  },
];
/**
 * @title Data table with sorting, pagination, and filtering.
 */
@Component({
  selector: 'app-quiz-en-reset',
  standalone: true,
  templateUrl: './quiz-en-reset.component.html',
  styleUrl: './quiz-en-reset.component.scss',
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatCardModule,
    MatIconModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    DatePipe,
    MatTooltipModule,
  ],
})
export class QuizEnResetComponent implements OnInit {
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);
  displayedColumns: string[] = ['titre', 'date_retest', 'nom_utilisateur', 'STATUT'];
  dataSource!: MatTableDataSource<Quiz_reponse>;
  filename = `Liste_Quiz_en_retest.xlsx`;
  downloadData!: Quiz_reponse[];
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  ngOnInit(): void {
    this.userService.Quiz_encours_retest().subscribe({
      next: resultat => {
        this.dataSource = new MatTableDataSource(resultat);
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
        this.downloadData = resultat;
      },
      error: error => {
        console.log(error);
      },
    });
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

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, this.filename);
  }
  display_details_agents(id: number) {
    console.log(id);
    //this.router.navigateByUrl(`mon-espace/mes-agents/details-agent/${id}`);
  }
}
