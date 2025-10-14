import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { UserService } from '@shared/services/user.service';
import { MatButton, MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-details-programme',
  standalone: true,
  imports: [MatTableModule, MatPaginator, MatButton, MatButtonModule],
  templateUrl: './details-programme.component.html',
  styleUrl: './details-programme.component.scss',
})
export class DetailsProgrammeComponent implements OnInit {
  imageUrl = 'img/site.png';
  private readonly userService = inject(UserService);
  private readonly route = inject(ActivatedRoute);
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  private readonly location = inject(Location);
  @ViewChild(MatSort) sort!: MatSort;
  displayedColumns: string[] = ['nom', 'prenom', 'fonction', 'login'];
  dataSource!: MatTableDataSource<any>;
  infos_programme: any[] = [];
  Details_programme: any;
  ngOnInit(): void {
    const id = this.route.snapshot.params['id'];
    this.userService.getDetailsProgrammeById(id).subscribe({
      next: resultat => {
        console.log(resultat.utilisateurs);
        this.dataSource = new MatTableDataSource(resultat.utilisateurs);
        this.Details_programme = resultat;
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
        this.infos_programme = resultat.infos_programme;
        console.log(this.infos_programme);
      },
      error: error => {
        console.log(error);
      },
    });
  }
  goBack() {
    this.location.back();
  }
}
