-- Matrice de droits dédiée « Agents en pôle » (module AGENT_POLE) :
--  - LIRE       : accéder à la section
--  - VOIR_TOUS  : voir les agents en pôle de TOUS les sites (+ filtres site/programme/équipe)
-- Sans VOIR_TOUS, un superviseur ne voit que ses agents (filtre date uniquement).
-- À exécuter sur une base déjà initialisée.
USE QUALITUS;

INSERT IGNORE INTO b_permission (module,action,code,libelle) VALUES
  ('AGENT_POLE','LIRE','agent_pole.lire','Consulter — agents en pôle'),
  ('AGENT_POLE','VOIR_TOUS','agent_pole.voir_tous','Voir les agents en pôle de tous les sites');

-- Parité avec l'existant : on rattache à tous les rôles (le durcissement se fait via l'UI).
INSERT IGNORE INTO b_role_permission (id_role, id_permission)
  SELECT r.id, p.id FROM b_role r JOIN b_permission p ON p.module='AGENT_POLE';
