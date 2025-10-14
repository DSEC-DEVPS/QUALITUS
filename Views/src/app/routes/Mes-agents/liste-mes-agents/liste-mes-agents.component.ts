import { Component, ViewChild, OnInit, inject } from '@angular/core';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { UserService } from '@shared/services/user.service';
import { agent_by_superviseur, AuthService, User } from '@core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { Router } from '@angular/router';

import * as XLSX from 'xlsx';
@Component({
  selector: 'app-liste-mes-agents',
  standalone: true,
  imports: [
    CommonModule,
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
  ],
  templateUrl: './liste-mes-agents.component.html',
  styleUrl: './liste-mes-agents.component.scss',
})
export class ListeMesAgentsComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly userService = inject(UserService);
  LogoUser = 'img/avatar.png';
  dataSource!: MatTableDataSource<agent_by_superviseur>;
  user!: User;
  /**le nom par defaut de la fiche à télécharger */
  filename = `Liste_des_agents.xlsx`;
  downloadData!: agent_by_superviseur[];
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  private readonly router = inject(Router);
  ngOnInit(): void {
    this.auth.user().subscribe({
      next: user => {
        this.user = user;
      },
      error: error => {
        console.log(error);
      },
    });
    this.userService.getAllAgentBySuperviseur(this.user.id || 0).subscribe(user => {
      console.log(user);
      this.dataSource = new MatTableDataSource(user);
      this.downloadData = user;
      this.dataSource.paginator = this.paginator;
      this.dataSource.sort = this.sort;
    });
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }
  NavigeOnSinglePageUtilisateur(id: number) {
    this.router.navigateByUrl(`mon-espace/mes-agents/details-agent/${id}`);
  }

  download() {
    const data = this.downloadData;

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, this.filename);
  }
}
