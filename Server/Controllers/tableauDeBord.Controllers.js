// =====================================================================
// TABLEAU DE BORD — indicateurs par périmètre et par période.
//
// Accès : permission tableau_de_bord.voir (R_ADMI toujours). Chaque section a sa
// propre permission, indépendante des droits de gestion des modules (réglable par
// rôle dans la matrice des droits et par personne dans « Droits par utilisateur ») :
//   tableau_de_bord.baseco | .evaluations | .quiz | .sondages | .calibrage
// Les sections ne montrent que des totaux, calculés sur le périmètre choisi.
//
// Périmètre (règle du site à vision globale) :
//   - administrateur / utilisateur du site à vision globale : tous les sites,
//     ou un site au choix, avec la répartition par site ;
//   - autres : leur site uniquement ;
//   - superviseur (agents rattachés) : « Mon équipe » en plus.
// Contrôlé ici (et pas seulement par le middleware) car le mode OBSERVATION
// laisse passer toutes les requêtes.
// =====================================================================
const db = require("../config/db");
const { permissionsEffectives } = require("../middlewares/permission");
const { porteeSite } = require("../utils/siteVisionGlobale");

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Indicateur { num, den, taux } ; taux null quand il n'y a aucune donnée. */
const ratio = (num, den) => {
  const n = Number(num) || 0;
  const d = Number(den) || 0;
  return { num: n, den: d, taux: d > 0 ? Math.round((1000 * n) / d) / 10 : null };
};

/** Période demandée (défaut : du 1er du mois courant à aujourd'hui). */
const periode = (q) => {
  const auj = new Date();
  const p2 = (n) => String(n).padStart(2, "0");
  const iso = (d) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
  let du = DATE_RE.test(String(q.du || "")) ? String(q.du) : iso(new Date(auj.getFullYear(), auj.getMonth(), 1));
  let au = DATE_RE.test(String(q.au || "")) ? String(q.au) : iso(auj);
  if (du > au) [du, au] = [au, du];
  return { du, au };
};

/** Contexte : droits, périmètre choisi et options disponibles ; null si pas d'accès. */
const contexte = async (userId, q) => {
  const { role, set } = await permissionsEffectives(userId);
  const admin = role === "R_ADMI";
  if (!admin && !set.has("tableau_de_bord.voir")) return null;
  const a = (code) => admin || set.has(code);
  const { idSite, visionGlobale } = await porteeSite(userId, admin);
  const [ag] = await db.query("SELECT DISTINCT id_AGENT AS id FROM b_r_superviseur_agent WHERE id_SUPERVISEUR = ?", [userId]);
  const agents = ag.map((r) => Number(r.id));
  const [sites] = visionGlobale
    ? await db.query("SELECT id, nom FROM B_SITE ORDER BY nom")
    : await db.query("SELECT id, nom FROM B_SITE WHERE id = ?", [idSite ?? -1]);

  const options = [];
  if (visionGlobale) {
    options.push({ code: "global", libelle: "Tous les sites" });
    for (const s of sites) options.push({ code: "site:" + s.id, libelle: s.nom });
  } else if (idSite != null && sites.length) {
    options.push({ code: "site:" + idSite, libelle: sites[0].nom });
  }
  if (agents.length) options.push({ code: "equipe", libelle: "Mon équipe (" + agents.length + " agent" + (agents.length > 1 ? "s" : "") + ")" });

  const demande = String(q.perimetre || "");
  const choisi = options.find((o) => o.code === demande) || options[0] || null;
  let perimetre = null;
  if (choisi) {
    if (choisi.code === "global") perimetre = { type: "global" };
    else if (choisi.code === "equipe") perimetre = { type: "equipe", agents };
    else perimetre = { type: "site", idSite: Number(choisi.code.slice(5)) };
    perimetre.code = choisi.code;
    perimetre.libelle = choisi.libelle;
  }
  const [[me]] = await db.query("SELECT COUNT(*) AS n FROM B_FICHE WHERE id_gestionnaire = ?", [userId]);
  return {
    userId: Number(userId),
    admin,
    visionGlobale,
    idSite,
    agents,
    options,
    perimetre,
    auteurFiches: Number(me.n) > 0,
    droits: {
      baseco: a("tableau_de_bord.baseco"),
      evaluations: a("tableau_de_bord.evaluations"),
      quiz: a("tableau_de_bord.quiz"),
      sondages: a("tableau_de_bord.sondages"),
      calibrage: a("tableau_de_bord.calibrage"),
    },
  };
};

