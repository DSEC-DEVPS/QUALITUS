# QUALITUS — Récapitulatif global du Socle commun

_Consolidation de tout ce qui a été livré au titre du `cahier_de_charges_socle_commun.docx`._
_État à jour de la dernière session. Docs de détail : [plan-socle-habilitations.md](plan-socle-habilitations.md), [plan-evaluation.md](plan-evaluation.md)._

---

## 1. Principe du socle

Le socle commun impose la **non-duplication des entités partagées** (utilisateur, site,
programme, fonction, superviseur/agent, **grille**, **notification**, **référentiel**) et des
**mécanismes transverses** réutilisables par tous les modules :

- un mécanisme générique de **référentiels** ;
- une **matrice des droits** (rôle × permission) avec contrôle **serveur** ;
- un mécanisme **unique de notifications** avec objet lié.

L'approche retenue partout a été **additive et non destructive** : aucune donnée supprimée,
changements réversibles, et pour la sécurité un déploiement **« observation d'abord, activation ensuite »**.

---

## 2. Tableau de synthèse

| Domaine socle | État | Preuve |
|---|---|---|
| **Login** (identifiant, résolution de login) | ✅ | test connexion + création éval par login |
| **Grille via l'écran utilisateur** (rattachement) | ✅ | `id_EvalGrille` posé/lu via l'UI |
| **Référentiels** (mécanisme générique) | ✅ | CRUD générique + états actif/inactif |
| **Notifications unifiées** (objet lié) | ✅ | E2E : notif éval dans `b_notification`, flux fiche intact |
| **Matrice des droits** (Étapes 1‑5, 7) | ✅ | E2E : observation journalisée, 403 en mode actif |
| **Non-duplication grille** (dépréciation legacy) | ✅ | création user sans `id_Grille` → 201 |
| **Activation du contrôle** (mode `ACTIF`) | ⏳ | décision métier après resserrement matrice |

---

## 3. Détail par domaine

### 3.1 Login (S1)
- Connexion par **identifiant** ; à la création d'évaluation, possibilité de **saisir le login**
  de l'agent (résolution serveur `resoudreLogin`).
- Correctifs d'environnement : proxy front → `127.0.0.1:3000` (évite l'IPv6 `::1`).

### 3.2 Grille via l'écran utilisateur (S2)
- La grille d'évaluation d'un agent se rattache **depuis la fiche utilisateur**
  (`id_EvalGrille` → `b_eval_grille`).
- Backend : `addUtilisateur` accepte `id_EvalGrille`, `getDetailsUtilisateur` le renvoie,
  endpoint dédié `PUT /utilisateur/:id/eval-grille` (`setEvalGrilleUtilisateur`).
- Frontend : sélecteur « Grille d'évaluation » dans **Ajouter** et **Fiche utilisateur**.

### 3.3 Référentiels — mécanisme générique (S4)
- `evalRef.Controllers.js` : CRUD **générique** piloté par un dictionnaire `type → {table, usages}`.
- Unicité du libellé (409), refus de suppression si utilisé (oriente vers **désactivation**),
  tri `ordre, libelle`, états **actif/inactif**, description.
- Frontend `referentiels/` : description, ordre, état.

### 3.4 Notifications unifiées (S6)
- Table **`b_notification` généralisée** : `nature_objet`, `id_objet`, `lu`, `dateLecture`
  (additif ; les notifications de fiche à `nature_objet NULL` gardent leur flux propre).
- Helper d'émission unique **`utils/notify.js` → `emit(...)`**, réutilisable par tous les modules.
- Émissions évaluation basculées : clôture (`evalExecution`), validations d'options
  **BI** et **coaching** (`nature_objet` = `EVALUATION` / `OPTION_BI` / `OPTION_COACHING`).
- Lecture unifiée `evalNotif.Controllers.js` ; suppression d'une évaluation
  **ne supprime plus** ses notifications ; ancienne table `b_eval_notification` migrée puis supprimée.
- **Vérifié E2E** : la notif de clôture atterrit dans `b_notification`, le compteur non-lues
  fonctionne, et le **flux fiche du base app reste intact**.

### 3.5 Matrice des droits (S5) — trajectoire Annexe A

Modèle de données ([db/init.sql](../db/init.sql), section « SOCLE S5 ») :
`b_permission` (référentiel module/action), `b_role`, `b_role_permission`,
`b_utilisateur_permission` (droits complémentaires GRANT/DENY), `b_habilitation_observation`
(journal), `b_param_habilitation` (mode).

