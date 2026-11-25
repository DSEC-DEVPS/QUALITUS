#!/bin/bash
# =====================================================================
# Applique les migrations QUALITUS dans l'ordre, une par une.
#   ./db/preprod/appliquer_migrations.sh 21 58
# Par défaut : conteneur de la pré-prod (qualitus-preprod-db-1).
# Pour la prod, le jour venu :
#   CONTENEUR=qualitus-db-1 ./db/preprod/appliquer_migrations.sh 21 58
# S'arrête à la première erreur ; après correction, reprendre à partir
# de la migration en erreur (ex. : ... 37 58).
# Journal : db/preprod/journal_migrations_AAAAMMJJ_HHMMSS.log
# =====================================================================
set -u -o pipefail
cd "$(dirname "$0")/../.." || exit 1
PREMIERE=${1:-21}
DERNIERE=${2:-58}
CONTENEUR=${CONTENEUR:-qualitus-preprod-db-1}
JOURNAL="db/preprod/journal_migrations_$(date +%Y%m%d_%H%M%S).log"

# Client MySQL forcé en utf8mb4 : sans cela, le client du conteneur lit les
# fichiers en latin1 et les accents sont enregistrés abîmés (Ã©, â€”).
mysql_base() {
  if [ -n "${MYSQL_COMMANDE:-}" ]; then        # tests hors Docker
    $MYSQL_COMMANDE --default-character-set=utf8mb4 QUALITUS
  else
    docker exec -i "$CONTENEUR" sh -c \
      'exec mysql --default-character-set=utf8mb4 -uroot -p"$MYSQL_ROOT_PASSWORD" QUALITUS' 2>&1 \
      | grep -v "Using a password on the command line"
  fi
}

log() { echo "$*" | tee -a "$JOURNAL"; }

log "=== Migrations $PREMIERE -> $DERNIERE sur ${MYSQL_COMMANDE:+base de test}${MYSQL_COMMANDE:-$CONTENEUR} ($(date '+%d/%m/%Y %H:%M:%S'))"
log "--- Niveau de la base AVANT :"
mysql_base < db/preprod/niveau_base.sql | tr '\t' ' ' | tee -a "$JOURNAL" || { log "ERREUR : base injoignable."; exit 1; }

n=0
for f in $(ls db/migrations/*.sql | sort -V); do
  num=$(basename "$f" | cut -d_ -f1); num=$((10#$num))
  [ "$num" -lt "$PREMIERE" ] || [ "$num" -gt "$DERNIERE" ] && continue
  debut=$(date +%s)
  sortie=$(mysql_base < "$f" 2>&1); code=$?
  [ -n "$sortie" ] && echo "$sortie" >> "$JOURNAL"
  if [ $code -ne 0 ] || echo "$sortie" | grep -q "^ERROR"; then
    log "ERREUR  $(basename "$f")"
    echo "$sortie" | grep "ERROR" | tee -a "$JOURNAL"
    log ""
    log "ARRÊT. Les migrations précédentes sont appliquées. Après correction :"
    log "  $0 $num $DERNIERE"
    exit 1
  fi
  log "OK      $(basename "$f")  ($(( $(date +%s) - debut )) s)"
  n=$((n+1))
done

log "--- Niveau de la base APRÈS :"
mysql_base < db/preprod/niveau_base.sql | tr '\t' ' ' | tee -a "$JOURNAL"
log "=== $n migration(s) appliquée(s) sans erreur. Journal : $JOURNAL"
