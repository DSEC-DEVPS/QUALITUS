import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { ToastrService } from 'ngx-toastr';
import { PageRapportQuiz, QuizService } from '@shared/services/quiz.service';
import { periodeParDefaut } from '@shared/utils/pagination-serveur';
import { Periode, libellePeriode, suffixePeriode } from '@shared/periode';
import { FiltrePeriodeComponent } from '../filtre-periode/filtre-periode.component';
import { FeuilleExport, ecrireClasseur } from '../export-quiz';
import { RapportQuestion, RapportQuiz } from '../interfaces';
import { ChargementComponent } from '@shared/components/chargement/chargement.component';

/** Question du détail, avec son numéro dans le quiz (ordre de création). */
interface QuestionDetail extends RapportQuestion {
  numero: number;
}

/** Ligne du tableau : quiz + rang de difficulté (parmi les quiz ayant des tentatives). */
interface LigneRapport extends RapportQuiz {
  rang: number | null;
}

@Component({
  selector: 'app-rapports',
  standalone: true,
  imports: [
    ChargementComponent,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSlideToggleModule,
    MatTooltipModule,
    MatProgressBarModule,
    MatPaginatorModule,
    FiltrePeriodeComponent,
    RouterLink,
  ],
  templateUrl: './rapports.component.html',
  styleUrl: './rapports.component.scss',
})
export class RapportsComponent implements OnInit, OnDestroy {
  private readonly quizSrv = inject(QuizService);
  private readonly toast = inject(ToastrService);

  /** Page affichée (rang compris), calculée par le serveur (out113). */
  page: LigneRapport[] = [];
  /** Nombre de quiz après recherche / « masquer sans tentative ». */
  totalFiltres = 0;
  /** Synthèse sur tous les quiz de la période (serveur). */
  synthese: PageRapportQuiz['synthese'] | null = null;
  detailParQuiz: Record<number, QuestionDetail[]> = {};
  /** Quiz dont le détail est déplié (détail repris dans l'export). */
  ouverts = new Set<number>();
  /** Période sur la date des tentatives (filtre serveur) : 3 derniers mois par défaut. */
  periode: Periode = periodeParDefaut();
  charge = false;
  recherche = '';
  masquerSansTentative = false;
  pageIndex = 0;
  pageSize = 10;
  private minuterie: any = null;
  private requete = 0;

  ngOnInit(): void {
    this.charger();
  }
  ngOnDestroy(): void { clearTimeout(this.minuterie); }

  /** Charge la page courante ; `complet` : nouvelle période (indicateur de chargement, détails rechargés). */
  charger(complet = true) {
    if (complet) this.charge = false;
    const n = ++this.requete;
    this.quizSrv.getRapportDifficultePage(this.periode, { q: this.recherche.trim(), masquer_sans_tentative: this.masquerSansTentative },
      { page: this.pageIndex + 1, taille: this.pageSize }).subscribe({
      next: r => {
        if (n !== this.requete) return;
        this.page = r.lignes as LigneRapport[];
        this.totalFiltres = r.total;
        this.synthese = r.synthese;
        this.charge = true;
        if (complet) {
          // Recharge le détail des quiz restés dépliés pour la nouvelle période.
          this.detailParQuiz = {};
          this.ouverts.forEach(id => this.chargerDetail({ id } as RapportQuiz));
        }
      },
      error: () => { if (n === this.requete) this.toast.error('Impossible de charger le rapport'); },
    });
  }

  changerPeriode(p: Periode) {
    this.periode = p;
    this.pageIndex = 0;
    this.charger();
  }

  // ---------- Synthèse (calculée par le serveur sur tous les quiz de la période) ----------
  get nbQuiz(): number { return this.synthese?.nb_quiz ?? 0; }
  get nbAvecTentatives(): number { return this.synthese?.nb_avec_tentatives ?? 0; }
  get totalTentatives(): number { return this.synthese?.total_tentatives ?? 0; }
  get totalReussites(): number { return this.synthese?.total_reussites ?? 0; }
  get tauxGlobal(): number | null { return this.synthese?.taux_global ?? null; }
  get totalNonPasses(): number { return this.synthese?.total_non_passes ?? 0; }
  get tauxParticipationGlobal(): number | null { return this.synthese?.taux_participation_global ?? null; }
  get scoreGlobal(): number | null { return this.synthese?.score_global ?? null; }

  // ---------- Filtres + pagination (serveur) ----------
  changerPage(e: PageEvent) {
    this.pageIndex = e.pageSize !== this.pageSize ? 0 : e.pageIndex;
    this.pageSize = e.pageSize;
    this.charger(false);
  }
  /** Recherche / « masquer sans tentative » : première page, après une courte pause de frappe. */
  filtreChange() {
    clearTimeout(this.minuterie);
    this.minuterie = setTimeout(() => { this.pageIndex = 0; this.charger(false); }, 300);
  }

  get libellePeriode(): string {
    return libellePeriode(this.periode);
  }
  get aDesLimites(): boolean {
    return !!this.synthese?.a_des_limites;
  }

