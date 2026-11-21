-- QUIZ : des badges qui gardent leur valeur dans le temps.
--  - B_QZ_BADGE.categorie : DECOUVERTE | PROGRESSION | QUALITE | MENSUEL ;
--  - B_QZ_BADGE_UTILISATEUR.periode : '' (badge cumulatif) ou 'AAAA-MM'
--    (badge mensuel « Sans faute du mois », obtenu une fois par mois) ;
--  - nouveaux badges : paliers 10 / 25 / 50 / 100 quiz réussis, qualité
--    (1er essai, série, 100 %), mensuel ;
--  - « Expert » (5 quiz réussis) devient « Habitué » ; « Expert » = 25.
-- Les badges déjà obtenus sont conservés. Les nouveaux sont attribués au fil
-- de l'eau (et d'un coup avec : node scripts/recalculer_badges_quiz.js).
-- Rejouable sans effet de bord.
USE QUALITUS;

-- Catégorie des badges
SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME) = 'b_qz_badge' AND COLUMN_NAME = 'categorie');
SET @s := IF(@c = 0, 'ALTER TABLE B_QZ_BADGE ADD COLUMN categorie VARCHAR(20) NOT NULL DEFAULT ''DECOUVERTE'' AFTER icone', 'SELECT 1');
PREPARE q FROM @s; EXECUTE q; DEALLOCATE PREPARE q;

-- Période d'obtention (badges mensuels)
SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME) = 'b_qz_badge_utilisateur' AND COLUMN_NAME = 'periode');
SET @s := IF(@c = 0, 'ALTER TABLE B_QZ_BADGE_UTILISATEUR ADD COLUMN periode VARCHAR(7) NOT NULL DEFAULT '''' AFTER id_UTILISATEUR', 'SELECT 1');
PREPARE q FROM @s; EXECUTE q; DEALLOCATE PREPARE q;

-- Unicité (badge, utilisateur, période) : nouvel index d'abord (la clé
-- étrangère sur id_Badge doit toujours avoir un index), puis retrait de
-- l'ancien index unique (badge, utilisateur).
SET @c := (SELECT COUNT(*) FROM information_schema.STATISTICS
            WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME) = 'b_qz_badge_utilisateur' AND INDEX_NAME = 'ux_badge_utilisateur_periode');
SET @s := IF(@c = 0, 'ALTER TABLE B_QZ_BADGE_UTILISATEUR ADD UNIQUE INDEX ux_badge_utilisateur_periode (id_Badge, id_UTILISATEUR, periode)', 'SELECT 1');
PREPARE q FROM @s; EXECUTE q; DEALLOCATE PREPARE q;
SET @ancien := (SELECT s.INDEX_NAME FROM information_schema.STATISTICS s
                 WHERE s.TABLE_SCHEMA = DATABASE() AND LOWER(s.TABLE_NAME) = 'b_qz_badge_utilisateur' AND s.NON_UNIQUE = 0
                   AND s.INDEX_NAME NOT IN ('PRIMARY', 'ux_badge_utilisateur_periode')
                 GROUP BY s.INDEX_NAME
                HAVING GROUP_CONCAT(s.COLUMN_NAME ORDER BY s.SEQ_IN_INDEX) = 'id_Badge,id_UTILISATEUR' LIMIT 1);
SET @s := IF(@ancien IS NULL, 'SELECT 1', CONCAT('ALTER TABLE B_QZ_BADGE_UTILISATEUR DROP INDEX `', @ancien, '`'));
PREPARE q FROM @s; EXECUTE q; DEALLOCATE PREPARE q;

-- Calcul des badges : tentatives d'un utilisateur
SET @c := (SELECT COUNT(*) FROM information_schema.STATISTICS
            WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME) = 'b_qz_tentative' AND INDEX_NAME = 'ix_qz_tentative_utilisateur');
SET @s := IF(@c = 0, 'CREATE INDEX ix_qz_tentative_utilisateur ON B_QZ_TENTATIVE (id_UTILISATEUR, num_essai, date_tentative)', 'SELECT 1');
PREPARE q FROM @s; EXECUTE q; DEALLOCATE PREPARE q;

-- Badges de découverte (existants)
UPDATE B_QZ_BADGE SET categorie = 'DECOUVERTE' WHERE code IN ('PREMIER_REUSSI', 'TROIS_REUSSIS', 'CINQ_REUSSIS', 'SCORE_PARFAIT');
UPDATE B_QZ_BADGE SET nom = 'Habitué', description = 'Réussir 5 quiz' WHERE code = 'CINQ_REUSSIS';

-- Nouveaux badges
INSERT IGNORE INTO B_QZ_BADGE (code, nom, description, icone, categorie, condition_type, condition_valeur) VALUES
  ('DIX_REUSSIS',     'Confirmé',           'Réussir 10 quiz',                                          'trending_up',   'PROGRESSION', 'QUIZ_REUSSIS', 10),
  ('VINGT5_REUSSIS',  'Expert',             'Réussir 25 quiz',                                          'emoji_events',  'PROGRESSION', 'QUIZ_REUSSIS', 25),
  ('CINQUANTE_REUSSIS','Maître',            'Réussir 50 quiz',                                          'military_tech', 'PROGRESSION', 'QUIZ_REUSSIS', 50),
  ('CENT_REUSSIS',    'Légende',            'Réussir 100 quiz',                                         'diamond',       'PROGRESSION', 'QUIZ_REUSSIS', 100),
  ('PREMIER_COUP_5',  'Du premier coup',    'Réussir 5 quiz dès le premier essai',                      'bolt',          'QUALITE',     'PREMIER_COUP', 5),
  ('PREMIER_COUP_20', 'Sûr de soi',         'Réussir 20 quiz dès le premier essai',                     'verified',      'QUALITE',     'PREMIER_COUP', 20),
  ('SERIE_5',         'En série',           'Réussir 5 quiz d''affilée dès le premier essai',           'local_fire_department', 'QUALITE', 'SERIE', 5),
  ('PARFAITS_5',      'Perfectionniste',    'Obtenir 100 % à 5 quiz différents',                        'auto_awesome',  'QUALITE',     'PARFAITS', 5),
  ('MOIS_SANS_FAUTE', 'Sans faute du mois', 'Passer au moins 2 quiz dans le mois, tous réussis dès le premier essai', 'calendar_month', 'MENSUEL', 'MOIS_SANS_FAUTE', 2);