/** Filtre SQL sur un utilisateur (alias) selon le périmètre. */
const filtreUtilisateur = (p, alias) => {
  if (!p || p.type === "global") return { sql: "1=1", params: [] };
  if (p.type === "site") return { sql: `${alias}.id_Site = ?`, params: [p.idSite] };
  if (!p.agents.length) return { sql: "1=0", params: [] };
  return { sql: `${alias}.id IN (${p.agents.map(() => "?").join(",")})`, params: p.agents };
};

/* --------------------------------------------------------------------- */
/* Baseco (chargements / fiches)                                          */
/* --------------------------------------------------------------------- */
const PUB = "COALESCE(f.dateVisibilite, f.dateEnregistrement)";
const filtreFiches = (per, ctx, mesFiches) => {
  // Bornes en intervalle (et non DATE(...)) : même résultat, sans calcul par ligne.
  const w = [`f.ETAT IN ('ACTIF','ARCHIVE')`, `${PUB} >= ?`, `${PUB} < ? + INTERVAL 1 DAY`];
  const params = [per.du, per.au];
  if (mesFiches) {
    w.push("f.id_gestionnaire = ?");
    params.push(ctx.userId);
  }
  return { sql: w.join(" AND "), params };
};

// Destinataire d'une fiche : utilisateur actif dont le site ET la fonction font partie des accès.
const CIBLE = (a) => `(UPPER(TRIM(f.AccesSite)) = 'ALL' OR FIND_IN_SET(${a}.id_Site, REPLACE(f.AccesSite, ' ', '')) > 0)
     AND (UPPER(TRIM(f.AccesProfil)) = 'ALL' OR FIND_IN_SET(${a}.id_Fonction, REPLACE(f.AccesProfil, ' ', '')) > 0)`;

/** Utilisateurs actifs du périmètre regroupés par (site, fonction) : quelques lignes seulement. */
const groupesDestinataires = (fu) =>
  `(SELECT u.id_Site, u.id_Fonction, COUNT(*) AS n FROM B_UTILISATEUR u
     WHERE u.status = 'ACTIF' AND ${fu.sql} GROUP BY u.id_Site, u.id_Fonction)`;

/**
 * Lecture des chargements, par site du lecteur :
 *  - destinataires : somme, par chargement, des groupes (site, fonction) ciblés,
 *    moins le gestionnaire lui-même s'il fait partie de la cible ;
 *  - lectures : première consultation de chaque (chargement, destinataire),
 *    calculée en un seul passage sur l'historique (index fiche, utilisateur, date).
 * Le total « tous sites » est la somme des lignes.
 */
