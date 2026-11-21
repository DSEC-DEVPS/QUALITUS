// =====================================================================
// QUIZ — Badges : calcul des badges mérités par un utilisateur.
// Types de conditions (B_QZ_BADGE.condition_type / condition_valeur) :
//  - QUIZ_REUSSIS   : N quiz différents réussis ;
//  - SCORE_PARFAIT  : au moins un quiz à 100 % ;
//  - PARFAITS       : N quiz différents réussis à 100 % ;
//  - PREMIER_COUP   : N quiz différents réussis dès le 1er essai ;
//  - SERIE          : N quiz réussis d'affilée au 1er essai (meilleure série) ;
//  - MOIS_SANS_FAUTE: badge MENSUEL — au moins N quiz passés dans le mois
//                     (1er essai), tous réussis. Un badge par mois (periode
//                     'AAAA-MM' dans B_QZ_BADGE_UTILISATEUR).
// Les badges cumulatifs ont periode = ''.
// =====================================================================

/** Statistiques utiles au calcul, en peu de requêtes. */
const statistiques = async (cx, userId) => {
  const [[st]] = await cx.query(
    `SELECT
       COUNT(DISTINCT CASE WHEN reussi = 1 THEN id_Quiz END) AS quiz_reussis,
       COUNT(DISTINCT CASE WHEN score = 100 THEN id_Quiz END) AS quiz_parfaits,
       COUNT(DISTINCT CASE WHEN reussi = 1 AND num_essai = 1 THEN id_Quiz END) AS premier_coup
     FROM B_QZ_TENTATIVE WHERE id_UTILISATEUR = ?`,
    [userId]
  );
  // 1ers essais dans l'ordre chronologique : séries et mois sans faute
  const [essais] = await cx.query(
    `SELECT id_Quiz, reussi, DATE_FORMAT(date_tentative, '%Y-%m') AS mois
       FROM B_QZ_TENTATIVE WHERE id_UTILISATEUR = ? AND num_essai = 1
      ORDER BY date_tentative, id`,
    [userId]
  );
  let serie = 0, meilleureSerie = 0;
  const mois = {};
  for (const e of essais) {
    serie = Number(e.reussi) === 1 ? serie + 1 : 0;
    meilleureSerie = Math.max(meilleureSerie, serie);
    if (!e.mois) continue;
    const m = (mois[e.mois] = mois[e.mois] || { nb: 0, ok: true });
    m.nb += 1;
    if (Number(e.reussi) !== 1) m.ok = false;
  }
  return {
    quizReussis: Number(st.quiz_reussis) || 0,
    quizParfaits: Number(st.quiz_parfaits) || 0,
    premierCoup: Number(st.premier_coup) || 0,
    meilleureSerie,
    mois,
  };
};

/** Périodes méritées pour un badge : [''] (cumulatif), liste de 'AAAA-MM' (mensuel) ou []. */
const periodesMeritees = (b, st) => {
  const n = Number(b.condition_valeur) || 0;
  switch (b.condition_type) {
    case "QUIZ_REUSSIS": return st.quizReussis >= n ? [""] : [];
    case "SCORE_PARFAIT": return st.quizParfaits >= 1 ? [""] : [];
    case "PARFAITS": return st.quizParfaits >= n ? [""] : [];
    case "PREMIER_COUP": return st.premierCoup >= n ? [""] : [];
    case "SERIE": return st.meilleureSerie >= n ? [""] : [];
    case "MOIS_SANS_FAUTE":
      return Object.keys(st.mois).filter((m) => st.mois[m].ok && st.mois[m].nb >= Math.max(1, n)).sort();
    default: return [];
  }
};

const libelleMois = (p) => {
  const [a, m] = String(p).split("-");
  const noms = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
  return m ? `${noms[Number(m) - 1]} ${a}` : p;
};

