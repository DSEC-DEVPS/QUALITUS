// Recalcul unique des badges quiz de tous les participants (après la
// migration 43) : attribue d'un coup les nouveaux badges déjà mérités au vu
// de l'historique. Sans danger à relancer.
//   Docker : docker compose exec server node scripts/recalculer_badges_quiz.js
//   Local  : cd Server && node scripts/recalculer_badges_quiz.js
const db = require("../config/db");
const { synchroniserBadges } = require("../utils/badgesQuiz");

(async () => {
  try {
    const [users] = await db.query("SELECT DISTINCT id_UTILISATEUR AS id FROM B_QZ_TENTATIVE");
    let ajoutes = 0, retires = 0;
    for (const u of users) {
      const r = await synchroniserBadges(db, u.id);
      ajoutes += r.ajoutes.length; retires += r.retires.length;
    }
    console.log(`Badges recalculés pour ${users.length} participant(s) : ${ajoutes} attribué(s), ${retires} retiré(s).`);
    process.exit(0);
  } catch (e) {
    console.error("Recalcul des badges impossible :", e.message);
    process.exit(1);
  }
})();
