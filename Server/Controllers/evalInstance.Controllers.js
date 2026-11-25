// =====================================================================
// Module ÉVALUATION QUALITÉ (cahier) — Évaluations : création (Phase 2)
// F.38bis (choix ressource + résolution grille), F.38ter (champs & état
// initial, création en masse), F.37ter (recopie snapshot immuable).
// Schéma b_evaluation + b_evaluation_categorie/erreur. Endpoints /eval/*.
// =====================================================================
const db = require("../config/db");
const { permissionsEffectives } = require("../middlewares/permission");

const num = (v) => (v === null || v === undefined ? 0 : Number(v));
const applied = (mode, row) =>
  mode === "AUTO" ? num(row.poids_calcule) : num(row.poids_saisi);

const rejet = (message) => { const e = new Error(message); e.rejet = true; return e; };

const withTx = async (fn) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const r = await fn(conn);
    await conn.commit();
    return r;
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
};

// --- résolution de la grille rattachée à un agent (F.38bis B) ---------
const resolveGrilleForAgent = async (conn, agentId) => {
  const [[u]] = await conn.query(
    `SELECT id_EvalGrille, id_Site, id_Programme FROM b_utilisateur WHERE id=?`, [agentId]
  );
  if (!u) throw rejet("Agent introuvable.");
  if (!u.id_EvalGrille) throw rejet("L'agent n'est rattaché à aucune grille d'évaluation.");
  const [[g]] = await conn.query(`SELECT * FROM b_eval_grille WHERE id=?`, [u.id_EvalGrille]);
  if (!g) throw rejet("La grille rattachée à l'agent est introuvable.");
  if (g.statut !== "ACTIVE") throw rejet("La grille rattachée à l'agent n'est pas au statut Active.");
  if (g.type_ressource_cible === "AUTOMATISEE") throw rejet("La grille rattachée à l'agent est de type Automatisée.");
  return { grilleId: g.id, siteId: u.id_Site, programmeId: u.id_Programme, grille: g };
};

// --- contrôle de période (F.38quater C) — permissif si non configuré --
const ensurePeriodeOuverte = async (conn, siteId, dateAppel) => {
  if (!siteId) return;
  const d = new Date(dateAppel);
  if (isNaN(d.getTime())) throw rejet("Date d'appel invalide.");
  const mois = d.getMonth() + 1, annee = d.getFullYear();
  const [rows] = await conn.query(
    `SELECT etat FROM b_eval_calendrier_mois WHERE id_site=? AND mois=? AND annee=?`,
    [siteId, mois, annee]
  );
  if (rows.length && rows[0].etat === "FERME") {
    throw rejet(`La période ${mois}/${annee} est fermée pour votre site : création impossible.`);
  }
};

// --- recopie immuable de la grille dans l'évaluation (F.37ter B) ------
const snapshotGrille = async (conn, evaluationId, grilleId) => {
  const [[grille]] = await conn.query(`SELECT mode_ponderation FROM b_eval_grille WHERE id=?`, [grilleId]);
  const mode = grille.mode_ponderation;
  const [cats] = await conn.query(
    `SELECT * FROM b_eval_categorie_erreur WHERE id_grille=? AND etat='ACTIF' ORDER BY ordre, id`, [grilleId]
  );
  for (const cat of cats) {
    const [catRes] = await conn.query(
      `INSERT INTO b_evaluation_categorie
       (id_evaluation, libelle, poids, seuil_reussite, comparateur, critique, score_obtenu, nb_erreurs_decochees, ordre, id_categorie_origine)
       VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, ?)`,
      [evaluationId, cat.libelle, num(cat.poids), num(cat.seuil_reussite), cat.comparateur, cat.critique, num(cat.ordre), cat.id]
    );
    const catSnapId = catRes.insertId;
    let scoreObtenu = 0;
    const [sousCats] = await conn.query(
      `SELECT * FROM b_eval_sous_categorie_erreur WHERE id_categorie_erreur=? AND etat='ACTIF' ORDER BY id`, [cat.id]
    );
    for (const sc of sousCats) {
      const poidsSC = applied(mode, sc);
      const [errs] = await conn.query(
        `SELECT * FROM b_eval_erreur WHERE id_sous_categorie_erreur=? AND etat='ACTIF' ORDER BY id`, [sc.id]
      );
      for (const e of errs) {
        const poidsErr = applied(mode, e);
        const scorePct = (poidsErr * num(cat.poids)) / 100;
        const scoreSur20 = (scorePct / 100) * 20;
        await conn.query(
          `INSERT INTO b_evaluation_erreur
           (id_evaluation, id_evaluation_categorie, item, sous_item, referentiel, poids, score_pct, score_sur20,
            libelle_sous_categorie, poids_sous_categorie, coche, commentaire, id_erreur_origine, id_sous_categorie_origine)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NULL, ?, ?)`,
          [evaluationId, catSnapId, e.item, e.sous_item, e.referentiel, poidsErr,
           Number(scorePct.toFixed(6)), Number(scoreSur20.toFixed(6)), sc.libelle, poidsSC, e.id, sc.id]
        );
        scoreObtenu += poidsErr;
      }
    }
    await conn.query(`UPDATE b_evaluation_categorie SET score_obtenu=? WHERE id=?`, [Number(scoreObtenu.toFixed(6)), catSnapId]);
  }
};

