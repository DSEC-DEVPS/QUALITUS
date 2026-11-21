/** Noms lisibles des modules du référentiel des permissions (le code reste affiché en petit). */
export const LIBELLES_MODULES: Record<string, string> = {
  AGENT_POLE: 'Agents par pôle',
  ASSIGNATION: 'Assignation',
  CALENDRIER: 'Calendrier',
  CALIBRAGE: 'Calibrage',
  CHARGEMENT: 'Chargements',
  COMPTE: 'Gérer les comptes',
  CONTRE_EVALUATION: 'Contre-évaluation',
  CREATION_MASSE: 'Création en masse',
  EVALUATION: 'Évaluation',
  FICHE: 'Fiches (Baseco)',
  FONCTION: 'Fonctions',
  GRILLE: 'Grilles',
  HABILITATION: 'Habilitations',
  MA_VOIX: 'Ma Voix',
  NOTIFICATION: 'Notifications',
  PROGRAMME: 'Programmes',
  QUIZ: 'Quiz',
  REFERENTIEL: 'Référentiels',
  REPORTING: 'Reporting',
  SITE: 'Sites',
  SONDAGE: 'Sondages',
  TABLEAU_DE_BORD: 'Tableau de bord',
  UTILISATEUR: 'Utilisateurs',
};

export function libelleModule(code: string): string {
  if (LIBELLES_MODULES[code]) return LIBELLES_MODULES[code];
  const t = (code || '').toLowerCase().replace(/_/g, ' ');
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Libellé de permission : celui du référentiel, sinon l'action mise en forme. */
export function libellePermission(p: { libelle?: string | null; action?: string; code?: string }): string {
  if (p.libelle && p.libelle.trim()) return p.libelle.trim();
  const a = (p.action || p.code || '').toLowerCase().replace(/_/g, ' ');
  return a.charAt(0).toUpperCase() + a.slice(1);
}
