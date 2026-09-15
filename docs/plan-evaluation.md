# Plan — Module Évaluation Qualité (conforme cahier des charges)

> Décision : l'ancien module (`b_ev_*`/`b_mg_*`, ex-« Evaluation » + « Calibrage ») est **abandonné**
> (sauvegardé dans `db/legacy_eval_backup.sql`, tables supprimées) et **reconstruit à neuf**
> selon `cahier_de_charges_evaluation.docx`.

## Architecture
- **BDD** : nouveau schéma `b_eval_*` (paramétrage) / `b_evaluation*` (instances), schéma consolidé `db/init.sql` (module éval fusionné, appliqué). Poids `DECIMAL(12,6)`, snapshot immuable. Pas de FK vers le socle (tables MyISAM) — intégrité applicative.
- **Backend** : nouveaux contrôleurs/routes du module (remplacent progressivement `evaluation.Controllers.js` et `calibrage.Controllers.js`).
- **Frontend** : module `routes/Evaluation` reconstruit ; navigation via le menu statique (`core/bootstrap/menu-data.ts`).
- **Rôles** : `Role_Associe`/`Permissions_Associe` + ngx-permissions.

## Périmètre = Évaluation + Calibrage (grilles) réunis sous le cahier.

## Phases
| Phase | Contenu | Fonctions | État |
|---|---|---|---|
| 0 — Fondations | Migration schéma cahier + référentiels + seeds | base + 37ter | ✅ fait |
| 1 — Grilles | CRUD grille/cat/sous-cat/erreur, pondération auto/manuel, cohérence ±0,01, scores, activation, archivage | 37bis, 37ter D | ✅ backend (testé E2E) + frontend |
| 2 — Création éval. | Choix ressource, résolution grille (user↔grille), recopie snapshot, création en masse | 38bis/ter, 37ter | ✅ backend (testé E2E) + frontend |
| 3 — Exécution + BI | Cochage, calcul au fil de l'eau, clôture, arbo BI + proposition/validation | 39bis, 39ter | ✅ 3a exécution + 3b BI (backend E2E + frontend) |
| 4 — Suites échec | Évaluations supplémentaires, coaching (arbo unique), plan d'action, lettres + approbation | 39quater/quinquies/sexies | ✅ backend (E2E) + frontends (suppl., coaching, plan d'action, lettre, arbre coaching, validation 2 arbres) |
| 5 — Consultation | Vues par rôle, filtres, détail 2 colonnes + actions, cycle de vie | 39septies | ✅ backend (E2E) + frontend (filtres, vues par rôle, cycle de vie, résultats par catégorie) |
| 6 — Périodes & contre-éval | Calendrier + politiques ; contre-évaluation | 38quater, 42bis | ✅ 6a calendrier + 6b contre-évaluation (backend E2E + frontends) |
| 7 — Reporting | Agents en échec répété (3 critères) | 40bis | ✅ backend (E2E) + frontend (3 critères, filtres, drill-down) |

## État courant
- Couche données prête (31 tables). Ancien module supprimé (sauvegardé).
- ⚠️ Les pages **Évaluation** et **Calibrage** existantes sont **cassées** (leur code référence les tables supprimées) tant que leur code n'est pas reconstruit (Phases 1+).
- Reste de l'app (login, fiches, quiz, sondage) : fonctionnel.
