import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { UserService } from '@shared/services/user.service';
import { MatButton, MatButtonModule } from '@angular/material/button';
import { finalize } from 'rxjs';
import { ChargementComponent } from '@shared/components/chargement/chargement.component';

@Component({
  selector: 'app-details-site',
  standalone: true,
  imports: [ChargementComponent, MatTableModule, MatPaginator, MatButton, MatButtonModule],
  templateUrl: './details-site.component.html',
  styleUrl: './details-site.component.scss',
})
export class DetailsSiteComponent implements OnInit {
  chargement = true;
  imageUrl = 'img/site.png';
  private readonly userService = inject(UserService);
  private readonly route = inject(ActivatedRoute);
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  private readonly location = inject(Location);
  @ViewChild(MatSort) sort!: MatSort;
  displayedColumns: string[] = ['nom', 'prenom', 'fonction', 'login'];
  dataSource!: MatTableDataSource<any>;
  infos_site: any;
  DetailsSite: any;
  ngOnInit(): void {
    this.chargement = true;
    const id = this.route.snapshot.params['id'];
    this.userService.getDetailsSiteById(id).pipe(finalize(() => (this.chargement = false))).subscribe({
      next: resultat => {
        this.dataSource = new MatTableDataSource(resultat.utilisateurs);
        this.DetailsSite = resultat;
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
        this.infos_site = resultat.infos_site;
        console.log(this.DetailsSite);
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
