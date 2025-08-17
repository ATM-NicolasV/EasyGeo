#!/bin/bash
# Script de déploiement initial pour l'Application d'Analyse Politique
# Usage: ./deploy.sh

set -e  # Arrêter le script en cas d'erreur

echo "🚀 Début du déploiement de l'Application d'Analyse Politique..."

# Variables
APP_DIR="/opt/political-analyzer"
BACKEND_DIR="$APP_DIR/app/backend"
FRONTEND_DIR="$APP_DIR/app/frontend"
LOG_DIR="$APP_DIR/logs"
BACKUP_DIR="$APP_DIR/backups"
SCRIPTS_DIR="$APP_DIR/scripts"

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Fonction pour vérifier si une commande existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Vérification des prérequis
log "Vérification des prérequis..."

if ! command_exists python3; then
    error "Python3 n'est pas installé"
    exit 1
fi

if ! command_exists node; then
    error "Node.js n'est pas installé"
    exit 1
fi

if ! command_exists yarn; then
    error "Yarn n'est pas installé"
    exit 1
fi

if ! command_exists mongod; then
    error "MongoDB n'est pas installé"
    exit 1
fi

if ! command_exists nginx; then
    error "Nginx n'est pas installé"
    exit 1
fi

if ! command_exists supervisord; then
    error "Supervisor n'est pas installé"
    exit 1
fi

log "Tous les prérequis sont satisfaits ✓"

# Création des répertoires
log "Création des répertoires de déploiement..."
sudo mkdir -p "$LOG_DIR" "$BACKUP_DIR" "$SCRIPTS_DIR"
sudo chown -R $USER:$USER "$APP_DIR"

# Configuration Backend
log "Configuration du backend..."
cd "$BACKEND_DIR"

# Vérification du fichier requirements.txt
if [ ! -f "requirements.txt" ]; then
    error "Le fichier requirements.txt n'existe pas dans $BACKEND_DIR"
    exit 1
fi

# Créer l'environnement virtuel
if [ ! -d "venv" ]; then
    log "Création de l'environnement virtuel Python..."
    python3 -m venv venv
fi

# Activer l'environnement virtuel et installer les dépendances
log "Installation des dépendances Python..."
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Vérification du fichier .env
if [ ! -f ".env" ]; then
    warn "Le fichier .env n'existe pas, création d'un template..."
    cat > .env << EOF
# MongoDB Configuration
MONGO_URL=mongodb://localhost:27017
DB_NAME=political_analyzer

# AI Configuration - IMPORTANT: Configurez votre clé Anthropic
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Security
JWT_SECRET_KEY=$(openssl rand -base64 64)

# Environment
ENVIRONMENT=production
DEBUG=false
LOG_LEVEL=INFO

# Server Configuration
HOST=0.0.0.0
PORT=8001
EOF
    warn "⚠️  IMPORTANT: Modifiez le fichier .env avec votre clé Anthropic API!"
fi

# Configuration Frontend
log "Configuration du frontend..."
cd "$FRONTEND_DIR"

# Vérification du fichier package.json
if [ ! -f "package.json" ]; then
    error "Le fichier package.json n'existe pas dans $FRONTEND_DIR"
    exit 1
fi

# Installation des dépendances
log "Installation des dépendances Node.js..."
yarn install

# Vérification du fichier .env
if [ ! -f ".env" ]; then
    warn "Le fichier .env frontend n'existe pas, création d'un template..."
    cat > .env << EOF
# Backend API URL - Ajustez selon votre domaine
REACT_APP_BACKEND_URL=http://localhost:8001

# Environment
NODE_ENV=production
GENERATE_SOURCEMAP=false
EOF
    warn "⚠️  IMPORTANT: Modifiez REACT_APP_BACKEND_URL avec votre domaine!"
fi

# Build du frontend pour production
log "Build du frontend en mode production..."
yarn build

# Vérification que MongoDB est démarré
log "Vérification de MongoDB..."
if ! systemctl is-active --quiet mongod; then
    log "Démarrage de MongoDB..."
    sudo systemctl start mongod
    sudo systemctl enable mongod
