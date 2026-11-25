// =====================================================================
// TABLEAU DE BORD — indicateurs par périmètre et par période.
//
// Accès : permission tableau_de_bord.voir (R_ADMI toujours). Chaque section a sa
// propre permission, indépendante des droits de gestion des modules (réglable par
// rôle dans la matrice des droits et par personne dans « Droits par utilisateur ») :
//   tableau_de_bord.baseco | .evaluations | .quiz | .sondages | .calibrage
//   | .coaching (suivi du coaching) | .plans_actions (suivi des plans d'actions)
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
const { sqlRetestADecider } = require("../utils/retestQuiz");

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

/**
 * Période de comparaison (écarts affichés sur les tuiles, out130) :
 *  - du 1er d'un mois à un jour du même mois (« Ce mois », « Mois dernier ») :
 *    mêmes jours du mois précédent (1er au 25 octobre pour 1er au 25 novembre) ;
 *  - du 1er janvier à un jour de la même année (« Cette année ») : même période
 *    de l'année précédente ;
 *  - sinon : période de même durée juste avant.
 */
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const MOIS_COURT = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const periodePrecedente = (per) => {
  const p2 = (n) => String(n).padStart(2, "0");
  const iso = (d) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
  const lire = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const fr = (s) => s.slice(8, 10) + "/" + s.slice(5, 7);
  const du = lire(per.du), au = lire(per.au);
  const finMois = (y, m) => new Date(y, m + 1, 0).getDate();
  if (du.getDate() === 1 && du.getFullYear() === au.getFullYear() && du.getMonth() === au.getMonth()) {
    const y = du.getMonth() === 0 ? du.getFullYear() - 1 : du.getFullYear();
    const m = (du.getMonth() + 11) % 12;
    const j = Math.min(au.getDate(), finMois(y, m));
    const r = { du: iso(new Date(y, m, 1)), au: iso(new Date(y, m, j)) };
    const complet = j === finMois(y, m);
    return { ...r, court: MOIS_COURT[m], libelle: `${MOIS[m]} ${y}` + (complet ? "" : ` (du ${fr(r.du)} au ${fr(r.au)})`) };
  }
  if (du.getDate() === 1 && du.getMonth() === 0 && du.getFullYear() === au.getFullYear()) {
    const y = du.getFullYear() - 1;
    const j = Math.min(au.getDate(), finMois(y, au.getMonth()));
    const r = { du: iso(new Date(y, 0, 1)), au: iso(new Date(y, au.getMonth(), j)) };
    return { ...r, court: String(y), libelle: `${y} (du ${fr(r.du)} au ${fr(r.au)})` };
  }
  const jours = Math.round((au - du) / 86400000) + 1;
  const pau = new Date(du.getFullYear(), du.getMonth(), du.getDate() - 1);
  const pdu = new Date(pau.getFullYear(), pau.getMonth(), pau.getDate() - (jours - 1));
  const r = { du: iso(pdu), au: iso(pau) };
  return { ...r, court: "pér. préc.", libelle: `période précédente (du ${fr(r.du)}/${r.du.slice(0, 4)} au ${fr(r.au)}/${r.au.slice(0, 4)})` };
};

