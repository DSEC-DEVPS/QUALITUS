-- =====================================================================
-- Quiz - code PIN d'acces
--  Chaque quiz a un code PIN (6 chiffres) genere a la creation.
--  Le conseiller saisit ce PIN pour acceder au quiz (au lieu d'une liste).
-- =====================================================================
USE QUALITUS;

ALTER TABLE B_QZ_QUIZ ADD COLUMN code_pin VARCHAR(10) NULL AFTER titre;

-- Backfill des quiz existants avec un PIN 6 chiffres (seed par id -> distincts)
UPDATE B_QZ_QUIZ
SET code_pin = LPAD(FLOOR(100000 + RAND(id * 7 + 13) * 899999), 6, '0')
WHERE code_pin IS NULL;
