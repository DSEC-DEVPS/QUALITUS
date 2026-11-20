/**
 * Icône d'une notification (cloche et Quiz › Nouveautés), selon son module et,
 * pour les quiz, son titre. Toutes les icônes existent dans la police locale
 * Material Icons (public/fonts) : pas d'emplacement vide.
 */
export interface NotificationIconSource {
  titre?: string | null;
  type?: string | null;
  nature_objet?: string | null;
  id_FICHE?: number | null;
  source?: string | null;
}

const ICONES_QUIZ: Record<string, string> = {
  'nouveau quiz': 'question_answer',
  'autorisation quiz': 'verified_user',
  'retest autorise': 'replay',
  "retest autorise et notifie a l'agent": 'replay',
  'réinitialisation demandée': 'settings_backup_restore',
  'réinitialisation confirmée': 'check_circle',
  'réinitialisation refusée': 'highlight_off',
  'score recalculé': 'autorenew',
  'quiz modifié': 'update',
  'temps écoulé': 'timer_off',
};

export function iconeNotification(n: NotificationIconSource): string {
  const titre = String(n.titre || '').trim().toLowerCase();
  const nature = String(n.nature_objet || n.type || '').toUpperCase();
  if (nature === 'QUIZ' || n.source === 'QUIZ') {
    return ICONES_QUIZ[titre] || 'question_answer';
  }
  switch (nature) {
    case 'COMMENTAIRE':
      // Commentaire ajouté sur une fiche (superviseur / gestionnaire)
      return 'comment';
    case 'EVALUATION':
      return 'assignment_turned_in';
    case 'CONTRE_EVALUATION':
      return 'compare_arrows';
    case 'CALIBRAGE':
      return 'tune';
    case 'OPTION_BI':
      return 'account_tree';
    case 'OPTION_COACHING':
    case 'COACHING':
    case 'PLAN_ACTION':
      return 'school';
  }
  if (n.id_FICHE) {
    // « nouveau document » : ajout d'une fiche
    return titre.includes('nouveau') ? 'note_add' : 'description';
  }
  return 'notifications';
}