/** Valeurs de la période de comparaison : seulement les indicateurs qui dépendent de la période. */
const valeursPrecedentes = async (prec, ctx, mesFiches) => {
  const taux = (r) => (r ? r.taux : null);
  const lectures = ctx.droits.baseco ? lectureParSite(prec, ctx, mesFiches) : Promise.resolve(null);
  lectures.catch(() => {});
  const [b, e, q, s, c, co, pa] = await Promise.all([
    ctx.droits.baseco ? lectures.then((l) => blocBaseco(prec, ctx, mesFiches, l)) : null,
    ctx.droits.evaluations ? blocEvaluations(prec, ctx) : null,
    ctx.droits.quiz ? blocQuiz(prec, ctx) : null,
    ctx.droits.sondages ? blocSondages(prec, ctx) : null,
    ctx.droits.calibrage ? blocCalibrage(prec, ctx) : null,
    ctx.droits.coaching ? blocCoaching(prec, ctx) : null,
    ctx.droits.plans_actions ? blocPlansActions(prec, ctx) : null,
  ]);
  const v = {};
  if (b) Object.assign(v, {
    "baseco.fiches_publiees": b.fiches_publiees, "baseco.lecture": taux(b.lecture), "baseco.lecture_j": taux(b.lecture_j),
    "baseco.lecture_j2": taux(b.lecture_j2), "baseco.utilite": taux(b.utilite), "baseco.exactitude": taux(b.exactitude),
    "baseco.ponctualite": taux(b.ponctualite), "baseco.maitrise_premier_essai": taux(b.maitrise_premier_essai),
    "baseco.reussite_apres_retest": taux(b.reussite_apres_retest),
  });
  if (e) Object.assign(v, {
    "evaluations.terminees": e.terminees, "evaluations.reussite": taux(e.reussite),
    "evaluations.approbation_en_attente": e.approbation_en_attente.num, "evaluations.coaching_a_faire": e.coaching_a_faire,
  });
  if (co) Object.assign(v, { "coaching.a_faire": co.a_faire, "coaching.termines": co.termines });
  if (pa) Object.assign(v, { "plans_actions.realisees": pa.realisees });
  if (q) Object.assign(v, { "quiz.tentatives": q.tentatives, "quiz.reussite": taux(q.reussite), "quiz.reussite_premier_essai": taux(q.reussite_premier_essai) });
  if (s) Object.assign(v, { "sondages.reponses_periode": s.reponses_periode });
  if (c) Object.assign(v, { "calibrage.cloturees": c.cloturees });
  return v;
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
  // Programme (out124) : programmes ayant au moins un utilisateur actif dans le périmètre.
  let optionsProgramme = [];
  if (perimetre) {
    const fu = filtreUtilisateur(perimetre, "u");
    const [pr] = await db.query(
      `SELECT p.id, p.nom, COUNT(*) AS n FROM B_UTILISATEUR u JOIN B_PROGRAMME p ON p.id = u.id_Programme
        WHERE u.status = 'ACTIF' AND ${fu.sql} GROUP BY p.id, p.nom ORDER BY p.nom`, fu.params);
    optionsProgramme = pr.map((x) => ({ id: Number(x.id), nom: x.nom, utilisateurs: Number(x.n) || 0 }));
    const idProg = Number(q.programme);
    const prog = Number.isInteger(idProg) ? optionsProgramme.find((o) => o.id === idProg) : null;
    if (prog) { perimetre.idProgramme = prog.id; perimetre.programme = prog.nom; }
  }
  const [[me]] = await db.query("SELECT COUNT(*) AS n FROM B_FICHE WHERE id_gestionnaire = ?", [userId]);
  return {
    userId: Number(userId),
    admin,
    visionGlobale,
    idSite,
    agents,
    options,
    optionsProgramme,
    perimetre,
    auteurFiches: Number(me.n) > 0,
    droits: {
      baseco: a("tableau_de_bord.baseco"),
      evaluations: a("tableau_de_bord.evaluations"),
      quiz: a("tableau_de_bord.quiz"),
      sondages: a("tableau_de_bord.sondages"),
      calibrage: a("tableau_de_bord.calibrage"),
      coaching: a("tableau_de_bord.coaching"),
      plans_actions: a("tableau_de_bord.plans_actions"),
    },
  };
};

/**
 * Filtre SQL sur un utilisateur (alias) selon le périmètre et, sauf sansProgramme,
 * le programme choisi (programme ACTUEL de l'utilisateur, out124).
 */