/**
 * Met les badges de l'utilisateur en accord avec ses tentatives : attribue ceux
 * mérités, retire ceux qui ne le sont plus (recalcul, réinitialisation…).
 * Retourne { ajoutes: [badge…], retires: [badge…] } (badge : code, nom,
 * description, icone, periode).
 */
const synchroniserBadges = async (cx, userId) => {
  const st = await statistiques(cx, userId);
  const [badges] = await cx.query("SELECT * FROM B_QZ_BADGE");
  const [obt] = await cx.query("SELECT id_Badge, periode FROM B_QZ_BADGE_UTILISATEUR WHERE id_UTILISATEUR = ?", [userId]);
  const obtenus = new Set(obt.map((o) => `${o.id_Badge}|${o.periode || ""}`));
  const ajoutes = [], retires = [];
  const maintenant = new Date();
  for (const b of badges) {
    const meritees = new Set(periodesMeritees(b, st));
    const desc = (p) => ({
      code: b.code, icone: b.icone, description: b.description, periode: p,
      nom: p ? `${b.nom} (${libelleMois(p)})` : b.nom,
    });
    for (const p of meritees) {
      if (obtenus.has(`${b.id}|${p}`)) continue;
      await cx.query(
        "INSERT IGNORE INTO B_QZ_BADGE_UTILISATEUR (id_Badge, id_UTILISATEUR, periode, dateObtention) VALUES (?,?,?,?)",
        [b.id, userId, p, maintenant]
      );
      ajoutes.push(desc(p));
    }
    for (const o of obt) {
      if (o.id_Badge !== b.id || meritees.has(o.periode || "")) continue;
      await cx.query("DELETE FROM B_QZ_BADGE_UTILISATEUR WHERE id_Badge = ? AND id_UTILISATEUR = ? AND periode = ?", [b.id, userId, o.periode || ""]);
      retires.push(desc(o.periode || ""));
    }
  }
  return { ajoutes, retires };
};

/**
 * Badges de l'utilisateur pour l'affichage : chaque badge avec obtenu (0/1),
 * nombre de fois (badges mensuels), dernière obtention, et rareté (part des
 * participants aux quiz qui le détiennent).
 */
const badgesUtilisateur = async (cx, userId) => {
  const [[{ participants }]] = await cx.query("SELECT COUNT(DISTINCT id_UTILISATEUR) AS participants FROM B_QZ_TENTATIVE");
  const [rows] = await cx.query(
    `SELECT b.id, b.code, b.nom, b.description, b.icone, b.categorie, b.condition_type, b.condition_valeur,
            COUNT(bu.id) AS nb_obtentions, MAX(bu.dateObtention) AS dateObtention,
            GROUP_CONCAT(NULLIF(bu.periode, '') ORDER BY bu.periode SEPARATOR ',') AS periodes,
            (SELECT COUNT(DISTINCT x.id_UTILISATEUR) FROM B_QZ_BADGE_UTILISATEUR x WHERE x.id_Badge = b.id) AS detenteurs
       FROM B_QZ_BADGE b
       LEFT JOIN B_QZ_BADGE_UTILISATEUR bu ON bu.id_Badge = b.id AND bu.id_UTILISATEUR = ?
      GROUP BY b.id
      ORDER BY FIELD(b.categorie, 'DECOUVERTE', 'PROGRESSION', 'QUALITE', 'MENSUEL'), b.condition_valeur, b.id`,
    [userId]
  );
  const total = Number(participants) || 0;
  return rows.map((r) => ({
    ...r,
    obtenu: Number(r.nb_obtentions) > 0 ? 1 : 0,
    nb_obtentions: Number(r.nb_obtentions) || 0,
    periodes: r.periodes ? String(r.periodes).split(",") : [],
    detenteurs: Number(r.detenteurs) || 0,
    rarete: total ? Math.round((100 * Number(r.detenteurs)) / total) : 0,
  }));
};

module.exports = { synchroniserBadges, badgesUtilisateur, statistiques, periodesMeritees };
