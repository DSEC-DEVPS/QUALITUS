import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';

import { MatButtonModule } from '@angular/material/button';
import { AuthService, maVoixCompte, motif_ma_voix_compte, User } from '@core';
import { UserService } from '@shared/services/user.service';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';


export interface PeriodicElement {
  name: string;
  position: number;
  weight: number;
  symbol: string;
}

const ELEMENT_DATA: PeriodicElement[] = [
  {position: 1, name: 'Hydrogen', weight: 1.0079, symbol: 'H'},
  {position: 2, name: 'Helium', weight: 4.0026, symbol: 'He'},
  {position: 3, name: 'Lithium', weight: 6.941, symbol: 'Li'},
  
];

@Component({
  selector: 'app-quiz-en-reset',
  standalone: true,
  imports: [MatIconModule, MatTabsModule, MatButtonModule,
      MatTooltipModule,
      MatIconModule,
      MatCardModule,
      MatChipsModule,
      MatGridListModule,
      MatTableModule,
      MatPaginatorModule,
      MatSortModule,
      MatInputModule,
      MatFormFieldModule,],
  templateUrl: './quiz-en-reset.component.html',
  styleUrl: './quiz-en-reset.component.scss'
})


export class QuizEnResetComponent {

  displayedColumns: string[] = ['position', 'name', 'weight', 'symbol'];
  dataSource = ELEMENT_DATA;

  
}
