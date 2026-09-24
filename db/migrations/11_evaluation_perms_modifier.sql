-- Matrice EVALUATION : ajoute la permission MODIFIER, retire CONTRE_EVALUER
-- (la contre-évaluation a désormais sa propre matrice CONTRE_EVALUATION).
-- À exécuter sur une base déjà initialisée.
USE QUALITUS;

-- Ajouter EVALUATION.MODIFIER + rattacher à tous les rôles (parité).
INSERT IGNORE INTO b_permission (module,action,code,libelle)
  VALUES ('EVALUATION','MODIFIER','evaluation.modifier','Modifier — evaluation');
INSERT IGNORE INTO b_role_permission (id_role, id_permission)
  SELECT r.id, p.id FROM b_role r JOIN b_permission p ON p.code='evaluation.modifier';

-- Retirer EVALUATION.CONTRE_EVALUER (les liens rôle/utilisateur cascadent via FK).
DELETE FROM b_permission WHERE code='evaluation.contre_evaluer';