const lectureParSite = async (per, ctx, mesFiches) => {
  const ff = filtreFiches(per, ctx, mesFiches);
  const fu = filtreUtilisateur(ctx.perimetre, "u");
  const fg = filtreUtilisateur(ctx.perimetre, "g");
  const [[den], [auteurs], [num]] = await Promise.all([
    db.query(
      `SELECT g.id_Site, SUM(g.n) AS cibles
         FROM B_FICHE f JOIN ${groupesDestinataires(fu)} g ON ${CIBLE("g")}
        WHERE ${ff.sql} GROUP BY g.id_Site`,
      [...fu.params, ...ff.params]
    ),
    db.query(
      `SELECT g.id_Site, COUNT(*) AS n
         FROM B_FICHE f JOIN B_UTILISATEUR g ON g.id = f.id_gestionnaire AND g.status = 'ACTIF' AND ${CIBLE("g")}
        WHERE ${ff.sql} AND ${fg.sql} GROUP BY g.id_Site`,
      [...ff.params, ...fg.params]
    ),
    db.query(
      `SELECT u.id_Site, COUNT(*) AS lus,
              SUM(DATE(x.lu) <= DATE(x.pub)) AS lus_j,
              SUM(DATE(x.lu) <= DATE(x.pub) + INTERVAL 2 DAY) AS lus_j2
         FROM (SELECT h.id_FICHE, h.id_UTILISATEUR, MIN(h.dateConsultation) AS lu, MIN(${PUB}) AS pub
                 FROM B_HISTORIQUE h JOIN B_FICHE f ON f.id = h.id_FICHE
                WHERE ${ff.sql}
                GROUP BY h.id_FICHE, h.id_UTILISATEUR) x
         JOIN B_FICHE f ON f.id = x.id_FICHE
         JOIN B_UTILISATEUR u ON u.id = x.id_UTILISATEUR AND u.status = 'ACTIF' AND u.id <> f.id_gestionnaire AND ${CIBLE("u")}
        WHERE ${fu.sql}
        GROUP BY u.id_Site`,
      [...ff.params, ...fu.params]
    ),
  ]);
  const parSite = new Map();
  const ligne = (id) => {
    const k = id == null ? "null" : String(id);
    if (!parSite.has(k)) parSite.set(k, { id_Site: id == null ? null : Number(id), cibles: 0, lus: 0, lus_j: 0, lus_j2: 0 });
    return parSite.get(k);
  };
  for (const r of den) ligne(r.id_Site).cibles += Number(r.cibles) || 0;
  for (const r of auteurs) ligne(r.id_Site).cibles -= Number(r.n) || 0;
  for (const r of num) {
    const l = ligne(r.id_Site);
    l.lus += Number(r.lus) || 0;
    l.lus_j += Number(r.lus_j) || 0;
    l.lus_j2 += Number(r.lus_j2) || 0;
  }
  return [...parSite.values()];
};

const blocBaseco = async (per, ctx, mesFiches, lectures) => {
  const ff = filtreFiches(per, ctx, mesFiches);
  const fu = filtreUtilisateur(ctx.perimetre, "u");
  const fg = filtreUtilisateur(ctx.perimetre, "g");
  const [[[pub]], [[s]], ponct, [[m]]] = await Promise.all([
    // Chargements mis à disposition ayant au moins un destinataire dans le périmètre.
    db.query(
      `SELECT COUNT(DISTINCT f.id) AS n FROM B_FICHE f JOIN ${groupesDestinataires(fu)} g ON ${CIBLE("g")} WHERE ${ff.sql}`,
      [...fu.params, ...ff.params]
    ),
    db.query(
      `SELECT COUNT(*) AS n, SUM(s.utilite = 1) AS utiles, SUM(s.exactitude = 1) AS exactes
         FROM B_SONDAGE s JOIN B_FICHE f ON f.id = s.id_FICHE JOIN B_UTILISATEUR u ON u.id = s.id_UTILISATEUR
        WHERE ${ff.sql} AND ${fu.sql}`,
      [...ff.params, ...fu.params]
    ),
    // Ponctualité : rattachée au site du gestionnaire qui publie (sans objet pour une équipe).
    ctx.perimetre.type === "equipe"
      ? Promise.resolve(null)
      : db.query(
          `SELECT COUNT(DISTINCT f.id) AS n, COUNT(DISTINCT CASE WHEN o.on_time = 'OUI' THEN f.id END) AS ok
             FROM B_ON_TIME o JOIN B_FICHE f ON f.id = o.id_Fiche LEFT JOIN B_UTILISATEUR g ON g.id = f.id_gestionnaire
            WHERE ${ff.sql} AND ${fg.sql}`,
          [...ff.params, ...fg.params]
        ),
    db.query(
      `SELECT COUNT(*) AS n,
              SUM(r.ETAT = 'succes' AND COALESCE(r.NB_RETEST, 1) <= 1) AS ok1,
              SUM(COALESCE(r.NB_RETEST, 1) > 1) AS retestes,
              SUM(r.ETAT = 'succes' AND COALESCE(r.NB_RETEST, 1) > 1) AS ok_retest
         FROM B_REPONSE_QUIZ r JOIN B_FICHE f ON f.id = r.id_FICHE JOIN B_UTILISATEUR u ON u.id = r.id_UTILISATEUR
        WHERE ${ff.sql} AND ${fu.sql}`,
      [...ff.params, ...fu.params]
    ),
  ]);
  const l = lectures.reduce(
    (t, x) => ({ cibles: t.cibles + x.cibles, lus: t.lus + x.lus, lus_j: t.lus_j + x.lus_j, lus_j2: t.lus_j2 + x.lus_j2 }),
    { cibles: 0, lus: 0, lus_j: 0, lus_j2: 0 }
  );
  const o = ponct ? ponct[0][0] : null;
  return {
    fiches_publiees: Number(pub.n) || 0,
    lecture: ratio(l.lus, l.cibles),
    lecture_j: ratio(l.lus_j, l.cibles),
    lecture_j2: ratio(l.lus_j2, l.cibles),
    utilite: ratio(s.utiles, s.n),
    exactitude: ratio(s.exactes, s.n),
    ponctualite: o ? ratio(o.ok, o.n) : null,
    maitrise_premier_essai: ratio(m.ok1, m.n),
    reussite_apres_retest: ratio(m.ok_retest, m.retestes),
  };
};

