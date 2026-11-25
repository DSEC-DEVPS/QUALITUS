const mysql = require("mysql2/promise");
const dotenv = require("dotenv");
dotenv.config();
const { dbPoolTaille } = require("./parametres");

// Taille du pool réglable (DB_POOL_SIZE, 30 par défaut) : sous forte charge, les
// requêtes attendent une connexion libre au lieu d'échouer.
const mysqlPool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: dbPoolTaille,
  waitForConnections: true,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
});

module.exports = mysqlPool;
