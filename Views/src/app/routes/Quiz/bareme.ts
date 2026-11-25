// Barème des quiz : les points des questions totalisent exactement 100.
// Tant que ce n'est pas le cas, le serveur refuse d'activer, d'ouvrir ou de
// diffuser le quiz, et ne le propose pas aux participants.
import { ConfirmationService } from '@shared/services/confirmation.service';
import { Question } from './interfaces';

export const BAREME_TOTAL = 100;

/** Arrondi au centième (les points ont 2 décimales au plus — out116). */
export const r2 = (x: number | string | null | undefined): number => Math.round(Number(x || 0) * 100) / 100;

/** Points à la française, sans zéros inutiles : 5, 12,5, 33,33. */
export function fmtPoints(v: number | string | null | undefined): string {
  if (v === null || v === undefined || v === '' || isNaN(Number(v))) return '';
  return r2(v).toLocaleString('fr-FR', { maximumFractionDigits: 2 });
}

/** Saisie de points : « 12,5 » ou « 12.5 » ; null si invalide (0,01 à 100, 2 décimales). */
export function lirePoints(v: number | string | null | undefined): number | null {
  const t = String(v ?? '').trim().replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
  const n = r2(t);
  return n >= 0.01 && n <= BAREME_TOTAL ? n : null;
}

/** Total des points (5 par défaut pour une question sans points), au centième. */
export function totalPoints(questions: Question[], sauf?: Question): number {
  return r2(questions.filter(q => q !== sauf).reduce((a, q) => a + Number(q.points ?? 5), 0));
}

/**
 * Ajout d'une question alors que le barème est déjà atteint (100 points) — out114.
 * Renvoie 'repartir' (ajouter puis répartir équitablement), 'manuel' (ajouter et
 * ajuster soi-même) ou null (annuler l'ajout). Barème non atteint : 'manuel' sans
 * rien demander (les points de la nouvelle question sont pré-remplis avec le reliquat).
 */
export async function choixAjoutBaremeAtteint(conf: ConfirmationService, questions: Question[]): Promise<'repartir' | 'manuel' | null> {
  if (totalPoints(questions) < BAREME_TOTAL) return 'manuel';
  const c = await conf.choisir({
    titre: `Barème déjà atteint (${fmtPoints(totalPoints(questions))} / ${BAREME_TOTAL})`,
    message:
      `Les ${BAREME_TOTAL} points sont déjà répartis entre les ${questions.length} questions : une question de plus ` +
      `fera dépasser le total. Voulez-vous répartir équitablement les ${BAREME_TOTAL} points après l'ajout ` +
      `(${questions.length + 1} questions), ou ajuster vous-même les points ?`,
    type: 'attention',
    choix: [
      { id: 'annuler', libelle: 'Annuler' },
      { id: 'manuel', libelle: 'Ajuster à la main' },
      { id: 'repartir', libelle: 'Répartir équitablement', principal: true },
    ],
  });
  return c === 'repartir' || c === 'manuel' ? c : null;
}

/**
 * Avant d'activer, d'ouvrir ou de diffuser un quiz (out114) : si le total n'est pas de
 * 100, proposer de répartir équitablement puis continuer, ou d'annuler pour ajuster à
 * la main. Renvoie true si l'action peut continuer (barème conforme, ou répartition faite).
 * `repartir` exécute la répartition côté serveur et se résout quand elle est faite.
 */
export async function garantirBareme(conf: ConfirmationService, total: number, nbQuestions: number, action: string,
                                     repartir: () => Promise<boolean>): Promise<boolean> {
  if (Math.round(total * 100) === BAREME_TOTAL * 100 || !nbQuestions) return true; // sans question : le serveur explique le refus
  const c = await conf.choisir({
    titre: `Barème : ${fmtPoints(total)} / ${BAREME_TOTAL} points`,
    message:
      `Pour ${action} le quiz, ses questions doivent totaliser exactement ${BAREME_TOTAL} points ` +
      `(actuellement ${fmtPoints(total)}). Répartir équitablement les ${BAREME_TOTAL} points entre les ${nbQuestions} questions ` +
      `et continuer, ou annuler pour ajuster vous-même les points ?`,
    type: 'attention',
    choix: [
      { id: 'annuler', libelle: 'Annuler' },
      { id: 'repartir', libelle: 'Répartir et continuer', principal: true },
    ],
  });
  return c === 'repartir' ? repartir() : false;
}

/** Confirmation explicite du bouton « Répartir équitablement ». */
export function confirmerRepartition(conf: ConfirmationService, nb: number): Promise<boolean> {
  // out116 : répartition au centième (comme le serveur) : 100 / 3 -> 33,34 + 33,33 + 33,33.
  const C = BAREME_TOTAL * 100, baseC = Math.floor(C / nb), reste = C - baseC * nb;
  const detail = reste
    ? `${reste} question(s) à ${fmtPoints((baseC + 1) / 100)} points et ${nb - reste} à ${fmtPoints(baseC / 100)} points`
    : `${fmtPoints(baseC / 100)} points chacune`;
  return conf.confirmer({
    titre: 'Répartir équitablement',
    message: `Les ${BAREME_TOTAL} points seront répartis entre les ${nb} questions : ${detail}. Les points actuels seront remplacés.`,
    type: 'attention',
    oui: 'Répartir',
  });
}
