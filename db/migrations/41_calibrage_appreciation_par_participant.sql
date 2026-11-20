-- CALIBRAGE : l'appréciation du jauge devient propre à chaque participant.
-- Elle était enregistrée sur la ligne de la RÉFÉRENCE, donc affichée sur le
-- même item chez tous les participants. Elle est désormais enregistrée sur la
-- ligne d'erreur du participant (transaction + item + participant).
-- Reprise des données : chaque appréciation existante est recopiée chez tous
-- les participants de la transaction (sans écraser une valeur déjà présente),
-- puis retirée de la référence. Rejouable sans effet de bord.
USE QUALITUS;

UPDATE b_cal_evaluation_erreur xp
  JOIN b_cal_evaluation ep ON ep.id = xp.id_cal_evaluation AND ep.est_reference = 0
  JOIN b_cal_evaluation er ON er.id_session = ep.id_session AND er.id_transaction = ep.id_transaction AND er.est_reference = 1
  JOIN b_cal_evaluation_erreur xr ON xr.id_cal_evaluation = er.id AND xr.id_erreur_origine = xp.id_erreur_origine
   SET xp.appreciation_jauge = xr.appreciation_jauge
 WHERE xr.appreciation_jauge IS NOT NULL AND xr.appreciation_jauge <> ''
   AND (xp.appreciation_jauge IS NULL OR xp.appreciation_jauge = '');

UPDATE b_cal_evaluation_erreur xr
  JOIN b_cal_evaluation er ON er.id = xr.id_cal_evaluation AND er.est_reference = 1
   SET xr.appreciation_jauge = NULL
 WHERE xr.appreciation_jauge IS NOT NULL;