fi

# Attendre que MongoDB soit prêt
log "Attente que MongoDB soit prêt..."
sleep 5

# Test de connexion MongoDB
if python3 -c "from pymongo import MongoClient; MongoClient().admin.command('ping')" 2>/dev/null; then
    log "MongoDB est opérationnel ✓"
else
    error "Impossible de se connecter à MongoDB"
    exit 1
fi

# Configuration Supervisor
log "Configuration de Supervisor..."
sudo cp "$APP_DIR/app/deployment/supervisor"/*.conf /etc/supervisor/conf.d/ 2>/dev/null || warn "Fichiers supervisor non trouvés, créons-les..."

# Créer les fichiers supervisor s'ils n'existent pas
if [ ! -f "/etc/supervisor/conf.d/political-analyzer-backend.conf" ]; then
    log "Création de la configuration Supervisor pour le backend..."
    sudo tee /etc/supervisor/conf.d/political-analyzer-backend.conf > /dev/null << EOF
[program:political-analyzer-backend]
command=$BACKEND_DIR/venv/bin/python -m uvicorn server:app --host 0.0.0.0 --port 8001
directory=$BACKEND_DIR
user=www-data
autostart=true
autorestart=true
startsecs=10
startretries=3
stderr_logfile=$LOG_DIR/backend.error.log
stdout_logfile=$LOG_DIR/backend.log
environment=PYTHONPATH="$BACKEND_DIR"
EOF
fi

if [ ! -f "/etc/supervisor/conf.d/political-analyzer-scheduler.conf" ]; then
    log "Création de la configuration Supervisor pour le scheduler..."
    sudo tee /etc/supervisor/conf.d/political-analyzer-scheduler.conf > /dev/null << EOF
[program:political-analyzer-scheduler]
command=$BACKEND_DIR/venv/bin/python scheduler.py
directory=$BACKEND_DIR
user=www-data
autostart=true
autorestart=true
startsecs=10
startretries=3
stderr_logfile=$LOG_DIR/scheduler.error.log
stdout_logfile=$LOG_DIR/scheduler.log
environment=PYTHONPATH="$BACKEND_DIR"
EOF
fi

# Configuration Nginx
log "Configuration de Nginx..."
if [ ! -f "/etc/nginx/sites-available/political-analyzer" ]; then
    log "Création de la configuration Nginx..."
    sudo tee /etc/nginx/sites-available/political-analyzer > /dev/null << EOF
server {
    listen 80;
    server_name localhost;  # Remplacez par votre domaine

    # Logs
    access_log $LOG_DIR/nginx.access.log;
    error_log $LOG_DIR/nginx.error.log;

    # Frontend - Servir les fichiers statiques React
    location / {
        root $FRONTEND_DIR/build;
        index index.html;
        try_files \$uri \$uri/ /index.html;
        
        # Headers pour les assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Backend API - Proxy vers FastAPI
    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }

    # Websockets support (si nécessaire)
    location /ws {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    # Sécurité
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
EOF

    # Activer le site
    sudo ln -s /etc/nginx/sites-available/political-analyzer /etc/nginx/sites-enabled/ 2>/dev/null || true
    
    # Désactiver le site par défaut
    sudo rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
fi

# Test de la configuration Nginx
log "Test de la configuration Nginx..."
if sudo nginx -t; then
    log "Configuration Nginx valide ✓"
else
    error "Configuration Nginx invalide"
    exit 1
fi

# Ajuster les permissions
log "Ajustement des permissions..."
sudo chown -R www-data:www-data "$APP_DIR"
sudo chmod -R 755 "$APP_DIR"

# Recharger les services
log "Rechargement des services..."
sudo supervisorctl reread
sudo supervisorctl update
sudo systemctl reload nginx

# Démarrer les services
log "Démarrage des services de l'application..."
sudo supervisorctl start political-analyzer-backend
sudo supervisorctl start political-analyzer-scheduler

# Attendre le démarrage
sleep 10

# Vérification du déploiement
log "Vérification du déploiement..."

# Test backend
if curl -f -s http://localhost:8001/api/health > /dev/null; then
    log "Backend API opérationnel ✓"
else
    warn "Backend API non accessible, vérifiez les logs"
fi

# Test frontend
if curl -f -s http://localhost/ > /dev/null; then
    log "Frontend opérationnel ✓"
else
    warn "Frontend non accessible, vérifiez la configuration Nginx"
fi

# Initialisation des données
log "Initialisation des sources par défaut..."
cd "$BACKEND_DIR"
source venv/bin/activate
python3 -c "
import asyncio
import sys
sys.path.append('$BACKEND_DIR')
from server import app
import httpx

async def init_data():
    async with httpx.AsyncClient() as client:
        try:
            # Initialiser les sources par défaut
            response = await client.post('http://localhost:8001/api/init-default-sources')
            print('Sources initialisées:', response.status_code)
            
            # Générer le glossaire automatique
            response = await client.post('http://localhost:8001/api/auto-glossary')
            print('Glossaire généré:', response.status_code)
            
        except Exception as e:
            print('Erreur initialisation:', e)

asyncio.run(init_data())
"

# Création des scripts de maintenance
log "Création des scripts de maintenance..."
cat > "$SCRIPTS_DIR/backup-mongodb.sh" << 'EOF'
#!/bin/bash
# Script de sauvegarde MongoDB

BACKUP_DIR="/opt/political-analyzer/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="political_analyzer"

echo "Début de la sauvegarde MongoDB - $DATE"

# Créer la sauvegarde
mongodump --db $DB_NAME --out "$BACKUP_DIR/$DATE"

# Compresser
cd "$BACKUP_DIR"
tar -czf "mongodb_backup_$DATE.tar.gz" "$DATE"
rm -rf "$DATE"

# Garder seulement les 30 dernières sauvegardes
find "$BACKUP_DIR" -name "mongodb_backup_*.tar.gz" -type f -mtime +30 -delete

echo "Sauvegarde terminée: mongodb_backup_$DATE.tar.gz"
EOF

chmod +x "$SCRIPTS_DIR/backup-mongodb.sh"

cat > "$SCRIPTS_DIR/update-app.sh" << 'EOF'
#!/bin/bash
# Script de mise à jour de l'application

set -e

APP_DIR="/opt/political-analyzer/app"
LOG_DIR="/opt/political-analyzer/logs"

echo "Début de la mise à jour..."

# Sauvegarder avant mise à jour
/opt/political-analyzer/scripts/backup-mongodb.sh

cd "$APP_DIR"

# Arrêter les services
sudo supervisorctl stop political-analyzer-backend political-analyzer-scheduler

# Mettre à jour le code
git pull origin main

# Backend
cd backend
source venv/bin/activate
pip install --upgrade -r requirements.txt

# Frontend
cd ../frontend
yarn install --frozen-lockfile
yarn build

# Redémarrer les services
sudo supervisorctl start political-analyzer-backend political-analyzer-scheduler
sudo systemctl reload nginx

echo "Mise à jour terminée avec succès"
EOF

chmod +x "$SCRIPTS_DIR/update-app.sh"

# Rapport final
log "🎉 Déploiement terminé avec succès!"
echo ""
info "📊 Résumé du déploiement:"
info "├── Backend API: http://localhost:8001"
info "├── Frontend: http://localhost/"
info "├── Logs: $LOG_DIR/"
info "├── Sauvegardes: $BACKUP_DIR/"
info "└── Scripts: $SCRIPTS_DIR/"
echo ""
warn "🔧 Actions requises:"
warn "1. Modifiez $BACKEND_DIR/.env avec votre clé Anthropic API"
warn "2. Modifiez $FRONTEND_DIR/.env avec votre domaine"
warn "3. Configurez votre domaine dans /etc/nginx/sites-available/political-analyzer"
warn "4. Configurez SSL avec Let's Encrypt si nécessaire"
echo ""
log "🚀 Votre Application d'Analyse Politique est maintenant déployée!"
log "📚 Consultez DEPLOY_LINUX.md pour plus d'informations"