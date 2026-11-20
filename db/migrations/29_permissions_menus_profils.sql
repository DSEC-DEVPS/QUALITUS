-- MENUS RÉSERVÉS À UN PROFIL -> PERMISSIONS ATTRIBUABLES
-- Chaque menu jusqu'ici réservé à un profil a désormais sa permission, attribuable
-- à n'importe quel utilisateur (Habilitations › Droits par utilisateur) :
--   compte.gerer        Gérer les comptes (réinit. mot de passe, programme, détail) — site de l'utilisateur
--   assignation.gerer   Assignation des agents aux superviseurs — site de l'utilisateur
--   ma_voix.ajouter     Ma Voix › Ajouter
--   ma_voix.motif       Ma Voix › Liste Motif (référentiel des motifs)
--   chargement.verifier Gestion Chargements (vérification / contrôle)
-- Reprise : chaque permission est donnée au profil qui avait le menu, rien ne
-- change pour les utilisateurs existants. Dashboard et Mes Agents : hors périmètre.
-- Rejouable sans effet de bord.
USE QUALITUS;

INSERT IGNORE INTO b_permission (module,action,code,libelle) VALUES
  ('COMPTE','GERER','compte.gerer','Gérer — comptes du site (mot de passe, programme, détail)'),
  ('ASSIGNATION','GERER','assignation.gerer','Gérer — assignation agents / superviseurs du site'),
  ('MA_VOIX','AJOUTER','ma_voix.ajouter','Ajouter — Ma Voix'),
  ('MA_VOIX','MOTIF','ma_voix.motif','Gérer — motifs Ma Voix'),
  ('CHARGEMENT','VERIFIER','chargement.verifier','Vérifier — chargements (Gestion Chargements)');

INSERT IGNORE INTO b_role_permission (id_role, id_permission)
  SELECT r.id, p.id
    FROM b_role r
    JOIN b_permission p
      ON (p.code IN ('compte.gerer','assignation.gerer') AND r.code = 'R_RO')
      OR (p.code = 'ma_voix.ajouter' AND r.code = 'R_TC')
      OR (p.code = 'ma_voix.motif' AND r.code = 'R_ADMI')
      OR (p.code = 'chargement.verifier' AND r.code = 'R_GE');