/* --------------------------------------------------------------------- */
/* Évaluations                                                            */
/* --------------------------------------------------------------------- */
const filtreEvaluations = (p) => {
  if (p.type === "global") return { sql: "1=1", params: [] };
  if (p.type === "site") return { sql: "e.id_site = ?", params: [p.idSite] };
  if (!p.agents.length) return { sql: "1=0", params: [] };
  return { sql: `e.id_agent IN (${p.agents.map(() => "?").join(",")})`, params: p.agents };
};

const blocEvaluations = async (per, ctx) => {
  // Totaux du périmètre choisi (site, tous les sites, ou « Mon équipe »).
  const fe = filtreEvaluations(ctx.perimetre);
  const [[r]] = await db.query(
    `SELECT SUM(e.statut = 'TERMINE') AS terminees,
            SUM(e.statut = 'TERMINE' AND e.conclusion = 'SUCCES') AS succes,
            SUM(e.statut <> 'TERMINE') AS en_cours,
            SUM(e.statut = 'TERMINE' AND (e.avis_agent IS NULL OR e.avis_agent = '')) AS sans_approbation,
            SUM(e.statut = 'TERMINE' AND e.conclusion = 'ECHEC'
                AND NOT EXISTS (SELECT 1 FROM b_eval_coaching co WHERE co.id_evaluation = e.id AND co.statut = 'TERMINE')) AS coaching_a_faire
       FROM b_evaluation e
      WHERE COALESCE(e.actif, 1) = 1
        AND DATE(COALESCE(e.date_evaluation, e.date_creation)) BETWEEN ? AND ? AND ${fe.sql}`,
    [per.du, per.au, ...fe.params]
  );
  const terminees = Number(r.terminees) || 0;
  return {
    terminees,
    en_cours: Number(r.en_cours) || 0,
    reussite: ratio(r.succes, terminees),
    approbation_en_attente: ratio(r.sans_approbation, terminees),
    coaching_a_faire: Number(r.coaching_a_faire) || 0,
  };
};

