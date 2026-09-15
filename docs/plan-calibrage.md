# Module Calibrage — plan de mise en œuvre

Basé sur `Cahier De Charges Calibrage.docx` (F.43 à F.47). Réutilise le domaine
Évaluation (grilles Actives, snapshot d'indépendance, présentation F.39bis), la
matrice des droits (socle S5) et les notifications (socle S6).

## Décisions de conception (validées)
- **Permission** : module `CALIBRAGE` → `calibrage.lire` (tous rôles) + `calibrage.organiser`
  (R_ADMI par défaut ; le jauge s'attribue surtout via **droits complémentaires**, F.43).
- **Commentaire du jauge** : porté par l'erreur de la **référence** (par transaction × erreur),
  affiché en regard du commentaire du participant (non modifiable par le jauge).
- **Chrono** : appliqué **côté serveur en lazy** (clôture auto au dépassement, calculée à l'accès).

## Schéma (db/init.sql — section « MODULE CALIBRAGE »)
`b_cal_session`, `b_cal_transaction`, `b_cal_participant`, `b_cal_evaluation`
(constat par transaction × évaluateur, `est_reference`), `b_cal_evaluation_categorie`
+ `b_cal_evaluation_erreur` (snapshot grille + coche + commentaire + `appreciation_jauge`
+ traçabilité `coche_initial`/`modifie_par`/`date_modif`), `b_cal_reinitialisation`.

## Phases
- [x] **Phase 0 — Socle & schéma** : 7 tables `b_cal_*`, permission `CALIBRAGE`, init.sql mis à jour + validé from-scratch (48 permissions).
- [x] **Phase 1 — Préparation** (F.44/45) : backend (sessions, transactions, participants+invitations S6, duplication, recherche) + frontend (liste/recherche, création, écran de préparation) + menu/routes guardées. Testé E2E, build OK.
- [x] **Phase 2 — Déroulement** (F.46) : backend (écran session par rôle, snapshot grille, constats+états, chrono lazy, clôtures participation/référence, visibilité, réinitialisation) + frontend (écran 3 zones, compte à rebours, vues participant/jauge). Testé E2E, build OK.
- [x] **Phase 3 — Résultats** (F.47) : backend (conformité, tableau croisé, confrontation, révision 2 côtés + traçabilité, recalcul, validation+notifs, conclusions) + frontend (tableau, confrontation, appréciations, conclusions, validation). Testé E2E, build OK.

**Module Calibrage complet (Phases 0-3).**

Chaque phase : backend testé E2E, puis frontend buildé.
