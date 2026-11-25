-- out102 : TABLEAU DE BORD — deux nouvelles sections, chacune avec sa permission
--   tableau_de_bord.coaching       section « Suivi du coaching »
--   tableau_de_bord.plans_actions  section « Suivi des plans d'actions »
-- Même mécanique que 47_tableau_de_bord_sections.sql : une section s'affiche si
-- l'utilisateur a tableau_de_bord.voir ET la permission de la section ; réglage par
-- rôle (Matrice des droits) et par personne (Droits par utilisateur).
-- Rôles par défaut : ceux qui voient déjà la section Évaluations du tableau de bord
-- (tableau_de_bord.evaluations), et l'administrateur. Rejouable sans effet de bord.
SET NAMES utf8mb4;
USE QUALITUS;

INSERT IGNORE INTO b_permission (module, action, code, libelle) VALUES
  ('TABLEAU_DE_BORD', 'COACHING',      'tableau_de_bord.coaching',      'Tableau de bord — section Suivi du coaching'),
  ('TABLEAU_DE_BORD', 'PLANS_ACTIONS', 'tableau_de_bord.plans_actions', 'Tableau de bord — section Suivi des plans d''actions');

INSERT IGNORE INTO b_role_permission (id_role, id_permission)
  SELECT DISTINCT rp.id_role, pn.id
    FROM b_role_permission rp
    JOIN b_permission pe ON pe.id = rp.id_permission AND pe.code = 'tableau_de_bord.evaluations'
    JOIN b_permission pn ON pn.code IN ('tableau_de_bord.coaching', 'tableau_de_bord.plans_actions');

INSERT IGNORE INTO b_role_permission (id_role, id_permission)
  SELECT r.id, p.id FROM b_role r CROSS JOIN b_permission p
   WHERE r.code = 'R_ADMI' AND p.code IN ('tableau_de_bord.coaching', 'tableau_de_bord.plans_actions');
