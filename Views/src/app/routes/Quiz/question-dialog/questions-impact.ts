import * as XLSX from 'xlsx';
import { fmtPoints } from '../bareme';
import {
  AppearanceAnimation,
  ButtonLayoutDisplay,
  ButtonMaker,
  ConfirmBoxInitializer,
  DialogLayoutDisplay,
  DisappearanceAnimation,
} from '@costlydeveloper/ngx-awesome-popup';
import { QuizService } from '@shared/services/quiz.service';
import { Question, Quiz } from '../interfaces';
import { QuestionDialogResult } from './question-dialog.component';

/**
 * Effets d'une modification de questions sur un quiz déjà passé :
 *  - AJOUT / REPONSES : toutes les tentatives sont réinitialisées (les réponses
 *    données ne peuvent pas être réévaluées) ;
 *  - POINTS / SUPPRESSION : les scores sont recalculés.
 * Le serveur applique ces règles ; cet utilitaire prévient l'utilisateur avant.
 */
export type ActionQuestion = 'AJOUT' | 'REPONSES' | 'POINTS' | 'SUPPRESSION';

export const MSG_QUIZ_FERME =
  'Rouvrez le quiz avant de modifier ses questions : il a déjà été passé et les participants devront le repasser.';

export function quizDejaPasse(quiz?: Quiz | null): boolean {
  return !!quiz && Number(quiz.nb_tentatives_total || 0) > 0;
}

/** Nature d'une modification de question (null : libellé seulement, aucun effet). */
export function actionModification(avant: Question, apres: QuestionDialogResult): ActionQuestion | null {
  const optsAvant = avant.options || [];
  const memes =
    (avant.type || 'VRAI_FAUX') === (apres.type || 'VRAI_FAUX') &&
    optsAvant.length === apres.options.length &&
    optsAvant.every(
      (o, i) =>
        String(o.libelle).trim() === String(apres.options[i].libelle).trim() &&
        (o.est_correcte ? 1 : 0) === (apres.options[i].est_correcte ? 1 : 0)
    );
  if (!memes) return 'REPONSES';
  if (Math.round(Number(avant.points ?? 5) * 100) !== Math.round(Number(apres.points) * 100)) return 'POINTS';
  return null;
}

/**
 * Demande confirmation si le quiz a déjà été passé. Pour une réinitialisation,
 * propose d'exporter le rapport des participants avant de continuer.
 * Résout true pour continuer, false pour annuler.
 */
export function confirmerImpact(
  quiz: Quiz | undefined | null,
  action: ActionQuestion,
  exporter: () => void
): Promise<boolean> {
  if (!quizDejaPasse(quiz)) return Promise.resolve(true);
  const nbT = Number(quiz!.nb_tentatives_total || 0);
  const nbP = Number(quiz!.nb_participants_total || 0);
  const reinit = action === 'AJOUT' || action === 'REPONSES';
  const quoi = {
    AJOUT: 'Ajouter cette question',
    REPONSES: 'Modifier les réponses de cette question',
    POINTS: 'Modifier les points de cette question',
    SUPPRESSION: 'Supprimer cette question',
  }[action];
  const message = reinit
    ? `Ce quiz a déjà été passé (${nbT} tentative(s), ${nbP} participant(s)). ${quoi} supprimera toutes les tentatives : les participants devront le repasser.`
    : `Ce quiz a déjà été passé (${nbT} tentative(s)). ${quoi} recalculera les scores ; les participants concernés seront prévenus.`;

  return new Promise(resolve => {
    const ouvrir = () => {
      const box = new ConfirmBoxInitializer();
      box.setTitle(reinit ? 'Réinitialisation des tentatives' : 'Recalcul des scores');
      box.setMessage(message);
      box.setConfig({
        layoutType: reinit ? DialogLayoutDisplay.DANGER : DialogLayoutDisplay.WARNING,
        animationIn: AppearanceAnimation.BOUNCE_IN,
        animationOut: DisappearanceAnimation.BOUNCE_OUT,
        buttonPosition: 'right',
      });
      const boutons = [
        new ButtonMaker('Continuer', 'continuer', reinit ? ButtonLayoutDisplay.DANGER : ButtonLayoutDisplay.WARNING),
        new ButtonMaker('Annuler', 'annuler', ButtonLayoutDisplay.SECONDARY),
      ];
      if (reinit) boutons.unshift(new ButtonMaker("Exporter le rapport d'abord", 'exporter', ButtonLayoutDisplay.INFO));
      box.setButtons(boutons);
      box.openConfirmBox$().subscribe(resp => {
        if (resp.clickedButtonID === 'exporter') {
          exporter();
          ouvrir(); // l'utilisateur décide ensuite de continuer ou non
          return;
        }
        resolve(resp.clickedButtonID === 'continuer');
      });
    };
    ouvrir();
  });
}

/** Score en pourcentage : 66.67%, 100%, 0%. */
export function scorePct(v: number | string | null | undefined): string {
  const n = Number(v);
  return v == null || isNaN(n) ? '—' : `${Number(n.toFixed(2))}%`;
}

/** « 10 / 15 » (points obtenus / points du quiz), ou '—'. */
export function pointsLabel(obtenus: number | null | undefined, total: number | null | undefined): string {
  return obtenus == null || total == null ? '—' : `${fmtPoints(obtenus)} / ${fmtPoints(total)}`;
}

/** Export Excel de toutes les tentatives du quiz (avant une réinitialisation). */
export function exporterTentativesQuiz(quizSrv: QuizService, quiz: Quiz, onErreur: () => void): void {
  quizSrv.getRapportParticipants(quiz.id).subscribe({
    next: rows => {
      const data = rows.map((p, i) => ({
        '#': i + 1,
        'Prénom - Nom': `${p.prenom} ${p.nom}`,
        Site: p.site || '',
        Essai: p.num_essai,
        'Date début': p.date_debut || '',
        'Date fin': p.date_fin || '',
        Résultat: p.reussi ? 'Réussi' : p.statut === 'TEMPS_ECOULE' ? 'Temps écoulé' : 'Échec',
        Score: scorePct(p.score),
        Points: pointsLabel(p.nb_points, p.nb_points_total),
      }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), 'Tentatives');
      const jour = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `Tentatives_quiz_${quiz.id}_avant_reinitialisation_${jour}.xlsx`);
    },
    error: onErreur,
  });
}
