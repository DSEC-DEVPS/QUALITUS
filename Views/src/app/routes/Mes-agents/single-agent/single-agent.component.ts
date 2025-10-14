import { Component, inject, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { Commentaire, Consultation, detailsUtilisateur, statistic_TC } from '@core';
import { UserService } from '@shared/services/user.service';
import { MatSort } from '@angular/material/sort';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import * as XLSX from 'xlsx';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatInputModule } from '@angular/material/input';
import { debounceTime, Subscription } from 'rxjs';
@Component({
  selector: 'app-single-agent',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  providers: [DatePipe],
  imports: [
    MatTableModule,
    MatPaginatorModule,
    MatTabsModule,
    DatePipe,
    MatTooltipModule,
    TitleCasePipe,
    MatIconModule,
    MatFormFieldModule,
    ReactiveFormsModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatFormFieldModule,
    ReactiveFormsModule,
    MatInputModule,
  ],
  templateUrl: './single-agent.component.html',
  styleUrl: './single-agent.component.scss',
})
export class SingleAgentComponent implements OnInit {
  imageUrl = 'img/person.png';
  private readonly route = inject(ActivatedRoute);
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);
  private readonly datePipe = inject(DatePipe);
  dateForm!: FormGroup;
  private subscription: Subscription = new Subscription();
  displayedColumns: string[] = ['nb_consultation', 'titre', 'Gestionnaire', 'dateConsultation'];
  displayedColumns_messages: string[] = ['titre', 'message', 'dateCommentaire'];
  nb_fiche_non_lu = 0;
  nb_sondage_encours = 0;
  nb_quiz_en_retest = 0;
  nb_quiz_echecs = 0;
  nb_quiz_total_en_retest = 0;
  nb_quiz_total_echecs = 0;
  statistic_TC!: statistic_TC;
  todayDate!: string | null;
  details_utilisateur!: detailsUtilisateur;
  filename!: string;
  dataSource!: MatTableDataSource<Consultation>;
  dataSource_messages!: MatTableDataSource<Commentaire>;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  ngOnInit(): void {
    const id = this.route.snapshot.params['id'];
    this.todayDate = this.datePipe.transform(new Date(), 'yyyy-MM-dd');
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
    this.dateForm = new FormGroup({
      selectedDate: new FormControl(new Date()),
    });
    this.subscription.add(
      this.dateForm
        .get('selectedDate')
        ?.valueChanges.pipe(debounceTime(300))
        .subscribe(date => {
          if (date) {
            this.sendDateRequest(id, date);
          }
        })
    );
    this.userService
      .statistic_TC_FOR_SUP({ userId: id, date: this.todayDate || '3000-01-01' })
      .subscribe({
        next: resultat => {
          this.nb_fiche_non_lu = resultat.nombre_fiche_lue || 0;
          this.nb_quiz_en_retest = resultat.nombre_quiz_en_retest || 0;
          this.nb_quiz_echecs = resultat.nombre_quiz_Echecs || 0;
          this.nb_sondage_encours = resultat.nombre_sondage_effectue || 0;
          this.nb_quiz_total_en_retest = resultat.nombre_total_quiz_en_retest || 0;
          this.nb_quiz_total_echecs = resultat.nombre_total_quiz_Echecs || 0;
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
  getFormattedDate(date: Date): string {
    date = this.dateForm.get('selectedDate')?.value;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private sendDateRequest(id: number, date: Date): void {
    // Formatage de la date au format yyyy-MM-dd
    const formattedDate = this.getFormattedDate(date);
    // Exemple d'envoi de requête HTTP
    this.userService.statistic_TC_FOR_SUP({ userId: id, date: formattedDate }).subscribe({
      next: resultat => {
        this.nb_fiche_non_lu = resultat.nombre_fiche_lue || 0;
        this.nb_quiz_en_retest = resultat.nombre_quiz_en_retest || 0;
        this.nb_quiz_echecs = resultat.nombre_quiz_Echecs || 0;
        this.nb_sondage_encours = resultat.nombre_sondage_effectue || 0;
        this.nb_quiz_total_en_retest = resultat.nombre_total_quiz_en_retest || 0;
        this.nb_quiz_total_echecs = resultat.nombre_total_quiz_Echecs || 0;
        this.statistic_TC = resultat;
      },
      error: error => {
        console.log(error);
      },
    });
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
