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
import { ToastrService } from 'ngx-toastr';
import {
  AppearanceAnimation,
  ConfirmBoxInitializer,
  DialogLayoutDisplay,
  DisappearanceAnimation,
} from '@costlydeveloper/ngx-awesome-popup';
import * as XLSX from 'xlsx';
import { QuizService } from '@shared/services/quiz.service';
import { Quiz } from '../interfaces';

@Component({
  selector: 'app-liste-quiz',
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
  templateUrl: './liste-quiz.component.html',
  styleUrl: './liste-quiz.component.scss',
})
export class ListeQuizComponent implements OnInit {
  private readonly quizSrv = inject(QuizService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastrService);

  dataSource = new MatTableDataSource<Quiz>([]);
  displayedColumns = ['id', 'titre', 'code_pin', 'fiche_titre', 'nb_questions', 'note_passage', 'Etat', 'actions'];
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  ngOnInit(): void {
    this.charger();
  }

  charger() {
    this.quizSrv.getAll().subscribe({
      next: data => {
        this.dataSource.data = data;
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
      },
      error: () => this.toast.error('Impossible de charger les quiz'),
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
    this.router.navigate(['/mon-espace/quiz/creer']);
  }

  editer(q: Quiz) {
    this.router.navigate(['/mon-espace/quiz/editer', q.id]);
  }

  detail(q: Quiz) {
    this.router.navigate(['/mon-espace/quiz/detail', q.id]);
  }

  supprimer(q: Quiz) {
    const box = new ConfirmBoxInitializer();
    box.setTitle('Suppression !');
    box.setMessage(`Supprimer le quiz "${q.titre}" et toutes ses questions ?`);
    box.setConfig({
      layoutType: DialogLayoutDisplay.DANGER,
      animationIn: AppearanceAnimation.BOUNCE_IN,
      animationOut: DisappearanceAnimation.BOUNCE_OUT,
      buttonPosition: 'right',
    });
    box.setButtonLabels('OUI', 'NON');
    box.openConfirmBox$().subscribe(resp => {
      if (resp.success) {
        this.quizSrv.delete(q.id).subscribe({
          next: r => {
            this.toast.success(r.message);
            this.charger();
          },
          error: () => this.toast.error('Suppression impossible'),
        });
      }
    });
  }

  exporter() {
    const data = this.dataSource.data.map(q => ({
      Id: q.id,
      Titre: q.titre,
      'Code PIN': q.code_pin || '',
      Description: q.description || '',
      'Contenu associe': q.fiche_titre || '',
      'Nb questions': q.nb_questions ?? 0,
      'Note de passage (%)': q.note_passage,
      'Retest auto': q.retest_auto ? 'Oui' : 'Non',
      Etat: q.Etat || '',
    }));
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Quiz');
    XLSX.writeFile(wb, `Liste_Quiz_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }
}
