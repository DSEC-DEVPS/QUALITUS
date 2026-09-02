import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import {
  AppearanceAnimation,
  ConfirmBoxInitializer,
  DialogLayoutDisplay,
  DisappearanceAnimation,
} from '@costlydeveloper/ngx-awesome-popup';
import * as XLSX from 'xlsx';
import { QuizService } from '@shared/services/quiz.service';
import {
  Question,
  Quiz,
  QuizIp,
  QuizIpDemande,
  RapportParticipant,
  QuestionRatee,
  OptionRatee,
  SiteOption,
} from '../interfaces';
import {
  QuestionDialogComponent,
  QuestionDialogData,
  QuestionDialogResult,
} from '../question-dialog/question-dialog.component';
import { TentativeDetailDialogComponent } from './tentative-detail-dialog.component';

/**
 * Page "Detail" d'un quiz : en-tete (parametres + PIN) + onglets
 * Questions / Rapports / Autorisations IP. Ouverte depuis la liste des quiz.
 */
@Component({
  selector: 'app-detail-quiz',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatTableModule,
    MatTooltipModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './detail-quiz.component.html',
  styleUrl: './detail-quiz.component.scss',
})
export class DetailQuizComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly quizSrv = inject(QuizService);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastrService);

  /** Points affiches par question (affichage seul, valeur fixe). */
  readonly POINT_PAR_QUESTION = 5;

  quizId!: number;
  quiz?: Quiz;
  questions: Question[] = [];

  // Onglet Rapports > Questions ratée (distribution des réponses)
  questionsRatees: QuestionRatee[] = [];

  // Onglet Rapports > Tous participants
  participants: RapportParticipant[] = [];
  colsParticipants = ['num', 'nom', 'date_debut', 'date_fin', 'statut', 'point', 'temps', 'site', 'actions'];
  sitesOptions: SiteOption[] = [];
  filtreAgent = '';
  filtreStatut = '';
  filtreSite = '';

  // Onglet Autorisations IP
  ips: QuizIp[] = [];
  colsIp = ['adresse_ip', 'libelle', 'agent', 'actions'];
  nouvelleIp = '';
  nouvelleIpLibelle = '';
  envoiIp = false;

  // Demandes d'acces IP en attente
  demandes: QuizIpDemande[] = [];
  colsDemande = ['agent', 'adresse_ip', 'dateCreation', 'actions'];

  ngOnInit(): void {
    this.quizId = Number(this.route.snapshot.paramMap.get('id'));
    this.charger();
    this.chargerRapport();
    this.chargerParticipants();
    this.chargerIps();
    this.chargerDemandes();
    this.quizSrv.getSites().subscribe({ next: s => (this.sitesOptions = s), error: () => {} });
  }

  chargerParticipants() {
    this.quizSrv
      .getRapportParticipants(this.quizId, {
        agent: this.filtreAgent.trim(),
        statut: this.filtreStatut,
        site: this.filtreSite,
      })
      .subscribe({
        next: r => (this.participants = r),
        error: () => this.toast.error('Impossible de charger les participants'),
      });
  }

  reinitFiltres() {
    this.filtreAgent = '';
    this.filtreStatut = '';
    this.filtreSite = '';
    this.chargerParticipants();
  }

  tempsLabel(sec: number | null | undefined): string {
    if (sec == null) return '—';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m ? `${m} min ${s}s` : `${s}s`;
  }

  voirTentative(p: RapportParticipant) {
    this.quizSrv.getTentativeDetail(p.id).subscribe({
      next: d => {
        this.dialog.open(TentativeDetailDialogComponent, {
          width: 'calc(100% - 30px)',
          maxWidth: '620px',
          data: d,
        });
      },
      error: () => this.toast.error('Détail indisponible'),
    });
  }

  exporterParticipants() {
    if (!this.participants.length) {
      this.toast.warning('Aucun participant à exporter');
      return;
    }
    const data = this.participants.map((p, i) => ({
      '#': i + 1,
      'Prénom - Nom': `${p.prenom} ${p.nom}`,
      'Date début': p.date_debut || '',
      'Date fin': p.date_fin || '',
      Statut: 'Terminé',
      Résultat: p.reussi ? 'Réussi' : 'Échec',
      Point: p.score,
      Temps: this.tempsLabel(p.temps_secondes),
      Site: p.site || '',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Participants');
    XLSX.writeFile(wb, `Rapport_participants_quiz_${this.quizId}.xlsx`);
  }

  get totalPoints(): number {
    return this.questions.length * this.POINT_PAR_QUESTION;
  }

  get sitesLabel(): string {
    const noms = (this.quiz?.sites_detail || []).map(s => s.nom);
    return noms.length ? noms.join(', ') : 'Tous les sites';
  }

  charger() {
    this.quizSrv.getOne(this.quizId).subscribe({
      next: q => {
        this.quiz = q;
        this.questions = q.questions || [];
      },
      error: () => this.toast.error('Quiz introuvable'),
    });
  }

  chargerRapport() {
    this.quizSrv.getQuestionsRatees(this.quizId).subscribe({
      next: r => (this.questionsRatees = r),
      error: () => {},
    });
  }

  /** Lettre d'option (A, B, C…) selon l'index. */
  lettre(i: number): string {
    return String.fromCharCode(65 + i);
  }

  /** Uniquement les mauvaises réponses (barres rouges). */
  optionsFausses(options: OptionRatee[]): OptionRatee[] {
    return (options || []).filter(o => !o.est_correcte);
  }

  /** Plus grand nombre de choix parmi les options (min 1) — pour l'échelle des barres. */
  maxChoix(options: OptionRatee[]): number {
    return Math.max(1, ...options.map(o => o.nb_choix));
  }

  chargerIps() {
    this.quizSrv.getIps(this.quizId).subscribe({
      next: r => (this.ips = r),
      error: () => {},
    });
  }

  chargerDemandes() {
    this.quizSrv.getDemandesIp(this.quizId).subscribe({
      next: r => (this.demandes = r),
      error: () => {},
    });
  }

  traiterDemande(d: QuizIpDemande, decision: 'AUTORISER' | 'REFUSER') {
    this.quizSrv.traiterDemandeIp(d.id, decision).subscribe({
      next: r => {
        this.toast.success(r.message);
        this.chargerDemandes();
        this.chargerIps();
      },
      error: err => this.toast.error(err?.error?.message || "Une erreur s'est produite"),
    });
  }

  retour() {
    this.router.navigate(['/mon-espace/quiz/gestion']);
  }

  editer() {
    this.router.navigate(['/mon-espace/quiz/editer', this.quizId]);
  }

  typeLabel(q: Question): string {
    switch (q.type) {
      case 'QCU':
        return 'QCU';
      case 'QCM':
        return 'QCM';
      default:
        return 'Vrai / Faux';
    }
  }

  private ok(msg: string) {
    this.toast.success(msg);
    this.charger();
  }
  private ko() {
    this.toast.error("Une erreur s'est produite");
  }

  /* --------- Questions --------- */
  ajouterQuestion() {
    const data: QuestionDialogData = { mode: 'add' };
    this.dialog
      .open(QuestionDialogComponent, { width: 'calc(100% - 30px)', maxWidth: '640px', data })
      .afterClosed()
      .subscribe((r: QuestionDialogResult | undefined) => {
        if (r) {
          this.quizSrv
            .addQuestion({ id_Quiz: this.quizId, ...r })
            .subscribe({ next: () => this.ok('Question ajoutee'), error: () => this.ko() });
        }
      });
  }

  modifierQuestion(q: Question) {
    const data: QuestionDialogData = { mode: 'edit', question: q };
    this.dialog
      .open(QuestionDialogComponent, { width: 'calc(100% - 30px)', maxWidth: '640px', data })
      .afterClosed()
      .subscribe((r: QuestionDialogResult | undefined) => {
        if (r) {
          this.quizSrv
            .updateQuestion(q.id, r)
            .subscribe({ next: () => this.ok('Question modifiee'), error: () => this.ko() });
        }
      });
  }

  supprimerQuestion(q: Question) {
    const box = new ConfirmBoxInitializer();
    box.setTitle('Suppression !');
    box.setMessage('Supprimer cette question ?');
    box.setConfig({
      layoutType: DialogLayoutDisplay.DANGER,
      animationIn: AppearanceAnimation.BOUNCE_IN,
      animationOut: DisappearanceAnimation.BOUNCE_OUT,
      buttonPosition: 'right',
    });
    box.setButtonLabels('OUI', 'NON');
    box.openConfirmBox$().subscribe(resp => {
      if (resp.success) {
        this.quizSrv
          .deleteQuestion(q.id)
          .subscribe({ next: () => this.ok('Question supprimee'), error: () => this.ko() });
      }
    });
  }

  /* --------- Autorisations IP --------- */
  ajouterIp() {
    const ip = this.nouvelleIp.trim();
    if (!ip) {
      this.toast.warning('Merci de saisir une adresse IP');
      return;
    }
    this.envoiIp = true;
    this.quizSrv.addIp(this.quizId, { adresse_ip: ip, libelle: this.nouvelleIpLibelle.trim() }).subscribe({
      next: () => {
        this.toast.success('Adresse IP ajoutee');
        this.nouvelleIp = '';
        this.nouvelleIpLibelle = '';
        this.envoiIp = false;
        this.chargerIps();
      },
      error: err => {
        this.envoiIp = false;
        this.toast.error(err?.error?.message || "Une erreur s'est produite");
      },
    });
  }

  supprimerIp(ip: QuizIp) {
    const box = new ConfirmBoxInitializer();
    box.setTitle('Suppression !');
    box.setMessage(`Retirer l'adresse ${ip.adresse_ip} de la liste autorisee ?`);
    box.setConfig({
      layoutType: DialogLayoutDisplay.DANGER,
      animationIn: AppearanceAnimation.BOUNCE_IN,
      animationOut: DisappearanceAnimation.BOUNCE_OUT,
      buttonPosition: 'right',
    });
    box.setButtonLabels('OUI', 'NON');
    box.openConfirmBox$().subscribe(resp => {
      if (resp.success) {
        this.quizSrv.deleteIp(ip.id).subscribe({
          next: () => {
            this.toast.success('Adresse IP supprimee');
            this.chargerIps();
          },
          error: () => this.ko(),
        });
      }
    });
  }
}
