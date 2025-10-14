import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatListModule } from '@angular/material/list';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MtxProgressModule } from '@ng-matero/extensions/progress';
import { NgxPermissionsModule } from 'ngx-permissions';
import { AuthService, User } from '@core';
import { DashboardService } from './dashboard.service';
import { UserService } from '@shared/services/user.service';
export interface PeriodicElement {
  site: number;
  Taux_a_J: number;
  Taux_a_J_plus_2: number;
  Taux_Mensuel: number;
}

const ELEMENT_DATA: PeriodicElement[] = [
  { site: 1, Taux_a_J: 1.0079, Taux_a_J_plus_2: 1.0079, Taux_Mensuel: 1.0079 },
  { site: 2, Taux_a_J: 4.0026, Taux_a_J_plus_2: 4.0026, Taux_Mensuel: 4.0026 },
  { site: 3, Taux_a_J: 6.941, Taux_a_J_plus_2: 6.941, Taux_Mensuel: 6.941 },
  { site: 4, Taux_a_J: 9.0122, Taux_a_J_plus_2: 9.0122, Taux_Mensuel: 9.0122 },
  { site: 5, Taux_a_J: 10.811, Taux_a_J_plus_2: 10.811, Taux_Mensuel: 10.811 },
  { site: 6, Taux_a_J: 12.0107, Taux_a_J_plus_2: 12.0107, Taux_Mensuel: 12.0107 },
  { site: 7, Taux_a_J: 14.0067, Taux_a_J_plus_2: 14.0067, Taux_Mensuel: 14.0067 },
  { site: 8, Taux_a_J: 15.9994, Taux_a_J_plus_2: 15.9994, Taux_Mensuel: 15.9994 },
  { site: 9, Taux_a_J: 18.9984, Taux_a_J_plus_2: 18.9984, Taux_Mensuel: 18.9984 },
  { site: 10, Taux_a_J: 20.1797, Taux_a_J_plus_2: 20.1797, Taux_Mensuel: 20.1797 },
];
@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [DashboardService],
  standalone: true,
  imports: [
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatListModule,
    MatGridListModule,
    MatTableModule,
    MatTabsModule,
    MtxProgressModule,
    NgxPermissionsModule,
  ],
})
export class DashboardComponent implements OnInit {
  private readonly userService = inject(UserService);
  private readonly auth = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef); // Ajoutez cette ligne
  displayedColumns: string[] = ['site', 'Taux_a_J', 'Taux_a_J_plus_2', 'Taux_Mensuel'];
  dataSource = ELEMENT_DATA;
  stats!: any[];
  user!: User;
  isLoading = true;
  ngOnInit() {
    this.auth.user().subscribe({
      next: user => {
        this.user = user;
        this.loadDashboardData();
      },
      error: error => {
        console.log(error);
        this.isLoading = false;
        this.cdr.markForCheck();
      },
    });
  }
  loadDashboardData() {
    if (this.user.roles === 'R_GB') {
      this.userService.getAllDashboard().subscribe({
        next: resultat => {
          console.log(resultat);
          this.stats = resultat;
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: error => {
          console.log(error);
          this.isLoading = false;
          this.cdr.markForCheck();
        },
      });
    } else {
      if (this.user.roles === 'R_ADMI' || this.user.roles === 'R_SUPE') {
        this.userService.getAllDashboard_admin().subscribe({
          next: resultat => {
            console.log(resultat);
            this.stats = resultat;
            this.isLoading = false;
            this.cdr.markForCheck();
          },
          error: error => {
            console.log(error);
            this.isLoading = false;
            this.cdr.markForCheck();
          },
        });
      }
    }
  }
}