  // ---------- Détail par question ----------
  basculer(q: LigneRapport) {
    if (this.ouverts.has(q.id)) {
      this.ouverts.delete(q.id);
    } else {
      this.ouverts.add(q.id);
      this.chargerDetail(q);
    }
  }

  chargerDetail(q: RapportQuiz) {
    if (this.detailParQuiz[q.id]) {
      return;
    }
    this.quizSrv.getRapportQuestions(q.id, this.periode).subscribe({
      next: d => {
        const numeros = new Map([...d].sort((a, b) => a.id - b.id).map((x, i) => [x.id, i + 1]));
        this.detailParQuiz[q.id] = d
          .map(x => ({
            ...x,
            nb_reponses: Number(x.nb_reponses) || 0,
            nb_echecs: Number(x.nb_echecs) || 0,
            taux_echec: x.taux_echec == null ? null : Number(x.taux_echec),
            numero: numeros.get(x.id) || 0,
          }))
          // De la plus ratée à la moins ratée ; sans réponse en dernier.
          .sort((a, b) => (b.taux_echec ?? -1) - (a.taux_echec ?? -1) || a.numero - b.numero);
      },
      error: () => this.toast.error('Impossible de charger le détail'),
    });
  }

  // ---------- Affichage ----------
  /** 33.333 -> « 33,3 % » ; 100 -> « 100 % » ; null -> « — ». */
  pct(v: number | null | undefined): string {
    if (v == null || isNaN(Number(v))) return '—';
    const arrondi = Math.round(Number(v) * 10) / 10;
    return `${arrondi.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %`;
  }

  /** Couleur d'un taux de RÉUSSITE : rouge < 50, orange < 75, vert sinon. */
  classeTaux(taux: number | null | undefined): string {
    if (taux == null) return 'neutre';
    if (taux < 50) return 'rouge';
    if (taux < 75) return 'orange';
    return 'vert';
  }

  /** Couleur d'un taux d'ÉCHEC (inverse). */
  classeEchec(taux: number | null | undefined): string {
    return taux == null ? 'neutre' : this.classeTaux(100 - taux);
  }

  /**
   * Exporte le résultat en vigueur : tous les quiz de la période, dans l'ordre
   * de difficulté ; le détail par question des quiz dépliés va dans une seconde feuille.
   */
  exporter() {
    // out113 : l'export demande au serveur tous les quiz de la période choisie.
    this.quizSrv.getRapportDifficulte(this.periode).subscribe({
      next: r => this.ecrireExport(r),
      error: () => this.toast.error("Impossible de préparer l'export"),
    });
  }

  private ecrireExport(brut: RapportQuiz[]) {
    let rang = 0;
    const rapport: LigneRapport[] = brut.map(q => {
      const l: LigneRapport = {
        ...q,
        nb_tentatives: Number(q.nb_tentatives) || 0,
        nb_reussis: Number(q.nb_reussis) || 0,
        score_moyen: q.score_moyen == null ? null : Number(q.score_moyen),
        taux_reussite: q.taux_reussite == null ? null : Number(q.taux_reussite),
        nb_designes: Number(q.nb_designes) || 0,
        nb_passes: Number(q.nb_passes) || 0,
        nb_non_passes: Number(q.nb_non_passes) || 0,
        taux_participation: q.taux_participation == null ? null : Number(q.taux_participation),
        rang: null,
      };
      if (l.nb_tentatives > 0) l.rang = ++rang;
      return l;
    });
    if (!rapport.length) {
      this.toast.info('Aucune donnée à exporter');
      return;
    }
    const entete = [`Période (date des tentatives) : ${libellePeriode(this.periode)}`];
    const lignes = rapport.map(r => ({
      Rang: r.rang ?? '',
      Quiz: r.titre,
      'Contenus associés': (r.fiches_liees || []).map(f => f.titre).join(' ; ') || r.fiche_titre || '',
      Tentatives: r.nb_tentatives,
      Réussites: r.nb_reussis,
      'Taux de réussite (%)': r.taux_reussite ?? '',
      'Score moyen (%)': r.score_moyen ?? '',
      'Participants désignés': r.nb_designes ?? 0,
      'Ont passé': r.nb_passes ?? 0,
      'Non passés': r.nb_non_passes ?? 0,
      'Taux de participation (%)': r.taux_participation ?? '',
      Périmètre: r.limite_site === 1 ? 'Agents de votre site' : 'Tous les participants',
    }));
    const feuilles: FeuilleExport[] = [{ nom: 'Rapport Quiz', entete, lignes }];
    const detail = rapport
      .filter(r => this.ouverts.has(r.id) && this.detailParQuiz[r.id])
      .flatMap(r =>
        this.detailParQuiz[r.id].map(d => ({
          Quiz: r.titre,
          'N° question': d.numero,
          Question: d.libelle,
          Réponses: d.nb_reponses,
          Échecs: d.nb_echecs,
          "Taux d'échec (%)": d.taux_echec ?? '',
        }))
      );
    if (detail.length) {
      feuilles.push({ nom: 'Détail questions', entete, lignes: detail });
    }
    ecrireClasseur(`Rapport_Quiz_${suffixePeriode(this.periode)}.xlsx`, feuilles);
  }
}
