-- ÉVALUATION : désactivation d'une évaluation terminée + calibrage réservé au jauge.
--   evaluation.desactiver   (Dés)activer une évaluation TERMINÉE (dans son
--                           périmètre d'accès). Une évaluation non terminée reste
--                           (dés)activable par son créateur. Attribuée au seul
--                           profil administrateur.
-- Calibrage (sans migration) : seul le jauge d'une session peut l'organiser ;
-- création limitée à son site hors site à vision globale.
-- Rejouable sans effet de bord.
USE QUALITUS;

INSERT IGNORE INTO b_permission (module, action, code, libelle) VALUES
  ('EVALUATION', 'DESACTIVER', 'evaluation.desactiver', '(Dés)activer une évaluation terminée');

INSERT IGNORE INTO b_role_permission (id_role, id_permission)
  SELECT r.id, p.id FROM b_role r JOIN b_permission p ON p.code = 'evaluation.desactiver'
   WHERE r.code = 'R_ADMI';
