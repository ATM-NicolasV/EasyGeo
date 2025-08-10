#!/bin/bash
# Script de mise à jour pour l'Application d'Analyse Politique
# Usage: ./update.sh

set -e

# Variables
APP_DIR="/opt/political-analyzer/app"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"
LOG_DIR="/opt/political-analyzer/logs"
BACKUP_DIR="/opt/political-analyzer/backups"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

log "🔄 Début de la mise à jour de l'Application d'Analyse Politique..."

# Vérification des prérequis
if [ ! -d "$APP_DIR" ]; then
    error "Répertoire d'application non trouvé: $APP_DIR"
    exit 1
fi

if [ ! -d "$BACKEND_DIR/venv" ]; then
    error "Environnement virtuel Python non trouvé"
    exit 1
fi

# Sauvegarde préventive
log "Sauvegarde préventive de la base de données..."
if [ -x "/opt/political-analyzer/scripts/backup-mongodb.sh" ]; then
    /opt/political-analyzer/scripts/backup-mongodb.sh
else
    warn "Script de sauvegarde non trouvé, création d'une sauvegarde manuelle..."
    DATE=$(date +%Y%m%d_%H%M%S)
    mkdir -p "$BACKUP_DIR"
    mongodump --db political_analyzer --out "$BACKUP_DIR/pre_update_$DATE" || warn "Sauvegarde échouée"
fi

# Arrêt des services
log "Arrêt des services de l'application..."
sudo supervisorctl stop political-analyzer-backend political-analyzer-scheduler || true

# Sauvegarde des fichiers de configuration
log "Sauvegarde des configurations..."
cp "$BACKEND_DIR/.env" "$BACKUP_DIR/.env.backup.$(date +%Y%m%d_%H%M%S)" 2>/dev/null || true
cp "$FRONTEND_DIR/.env" "$BACKUP_DIR/frontend.env.backup.$(date +%Y%m%d_%H%M%S)" 2>/dev/null || true

# Mise à jour du code source
log "Mise à jour du code source..."
cd "$APP_DIR"

# Vérifier s'il y a des modifications locales
if git diff --quiet && git diff --cached --quiet; then
    log "Pas de modifications locales détectées"
else
    warn "Modifications locales détectées, création d'un stash..."
    git stash push -m "Auto-stash before update $(date)"
fi

# Récupérer les dernières modifications
git fetch origin
CURRENT_BRANCH=$(git branch --show-current)
git pull origin "$CURRENT_BRANCH"

# Mise à jour du backend
log "Mise à jour du backend..."
cd "$BACKEND_DIR"

# Activer l'environnement virtuel
source venv/bin/activate

# Mettre à jour pip
pip install --upgrade pip

# Installer/mettre à jour les dépendances
if [ -f "requirements.txt" ]; then
    log "Installation des dépendances Python..."
    pip install --upgrade -r requirements.txt
else
    warn "requirements.txt non trouvé"
fi

# Mise à jour du frontend
log "Mise à jour du frontend..."
cd "$FRONTEND_DIR"

# Vérifier yarn.lock pour éviter les conflits
if [ -f "yarn.lock" ]; then
    log "Installation des dépendances Node.js..."
    yarn install --frozen-lockfile
else
    warn "yarn.lock non trouvé, installation normale..."
    yarn install
fi

# Build de production
log "Build du frontend en mode production..."
yarn build

# Vérifications post-mise à jour
log "Vérifications post-mise à jour..."

# Vérifier que MongoDB est accessible
if python3 -c "from pymongo import MongoClient; MongoClient().admin.command('ping')" 2>/dev/null; then
    log "MongoDB accessible ✓"
else
    error "MongoDB non accessible"
    exit 1
fi

# Test rapide du backend (sans le démarrer)
cd "$BACKEND_DIR"
source venv/bin/activate
if python3 -c "import server" 2>/dev/null; then
    log "Backend importable ✓"
else
    error "Erreur dans le code backend"
    exit 1
fi

# Redémarrage des services
log "Redémarrage des services..."
sudo supervisorctl start political-analyzer-backend
sleep 5
sudo supervisorctl start political-analyzer-scheduler

# Rechargement de nginx
log "Rechargement de Nginx..."
sudo systemctl reload nginx

# Vérification que les services sont opérationnels
log "Vérification des services..."
sleep 10

# Test backend
if curl -f -s http://localhost:8001/api/health > /dev/null; then
    log "Backend API opérationnel ✓"
else
    error "Backend API non accessible, vérifiez les logs"
    info "Logs backend: sudo supervisorctl tail political-analyzer-backend stderr"
fi

# Test frontend
if curl -f -s http://localhost/ > /dev/null; then
    log "Frontend opérationnel ✓"
else
    error "Frontend non accessible, vérifiez la configuration Nginx"
fi

# Nettoyage
log "Nettoyage des fichiers temporaires..."
cd "$FRONTEND_DIR"
rm -rf node_modules/.cache 2>/dev/null || true

cd "$BACKEND_DIR"
find . -name "*.pyc" -delete 2>/dev/null || true
find . -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true

# Rotation des logs
log "Rotation des logs..."
find "$LOG_DIR" -name "*.log" -size +100M -exec truncate -s 0 {} \; 2>/dev/null || true

# Résumé
log "✅ Mise à jour terminée avec succès!"
echo ""
info "📊 Statut des services:"
sudo supervisorctl status political-analyzer-backend political-analyzer-scheduler
echo ""
info "🔍 Pour vérifier les logs en cas de problème:"
info "  Backend: sudo supervisorctl tail -f political-analyzer-backend stderr"
info "  Scheduler: sudo supervisorctl tail -f political-analyzer-scheduler stderr"
info "  Nginx: sudo tail -f /var/log/nginx/error.log"
echo ""
log "🎉 L'Application d'Analyse Politique a été mise à jour avec succès!"