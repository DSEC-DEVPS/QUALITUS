import { Component, OnInit, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { ToastrService } from 'ngx-toastr';
import { QuizService } from '@shared/services/quiz.service';
import { Periode, libellePeriode, suffixePeriode } from '@shared/periode';
import { FiltrePeriodeComponent } from '../filtre-periode/filtre-periode.component';
import { FeuilleExport, ecrireClasseur } from '../export-quiz';
import { RapportQuestion, RapportQuiz } from '../interfaces';
import { ChargementComponent } from '@shared/components/chargement/chargement.component';

@Component({
  selector: 'app-rapports',
  standalone: true,
  imports: [ChargementComponent,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatExpansionModule,
    MatProgressBarModule,
    MatPaginatorModule,
    FiltrePeriodeComponent,
  ],
  templateUrl: './rapports.component.html',
  styleUrl: './rapports.component.scss',
})
export class RapportsComponent implements OnInit {
  private readonly quizSrv = inject(QuizService);
  private readonly toast = inject(ToastrService);

  rapport: RapportQuiz[] = [];
  colonnes = ['titre', 'fiche_titre', 'nb_tentatives', 'nb_reussis', 'taux_reussite', 'score_moyen'];
  detailParQuiz: Record<number, RapportQuestion[]> = {};
  /** Quiz dont le panneau est ouvert (détail repris dans l'export). */
  ouverts = new Set<number>();
  /** Période sur la date des tentatives (filtre serveur). */
  periode: Periode = { du: null, au: null };
  charge = false;
  /** Pagination des panneaux (l'export reste complet). */
  pageIndex = 0;
  pageSize = 10;

  get rapportPage(): RapportQuiz[] {
    const debut = this.pageIndex * this.pageSize;
    return this.rapport.slice(debut, debut + this.pageSize);
  }

  changerPage(e: PageEvent) {
    this.pageIndex = e.pageIndex;
    this.pageSize = e.pageSize;
  }

  ngOnInit(): void {
    this.charger();
  }

  charger() {
    this.charge = false;
    this.quizSrv.getRapportDifficulte(this.periode).subscribe({
      next: r => {
        this.rapport = r;
        this.charge = true;
        // Recharge le détail des panneaux restés ouverts pour la nouvelle période.
        this.detailParQuiz = {};
        this.ouverts.forEach(id => {
          const q = r.find(x => x.id === id);
          if (q) this.chargerDetail(q);
          else this.ouverts.delete(id);
        });
      },
      error: () => this.toast.error('Impossible de charger le rapport'),
    });
  }

  changerPeriode(p: Periode) {
    this.periode = p;
    this.pageIndex = 0;
    this.charger();
  }

  ouvrir(q: RapportQuiz) {
    this.ouverts.add(q.id);
    this.chargerDetail(q);
  }

  fermer(q: RapportQuiz) {
    this.ouverts.delete(q.id);
  }

  get libellePeriode(): string {
    return libellePeriode(this.periode);
  }

  get aDesLimites(): boolean {
    return this.rapport.some(r => r.limite_site === 1);
  }

  chargerDetail(q: RapportQuiz) {
    if (this.detailParQuiz[q.id]) {
      return;
    }
    this.quizSrv.getRapportQuestions(q.id, this.periode).subscribe({
      next: d => (this.detailParQuiz[q.id] = d),
      error: () => this.toast.error('Impossible de charger le detail'),
    });
  }

  classeTaux(taux: number | null): string {
    if (taux == null) {
      return '';
    }
    if (taux < 50) {
      return 'rouge';
    }
    if (taux < 75) {
      return 'orange';
    }
    return 'vert';
  }

  /**
   * Exporte le résultat en vigueur : quiz et statistiques de la période,
   * dans l'ordre affiché ; le détail par question des panneaux ouverts est
   * ajouté dans une seconde feuille.
   */
  exporter() {
    if (!this.rapport.length) {
      this.toast.info('Aucune donnée à exporter');
      return;
    }
    const entete = [`Période (date des tentatives) : ${libellePeriode(this.periode)}`];
    const lignes = this.rapport.map(r => ({
      Quiz: r.titre,
      'Contenu associe': r.fiche_titre || '',
      Tentatives: r.nb_tentatives,
      Reussites: r.nb_reussis,
      'Taux de reussite (%)': r.taux_reussite ?? '',
      'Score moyen (%)': r.score_moyen ?? '',
      Perimetre: r.limite_site === 1 ? 'Agents de votre site' : 'Tous les participants',
    }));
    const feuilles: FeuilleExport[] = [{ nom: 'Rapport Quiz', entete, lignes }];
    const detail = this.rapport
      .filter(r => this.ouverts.has(r.id) && this.detailParQuiz[r.id])
      .flatMap(r =>
        this.detailParQuiz[r.id].map(d => ({
          Quiz: r.titre,
          Question: d.libelle,
          Reponses: d.nb_reponses,
          Echecs: d.nb_echecs,
          "Taux d'echec (%)": d.taux_echec ?? '',
        }))
      );
    if (detail.length) {
      feuilles.push({ nom: 'Detail questions', entete, lignes: detail });
    }
    ecrireClasseur(`Rapport_Quiz_${suffixePeriode(this.periode)}.xlsx`, feuilles);
  }
}
