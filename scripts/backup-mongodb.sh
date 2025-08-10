#!/bin/bash
# Script de sauvegarde MongoDB pour l'Application d'Analyse Politique
# Usage: ./backup-mongodb.sh

set -e

# Configuration
BACKUP_DIR="/opt/political-analyzer/backups"
DB_NAME="political_analyzer"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="$BACKUP_DIR/mongodb_$DATE"
LOG_FILE="/opt/political-analyzer/logs/backup.log"
RETENTION_DAYS=30

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" | tee -a "$LOG_FILE"
}

# Créer le répertoire de sauvegarde s'il n'existe pas
mkdir -p "$BACKUP_DIR"

log "🚀 Début de la sauvegarde MongoDB"
log "Base de données: $DB_NAME"
log "Répertoire: $BACKUP_PATH"

# Vérifier que MongoDB est accessible
if ! mongo --quiet --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
    error "MongoDB n'est pas accessible"
    exit 1
fi

# Statistiques avant sauvegarde
COLLECTIONS=$(mongo "$DB_NAME" --quiet --eval "db.getCollectionNames().length")
TOTAL_SIZE=$(mongo "$DB_NAME" --quiet --eval "db.stats().dataSize" 2>/dev/null || echo "0")
log "Collections à sauvegarder: $COLLECTIONS"
log "Taille des données: $(numfmt --to=iec "$TOTAL_SIZE" 2>/dev/null || echo "N/A")"

# Créer la sauvegarde avec mongodump
log "Création de la sauvegarde avec mongodump..."
if mongodump --db "$DB_NAME" --out "$BACKUP_PATH" --quiet; then
    log "Sauvegarde mongodump créée avec succès"
else
    error "Échec de la création de la sauvegarde"
    exit 1
fi

# Vérifier que la sauvegarde contient des données
BACKUP_SIZE=$(du -sb "$BACKUP_PATH" | cut -f1)
if [ "$BACKUP_SIZE" -lt 1024 ]; then
    warn "La sauvegarde semble anormalement petite ($BACKUP_SIZE bytes)"
fi

# Compression de la sauvegarde
log "Compression de la sauvegarde..."
cd "$BACKUP_DIR"
if tar -czf "mongodb_backup_$DATE.tar.gz" "mongodb_$DATE"; then
    log "Sauvegarde compressée: mongodb_backup_$DATE.tar.gz"
    
    # Supprimer le répertoire non compressé
    rm -rf "mongodb_$DATE"
    
    # Taille finale
    COMPRESSED_SIZE=$(du -h "mongodb_backup_$DATE.tar.gz" | cut -f1)
    log "Taille de la sauvegarde compressée: $COMPRESSED_SIZE"
else
    error "Échec de la compression"
    exit 1
fi

# Nettoyage des anciennes sauvegardes
log "Nettoyage des sauvegardes anciennes (> $RETENTION_DAYS jours)..."
OLD_BACKUPS=$(find "$BACKUP_DIR" -name "mongodb_backup_*.tar.gz" -type f -mtime +$RETENTION_DAYS | wc -l)
if [ "$OLD_BACKUPS" -gt 0 ]; then
    find "$BACKUP_DIR" -name "mongodb_backup_*.tar.gz" -type f -mtime +$RETENTION_DAYS -delete
    log "Supprimé $OLD_BACKUPS anciennes sauvegardes"
else
    log "Aucune ancienne sauvegarde à supprimer"
fi

# Vérification de l'intégrité (optionnel)
log "Vérification de l'intégrité de la sauvegarde..."
if tar -tzf "mongodb_backup_$DATE.tar.gz" > /dev/null 2>&1; then
    log "Intégrité de l'archive vérifiée ✓"
else
    error "L'archive semble corrompue"
    exit 1
fi

# Statistiques finales
TOTAL_BACKUPS=$(find "$BACKUP_DIR" -name "mongodb_backup_*.tar.gz" -type f | wc -l)
TOTAL_BACKUP_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
log "Nombre total de sauvegardes: $TOTAL_BACKUPS"
log "Espace utilisé par les sauvegardes: $TOTAL_BACKUP_SIZE"

# Test de restauration rapide (vérification)
log "Test de restauration (vérification)..."
TEST_DIR="/tmp/mongodb_restore_test_$$"
mkdir -p "$TEST_DIR"
cd "$TEST_DIR"

if tar -xzf "$BACKUP_DIR/mongodb_backup_$DATE.tar.gz" > /dev/null 2>&1; then
    RESTORED_COLLECTIONS=$(find . -name "*.bson" | wc -l)
    log "Test de restauration réussi: $RESTORED_COLLECTIONS fichiers .bson extraits"
    rm -rf "$TEST_DIR"
else
    warn "Échec du test de restauration"
    rm -rf "$TEST_DIR"
fi

# Notification par email (optionnel)
if command -v mail > /dev/null 2>&1 && [ -n "${ADMIN_EMAIL:-}" ]; then
    echo "Sauvegarde MongoDB terminée avec succès le $(date)" | \
    mail -s "Sauvegarde Political Analyzer - $(date +%Y-%m-%d)" "$ADMIN_EMAIL"
fi

# Métriques pour monitoring (format Prometheus/Grafana compatible)
cat > "$BACKUP_DIR/backup_metrics.txt" << EOF
# HELP mongodb_backup_timestamp_seconds Timestamp of last backup
# TYPE mongodb_backup_timestamp_seconds gauge
mongodb_backup_timestamp_seconds $(date +%s)

# HELP mongodb_backup_size_bytes Size of last backup in bytes
# TYPE mongodb_backup_size_bytes gauge
mongodb_backup_size_bytes $(stat -f%z "$BACKUP_DIR/mongodb_backup_$DATE.tar.gz" 2>/dev/null || stat -c%s "$BACKUP_DIR/mongodb_backup_$DATE.tar.gz")

# HELP mongodb_backup_collections_total Number of collections backed up
# TYPE mongodb_backup_collections_total gauge
mongodb_backup_collections_total $COLLECTIONS

# HELP mongodb_backup_success Last backup success status (1=success, 0=failure)
# TYPE mongodb_backup_success gauge
mongodb_backup_success 1
EOF

log "✅ Sauvegarde MongoDB terminée avec succès!"
log "Fichier: mongodb_backup_$DATE.tar.gz"
log "Répertoire: $BACKUP_DIR"

# Instructions de restauration
cat >> "$LOG_FILE" << EOF

📋 INSTRUCTIONS DE RESTAURATION:
1. Arrêter l'application: sudo supervisorctl stop all
2. Sauvegarder la base actuelle (optionnel): mongodump --db political_analyzer --out /tmp/backup_current
3. Supprimer la base actuelle: mongo political_analyzer --eval "db.dropDatabase()"
4. Extraire la sauvegarde: tar -xzf mongodb_backup_$DATE.tar.gz
5. Restaurer: mongorestore --db political_analyzer mongodb_$DATE/political_analyzer/
6. Redémarrer l'application: sudo supervisorctl start all
7. Vérifier: curl http://localhost:8001/api/health

EOF

exit 0