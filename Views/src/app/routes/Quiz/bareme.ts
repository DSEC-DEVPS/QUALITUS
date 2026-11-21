// Barème des quiz : les points des questions totalisent exactement 100.
// Tant que ce n'est pas le cas, le serveur refuse d'activer, d'ouvrir ou de
// diffuser le quiz, et ne le propose pas aux participants.
import { ConfirmationService } from '@shared/services/confirmation.service';
import { Question } from './interfaces';

export const BAREME_TOTAL = 100;

/** Total des points (5 par défaut pour une question sans points). */
export function totalPoints(questions: Question[], sauf?: Question): number {
  return questions.filter(q => q !== sauf).reduce((a, q) => a + Number(q.points ?? 5), 0);
}

/** Après un ajout : total ≠ 100 -> répartir équitablement ou ajuster à la main ? */
export function proposerRepartition(conf: ConfirmationService, questions: Question[]): Promise<boolean> {
  const total = totalPoints(questions);
  if (!questions.length || total === BAREME_TOTAL) return Promise.resolve(false);
  return conf.confirmer({
    titre: `Barème : ${total} / ${BAREME_TOTAL} points`,
    message:
      `Le total des points des ${questions.length} questions n'est pas de ${BAREME_TOTAL} : le quiz ne pourra pas être ` +
      `activé, ouvert ni diffusé. Voulez-vous répartir équitablement les ${BAREME_TOTAL} points entre les questions, ` +
      `ou ajuster vous-même les points ?`,
    type: 'attention',
    oui: 'Répartir équitablement',
    non: 'Ajuster à la main',
  });
}

/** Confirmation explicite du bouton « Répartir équitablement ». */
export function confirmerRepartition(conf: ConfirmationService, nb: number): Promise<boolean> {
  const base = Math.floor(BAREME_TOTAL / nb), reste = BAREME_TOTAL - base * nb;
  const detail = reste
    ? `${reste} question(s) à ${base + 1} points et ${nb - reste} à ${base} points`
    : `${base} points chacune`;
  return conf.confirmer({
    titre: 'Répartir équitablement',
    message: `Les ${BAREME_TOTAL} points seront répartis entre les ${nb} questions : ${detail}. Les points actuels seront remplacés.`,
    type: 'attention',
    oui: 'Répartir',
  });
}
