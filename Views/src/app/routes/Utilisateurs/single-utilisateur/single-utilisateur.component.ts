import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { Commentaire, Consultation, detailsUtilisateur } from '@core';
import { UserService } from '@shared/services/user.service';
import { MatSort } from '@angular/material/sort';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import * as XLSX from 'xlsx';
@Component({
  selector: 'app-single-agent',
  standalone: true,
  imports: [
    MatTableModule,
    MatPaginatorModule,
    MatTabsModule,
    DatePipe,
    MatTooltipModule,
    TitleCasePipe,
    MatIconModule,
  ],
  templateUrl: './single-utilisateur.component.html',
  styleUrl: './single-utilisateur.component.scss',
})
export class SingleUtilisateurComponent implements OnInit {
  imageUrl = 'img/person.png';
  private readonly route = inject(ActivatedRoute);
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);
  displayedColumns: string[] = ['nb_consultation', 'titre', 'Gestionnaire', 'dateConsultation'];
  displayedColumns_messages: string[] = ['titre', 'message', 'dateCommentaire'];
  details_utilisateur!: detailsUtilisateur;
  filename!: string;
  dataSource!: MatTableDataSource<Consultation>;
  dataSource_messages!: MatTableDataSource<Commentaire>;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  ngOnInit(): void {
    const id = this.route.snapshot.params['id'];
    this.userService.getDetailsUtilisateur(id).subscribe({
      next: result => {
        this.dataSource = new MatTableDataSource(result.consultations);
        this.dataSource_messages = new MatTableDataSource(result.commentaires);
        this.details_utilisateur = result;
        this.filename = `Details_agent_${result.nom}.xlsx`;
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
      },
      error: error => {
        console.log(error);
      },
    });
  }
  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
  }
  lire_fiche(id: number) {
    this.router.navigateByUrl(`lecture-fiche/${id}`);
  }

  download() {
    const data = this.details_utilisateur;
    const data2 = this.details_utilisateur;

    const ws1: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data.consultations);
    const ws2: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data.commentaires);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws1, 'Liste_Consultaitons');
    XLSX.utils.book_append_sheet(wb, ws2, 'Liste_Commentaires');
    XLSX.writeFile(wb, this.filename);
  }
}
