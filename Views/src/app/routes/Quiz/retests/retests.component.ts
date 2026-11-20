import { AfterViewInit, Component, OnInit, ViewChild, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { ToastrService } from 'ngx-toastr';
import { QuizService } from '@shared/services/quiz.service';
import { Periode } from '@shared/periode';
import { FiltrePeriodeComponent } from '../filtre-periode/filtre-periode.component';
import { RetestEchec } from '../interfaces';

@Component({
  selector: 'app-retests',
  standalone: true,
  imports: [MatCardModule, MatButtonModule, MatIconModule, MatTableModule, MatChipsModule, MatPaginatorModule, DatePipe, FiltrePeriodeComponent],
  templateUrl: './retests.component.html',
  styleUrl: './retests.component.scss',
})
export class RetestsComponent implements OnInit, AfterViewInit {
  private readonly quizSrv = inject(QuizService);
  private readonly toast = inject(ToastrService);

  dataSource = new MatTableDataSource<RetestEchec>([]);
  colonnes = ['agent', 'quiz', 'score', 'essai', 'date', 'actions'];
  /** Période sur la date de la tentative en échec (filtre serveur). */
  periode: Periode = { du: null, au: null };
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  ngOnInit(): void {
    this.charger();
  }

  ngAfterViewInit(): void {
    // Après un rechargement (ex. retest autorisé), la page en cours est conservée
    // tant qu'elle existe encore.
    this.dataSource.paginator = this.paginator;
  }

  charger() {
    this.quizSrv.getRetestEchecs(this.periode).subscribe({
      next: d => (this.dataSource.data = d),
      error: () => this.toast.error('Impossible de charger les echecs'),
    });
  }

  changerPeriode(p: Periode) {
    this.periode = p;
    this.paginator?.firstPage();
    this.charger();
  }

  autoriser(e: RetestEchec) {
    this.quizSrv.autoriserRetest(e.id_Quiz, e.id_UTILISATEUR).subscribe({
      next: r => {
        this.toast.success(r.message);
        this.charger();
      },
      error: () => this.toast.error("Une erreur s'est produite"),
    });
  }
}
