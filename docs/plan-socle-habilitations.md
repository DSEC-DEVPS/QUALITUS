# Socle commun S5 — Matrice des droits (trajectoire Annexe A)

Approche **additive, non destructive**. Contrôle serveur d'abord en
**OBSERVATION** (aucun refus, journalisation), activation ultérieure.

## Modèle de données (`db/init.sql`, section « SOCLE S5 »)
- `b_permission` — référentiel des permissions (module + action), 46 seed.
- `b_role` — rôles, **codes repris** de `b_fonction.Role_Associe` (immuables).
- `b_role_permission` — matrice rôle ↔ permission.
- `b_utilisateur_permission` — droits complémentaires (GRANT / DENY).
- `b_habilitation_observation` — journal des accès qui SERAIENT refusés.
- `b_param_habilitation.mode_controle` — `OBSERVATION` | `ACTIF`.

## Mécanisme
- `middlewares/permission.js` : `permission(module, action)`.
  - Permissions effectives = perms du rôle ∪ GRANT − DENY ; `R_ADMI` = super-admin.
  - OBSERVATION : laisse passer + journalise ; ACTIF : 403 si manquant.
  - Cache du mode 30 s.
- `Controllers/habilitation.Controllers.js` + `Routes/habilitation.Routes.js` :
  matrice, rôles, permissions, mode (get/set), observations, `/me/permissions`.

## État des étapes (Annexe A)
- [x] **Ét.1** Figer le code de rôle — `update_Fonction` ne régénère plus `Role_Associe`.
- [x] **Ét.2** Constituer le référentiel des permissions (module/action).
- [x] **Ét.3** Attribuer les permissions aux rôles — reprise **fidèle** (accès uniforme
      actuel → toutes permissions par rôle ; différenciation fine = décision métier via l'UI).
- [x] **Ét.4** Alimenter le client — endpoint `GET /me/permissions`.
- [x] **Ét.5** Contrôle serveur en **OBSERVATION** — câblé sur le module pilote **Grille**.
- [ ] **Ét.6** Activation (`mode_controle=ACTIF`) après resserrement de la matrice.
- [x] **Ét.7** Droits complémentaires — GRANT/DENY par utilisateur : endpoints + écran
      « Droits par utilisateur » (Habilitations). Sélecteur 3 états Refuser/Hériter/Autoriser.

## Généralisation du guardage client (fait)
- Boutons `*appCan` : Utilisateurs, Site, Programme, Fonction (creer/modifier/supprimer),
  Sondage, Quiz (nouveau/editer/supprimer).
- Guards de route `canMatchPermission` : Fiche (Ajouter=creer, update=modifier),
  Évaluation (creation unitaire/masse=creer, grilles/editeur=grille.modifier,
  referentiels=referentiel.lire, contre-evaluation=contre_evaluer), Habilitations=habilitation.lire.

## Reste à faire
- [x] **Frontend** : écran matrice + journal d'observation + bascule de mode — `routes/Habilitations/matrice` (menu « Habilitations » réservé R_ADMI).
- [x] **Guardage client** : `PermissionsService` (/me/permissions) + directive `*appCan` +
  guard `canMatchPermission` ; chargé au démarrage, alimente ngx-permissions.
  Appliqué : route Habilitations (guard) et boutons Utilisateurs (creer/modifier/supprimer).
  À généraliser écran par écran avec `*appCan`.
- [x] **Étendre** le contrôle (observation) à tous les modules : baseco (utilisateur, site,
  programme, fonction, fiche, grille, notification, reporting), quiz, sondage, évaluation
  (exécution/BI/coaching/contre/suites/calendrier/rapport), référentiels — 180 routes câblées.
- **Resserrer** la matrice par rôle (métier) puis **activer** (Ét.6).

## Clarification grille (socle — non-duplication) — fait
Deux « grilles » coexistaient : `b_grille` (id_Grille, ancien système, 11 lignes, seuils)
et `b_eval_grille` (id_EvalGrille, grille du cahier). Même concept métier → duplication.
Résolution retenue : **déprécier le legacy**.
- `id_EvalGrille` (b_eval_grille) est la grille d'évaluation canonique.
- Formulaire utilisateur : sélecteur legacy retiré, `id_Grille` non obligatoire à la création.
- Menu « Grille » (legacy) masqué ; table `b_grille` et son CRUD conservés (données),
  annotés DÉPRÉCIÉ dans `baseco.Controllers.js`.
- Aucune suppression de données ; réversible.
