import { Menu } from './menu.service';

/**
 * Menu statique de l'application.
 * Le backend n'expose pas de route /me/menu ; ce menu est chargé au démarrage
 * (cf. startup.service.ts) pour rendre les modules navigables.
 * Les libellés sont affichés tels quels (pas de namespace i18n).
 * Pour restreindre par rôle, ajouter `permissions: { only: 'R_XXX' }` sur un item.
 */
export const MENU: Menu[] = [
  {
    route: 'mon-espace/dashboard',
    name: 'Tableau de bord',
    type: 'link',
    icon: 'dashboard',
  },
  {
    route: '',
    name: 'Évaluation',
    type: 'sub',
    icon: 'fact_check',
    children: [
      { route: 'mon-espace/evaluation/evaluations', name: 'Évaluations', type: 'link' },
      { route: 'mon-espace/evaluation/creation/unitaire', name: 'Créer une évaluation', type: 'link' },
      { route: 'mon-espace/evaluation/creation/masse', name: 'Création en masse', type: 'link' },
      { route: 'mon-espace/evaluation/bi/arborescences', name: 'Arborescences BI', type: 'link' },
      { route: 'mon-espace/evaluation/bi/validation', name: 'Validation d’options', type: 'link' },
      // Écrans à reconstruire aux phases suivantes (contre-évaluation, coaching,
      // notifications, reporting, référentiels…).
    ],
  },
  {
    route: 'mon-espace/evaluation/grilles',
    name: 'Grilles d’évaluation',
    type: 'link',
    icon: 'grid_view',
  },
  {
    route: '',
    name: 'Base de connaissance',
    type: 'sub',
    icon: 'menu_book',
    children: [
      { route: 'mon-espace/Fiche/Liste', name: 'Fiches', type: 'link' },
      { route: 'mon-espace/Fiche/ListeCategorie', name: 'Catégories', type: 'link' },
      { route: 'mon-espace/Fiche/ListeSousCategorie', name: 'Sous-catégories', type: 'link' },
      { route: 'mon-espace/Fiche/ListeSla', name: 'SLA', type: 'link' },
    ],
  },
  {
    route: '',
    name: 'Quiz',
    type: 'sub',
    icon: 'quiz',
    children: [
      { route: 'mon-espace/quiz/gestion', name: 'Gestion des quiz', type: 'link' },
      { route: 'mon-espace/quiz/quiz-en-echecs', name: 'Quiz en échec', type: 'link' },
      { route: 'mon-espace/quiz/Quiz-en-reset', name: 'Quiz en reset', type: 'link' },
    ],
  },
  {
    route: 'mon-espace/sondage/gestion',
    name: 'Sondages',
    type: 'link',
    icon: 'poll',
  },
  {
    route: 'mon-espace/MaVoixCompte/ajouter',
    name: 'Ma voix compte',
    type: 'link',
    icon: 'record_voice_over',
  },
  {
    route: '',
    name: 'Administration',
    type: 'sub',
    icon: 'settings',
    children: [
      { route: 'mon-espace/Utilisateurs/Liste', name: 'Utilisateurs', type: 'link' },
      { route: 'mon-espace/Fonction/Liste', name: 'Fonctions', type: 'link' },
      { route: 'mon-espace/Site/Liste', name: 'Sites', type: 'link' },
      { route: 'mon-espace/Programme/Liste', name: 'Programmes', type: 'link' },
      { route: 'mon-espace/mes-agents/Liste', name: 'Mes agents', type: 'link' },
      { route: 'mon-espace/RO/assignation-agents', name: 'Assignation agents', type: 'link' },
      { route: 'mon-espace/RO/renitialisation-password', name: 'Réinit. mot de passe', type: 'link' },
      { route: 'mon-espace/export', name: 'Export', type: 'link' },
    ],
  },
];