const getTypeEvaluationId = async (conn, code) => {
  const [[r]] = await conn.query(`SELECT id FROM b_eval_ref_type_evaluation WHERE code=?`, [code]);
  return r ? r.id : null;
};

const getEvaluateurSite = async (conn, evaluateurId) => {
  const [[r]] = await conn.query(`SELECT id_Site FROM b_utilisateur WHERE id=?`, [evaluateurId]);
  return r ? r.id_Site : null;
};

// --- cœur de la création (F.38ter D) ---------------------------------
const creerEvaluationInterne = async (conn, p, evaluateurId, evaluateurSiteId) => {
  const type_ressource = p.type_ressource;
  if (type_ressource !== "HUMAINE" && type_ressource !== "AUTOMATISEE") throw rejet("Type de ressource invalide.");
  if (!p.date_appel) throw rejet("La date d'appel est obligatoire.");
  await ensurePeriodeOuverte(conn, evaluateurSiteId, p.date_appel);

  let grilleId, siteId = null, programmeId = null, natureId = null, agentId = null;
  if (type_ressource === "HUMAINE") {
    if (!p.id_agent) throw rejet("L'agent est obligatoire pour une ressource humaine.");
    if (p.id_grille) throw rejet("La grille n'est pas saisissable pour une ressource humaine.");
    const r = await resolveGrilleForAgent(conn, p.id_agent);
    grilleId = r.grilleId; siteId = r.siteId; programmeId = r.programmeId; agentId = p.id_agent;
  } else {
    if (p.id_agent) throw rejet("L'agent est interdit pour une ressource automatisée.");
    if (!p.id_grille) throw rejet("La grille d'évaluation est obligatoire.");
    if (!p.id_nature_ressource) throw rejet("La nature de la ressource est obligatoire.");
    const [[g]] = await conn.query(`SELECT * FROM b_eval_grille WHERE id=?`, [p.id_grille]);
    if (!g) throw rejet("Grille introuvable.");
    if (g.statut !== "ACTIVE") throw rejet("La grille sélectionnée n'est pas active.");
    if (g.type_ressource_cible !== "AUTOMATISEE") throw rejet("La grille sélectionnée n'est pas de type Automatisée.");
    grilleId = g.id; natureId = p.id_nature_ressource;
  }

  // Une évaluation liée à un parent EST une évaluation supplémentaire (créée via
  // le formulaire normal, ce n'est pas une duplication).
  const typeId = p.id_evaluation_parente
    ? await getTypeEvaluationId(conn, "EVALUATION_SUPPLEMENTAIRE")
    : (p.id_type_evaluation || (await getTypeEvaluationId(conn, "EVALUATION")));
  const [ins] = await conn.query(
    `INSERT INTO b_evaluation
     (type_ressource, id_nature_ressource, id_agent, id_evaluateur, id_site, id_programme,
      id_grille_origine, id_contexte, identifiant_appel, numero_case, numero_appel, motif_appel,
      date_appel, dmt, id_type_evaluation, id_evaluation_parente, nb_supplementaires_attendues,
      statut, conclusion, resolution, synthese, avis_agent, date_creation, date_evaluation, actif)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL,
             'NON_TERMINE', NULL, NULL, NULL, NULL, NOW(), NULL, 1)`,
    [type_ressource, natureId, agentId, evaluateurId, siteId, programmeId, grilleId,
     p.id_contexte || null, p.identifiant_appel || null, p.numero_case || null, p.numero_appel || null,
     p.motif_appel || null, p.date_appel, num(p.dmt), typeId, p.id_evaluation_parente || null]
  );
  const evaluationId = ins.insertId;
  await snapshotGrille(conn, evaluationId, grilleId);
  return evaluationId;
};

