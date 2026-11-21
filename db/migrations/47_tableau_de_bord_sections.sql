-- TABLEAU DE BORD : une permission par section, indépendante des droits de gestion des modules.
--   tableau_de_bord.baseco       section Baseco (chargements)
--   tableau_de_bord.evaluations  section Évaluations (totaux du périmètre ; bascule « Mon équipe » possible)
--   tableau_de_bord.quiz         section Quiz
--   tableau_de_bord.sondages     section Sondages
--   tableau_de_bord.calibrage    section Calibrage
-- Une section s'affiche si l'utilisateur a tableau_de_bord.voir ET la permission de la section.
-- Réglage par rôle (Matrice des droits) et par personne (Droits par utilisateur).
-- Reprise de l'existant : chaque rôle qui voit le tableau de bord reçoit les sections qu'il
-- voyait déjà (droits de module équivalents). Rejouable sans effet de bord.
SET NAMES utf8mb4;
USE QUALITUS;

INSERT IGNORE INTO b_permission (module, action, code, libelle) VALUES
  ('TABLEAU_DE_BORD', 'BASECO',      'tableau_de_bord.baseco',      'Tableau de bord — section Baseco (chargements)'),
  ('TABLEAU_DE_BORD', 'EVALUATIONS', 'tableau_de_bord.evaluations', 'Tableau de bord — section Évaluations'),
  ('TABLEAU_DE_BORD', 'QUIZ',        'tableau_de_bord.quiz',        'Tableau de bord — section Quiz'),
  ('TABLEAU_DE_BORD', 'SONDAGES',    'tableau_de_bord.sondages',    'Tableau de bord — section Sondages'),
  ('TABLEAU_DE_BORD', 'CALIBRAGE',   'tableau_de_bord.calibrage',   'Tableau de bord — section Calibrage');

-- Rôles qui voient le tableau de bord
CREATE TEMPORARY TABLE tdb_roles AS
  SELECT DISTINCT rp.id_role FROM b_role_permission rp JOIN b_permission p ON p.id = rp.id_permission
   WHERE p.code = 'tableau_de_bord.voir';

-- Section <-> droits de module qui l'affichaient jusqu'ici
CREATE TEMPORARY TABLE tdb_equiv (section VARCHAR(64), code VARCHAR(64));
INSERT INTO tdb_equiv VALUES
  ('tableau_de_bord.baseco', 'fiche.creer'), ('tableau_de_bord.baseco', 'fiche.gerer'),
  ('tableau_de_bord.baseco', 'chargement.verifier'), ('tableau_de_bord.baseco', 'reporting.lire'),
  ('tableau_de_bord.evaluations', 'evaluation.voir_tous'),
  ('tableau_de_bord.quiz', 'quiz.lire'), ('tableau_de_bord.sondages', 'sondage.lire'),
  ('tableau_de_bord.calibrage', 'calibrage.lire');

INSERT IGNORE INTO b_role_permission (id_role, id_permission)
  SELECT DISTINCT tr.id_role, ps.id
    FROM tdb_roles tr
    JOIN b_role_permission rp ON rp.id_role = tr.id_role
    JOIN b_permission pm ON pm.id = rp.id_permission
    JOIN tdb_equiv eq ON eq.code = pm.code
    JOIN b_permission ps ON ps.code = eq.section;

-- Superviseurs : la section Évaluations (ils la voyaient déjà, limitée à leur équipe)
INSERT IGNORE INTO b_role_permission (id_role, id_permission)
  SELECT r.id, p.id FROM b_role r JOIN tdb_roles tr ON tr.id_role = r.id CROSS JOIN b_permission p
   WHERE r.code = 'R_SUP' AND p.code = 'tableau_de_bord.evaluations';

-- Administrateur : toutes les sections
INSERT IGNORE INTO b_role_permission (id_role, id_permission)
  SELECT r.id, p.id FROM b_role r CROSS JOIN b_permission p
   WHERE r.code = 'R_ADMI' AND p.code LIKE 'tableau\_de\_bord.%';

DROP TEMPORARY TABLE tdb_equiv;
DROP TEMPORARY TABLE tdb_roles;