/* --------------------------------------------------------------------- */
/* Quiz                                                                   */
/* --------------------------------------------------------------------- */
const blocQuiz = async (per, ctx) => {
  const fu = filtreUtilisateur(ctx.perimetre, "u");
  const [[t]] = await db.query(
    `SELECT COUNT(*) AS n, SUM(t.reussi = 1) AS ok,
            SUM(t.num_essai = 1) AS n1, SUM(t.num_essai = 1 AND t.reussi = 1) AS ok1,
            COUNT(DISTINCT t.id_UTILISATEUR) AS participants
       FROM b_qz_tentative t JOIN B_UTILISATEUR u ON u.id = t.id_UTILISATEUR
      WHERE t.statut IS NOT NULL AND DATE(COALESCE(t.date_fin, t.date_tentative)) BETWEEN ? AND ? AND ${fu.sql}`,
    [per.du, per.au, ...fu.params]
  );
  const [[o]] = await db.query(
    `SELECT COUNT(DISTINCT q.id) AS n FROM B_QZ_QUIZ q
       JOIN B_QZ_PARTICIPANT pa ON pa.id_Quiz = q.id JOIN B_UTILISATEUR u ON u.id = pa.id_UTILISATEUR
      WHERE q.statut = 'ACTIF' AND q.Etat = 'OUVERT' AND (q.date_fermeture IS NULL OR q.date_fermeture > NOW()) AND ${fu.sql}`,
    fu.params
  );
  // Agents dont le dernier essai sur un quiz ouvert est un échec, sans retest accordé.
  const [[e]] = await db.query(
    `SELECT COUNT(*) AS n FROM (
        SELECT t.id_Quiz, t.id_UTILISATEUR FROM b_qz_tentative t
          JOIN B_QZ_QUIZ q ON q.id = t.id_Quiz AND q.statut = 'ACTIF' AND q.Etat = 'OUVERT'
          JOIN B_UTILISATEUR u ON u.id = t.id_UTILISATEUR
         WHERE t.statut IS NOT NULL AND ${fu.sql}
           AND t.num_essai = (SELECT MAX(t2.num_essai) FROM b_qz_tentative t2 WHERE t2.id_Quiz = t.id_Quiz AND t2.id_UTILISATEUR = t.id_UTILISATEUR AND t2.statut IS NOT NULL)
           AND t.reussi = 0
           AND NOT EXISTS (SELECT 1 FROM b_qz_retest r WHERE r.id_Quiz = t.id_Quiz AND r.id_UTILISATEUR = t.id_UTILISATEUR AND COALESCE(r.consomme, 0) = 0)
         GROUP BY t.id_Quiz, t.id_UTILISATEUR) z`,
    fu.params
  );
  return {
    quiz_ouverts: Number(o.n) || 0,
    tentatives: Number(t.n) || 0,
    participants: Number(t.participants) || 0,
    reussite: ratio(t.ok, t.n),
    reussite_premier_essai: ratio(t.ok1, t.n1),
    echecs_sans_retest: Number(e.n) || 0,
  };
};

/* --------------------------------------------------------------------- */
/* Sondages                                                               */
/* --------------------------------------------------------------------- */
const blocSondages = async (per, ctx) => {
  const fu = filtreUtilisateur(ctx.perimetre, "u");
  const [[r]] = await db.query(
    `SELECT COUNT(DISTINCT s.id) AS actifs, COUNT(*) AS cibles,
            SUM(EXISTS (SELECT 1 FROM B_SD_PASSATION p WHERE p.id_Sondage = s.id AND p.id_UTILISATEUR = c.id_UTILISATEUR AND p.termine = 1)) AS repondu
       FROM B_SD_SONDAGE s JOIN B_SD_CIBLE c ON c.id_Sondage = s.id JOIN B_UTILISATEUR u ON u.id = c.id_UTILISATEUR
      WHERE s.statut = 'ACTIF' AND ${fu.sql}`,
    fu.params
  );
  const [[p]] = await db.query(
    `SELECT COUNT(*) AS n FROM B_SD_PASSATION p LEFT JOIN B_UTILISATEUR u ON u.id = p.id_UTILISATEUR
      WHERE p.termine = 1 AND DATE(p.date_fin) BETWEEN ? AND ?
        AND ${ctx.perimetre.type === "global" ? "1=1" : fu.sql}`,
    [per.du, per.au, ...(ctx.perimetre.type === "global" ? [] : fu.params)]
  );
  return {
    sondages_actifs: Number(r.actifs) || 0,
    reponse_cibles: ratio(r.repondu, r.cibles),
    reponses_periode: Number(p.n) || 0,
  };
};

