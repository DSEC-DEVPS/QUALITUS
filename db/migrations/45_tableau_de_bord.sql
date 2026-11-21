-- TABLEAU DE BORD : nouvelle permission « Consulter le tableau de bord ».
--   tableau_de_bord.voir  Consulter — tableau de bord (indicateurs de son périmètre)
-- Le contenu dépend ensuite des droits de chaque module (Baseco, évaluations,
-- quiz, sondages, calibrage) et du périmètre : son site, tous les sites pour
-- le site à vision globale et l'administrateur, son équipe pour un superviseur.
-- Profils par défaut : administrateur, gestionnaire Baseco, superviseur,
-- responsable opérationnel, agent qualité (modifiable dans la matrice des droits).
-- Corrige aussi les libellés de rôles enregistrés avec un encodage abîmé.
-- Rejouable sans effet de bord.
SET NAMES utf8mb4;
USE QUALITUS;

INSERT IGNORE INTO b_permission (module, action, code, libelle) VALUES
  ('TABLEAU_DE_BORD', 'VOIR', 'tableau_de_bord.voir', 'Consulter — tableau de bord (indicateurs de son périmètre)');

INSERT IGNORE INTO b_role_permission (id_role, id_permission)
  SELECT r.id, p.id FROM b_role r CROSS JOIN b_permission p
   WHERE p.code = 'tableau_de_bord.voir' AND r.code IN ('R_ADMI', 'R_GB', 'R_SUP', 'R_RO', 'R_AQ');

-- Libellés de rôles abîmés (« OpÃ©rationnel », « QualitÃ© ») -> texte correct.
UPDATE b_role SET libelle = 'Responsable Opérationnel',
       description = 'Rôle repris de la fonction « Responsable Opérationnel »'
 WHERE code = 'R_RO' AND (libelle LIKE '%Ã%' OR description LIKE '%Ã%');
UPDATE b_role SET libelle = 'Agent Qualité',
       description = 'Rôle repris de la fonction « Agent Qualité »'
 WHERE code = 'R_AQ' AND (libelle LIKE '%Ã%' OR description LIKE '%Ã%');
