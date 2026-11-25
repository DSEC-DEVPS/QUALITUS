// =====================================================================
// Plan d'actions — règles partagées (out102)
//  - nettoyage / comparaison des textes saisis (pas d'enregistrement ni de
//    notification sans changement réel) ;
//  - action « réalisée » (statut Réalisé ou date de réalisation renseignée) ;
//  - utilisateurs proposables comme porteur / contributeur :
//      utilisateur du site à vision globale (ou administrateur) : tous les sites ;
//      sinon : son site + le site à vision globale ; utilisateurs actifs.
// =====================================================================
const db = require("../config/db");
const { permissionsEffectives } = require("../middlewares/permission");
const { porteeSite, PARAM_SITE_GLOBAL } = require("./siteVisionGlobale");

/** Texte enregistré : lignes nettoyées, espaces multiples réduits ; vide -> null. */
const nettoyerTexte = (v, max = 4000) => {
  if (v === null || v === undefined) return null;
  const t = String(v)
    .replace(/\r\n?/g, "\n")
    .split("\n").map((l) => l.replace(/[ \t ]+/g, " ").trim()).join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return t ? t.slice(0, max) : null;
};

/** Clé de comparaison : tous les blancs réduits à une espace (un espace en trop ne compte pas). */
const cleTexte = (v) => String(v ?? "").replace(/\s+/g, " ").trim();

/**
 * Expression SQL (jamais NULL) : l'action (alias l, statut alias st) est réalisée —
 * statut « Réalisé », ou, sans statut, une date de réalisation renseignée.
 */
const sqlRealisee = (l = "l", st = "st") =>
  `(COALESCE(${st}.libelle, '') LIKE 'Réalis%' OR COALESCE(${st}.libelle, '') LIKE 'Realis%'
    OR (${l}.id_statut IS NULL AND ${l}.date_realisation IS NOT NULL))`;

/** Statut « Réalisé » d'après son libellé. */
const estStatutRealise = (libelle) => /^r[ée]alis/i.test(String(libelle || "").trim());

/**
 * Statut qui CLÔT l'action (out107) : Réalisé, Abandonné, Annulé, Clos / Clôturé, Terminé.
 * Une action close ne se modifie plus et ne se supprime plus.
 */
const RE_STATUT_CLOS = /^(r[ée]alis|abandon|annul|clos|cl[oô]tur|termin)/i;
const estStatutClos = (libelle) => RE_STATUT_CLOS.test(String(libelle || "").trim());
/** Expression SQL (jamais NULL) : l'action (alias l / st) est close. */
const sqlClose = (l = "l", st = "st") => {
  const c = `COALESCE(${st}.libelle, '')`;
  return `(${["Réalis%", "Realis%", "Abandon%", "Annul%", "Clos%", "Clotur%", "Clôtur%", "Termin%"].map((m) => `${c} LIKE '${m}'`).join(" OR ")}
    OR (${l}.id_statut IS NULL AND ${l}.date_realisation IS NOT NULL))`;
};

/** Id du site à vision globale (paramètre), ou null. */
const idSiteGlobal = async () => {
  const [[p]] = await db.query(`SELECT valeur FROM b_param_habilitation WHERE cle = ?`, [PARAM_SITE_GLOBAL]);
  return p && /^\d+$/.test(String(p.valeur)) ? Number(p.valeur) : null;
};

/**
 * Filtre SQL (alias u) des utilisateurs que `userId` peut désigner porteur ou
 * contributeur. { tous: true } pour le site à vision globale et l'administrateur.
 */
const filtreAssignables = async (userId, alias = "u") => {
  const { role } = await permissionsEffectives(userId);
  const admin = role === "R_ADMI";
  const { idSite, visionGlobale } = await porteeSite(userId, admin);
  if (visionGlobale) return { tous: true, sql: "1=1", params: [] };
  const sites = [idSite, await idSiteGlobal()].filter((s) => s !== null && s !== undefined);
  if (!sites.length) return { tous: false, sql: "1=0", params: [] };
  return { tous: false, sql: `${alias}.id_Site IN (${sites.map(() => "?").join(",")})`, params: sites };
};

/** Ids (parmi `ids`) que `userId` n'a pas le droit de désigner (utilisateur actif hors périmètre). */
const horsPerimetre = async (userId, ids) => {
  const uniques = [...new Set((ids || []).map(Number).filter((n) => Number.isInteger(n) && n > 0))];
  if (!uniques.length) return [];
  const f = await filtreAssignables(userId, "u");
  const [ok] = await db.query(
    `SELECT u.id FROM b_utilisateur u
      WHERE u.id IN (${uniques.map(() => "?").join(",")}) AND u.status = 'ACTIF' AND ${f.sql}`,
    [...uniques, ...f.params]
  );
  const autorises = new Set(ok.map((r) => Number(r.id)));
  return uniques.filter((id) => !autorises.has(id));
};

module.exports = { nettoyerTexte, cleTexte, sqlRealisee, estStatutRealise, estStatutClos, sqlClose, filtreAssignables, horsPerimetre, idSiteGlobal };