/* --------------------------------------------------------------------- */
/* Calibrage                                                              */
/* --------------------------------------------------------------------- */
const blocCalibrage = async (per, ctx) => {
  const p = ctx.perimetre;
  // Les sessions sont rattachées à un site : « Mon équipe » se ramène au site de l'utilisateur.
  const site = p.type === "site" ? p.idSite : p.type === "equipe" ? ctx.idSite : null;
  const w = site == null ? (p.type === "global" ? "1=1" : "1=0") : "s.id_site = ?";
  const params = site == null ? [] : [site];
  const [[r]] = await db.query(
    `SELECT SUM(s.statut = 'BROUILLON') AS brouillons,
            SUM(s.statut IN ('OUVERTE','RESULTATS_EN_REVISION')) AS en_cours,
            SUM(s.statut = 'CLOTUREE' AND DATE(s.dateCloture) BETWEEN ? AND ?) AS cloturees
       FROM b_cal_session s WHERE ${w}`,
    [per.du, per.au, ...params]
  );
  const [[q]] = await db.query(
    `SELECT COUNT(*) AS n, SUM(cp.statut_participation = 'CLOSE') AS ok
       FROM b_cal_participant cp JOIN b_cal_session s ON s.id = cp.id_session
      WHERE (s.statut IN ('OUVERTE','RESULTATS_EN_REVISION') OR (s.statut = 'CLOTUREE' AND DATE(s.dateCloture) BETWEEN ? AND ?)) AND ${w}`,
    [per.du, per.au, ...params]
  );
  return {
    perimetre_site: p.type === "equipe",
    en_preparation: Number(r.brouillons) || 0,
    en_cours: Number(r.en_cours) || 0,
    cloturees: Number(r.cloturees) || 0,
    participation: ratio(q.ok, q.n),
  };
};

/* --------------------------------------------------------------------- */
/* Répartition par site (périmètre « Tous les sites »)                   */
/* --------------------------------------------------------------------- */
const parSite = async (per, ctx, lectures) => {
  const [sites] = await db.query("SELECT id, nom FROM B_SITE ORDER BY nom");
  const lignes = new Map(sites.map((s) => [Number(s.id), { id: Number(s.id), nom: s.nom }]));
  if (lectures) {
    for (const l of lectures) {
      const x = lignes.get(Number(l.id_Site));
      if (x) x.lecture = ratio(l.lus, l.cibles);
    }
  }
  if (ctx.droits.evaluations) {
    const [ev] = await db.query(
      `SELECT e.id_site, SUM(e.statut = 'TERMINE') AS n, SUM(e.statut = 'TERMINE' AND e.conclusion = 'SUCCES') AS ok
         FROM b_evaluation e
        WHERE COALESCE(e.actif, 1) = 1
          AND DATE(COALESCE(e.date_evaluation, e.date_creation)) BETWEEN ? AND ?
        GROUP BY e.id_site`,
      [per.du, per.au]
    );
    for (const r of ev) {
      const x = lignes.get(Number(r.id_site));
      if (x) { x.evaluations = Number(r.n) || 0; x.reussite_evaluations = ratio(r.ok, r.n); }
    }
  }
  if (ctx.droits.quiz) {
    const [qz] = await db.query(
      `SELECT u.id_Site, COUNT(*) AS n, SUM(t.reussi = 1) AS ok
         FROM b_qz_tentative t JOIN B_UTILISATEUR u ON u.id = t.id_UTILISATEUR
        WHERE t.statut IS NOT NULL AND DATE(COALESCE(t.date_fin, t.date_tentative)) BETWEEN ? AND ?
        GROUP BY u.id_Site`,
      [per.du, per.au]
    );
    for (const r of qz) {
      const x = lignes.get(Number(r.id_Site));
      if (x) x.reussite_quiz = ratio(r.ok, r.n);
    }
  }
  return [...lignes.values()];
};

