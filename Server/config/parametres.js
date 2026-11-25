// Paramètres d'exécution de l'API, lus dans l'environnement (fichier .env ou
// variables du conteneur). Chaque valeur a un défaut qui reproduit le
// fonctionnement d'avant : aucune variable n'est obligatoire.
const dotenv = require("dotenv");
dotenv.config();

const entier = (v, defaut, min, max) => {
  const n = parseInt(v, 10);
  if (!Number.isFinite(n)) return defaut;
  return Math.min(max, Math.max(min, n));
};

const production = process.env.NODE_ENV === "production";

module.exports = {
  production,
  /** Connexions MySQL ouvertes au plus par processus Node (mysql2 : 10 par défaut). */
  dbPoolTaille: entier(process.env.DB_POOL_SIZE, 30, 1, 200),
  /** Secret de signature des jetons. Défaut : l'ancien secret, pour ne couper aucune session. */
  jwtSecret: process.env.JWT_SECRET || "DevpsDsec",
  /** Durée de validité d'un jeton (inchangée). */
  jwtDuree: process.env.JWT_EXPIRES_IN || "8h",
  /**
   * Journal des requêtes : « toutes » (une ligne par requête, comme avant) ou
   * « erreurs » (seulement les réponses en erreur et les requêtes lentes).
   * Défaut : « erreurs » si NODE_ENV=production, sinon « toutes ».
   */
  journalRequetes: ["toutes", "erreurs"].includes(process.env.JOURNAL_REQUETES)
    ? process.env.JOURNAL_REQUETES
    : production ? "erreurs" : "toutes",
  /** Seuil (ms) au-delà duquel une requête est dite lente et journalisée. */
  seuilLentMs: entier(process.env.SEUIL_REQUETE_LENTE_MS, 1000, 1, 600000),
  /** Nombre de processus Node de l'API (WEB_CONCURRENCY ; 1 = comme avant). Voir demarrer.js. */
  nbProcessus: entier(process.env.WEB_CONCURRENCY, 1, 1, 64),
  /** Durée (ms) de conservation en mémoire des permissions d'un utilisateur (0 = pas de cache). */
  cachePermissionsMs: entier(process.env.CACHE_PERMISSIONS_MS, 10000, 0, 300000),
};