| Étape | Objet | État |
|---|---|---|
| 1 | Figer le **code de rôle** (`Role_Associe` immuable au renommage) | ✅ |
| 2 | **Référentiel des permissions** — 46 permissions, 13 modules | ✅ |
| 3 | **Attribution** aux rôles — 8 rôles repris (codes conservés), reprise fidèle | ✅ |
| 4 | **Alimenter le client** — `GET /me/permissions` | ✅ |
| 5 | **Contrôle serveur** en **OBSERVATION** — **180 routes** câblées | ✅ |
| 6 | **Activation** (`mode=ACTIF`) | ⏳ |
| 7 | **Droits complémentaires** (GRANT/DENY par utilisateur) | ✅ |

Mécanisme :
- `middlewares/permission.js` → `permission(module, action)` :
  effectives = permissions du rôle ∪ GRANT − DENY ; `R_ADMI` = super-admin.
  **OBSERVATION** : laisse passer + journalise ; **ACTIF** : 403 si manquant. Cache de mode 30 s.
- `Controllers/habilitation.Controllers.js` + `Routes/habilitation.Routes.js` :
  matrice, rôles, permissions, mode (get/set), journal d'observation, droits par utilisateur.

Frontend :
- **Écran Matrice** (`routes/Habilitations/matrice`) : grille rôle×permission éditable,
  bascule Observation/Actif, onglet **Journal d'observation**.
- **Écran Droits par utilisateur** (`routes/Habilitations/droits-utilisateur`) : recherche d'un
  agent, sélecteur **3 états Refuser / Hériter / Autoriser**, accès effectif affiché.
- **Guardage client** : `PermissionsService` (`/me/permissions`) + directive **`*appCan`** +
  guard de route **`canMatchPermission`**, chargés au démarrage (`startup.service.ts`).
  Appliqués : boutons Utilisateurs, Site, Programme, Fonction, Sondage, Quiz ; guards de route
  Fiche (Ajouter/update), Évaluation (création, éditeur de grille, référentiels, contre-évaluation),
  Habilitations.

**Vérifié E2E** : en OBSERVATION un accès sans droit passe et est **journalisé** ;
en ACTIF le même accès renvoie **403** ; `R_ADMI` non impacté ; dérogations GRANT/DENY honorées.

### 3.6 Non-duplication de la grille
- `b_grille` (`id_Grille`, ancien système) et `b_eval_grille` (`id_EvalGrille`, cahier)
  représentaient le **même concept** → duplication.
- Résolution : **dépréciation du legacy**. `id_EvalGrille` devient la grille canonique ;
  `id_Grille` non obligatoire, sélecteur legacy retiré de l'UI, menu « Grille » masqué,
  table `b_grille` conservée mais annotée **DÉPRÉCIÉ**. Aucune perte de données.

---

## 4. Reste à faire

1. **Activer le contrôle des droits** (`b_param_habilitation.mode_controle = 'ACTIF'`),
   **après** resserrement de la matrice par rôle (métier), en s'appuyant sur le
   *Journal d'observation* pour ne rien casser.
2. **Généraliser `*appCan`** aux écrans restants (au fil de l'eau).
3. (Optionnel) Étendre le contrôle serveur aux quelques sous-ressources non câblées
   (catégorie/sla/sous-catégorie de fiche) si elles doivent être gouvernées.

---

## 5. Fichiers clés

**Backend** — `Server/` :
`middlewares/permission.js`, `middlewares/auth.js`, `utils/notify.js`,
`Controllers/habilitation.Controllers.js`, `Controllers/evalRef.Controllers.js`,
`Controllers/evalNotif.Controllers.js`, `Controllers/baseco.Controllers.js`,
`Routes/habilitation.Routes.js`, `server.js`.

**Base** — `db/` :
`init.sql` (schéma complet consolidé : base + Évaluation + habilitations), `legacy_eval_backup.sql` (sauvegarde séparée).

**Frontend** — `Views/src/app/` :
`core/authorization/{permissions.service.ts, can.directive.ts, permission.guard.ts}`,
`core/bootstrap/startup.service.ts`,
`routes/Habilitations/{matrice, droits-utilisateur, habilitation.service.ts}`,
`public/data/menu.json`.

---

## 6. Lancer l'environnement

Backend :

```bash
cd Server && DB_HOST=127.0.0.1 DB_USER=root DB_PASSWORD= node server.js
```

Frontend :

```bash
cd Views && npx ng serve --host 127.0.0.1 --port 4200
```

Accès : http://127.0.0.1:4200 (proxy `/api` → `http://127.0.0.1:3000`).
