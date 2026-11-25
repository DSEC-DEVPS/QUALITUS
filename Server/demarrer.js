// Point d'entrée de l'API (out113).
// WEB_CONCURRENCY = nombre de processus Node (défaut 1 : un seul processus, comme avant).
// Avec plusieurs processus, le module « cluster » de Node répartit les connexions sur le
// même port ; un processus qui s'arrête est relancé. Les caches en mémoire (permissions)
// sont vidés dans tous les processus quand l'un d'eux enregistre une modification de droits.
const cluster = require("node:cluster");
const { nbProcessus } = require("./config/parametres");

if (nbProcessus > 1 && cluster.isPrimary) {
  console.log(`API QUALITUS : ${nbProcessus} processus`);
  for (let i = 0; i < nbProcessus; i++) cluster.fork();
  cluster.on("exit", (w, code, signal) => {
    console.error(`Processus ${w.process.pid} arrêté (${signal || code}) : relance.`);
    cluster.fork();
  });
  // relais entre processus : vidage des caches de permissions
  cluster.on("message", (emetteur, msg) => {
    if (msg && msg.type === "qualitus:vider-permissions") {
      for (const w of Object.values(cluster.workers)) if (w && w.id !== emetteur.id) w.send(msg);
    }
  });
} else {
  require("./server");
}