const filtreUtilisateur = (p, alias, sansProgramme = false) => {
  const base = (() => {
    if (!p || p.type === "global") return { sql: "1=1", params: [] };
    if (p.type === "site") return { sql: `${alias}.id_Site = ?`, params: [p.idSite] };
    if (!p.agents.length) return { sql: "1=0", params: [] };
    return { sql: `${alias}.id IN (${p.agents.map(() => "?").join(",")})`, params: p.agents };
  })();
  if (sansProgramme || !p || !p.idProgramme) return base;
  return { sql: `(${base.sql} AND ${alias}.id_Programme = ?)`, params: [...base.params, p.idProgramme] };
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

/* Taux de lecture (out124)
 * ---------------------------------------------------------------------
 * Pour chaque chargement de la période (date de mise à disposition = PUB) :
 *  - « Lecture » (couverture actuelle) : destinataires = utilisateurs actifs
 *    ciblés (site ET fonction), du périmètre / programme, hors auteur, y compris
 *    les nouveaux arrivants ; lectures à n'importe quelle date. Chargement
 *    ARCHIVÉ : figé à l'archivage (comptes créés au plus tard ce jour-là,
 *    lectures faites avant l'archivage).
 *  - « Lecture le jour J » / « sous 2 jours » : destinataires = les mêmes, mais
 *    dont le compte existait le jour de la mise à disposition (créé au plus tard
 *    ce jour ; sans date de création = ancien compte) ; première lecture au plus
 *    tard J / J+2 (jours calendaires). Calcul en direct : un chargement encore
 *    dans son délai compte avec les lectures déjà faites (« en délai »).
 * Le site, la fonction et le programme sont ceux d'aujourd'hui (pas d'historique).
 * Dénominateurs calculés en mémoire : utilisateurs du périmètre regroupés par
 * (site, fonction), dates de création triées (recherche dichotomique).
 */
const JOUR = (d) => (d == null ? null : (d instanceof Date ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` : String(d).slice(0, 10)));
const ajouterJours = (iso, n) => {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + n);
  return JOUR(d);
};
/** Nombre d'éléments de `tri` (dates ISO triées, null = ancien compte en tête) <= borne. */
const nbJusqua = (tri, borne) => {
  let lo = 0, hi = tri.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (tri[mid] === null || tri[mid] <= borne) lo = mid + 1; else hi = mid;
  }
  return lo;
};
const listeAcces = (v) => {
  const t = String(v || "").replace(/\s+/g, "");
  if (t.toUpperCase() === "ALL") return null; // tous
  return new Set(t.split(",").filter(Boolean).map(Number));
};

const lectureParSite = async (per, ctx, mesFiches) => {
  const ff = filtreFiches(per, ctx, mesFiches);
  const fu = filtreUtilisateur(ctx.perimetre, "u");
  const [[fiches], [users], [num], [[auj]]] = await Promise.all([
    db.query(
      `SELECT f.id, f.titre, f.id_gestionnaire, f.AccesSite, f.AccesProfil, f.ETAT AS etat,
              DATE_FORMAT(${PUB}, '%Y-%m-%d') AS jour_pub,
              CASE WHEN f.ETAT = 'ARCHIVE' AND f.date_Archive IS NOT NULL THEN DATE_FORMAT(f.date_Archive, '%Y-%m-%d') END AS jour_archive
         FROM B_FICHE f WHERE ${ff.sql}`,
      ff.params
    ),
    db.query(
      `SELECT u.id, u.id_Site, u.id_Fonction, DATE_FORMAT(u.dateCreation, '%Y-%m-%d') AS cree
         FROM B_UTILISATEUR u WHERE u.status = 'ACTIF' AND ${fu.sql}`,
      fu.params
    ),
    // Lectures : première consultation de chaque (chargement, destinataire ciblé aujourd'hui).
    db.query(
      `SELECT x.id_FICHE, u.id_Site,
              SUM(f.ETAT <> 'ARCHIVE' OR f.date_Archive IS NULL
                  OR (DATE(x.lu) <= GREATEST(DATE(f.date_Archive), DATE(x.pub))
                      AND (u.dateCreation IS NULL OR DATE(u.dateCreation) <= GREATEST(DATE(f.date_Archive), DATE(x.pub))))) AS lus,
              SUM((u.dateCreation IS NULL OR DATE(u.dateCreation) <= DATE(x.pub)) AND DATE(x.lu) <= DATE(x.pub)) AS lus_j,
              SUM((u.dateCreation IS NULL OR DATE(u.dateCreation) <= DATE(x.pub)) AND DATE(x.lu) <= DATE(x.pub) + INTERVAL 2 DAY) AS lus_j2
         FROM (SELECT h.id_FICHE, h.id_UTILISATEUR, MIN(h.dateConsultation) AS lu, MIN(${PUB}) AS pub
                 FROM B_HISTORIQUE h JOIN B_FICHE f ON f.id = h.id_FICHE
                WHERE ${ff.sql}
                GROUP BY h.id_FICHE, h.id_UTILISATEUR) x
         JOIN B_FICHE f ON f.id = x.id_FICHE
         JOIN B_UTILISATEUR u ON u.id = x.id_UTILISATEUR AND u.status = 'ACTIF' AND u.id <> f.id_gestionnaire AND ${CIBLE("u")}
        WHERE ${fu.sql}
        GROUP BY x.id_FICHE, u.id_Site`,
      [...ff.params, ...fu.params]
    ),
    db.query(`SELECT DATE_FORMAT(CURDATE(), '%Y-%m-%d') AS j`),
  ]);
  const aujourdhui = auj.j;

  // Utilisateurs du périmètre par (site, fonction) : dates de création triées.
  const groupes = new Map();
  const parId = new Map();
  for (const u of users) {
    parId.set(Number(u.id), u);
    const k = `${u.id_Site}|${u.id_Fonction}`;
    if (!groupes.has(k)) groupes.set(k, { site: u.id_Site == null ? null : Number(u.id_Site), fonction: u.id_Fonction == null ? null : Number(u.id_Fonction), dates: [] });
    groupes.get(k).dates.push(u.cree || null);
  }
  for (const g of groupes.values()) g.dates.sort((a, b) => (a === b ? 0 : a === null ? -1 : b === null ? 1 : a < b ? -1 : 1));

  const lignesSite = new Map();
  const ligne = (id) => {
    const k = id == null ? "null" : String(id);
    if (!lignesSite.has(k)) lignesSite.set(k, { id_Site: id == null ? null : Number(id), cibles: 0, lus: 0, cibles_pub: 0, lus_j: 0, lus_j2: 0 });
    return lignesSite.get(k);
  };
  const stats = new Map(); // par chargement
  for (const f of fiches) {
    const sites = listeAcces(f.AccesSite);
    const profils = listeAcces(f.AccesProfil);
    const cible = (site, fonction) => (sites === null || sites.has(Number(site))) && (profils === null || profils.has(Number(fonction)));
    // Couverture figée à l'archivage (jamais avant la mise à disposition).
    const finLecture = f.jour_archive ? (f.jour_archive > f.jour_pub ? f.jour_archive : f.jour_pub) : null;
    const st = { id: Number(f.id), titre: f.titre, jour_pub: f.jour_pub, archive: !!f.jour_archive, cibles: 0, lus: 0, cibles_pub: 0, lus_j: 0, lus_j2: 0 };
    for (const g of groupes.values()) {
      if (!cible(g.site, g.fonction)) continue;
      const nActuel = finLecture ? nbJusqua(g.dates, finLecture) : g.dates.length;
      const nPub = nbJusqua(g.dates, f.jour_pub);
      const l = ligne(g.site);
      l.cibles += nActuel; l.cibles_pub += nPub;
      st.cibles += nActuel; st.cibles_pub += nPub;
    }
    // L'auteur ne fait pas partie de ses propres destinataires.
    const auteur = parId.get(Number(f.id_gestionnaire));
    if (auteur && cible(auteur.id_Site, auteur.id_Fonction)) {
      const l = ligne(auteur.id_Site);
      const avant = (borne) => !auteur.cree || auteur.cree <= borne;
      if (!finLecture || avant(finLecture)) { l.cibles--; st.cibles--; }
      if (avant(f.jour_pub)) { l.cibles_pub--; st.cibles_pub--; }
    }
    stats.set(st.id, st);
  }
  for (const r of num) {
    const l = ligne(r.id_Site);
    const st = stats.get(Number(r.id_FICHE));
    for (const k of ["lus", "lus_j", "lus_j2"]) {
      const v = Number(r[k]) || 0;
      l[k] += v;
      if (st) st[k] += v;
    }
  }

  // Chargements encore dans leur délai (jour J ou J+2 pas encore terminé).
  const limiteJ2 = ajouterJours(aujourdhui, -2);
  const liste = [...stats.values()].filter((s) => s.cibles > 0 || s.cibles_pub > 0);
  const enDelaiJ = liste.filter((s) => s.cibles_pub > 0 && s.jour_pub === aujourdhui).length;
  const enDelaiJ2 = liste.filter((s) => s.cibles_pub > 0 && s.jour_pub >= limiteJ2 && s.jour_pub <= aujourdhui).length;
  const taux = (a, b) => (b > 0 ? Math.round((1000 * a) / b) / 10 : null);
  const aRelancer = liste
    .filter((s) => s.cibles_pub > 0 && s.jour_pub >= limiteJ2 && s.jour_pub <= aujourdhui)
    .map((s) => {
      const restant = Math.round((new Date(ajouterJours(s.jour_pub, 2) + "T12:00:00") - new Date(aujourdhui + "T12:00:00")) / 86400000);
      return { id: s.id, titre: s.titre, jour_pub: s.jour_pub, destinataires: s.cibles_pub, lus: s.lus_j2, taux: taux(s.lus_j2, s.cibles_pub),
        jour_j_en_cours: s.jour_pub === aujourdhui, jours_restants_j2: restant };
    })
    .sort((a, b) => (a.taux ?? 0) - (b.taux ?? 0) || b.destinataires - a.destinataires)
    .slice(0, 10);
  const moinsLues = liste
    .filter((s) => s.cibles > 0 && s.jour_pub < limiteJ2)
    .map((s) => ({ id: s.id, titre: s.titre, jour_pub: s.jour_pub, archive: s.archive, destinataires: s.cibles, lus: s.lus,
      taux: taux(s.lus, s.cibles), taux_j2: taux(s.lus_j2, s.cibles_pub) }))
    .sort((a, b) => (a.taux ?? 0) - (b.taux ?? 0) || b.destinataires - a.destinataires)
    .slice(0, 10);
  return { parSite: [...lignesSite.values()], enDelaiJ, enDelaiJ2, aRelancer, moinsLues };
};

const blocBaseco = async (per, ctx, mesFiches, lectures) => {
  const ff = filtreFiches(per, ctx, mesFiches);
  const fu = filtreUtilisateur(ctx.perimetre, "u");
  // Ponctualité : site du gestionnaire qui publie ; le programme ne s'y applique pas.
  const fg = filtreUtilisateur(ctx.perimetre, "g", true);
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
  const l = lectures.parSite.reduce(
    (t, x) => ({ cibles: t.cibles + x.cibles, lus: t.lus + x.lus, cibles_pub: t.cibles_pub + x.cibles_pub,
      lus_j: t.lus_j + x.lus_j, lus_j2: t.lus_j2 + x.lus_j2 }),
    { cibles: 0, lus: 0, cibles_pub: 0, lus_j: 0, lus_j2: 0 }
  );
  const o = ponct ? ponct[0][0] : null;
  return {
    fiches_publiees: Number(pub.n) || 0,
    lecture: ratio(l.lus, l.cibles),
    lecture_j: ratio(l.lus_j, l.cibles_pub),
    lecture_j2: ratio(l.lus_j2, l.cibles_pub),
    en_delai_j: lectures.enDelaiJ,
    en_delai_j2: lectures.enDelaiJ2,
    a_relancer: lectures.aRelancer,
    moins_lues: lectures.moinsLues,
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
/** Filtre SQL sur les évaluations : périmètre + programme enregistré sur l'évaluation (out124). */
const filtreEvaluations = (p) => {
  const base = (() => {
    if (p.type === "global") return { sql: "1=1", params: [] };
    if (p.type === "site") return { sql: "e.id_site = ?", params: [p.idSite] };
    if (!p.agents.length) return { sql: "1=0", params: [] };
    return { sql: `e.id_agent IN (${p.agents.map(() => "?").join(",")})`, params: p.agents };
  })();
  if (!p.idProgramme) return base;
  return { sql: `(${base.sql} AND e.id_programme = ?)`, params: [...base.params, p.idProgramme] };
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
/* Suivi du coaching (tableau_de_bord.coaching)                           */
/* --------------------------------------------------------------------- */
// Évaluations terminées en échec sur la période et le périmètre, selon l'état
// de leur coaching : à faire (pas commencé), en cours, terminé.
const blocCoaching = async (per, ctx) => {
  const fe = filtreEvaluations(ctx.perimetre);
  const [[r]] = await db.query(
    `SELECT SUM(co.id IS NULL) AS a_faire,
            SUM(co.id IS NOT NULL AND co.statut <> 'TERMINE') AS en_cours,
            SUM(co.statut = 'TERMINE') AS termines
       FROM b_evaluation e
       LEFT JOIN (SELECT id_evaluation, MAX(id) AS id FROM b_eval_coaching GROUP BY id_evaluation) cm
              ON cm.id_evaluation = e.id
       LEFT JOIN b_eval_coaching co ON co.id = cm.id
      WHERE COALESCE(e.actif, 1) = 1 AND e.statut = 'TERMINE' AND e.conclusion = 'ECHEC'
        AND DATE(COALESCE(e.date_evaluation, e.date_creation)) BETWEEN ? AND ? AND ${fe.sql}`,
    [per.du, per.au, ...fe.params]
  );
  return { a_faire: Number(r.a_faire) || 0, en_cours: Number(r.en_cours) || 0, termines: Number(r.termines) || 0 };
};

/* --------------------------------------------------------------------- */
/* Suivi des plans d'actions (tableau_de_bord.plans_actions)              */
/* --------------------------------------------------------------------- */
// Actions du périmètre : en cours / en retard / échéance proche = état actuel ;
// réalisées = réalisées sur la période. (Porteur obligatoire depuis out106.)
const blocPlansActions = async (per, ctx) => {
  const { sqlRealisee, sqlClose } = require("../utils/planAction");
  const { SQL_EN_RETARD, SQL_ECHEANCE_PROCHE } = require("./evalSuites.Controllers");
  const fe = filtreEvaluations(ctx.perimetre);
  const [[r]] = await db.query(
    `SELECT SUM(NOT ${sqlClose()}) AS en_cours,
            SUM(${SQL_EN_RETARD}) AS en_retard,
            SUM(${SQL_ECHEANCE_PROCHE}) AS echeance_proche,
            SUM(${sqlRealisee()} AND DATE(l.date_realisation) BETWEEN ? AND ?) AS realisees
       FROM b_eval_plan_action_ligne l
       JOIN b_evaluation e ON e.id = l.id_evaluation
       LEFT JOIN b_eval_ref_statut_pa st ON st.id = l.id_statut
      WHERE COALESCE(e.actif, 1) = 1 AND ${fe.sql}`,
    [per.du, per.au, ...fe.params]
  );
  const v = (x) => Number(x) || 0;
  return { en_cours: v(r.en_cours), en_retard: v(r.en_retard), echeance_proche: v(r.echeance_proche), realisees: v(r.realisees) };
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
  // Agents dont le dernier essai sur un quiz ouvert est un échec qui attend une décision
  // de retest (mêmes règles que la page « Retests à autoriser »), sans retest accordé.
  const [[e]] = await db.query(
    `SELECT COUNT(*) AS n FROM (
        SELECT t.id_Quiz, t.id_UTILISATEUR FROM b_qz_tentative t
          JOIN B_QZ_QUIZ q ON q.id = t.id_Quiz AND q.statut = 'ACTIF' AND q.Etat = 'OUVERT'
          JOIN B_UTILISATEUR u ON u.id = t.id_UTILISATEUR
         WHERE t.statut IS NOT NULL AND ${fu.sql}
           AND t.num_essai = (SELECT MAX(t2.num_essai) FROM b_qz_tentative t2 WHERE t2.id_Quiz = t.id_Quiz AND t2.id_UTILISATEUR = t.id_UTILISATEUR AND t2.statut IS NOT NULL)
           AND t.reussi = 0
           AND ${sqlRetestADecider("t", "q")}
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
        AND ${fu.sql}`,
    [per.du, per.au, ...fu.params]
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
    // Une session n'est pas rattachée à un programme : le filtre Programme ne s'y applique pas.
    programme_non_applique: !!p.idProgramme,
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
    for (const l of lectures.parSite) {
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
          ${ctx.perimetre.idProgramme ? "AND e.id_programme = ?" : ""}
        GROUP BY e.id_site`,
      [per.du, per.au, ...(ctx.perimetre.idProgramme ? [ctx.perimetre.idProgramme] : [])]
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
          ${ctx.perimetre.idProgramme ? "AND u.id_Programme = ?" : ""}
        GROUP BY u.id_Site`,
      [per.du, per.au, ...(ctx.perimetre.idProgramme ? [ctx.perimetre.idProgramme] : [])]
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

/** GET /tableau-de-bord?du=YYYY-MM-DD&au=YYYY-MM-DD&perimetre=global|site:<id>|equipe&programme=<id>&mes_fiches=1&actualiser=1 */
const getTableauDeBord = async (req, res) => {
  try {
    const ctx = await contexte(req.auth.userId, req.query);
    if (!ctx) return res.status(403).json({ message: "Accès refusé : habilitation manquante (tableau_de_bord.voir)." });
    const per = periode(req.query);
    const mesFiches = String(req.query.mes_fiches || "") === "1" && ctx.auteurFiches;
    // La clé reprend tout ce qui change le résultat : utilisateur, droits, périmètre, période.
    const cle = JSON.stringify([ctx.userId, ctx.perimetre && ctx.perimetre.code, ctx.perimetre && ctx.perimetre.idProgramme,
      per.du, per.au, mesFiches, ctx.droits]);
    if (String(req.query.actualiser || "") !== "1") {
      const enCache = lireCache(cle);
      if (enCache) return res.status(200).json({ ...enCache, depuis_cache: true });
    }
    const base = {
      periode: per,
      perimetre: ctx.perimetre ? { code: ctx.perimetre.code, libelle: ctx.perimetre.libelle, type: ctx.perimetre.type } : null,
      options_perimetre: ctx.options,
      options_programme: ctx.optionsProgramme,
      programme: ctx.perimetre && ctx.perimetre.idProgramme ? { id: ctx.perimetre.idProgramme, nom: ctx.perimetre.programme } : null,
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
    const prec = periodePrecedente(per);
    const [baseco, evaluations, quiz, sondages, calibrage, par_site, coaching, plans_actions, precedent] = await Promise.all([
      ctx.droits.baseco ? lectures.then((l) => blocBaseco(per, ctx, mesFiches, l)) : null,
      ctx.droits.evaluations ? blocEvaluations(per, ctx) : null,
      ctx.droits.quiz ? blocQuiz(per, ctx) : null,
      ctx.droits.sondages ? blocSondages(per, ctx) : null,
      ctx.droits.calibrage ? blocCalibrage(per, ctx) : null,
      global ? lectures.then((l) => parSite(per, ctx, l)) : null,
      ctx.droits.coaching ? blocCoaching(per, ctx) : null,
      ctx.droits.plans_actions ? blocPlansActions(per, ctx) : null,
      // Écarts avec la période de comparaison (mêmes filtres)
      valeursPrecedentes(prec, ctx, mesFiches),
    ]);
    const blocs = {};
    if (baseco) blocs.baseco = baseco;
    if (evaluations) blocs.evaluations = evaluations;
    if (quiz) blocs.quiz = quiz;
    if (sondages) blocs.sondages = sondages;
    if (calibrage) blocs.calibrage = calibrage;
    if (coaching) blocs.coaching = coaching;
    if (plans_actions) blocs.plans_actions = plans_actions;
    const valeur = { ...base, blocs, par_site, comparaison: { ...prec, valeurs: precedent }, calcule_le: new Date().toISOString() };
    ecrireCache(cle, valeur);
    return res.status(200).json(valeur);
  } catch (e) {
    console.error("tableau de bord:", e);
    return res.status(500).json({ message: "Erreur lors du calcul du tableau de bord." });
  }
};

module.exports = { getTableauDeBord, _interne: { contexte, ratio, periode, periodePrecedente, cache } };
