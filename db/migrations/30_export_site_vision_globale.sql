-- EXPORTATIONS : paramètre « site à vision globale ».
-- Les utilisateurs de ce site (ex. DSFO) — et les administrateurs — exportent les
-- données de tous les sites et choisissent un site ou tous les sites ; les autres
-- n'exportent que les données de leur propre site (exports Évaluation du menu
-- Exportations : Écoutes, Écoutes items, Pôle, Liste des agents, Coaching agent,
-- Contre-évaluation, Calibrages, Plan d'actions).
-- valeur = id du site (b_site.id) ; vide = aucun site à vision globale.
-- Initialisé avec le site nommé « DSFO » s'il existe ; sinon à régler :
--   UPDATE b_param_habilitation SET valeur = '<id du site>' WHERE cle = 'site_vision_globale';
-- Rejouable sans effet de bord (une valeur déjà réglée n'est pas écrasée).
USE QUALITUS;

INSERT IGNORE INTO b_param_habilitation (cle, valeur) VALUES ('site_vision_globale', '');

UPDATE b_param_habilitation
   SET valeur = (SELECT CAST(MIN(id) AS CHAR) FROM b_site WHERE UPPER(TRIM(nom)) = 'DSFO')
 WHERE cle = 'site_vision_globale' AND valeur = ''
   AND EXISTS (SELECT 1 FROM b_site WHERE UPPER(TRIM(nom)) = 'DSFO');
