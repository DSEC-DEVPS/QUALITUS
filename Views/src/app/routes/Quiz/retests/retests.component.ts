import { AfterViewInit, Component, OnInit, ViewChild, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ToastrService } from 'ngx-toastr';
import { QuizService } from '@shared/services/quiz.service';
import { ConfirmationService } from '@shared/services/confirmation.service';
import { Periode } from '@shared/periode';
import { FiltrePeriodeComponent } from '../filtre-periode/filtre-periode.component';
import { RetestEchec } from '../interfaces';

/** Un quiz et son nombre d'échecs en attente de décision. */
interface QuizEnAttente {
  id: number;
  titre: string;
  nb: number;
}

@Component({
  selector: 'app-retests',
  standalone: true,
  imports: [
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatChipsModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    DatePipe,
    FiltrePeriodeComponent,
  ],
  templateUrl: './retests.component.html',
  styleUrl: './retests.component.scss',
})
export class RetestsComponent implements OnInit, AfterViewInit {
  private readonly quizSrv = inject(QuizService);
  private readonly toast = inject(ToastrService);
  private readonly confirmation = inject(ConfirmationService);

  dataSource = new MatTableDataSource<RetestEchec>([]);
  colonnes = ['agent', 'quiz', 'score', 'essai', 'date', 'actions'];
  /** Période sur la date de la tentative en échec (filtre serveur). */
  periode: Periode = { du: null, au: null };
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  /** Filtres locaux : quiz (id) et recherche agent. */
  quizFiltre: number | null = null;
  recherche = '';
  /** Quiz ayant des échecs en attente, avec leur nombre (le plus chargé d'abord). */
  quizListe: QuizEnAttente[] = [];
  enCours = new Set<string>();

  ngOnInit(): void {
    this.dataSource.filterPredicate = (e, f) => {
      const { quiz, texte } = JSON.parse(f) as { quiz: number | null; texte: string };
      if (quiz && e.id_Quiz !== quiz) {
        return false;
      }
      if (!texte) {
        return true;
      }
      return this.normaliser(`${e.nom} ${e.prenom} ${e.login}`).includes(texte);
    };
    this.charger();
  }

  ngAfterViewInit(): void {
    // Après un rechargement (ex. retest autorisé), la page en cours est conservée
    // tant qu'elle existe encore.
    this.dataSource.paginator = this.paginator;
  }

  private normaliser(s: string): string {
    return (s || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  charger() {
    this.quizSrv.getRetestEchecs(this.periode).subscribe({
      next: d => {
        this.dataSource.data = d;
        const parQuiz = new Map<number, QuizEnAttente>();
        for (const e of d) {
          const q = parQuiz.get(e.id_Quiz) || { id: e.id_Quiz, titre: e.quiz_titre, nb: 0 };
          if (!e.retest_en_attente) {
            q.nb++;
          }
          parQuiz.set(e.id_Quiz, q);
        }
        this.quizListe = [...parQuiz.values()].sort((a, b) => b.nb - a.nb || a.titre.localeCompare(b.titre));
        if (this.quizFiltre && !parQuiz.has(this.quizFiltre)) {
          this.quizFiltre = null;
        }
        this.appliquerFiltre(false);
      },
      error: () => this.toast.error('Impossible de charger les échecs'),
    });
  }

  appliquerFiltre(premierePage = true) {
    this.dataSource.filter = JSON.stringify({ quiz: this.quizFiltre, texte: this.normaliser(this.recherche) });
    if (premierePage) {
      this.paginator?.firstPage();
    }
  }

  changerPeriode(p: Periode) {
    this.periode = p;
    this.paginator?.firstPage();
    this.charger();
  }

  /** Échecs sans retest accordé : ceux qui attendent une décision. */
  get nbADecider(): number {
    return this.quizListe.reduce((s, q) => s + q.nb, 0);
  }

  get quizSelectionne(): QuizEnAttente | undefined {
    return this.quizListe.find(q => q.id === this.quizFiltre);
  }

  /** Retests déjà passés / maximum, ex. « 0/1 ». */
  retestsLabel(e: RetestEchec): string {
    return `${Math.max(0, (e.num_essai || 1) - 1)}/${e.nb_retest_max || 1}`;
  }

  private cle(e: RetestEchec): string {
    return `${e.id_Quiz}-${e.id_UTILISATEUR}`;
  }

  occupe(e: RetestEchec): boolean {
    return this.enCours.has(this.cle(e));
  }

  autoriser(e: RetestEchec) {
    this.enCours.add(this.cle(e));
    this.quizSrv.autoriserRetest(e.id_Quiz, e.id_UTILISATEUR).subscribe({
      next: r => {
        this.enCours.delete(this.cle(e));
        this.toast.success(r.message);
        this.charger();
      },
      // Message précis du serveur affiché par l'intercepteur global.
      error: () => this.enCours.delete(this.cle(e)),
    });
  }

  async refuser(e: RetestEchec) {
    const ok = await this.confirmation.confirmer({
      titre: 'Ne pas autoriser de retest',
      message: `${e.nom} ${e.prenom} — « ${e.quiz_titre} » : l'échec est classé définitif et disparaît de cette liste.`,
      type: 'attention',
      oui: 'Ne pas autoriser',
      non: 'Annuler',
    });
    if (!ok) {
      return;
    }
    this.enCours.add(this.cle(e));
    this.quizSrv.refuserRetest(e.id_Quiz, e.id_UTILISATEUR).subscribe({
      next: r => {
        this.enCours.delete(this.cle(e));
        this.toast.success(r.message);
        this.charger();
      },
      error: () => this.enCours.delete(this.cle(e)),
    });
  }

  async refuserTout(q: QuizEnAttente) {
    const ok = await this.confirmation.confirmer({
      titre: 'Clore les retests de ce quiz',
      message:
        `« ${q.titre} » : ${q.nb} échec${q.nb > 1 ? 's' : ''} en attente ` +
        `${q.nb > 1 ? 'seront classés' : 'sera classé'} « retest non autorisé ». ` +
        'Les retests déjà accordés ne changent pas. Pour ne plus recevoir de nouveaux échecs de ce quiz, ' +
        'désactivez « Autoriser les retests » dans ses paramètres.',
      type: 'attention',
      oui: 'Clore les retests',
      non: 'Annuler',
    });
    if (!ok) {
      return;
    }
    this.quizSrv.refuserRetestsQuiz(q.id).subscribe({
      next: r => {
        this.toast.success(r.message);
        this.charger();
      },
      error: () => {},
    });
  }
}