/** GET /tableau-de-bord?du=YYYY-MM-DD&au=YYYY-MM-DD&perimetre=global|site:<id>|equipe&mes_fiches=1 */
/* --------------------------------------------------------------------- */
/* Cache court : revenir sur un filtre déjà consulté est immédiat.        */
/* --------------------------------------------------------------------- */
const DUREE_CACHE_MS = 2 * 60 * 1000;
const MAX_ENTREES_CACHE = 300;
const cache = new Map(); // clé -> { expire, valeur }
const lireCache = (cle) => {
  const e = cache.get(cle);
  if (!e) return null;
  if (e.expire < Date.now()) { cache.delete(cle); return null; }
  return e.valeur;
};
const ecrireCache = (cle, valeur) => {
  if (cache.size >= MAX_ENTREES_CACHE) {
    const maintenant = Date.now();
    for (const [k, v] of cache) if (v.expire < maintenant) cache.delete(k);
    while (cache.size >= MAX_ENTREES_CACHE) cache.delete(cache.keys().next().value);
  }
  cache.set(cle, { expire: Date.now() + DUREE_CACHE_MS, valeur });
};

/** GET /tableau-de-bord?du=YYYY-MM-DD&au=YYYY-MM-DD&perimetre=global|site:<id>|equipe&mes_fiches=1&actualiser=1 */
const getTableauDeBord = async (req, res) => {
  try {
    const ctx = await contexte(req.auth.userId, req.query);
    if (!ctx) return res.status(403).json({ message: "Accès refusé : habilitation manquante (tableau_de_bord.voir)." });
    const per = periode(req.query);
    const mesFiches = String(req.query.mes_fiches || "") === "1" && ctx.auteurFiches;
    // La clé reprend tout ce qui change le résultat : utilisateur, droits, périmètre, période.
    const cle = JSON.stringify([ctx.userId, ctx.perimetre && ctx.perimetre.code, per.du, per.au, mesFiches, ctx.droits]);
    if (String(req.query.actualiser || "") !== "1") {
      const enCache = lireCache(cle);
      if (enCache) return res.status(200).json({ ...enCache, depuis_cache: true });
    }
    const base = {
      periode: per,
      perimetre: ctx.perimetre ? { code: ctx.perimetre.code, libelle: ctx.perimetre.libelle, type: ctx.perimetre.type } : null,
      options_perimetre: ctx.options,
      vision_globale: ctx.visionGlobale,
      auteur_fiches: ctx.auteurFiches && ctx.droits.baseco,
      mes_fiches: mesFiches,
    };
    // Aucun périmètre possible (ni site ni équipe) : rien à afficher.
    if (!ctx.perimetre) return res.status(200).json({ ...base, blocs: {}, calcule_le: new Date().toISOString() });

    // Lecture Baseco calculée une seule fois (total et répartition par site), en parallèle
    // des autres blocs ; Baseco et la répartition par site l'attendent.
    const lectures = ctx.droits.baseco ? lectureParSite(per, ctx, mesFiches) : Promise.resolve(null);
    lectures.catch(() => {}); // l'erreur éventuelle est remontée par Promise.all ci-dessous
    const global = ctx.perimetre.type === "global";
    const [baseco, evaluations, quiz, sondages, calibrage, par_site] = await Promise.all([
      ctx.droits.baseco ? lectures.then((l) => blocBaseco(per, ctx, mesFiches, l)) : null,
      ctx.droits.evaluations ? blocEvaluations(per, ctx) : null,
      ctx.droits.quiz ? blocQuiz(per, ctx) : null,
      ctx.droits.sondages ? blocSondages(per, ctx) : null,
      ctx.droits.calibrage ? blocCalibrage(per, ctx) : null,
      global ? lectures.then((l) => parSite(per, ctx, l)) : null,
    ]);
    const blocs = {};
    if (baseco) blocs.baseco = baseco;
    if (evaluations) blocs.evaluations = evaluations;
    if (quiz) blocs.quiz = quiz;
    if (sondages) blocs.sondages = sondages;
    if (calibrage) blocs.calibrage = calibrage;
    const valeur = { ...base, blocs, par_site, calcule_le: new Date().toISOString() };
    ecrireCache(cle, valeur);
    return res.status(200).json(valeur);
  } catch (e) {
    console.error("tableau de bord:", e);
    return res.status(500).json({ message: "Erreur lors du calcul du tableau de bord." });
  }
};

module.exports = { getTableauDeBord, _interne: { contexte, ratio, periode, cache } };
