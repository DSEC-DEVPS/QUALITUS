-- Niveau de migration d'une base QUALITUS (lecture seule, ne modifie rien).
-- OUI = la migration est présente. 10, 11, 16, 17, 18 ne sont pas testables
-- (agrandissement de colonnes ou permissions renommées depuis) : on les déduit
-- de leurs voisines.
SELECT m, IF(ok>0,'OUI','NON') AS appliquee FROM (
 SELECT '05' m, COUNT(*) ok FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='b_eval_ref_contexte' AND column_name='ordre' UNION ALL
 SELECT '06', COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND LOWER(table_name)='b_utilisateur' AND column_name='id_EvalGrille' UNION ALL
 SELECT '07', COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='b_evaluation_bi' AND column_name='id_option' UNION ALL
 SELECT '08', COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='b_evaluation' AND column_name='statut_apres_evaluation' UNION ALL
 SELECT '09', COUNT(*) FROM b_permission WHERE code='contre_evaluation.creer' UNION ALL
 SELECT '12', COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='b_eval_plan_action_ligne' AND column_name='synthese' UNION ALL
 SELECT '13', COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='b_cal_transaction' AND column_name='id_agent' UNION ALL
 SELECT '14', COUNT(*) FROM b_permission WHERE code='agent_pole.lire' UNION ALL
 SELECT '15', COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='b_eval_ref_statut_evaluation' UNION ALL
 SELECT '19', COUNT(*) FROM b_permission WHERE code='quiz.baseco' UNION ALL
 SELECT '20', COUNT(*) FROM b_role WHERE code='R_BO' UNION ALL
 SELECT '21', COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND LOWER(table_name)='b_brouillon_controle' UNION ALL
 SELECT '22', COUNT(*) FROM b_permission WHERE code='fiche.archiver' UNION ALL
 SELECT '23', COUNT(*) FROM b_permission WHERE code='quiz.participer' UNION ALL
 SELECT '24', COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='b_qz_quiz' AND column_name='statut'
) x;