// =====================================================================
// ROUTES
// =====================================================================
const createEvaluation = async (req, res) => {
  const evaluateurId = req.auth.userId;
  try {
    const id = await withTx(async (conn) => {
      const siteEval = await getEvaluateurSite(conn, evaluateurId);
      return creerEvaluationInterne(conn, req.body, evaluateurId, siteEval);
    });
    return res.status(201).json({ id, message: "Évaluation créée.", afficher_grille: !!req.body.afficher_grille });
  } catch (e) {
    if (e.rejet) return res.status(400).json({ message: e.message });
    console.log(e); return res.status(500).json({ message: "Erreur lors de la création." });
  }
};

const createEvaluationMasse = async (req, res) => {
  const evaluateurId = req.auth.userId;
  const lignes = Array.isArray(req.body.lignes) ? req.body.lignes : [];
  const commun = req.body.commun || {};
  if (lignes.length === 0) return res.status(400).json({ message: "Aucune ligne fournie." });
  try {
    const conn = await db.getConnection();
    const siteEval = await getEvaluateurSite(conn, evaluateurId).catch(() => null);
    const crees = [], rejetes = [];
    for (let i = 0; i < lignes.length; i++) {
      const payload = { ...commun, ...lignes[i] };
      try {
        await conn.beginTransaction();
        const id = await creerEvaluationInterne(conn, payload, evaluateurId, siteEval);
        await conn.commit();
        crees.push({ index: i, id });
      } catch (e) {
        await conn.rollback();
        rejetes.push({ index: i, motif: e.rejet ? e.message : "Erreur technique." });
        if (!e.rejet) console.log(e);
      }
    }
    conn.release();
    return res.status(201).json({ total: lignes.length, crees, rejetes, message: `${crees.length} créée(s), ${rejetes.length} rejetée(s).` });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors de la création en masse." }); }
};

const getAgentsEvaluables = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT u.id, u.nom, u.prenom, u.nom_utilisateur AS login,
              s.nom AS site, p.nom AS programme,
              g.id AS id_grille, g.nom AS grille, g.statut AS grille_statut, g.type_ressource_cible AS grille_type
       FROM b_utilisateur u
       LEFT JOIN b_site s ON u.id_Site=s.id
       LEFT JOIN b_programme p ON u.id_Programme=p.id
       LEFT JOIN b_eval_grille g ON u.id_EvalGrille=g.id
       WHERE u.status='ACTIF'
       ORDER BY u.nom, u.prenom`
    );
    return res.status(200).json(rows);
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors du chargement." }); }
};

const getGrilleForAgent = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const r = await resolveGrilleForAgent(conn, req.params.id);
    return res.status(200).json({
      ok: true,
      grille: { id: r.grille.id, nom: r.grille.nom, statut: r.grille.statut, type_ressource_cible: r.grille.type_ressource_cible },
      id_site: r.siteId, id_programme: r.programmeId,
    });
  } catch (e) {
    if (e.rejet) return res.status(200).json({ ok: false, message: e.message });
    console.log(e); return res.status(500).json({ message: "Erreur lors de la résolution." });
  } finally { conn.release(); }
};

// --- liste des évaluations (F.39septies) : vues par rôle + filtres ------
const getUserRole = async (userId) => {
  const [[r]] = await db.query(
    `SELECT f.Role_Associe AS role FROM b_utilisateur u JOIN b_fonction f ON u.id_Fonction=f.id WHERE u.id=?`, [userId]
  );
  return r ? r.role : null;
};

// Gardes-fous de parsing pour les filtres (évite les 500 sur valeurs invalides)
const estDateYMD = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
const entierOuNull = (v) => {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
};
const dansEnsemble = (v, ens) => (ens.includes(v) ? v : null);

const getAllEvaluations = async (req, res) => {
  const userId = req.auth.userId;
  const q = req.query || {};
  try {
    const role = await getUserRole(userId);
    const where = [];
    const params = [];
    // Visibilité (out111) : jointure sur l'union des évaluations visibles, chaque
    // branche s'appuyant sur un index (évaluateur, agents supervisés, agent, site),
    // au lieu d'un OR qui obligeait à parcourir toute la table.
    let jointureVisibilite = "";
    const paramsVisibilite = [];

    // Normalisation / validation des filtres (aucune valeur brute non vérifiée)
    const fStatut = dansEnsemble(q.statut, ["NON_TERMINE", "EN_ATTENTE_VALIDATION_OPTION", "TERMINE"]);
    const fConclusion = dansEnsemble(q.conclusion, ["SUCCES", "ECHEC"]);
    const fTypeRessource = dansEnsemble(q.type_ressource, ["HUMAINE", "AUTOMATISEE"]);
    const fTypeEval = dansEnsemble(q.type_evaluation, ["EVALUATION", "EVALUATION_SUPPLEMENTAIRE"]);
    const fSite = entierOuNull(q.id_site);
    // Programme enregistré sur l'évaluation (lien du tableau de bord filtré par programme, out124).
    const fProgramme = entierOuNull(q.id_programme);
    const fContexte = entierOuNull(q.id_contexte);
    const fDateDebut = estDateYMD(q.date_debut) ? q.date_debut : null;
    const fDateFin = estDateYMD(q.date_fin) ? q.date_fin : null;
    const fQ = typeof q.q === "string" && q.q.trim() ? q.q.trim().slice(0, 100) : null;

    // Vues dédiées
    if (q.portee === "creees") {
      // « Mes évaluations » : uniquement celles créées par l'utilisateur lui-même
      where.push(`e.id_evaluateur=?`);
      params.push(userId);
    } else if (q.portee === "mes-agents") {
      // évaluations de MES agents où je ne suis PAS l'évaluateur, et seulement TERMINÉES
      where.push(`e.id_agent IN (SELECT id_AGENT FROM b_r_superviseur_agent WHERE id_SUPERVISEUR=?)`);
      where.push(`e.id_evaluateur<>?`);
      where.push(`e.statut='TERMINE'`);
      params.push(userId, userId);
    } else if (q.portee === "coaching") {
      // évaluations de MES agents nécessitant un coaching (échec), quel que soit l'évaluateur ;
      // etendue=perimetre (evaluation.voir_tous / administrateur) : tout son périmètre
      // de site (tous les sites pour le site à vision globale), comme le tableau de bord.
      let perimetre = false;
      if (q.etendue === "perimetre") {
        const { permissionsEffectives } = require("../middlewares/permission");
        const { porteeSite } = require("../utils/siteVisionGlobale");
        const { set } = await permissionsEffectives(userId);
        if (role === "R_ADMI") perimetre = true;
        else if (set.has("evaluation.voir_tous")) {
          const p = await porteeSite(userId);
          if (p.visionGlobale) perimetre = true;
          else if (p.idSite !== null) { where.push(`e.id_site=?`); params.push(p.idSite); perimetre = true; }
        }
      }
      if (!perimetre) {
        where.push(`e.id_agent IN (SELECT id_AGENT FROM b_r_superviseur_agent WHERE id_SUPERVISEUR=?)`);
        params.push(userId);
      }
      where.push(`e.statut='TERMINE'`);
      where.push(`e.conclusion='ECHEC'`);
      // état du coaching : à faire (aucun coaching), en cours (commencé), terminé
      const SQL_CO = (st) => `EXISTS (SELECT 1 FROM b_eval_coaching co WHERE co.id_evaluation=e.id AND ${st})`;
      if (q.coaching_etat === "a_faire") where.push(`NOT ${SQL_CO("1=1")}`);
      else if (q.coaching_etat === "en_cours") where.push(`${SQL_CO("co.statut<>'TERMINE'")} AND NOT ${SQL_CO("co.statut='TERMINE'")}`);
      else if (q.coaching_etat === "termine") where.push(SQL_CO("co.statut='TERMINE'"));
      // à faire ou en cours (défaut de l'écran Mes coaching, out113)
      else if (q.coaching_etat === "non_termine") where.push(`NOT ${SQL_CO("co.statut='TERMINE'")}`);
      // filtre sur l'état du coaching (terminé ou non)
      if (q.coaching_termine === "true") {
        where.push(`EXISTS (SELECT 1 FROM b_eval_coaching co WHERE co.id_evaluation=e.id AND co.statut='TERMINE')`);
      } else if (q.coaching_termine === "false") {
        where.push(`NOT EXISTS (SELECT 1 FROM b_eval_coaching co WHERE co.id_evaluation=e.id AND co.statut='TERMINE')`);
      }
    }
    // Portée (hors vues dédiées), par permission et non plus par profil :
    //  - administrateur : tout ;
    //  - evaluation.voir_tous : tous les sites pour le site à vision globale,
    //    sinon toutes les évaluations de son site ;
    //  - en plus, pour tous : celles qu'on a faites, celles des agents qu'on
    //    supervise, et les siennes une fois terminées.
    else if (role !== "R_ADMI") {
      const { permissionsEffectives } = require("../middlewares/permission");
      const { porteeSite } = require("../utils/siteVisionGlobale");
      const { set } = await permissionsEffectives(userId);
      const portee = set.has("evaluation.voir_tous") ? await porteeSite(userId) : null;
      if (!(portee && portee.visionGlobale)) {
        const branches = [
          `SELECT v1.id FROM b_evaluation v1 WHERE v1.id_evaluateur = ?`,
          `SELECT v2.id FROM b_evaluation v2 JOIN b_r_superviseur_agent sa ON sa.id_AGENT = v2.id_agent AND sa.id_SUPERVISEUR = ?`,
          `SELECT v3.id FROM b_evaluation v3 WHERE v3.id_agent = ? AND v3.statut = 'TERMINE'`,
        ];
        paramsVisibilite.push(userId, userId, userId);
        if (portee && portee.idSite !== null) {
          branches.push(`SELECT v4.id FROM b_evaluation v4 WHERE v4.id_site = ?`);
          paramsVisibilite.push(portee.idSite);
        }
        jointureVisibilite = `JOIN (${branches.join(" UNION ")}) vis ON vis.id = e.id`;
      }
    }

    // actif / inactif
    if (q.inactifs === "true") {
      where.push(`e.actif=0`);
      // Voir les évaluations désactivées : réservé à leur créateur (l'admin voit tout).
      if (role !== "R_ADMI") { where.push(`e.id_evaluateur=?`); params.push(userId); }
    } else {
      where.push(`e.actif=1`);
    }

    // filtres (valeurs déjà validées/normalisées ci-dessus)
    if (fStatut) { where.push(`e.statut=?`); params.push(fStatut); }
    if (fConclusion) { where.push(`e.conclusion=?`); params.push(fConclusion); }
    if (fTypeRessource) { where.push(`e.type_ressource=?`); params.push(fTypeRessource); }
    if (fSite) { where.push(`e.id_site=?`); params.push(fSite); }
    if (fProgramme) { where.push(`e.id_programme=?`); params.push(fProgramme); }
    if (fContexte) { where.push(`e.id_contexte=?`); params.push(fContexte); }
    if (fTypeEval) { where.push(`t.code=?`); params.push(fTypeEval); }
    // Période sur la date d'appel (défaut) ou, date_sur=evaluation, sur la date de
    // l'évaluation (même base que le tableau de bord).
    const colDate = q.date_sur === "evaluation" ? "COALESCE(e.date_evaluation, e.date_creation)" : "e.date_appel";
    if (fDateDebut) { where.push(`${colDate} >= ?`); params.push(fDateDebut + " 00:00:00"); }
    if (fDateFin) { where.push(`${colDate} <= ?`); params.push(fDateFin + " 23:59:59"); }
    if (fQ) {
      // Chaque mot doit apparaître dans au moins un champ (« nom prénom » fonctionne) ;
      // casse et accents ignorés par la collation. % et _ saisis sont pris littéralement.
      const mots = fQ.split(/\s+/).filter(Boolean).slice(0, 5);
      for (const mot of mots) {
        where.push(`(e.identifiant_appel LIKE ? OR e.numero_case LIKE ? OR e.numero_appel LIKE ? OR ag.nom LIKE ? OR ag.prenom LIKE ? OR ag.nom_utilisateur LIKE ?)`);
        const like = `%${mot.replace(/[\\%_]/g, (c) => "\\" + c)}%`;
        params.push(like, like, like, like, like, like);
      }
    }

    const clauseWhere = where.length ? "WHERE " + where.join(" AND ") : "";
    const jointuresFiltres = `
       LEFT JOIN b_utilisateur ag ON e.id_agent = ag.id
       LEFT JOIN b_eval_ref_type_evaluation t ON e.id_type_evaluation = t.id`;

    // Pagination côté serveur (out111) : ?page=1&taille=25 -> { lignes, total, page, taille }.
    // Sans « page » : liste complète (compatibilité).
    const pagine = q.page !== undefined;
    let idsPage = null, total = null, page = 1, taille = 25;
    if (pagine) {
      page = Math.max(1, parseInt(q.page, 10) || 1);
      taille = Math.min(100, Math.max(5, parseInt(q.taille, 10) || 25));
      const [[c]] = await db.query(
        `SELECT COUNT(*) AS n FROM b_evaluation e ${jointureVisibilite} ${jointuresFiltres} ${clauseWhere}`,
        [...paramsVisibilite, ...params]
      );
      total = Number(c.n);
      const [ids] = await db.query(
        `SELECT e.id FROM b_evaluation e ${jointureVisibilite} ${jointuresFiltres} ${clauseWhere}
          ORDER BY e.date_creation DESC, e.id DESC LIMIT ? OFFSET ?`,
        [...paramsVisibilite, ...params, taille, (page - 1) * taille]
      );
      idsPage = ids.map((r) => r.id);
      if (!idsPage.length) return res.status(200).json({ lignes: [], total, page, taille });
    }

    const [rows] = await db.query(
      `SELECT e.id, e.type_ressource, e.statut, e.conclusion, e.date_appel, e.date_creation,
              e.identifiant_appel, e.numero_case, e.numero_appel, e.actif, e.id_evaluation_parente, e.id_evaluateur,
              EXISTS (SELECT 1 FROM b_eval_contre_evaluation ce
                       WHERE ce.id_evaluation_initiale = e.id
                          OR ce.id_evaluation_initiale IN (SELECT s2.id FROM b_evaluation s2 WHERE s2.id_evaluation_parente = e.id)) AS contre_evaluee,
              ag.nom AS agent_nom, ag.prenom AS agent_prenom, ag.nom_utilisateur AS agent_login,
              ev.nom AS evaluateur_nom, ev.prenom AS evaluateur_prenom,
              t.libelle AS type_evaluation, t.code AS type_code, ctx.libelle AS contexte, gr.nom AS grille, s.nom AS site,
              (SELECT co.statut FROM b_eval_coaching co WHERE co.id_evaluation=e.id ORDER BY co.id DESC LIMIT 1) AS coaching_statut
       FROM b_evaluation e
       LEFT JOIN b_utilisateur ag ON e.id_agent = ag.id
       LEFT JOIN b_utilisateur ev ON e.id_evaluateur = ev.id
       LEFT JOIN b_eval_ref_type_evaluation t ON e.id_type_evaluation = t.id
       LEFT JOIN b_eval_ref_contexte ctx ON e.id_contexte = ctx.id
       LEFT JOIN b_eval_grille gr ON e.id_grille_origine = gr.id
       LEFT JOIN b_site s ON e.id_site = s.id
       ${idsPage ? "" : jointureVisibilite}
       ${idsPage ? `WHERE e.id IN (${idsPage.map(() => "?").join(",")})` : clauseWhere}
       ORDER BY e.date_creation DESC, e.id DESC`,
      idsPage ? idsPage : [...paramsVisibilite, ...params]
    );
    if (pagine) return res.status(200).json({ lignes: rows, total, page, taille });
    return res.status(200).json(rows);
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors du chargement." }); }
};

// --- cycle de vie (F.39septies D) --------------------------------------
// (Dés)activer / voir une évaluation désactivée : réservé à son créateur
// (l'administrateur conserve un accès transverse).
const peutModifierCycle = (role, evaluationCreateurId, userId) =>
  role === "R_ADMI" || Number(evaluationCreateurId) === Number(userId);

// (Dés)activation : réservée au CRÉATEUR de l'évaluation (ou à l'administrateur).
// Évaluation NON terminée : le créateur seul suffit ; évaluation TERMINÉE : le
// créateur doit en plus détenir evaluation.desactiver. Ni le superviseur de
// l'agent ni evaluation.voir_tous ne permettent de désactiver.
const peutDesactiver = async (userId, role, e) => {
  if (role === "R_ADMI") return true;
  if (Number(e.id_evaluateur) !== Number(userId)) return false;
  if (e.statut !== "TERMINE") return true;
  const { set } = await permissionsEffectives(userId);
  return set.has("evaluation.desactiver");
};

const setActifEvaluation = async (req, res) => {
  const id = req.params.id;
  const userId = req.auth.userId;
  const actif = req.body.actif ? 1 : 0;
  try {
    const role = await getUserRole(userId);
    const [[e]] = await db.query(`SELECT id, id_evaluateur, id_agent, id_site, statut FROM b_evaluation WHERE id=?`, [id]);
    if (!e) return res.status(404).json({ message: "Évaluation introuvable." });
    if (!(await peutDesactiver(userId, role, e))) {
      return res.status(403).json({
        message: Number(e.id_evaluateur) !== Number(userId)
          ? "Vous ne pouvez (dés)activer qu'une évaluation que vous avez créée."
          : "Une évaluation terminée ne peut être (dés)activée qu'avec la permission Désactiver.",
      });
    }
    await withTx(async (conn) => {
      await conn.query(`UPDATE b_evaluation SET actif=? WHERE id=?`, [actif, id]);
      // les évaluations supplémentaires suivent le sort de leur parente
      await conn.query(`UPDATE b_evaluation SET actif=? WHERE id_evaluation_parente=?`, [actif, id]);
    });
    return res.status(200).json({ message: actif ? "Évaluation réactivée." : "Évaluation désactivée." });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur." }); }
};

const desactiverMasse = async (req, res) => {
  const userId = req.auth.userId;
  const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
  if (ids.length === 0) return res.status(400).json({ message: "Aucune évaluation sélectionnée." });
  try {
    const role = await getUserRole(userId);
    let ignorees = 0;
    await withTx(async (conn) => {
      for (const id of ids) {
        const [[e]] = await conn.query(`SELECT id, id_evaluateur, id_agent, id_site, statut FROM b_evaluation WHERE id=?`, [id]);
        if (!e || !(await peutDesactiver(userId, role, e))) { ignorees++; continue; }
        await conn.query(`UPDATE b_evaluation SET actif=0 WHERE id=?`, [id]);
        await conn.query(`UPDATE b_evaluation SET actif=0 WHERE id_evaluation_parente=?`, [id]);
      }
    });
    const traitees = ids.length - ignorees;
    const suffixe = ignorees ? ` (${ignorees} ignorée(s) : non créée(s) par vous, ou terminée(s) sans la permission dédiée)` : "";
    return res.status(200).json({ message: `${traitees} évaluation(s) désactivée(s)${suffixe}.` });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur." }); }
};

// Suppression définitive — réservée au CRÉATEUR disposant de la permission
// EVALUATION.SUPPRIMER (l'administrateur conserve un accès transverse), y compris
// pour une évaluation terminée, SAUF si elle (ou une de ses supplémentaires) a
// été contre-évaluée. Supprime aussi ses résultats, son analyse BI, son coaching,
// son plan d'actions, l'historique d'avis et ses évaluations supplémentaires.
// L'agent évalué et son superviseur sont notifiés (et le créateur si ce n'est
// pas lui qui supprime).
const supprimerEvaluationCascade = async (conn, eid) => {
  await conn.query(`DELETE FROM b_evaluation_bi WHERE id_evaluation=?`, [eid]);
  // options BI / coaching proposées depuis cette évaluation : on retire celles en
  // attente (du niveau le plus profond au plus haut), on détache les autres.
  await conn.query(`DELETE FROM b_eval_bi_option WHERE id_evaluation_origine=? AND etat='EN_ATTENTE' ORDER BY niveau DESC`, [eid]);
  await conn.query(`UPDATE b_eval_bi_option SET id_evaluation_origine=NULL WHERE id_evaluation_origine=?`, [eid]);
  const [cos] = await conn.query(`SELECT id FROM b_eval_coaching WHERE id_evaluation=?`, [eid]);
  for (const co of cos) {
    await conn.query(`DELETE FROM b_eval_coaching_niveau WHERE id_coaching=?`, [co.id]);
    await conn.query(`DELETE FROM b_eval_coaching_option WHERE id_coaching_origine=? AND etat='EN_ATTENTE' ORDER BY niveau DESC`, [co.id]);
    await conn.query(`UPDATE b_eval_coaching_option SET id_coaching_origine=NULL WHERE id_coaching_origine=?`, [co.id]);
  }
  await conn.query(`DELETE FROM b_eval_coaching WHERE id_evaluation=?`, [eid]);
  await conn.query(
    `DELETE c FROM b_eval_plan_action_contributeur c JOIN b_eval_plan_action_ligne l ON l.id=c.id_ligne WHERE l.id_evaluation=?`, [eid]
  );
  await conn.query(`DELETE FROM b_eval_plan_action_ligne WHERE id_evaluation=?`, [eid]);
  await conn.query(`DELETE FROM b_evaluation_avis_histo WHERE id_evaluation=?`, [eid]);
  // S6 : on ne supprime PAS les notifications liées ; le lien devient simplement inopérant.
  await conn.query(`DELETE FROM b_evaluation_erreur WHERE id_evaluation=?`, [eid]);
  await conn.query(`DELETE FROM b_evaluation_categorie WHERE id_evaluation=?`, [eid]);
};

const deleteEvaluation = async (req, res) => {
  const id = req.params.id;
  const userId = req.auth.userId;
  try {
    const [[e0]] = await db.query(`SELECT id_evaluateur, statut FROM b_evaluation WHERE id=?`, [id]);
    if (!e0) return res.status(404).json({ message: "Évaluation introuvable." });
    const { role, set } = await permissionsEffectives(userId);
    const estCreateur = Number(e0.id_evaluateur) === Number(userId);
    const aDroit = role === "R_ADMI" || (estCreateur && set.has("evaluation.supprimer"));
    if (!aDroit) {
      return res.status(403).json({ message: "Suppression réservée au créateur disposant de la permission Supprimer." });
    }
    const { emitEvaluation } = require("../utils/notify");
    const out = await withTx(async (conn) => {
      const [[e]] = await conn.query(
        `SELECT e.id, e.id_evaluateur, e.id_agent, e.numero_case, e.date_evaluation, e.date_appel,
                TRIM(CONCAT(COALESCE(u.prenom, ''), ' ', COALESCE(u.nom, ''))) AS auteur
           FROM b_evaluation e LEFT JOIN b_utilisateur u ON u.id=?
          WHERE e.id=?`, [userId, id]
      );
      if (!e) return { notFound: true };
      const [sups] = await conn.query(`SELECT id FROM b_evaluation WHERE id_evaluation_parente=?`, [id]);
      const tous = [Number(id), ...sups.map((s) => s.id)];
      const [[contre]] = await conn.query(
        `SELECT COUNT(*) AS n FROM b_eval_contre_evaluation WHERE id_evaluation_initiale IN (?)`, [tous]
      );
      if (contre.n > 0) return { contreEvaluee: true };
      for (const eid of tous) await supprimerEvaluationCascade(conn, eid);
      await conn.query(`DELETE FROM b_evaluation WHERE id_evaluation_parente=?`, [id]);
      await conn.query(`DELETE FROM b_evaluation WHERE id=?`, [id]);
      // Information de l'agent évalué, de son superviseur et du créateur (hors auteur).
      const d = e.date_evaluation || e.date_appel;
      const dateTxt = d ? new Date(d).toLocaleDateString("fr-FR") : null;
      await emitEvaluation(conn, e, {
        titre: `Évaluation supprimée : n° ${e.id}${dateTxt ? " du " + dateTxt : ""}`,
        message: `${e.numero_case ? "Case " + e.numero_case + " — " : ""}supprimée par ${e.auteur || "un utilisateur"}.`,
        url: null, exclure: userId,
      });
      return { ok: true };
    });
    if (out.notFound) return res.status(404).json({ message: "Évaluation introuvable." });
    if (out.contreEvaluee) {
      return res.status(409).json({ message: "Cette évaluation a été contre-évaluée : elle ne peut pas être supprimée (désactivez-la)." });
    }
    return res.status(200).json({ message: "Évaluation supprimée." });
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors de la suppression." }); }
};

// --- référentiels pour le formulaire (lecture) -----------------------
const getContextes = async (req, res) => {
  try {
    const [rows] = await db.query(`SELECT id, libelle FROM b_eval_ref_contexte WHERE etat='ACTIF' ORDER BY libelle`);
    return res.status(200).json(rows);
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors du chargement." }); }
};
const getNatures = async (req, res) => {
  try {
    const [rows] = await db.query(`SELECT id, libelle FROM b_eval_ref_nature_ressource WHERE etat='ACTIF' ORDER BY libelle`);
    return res.status(200).json(rows);
  } catch (e) { console.log(e); return res.status(500).json({ message: "Erreur lors du chargement." }); }
};

module.exports = {
  createEvaluation, createEvaluationMasse, getAgentsEvaluables, getGrilleForAgent,
  getContextes, getNatures, getAllEvaluations,
  setActifEvaluation, desactiverMasse, deleteEvaluation,
  _internals: { snapshotGrille, resolveGrilleForAgent, creerEvaluationInterne },
};
