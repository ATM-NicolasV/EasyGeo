#!/bin/bash
# Script d'installation des dépendances pour Ubuntu/Debian
# Usage: sudo ./install-dependencies.sh

set -e

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

# Vérifier les privilèges root
if [ "$EUID" -ne 0 ]; then
    error "Ce script doit être exécuté avec sudo"
    exit 1
fi

log "🚀 Installation des dépendances pour l'Application d'Analyse Politique"
log "OS détecté: $(lsb_release -d | cut -f2)"

# Mise à jour du système
log "Mise à jour du système..."
apt update && apt upgrade -y

# Outils essentiels
log "Installation des outils essentiels..."
apt install -y \
    curl \
    wget \
    git \
    build-essential \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release \
    htop \
    nano \
    unzip \
    tree \
    jq

# Python 3.9+
log "Installation de Python 3.9+..."
apt install -y \
    python3 \
    python3-pip \
    python3-venv \
    python3-dev \
    python3-setuptools \
    python3-wheel

# Vérifier la version Python
PYTHON_VERSION=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1-2)
if python3 -c "import sys; exit(0 if sys.version_info >= (3, 9) else 1)"; then
    log "Python $PYTHON_VERSION installé ✓"
else
    warn "Python version trop ancienne, installation de Python 3.9..."
    add-apt-repository ppa:deadsnakes/ppa -y
    apt update
    apt install -y python3.9 python3.9-venv python3.9-dev python3.9-distutils
    update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.9 1
fi

# Node.js 18+
log "Installation de Node.js 18+..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -ge 18 ]; then
    log "Node.js $(node --version) installé ✓"
else
    error "Node.js version insuffisante"
    exit 1
fi

# Yarn
log "Installation de Yarn..."
if ! command -v yarn &> /dev/null; then
    npm install -g yarn
fi
log "Yarn $(yarn --version) installé ✓"

# MongoDB 6.0+
log "Installation de MongoDB 6.0+..."
if ! command -v mongod &> /dev/null; then
    # Import GPG key
    curl -fsSL https://www.mongodb.org/static/pgp/server-6.0.asc | gpg --dearmor -o /usr/share/keyrings/mongodb-server-6.0.gpg

    # Add repository
    echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-6.0.gpg ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/6.0 multiverse" > /etc/apt/sources.list.d/mongodb-org-6.0.list

    # Install
    apt update
    apt install -y mongodb-org

    # Configure
    systemctl enable mongod
    systemctl start mongod
fi

if systemctl is-active --quiet mongod; then
    log "MongoDB installé et démarré ✓"
else
    error "Problème avec MongoDB"
    exit 1
fi

# Nginx
log "Installation de Nginx..."
apt install -y nginx

# Configuration de base Nginx
if [ ! -f "/etc/nginx/nginx.conf.backup" ]; then
    cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup
fi

systemctl enable nginx
systemctl start nginx
log "Nginx installé ✓"

# Supervisor
log "Installation de Supervisor..."
apt install -y supervisor

systemctl enable supervisor
systemctl start supervisor
log "Supervisor installé ✓"

# Certbot pour SSL (optionnel)
log "Installation de Certbot pour SSL..."
apt install -y certbot python3-certbot-nginx
log "Certbot installé ✓"

# UFW Firewall
log "Configuration du firewall UFW..."
apt install -y ufw

# Configuration de base
ufw --force reset
ufw default deny incoming
ufw default allow outgoing

# Autoriser SSH, HTTP et HTTPS
ufw allow ssh
ufw allow 'Nginx Full'
ufw allow 27017  # MongoDB (à restreindre en production)

log "Firewall configuré ✓"

# Utilisateur www-data
log "Configuration de l'utilisateur www-data..."
usermod -s /bin/bash www-data
mkdir -p /var/www
chown www-data:www-data /var/www

# Création des répertoires de base
log "Création des répertoires de l'application..."
mkdir -p /opt/political-analyzer/{app,logs,backups,scripts}
chown -R www-data:www-data /opt/political-analyzer

# Optimisations système
log "Optimisations système..."

# Augmenter les limites de fichiers ouverts
cat >> /etc/security/limits.conf << EOF

# Limites pour l'application politique
www-data soft nofile 65536
www-data hard nofile 65536
EOF

# Optimisations MongoDB
cat > /etc/mongod.conf << EOF
# Configuration MongoDB pour Political Analyzer

storage:
  dbPath: /var/lib/mongodb
  journal:
    enabled: true

systemLog:
  destination: file
  logAppend: true
  path: /var/log/mongodb/mongod.log
  logRotate: rename

net:
  port: 27017
  bindIp: 127.0.0.1

processManagement:
  fork: true
  pidFilePath: /var/run/mongodb/mongod.pid

# Sécurité
security:
  authorization: disabled  # À activer avec des utilisateurs en production

# Performance
operationProfiling:
  slowOpThresholdMs: 100
  mode: slowOp
EOF

# Redémarrer MongoDB avec la nouvelle configuration
systemctl restart mongod

# Configuration logrotate
log "Configuration de la rotation des logs..."
cat > /etc/logrotate.d/political-analyzer << EOF
/opt/political-analyzer/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    copytruncate
    postrotate
        supervisorctl restart all > /dev/null 2>&1 || true
    endscript
}
EOF

# Tâche cron pour maintenance
log "Configuration des tâches de maintenance..."
(crontab -l -u www-data 2>/dev/null || true; echo "# Political Analyzer maintenance") | crontab -u www-data -
(crontab -l -u www-data; echo "0 2 * * * /opt/political-analyzer/scripts/backup-mongodb.sh >> /opt/political-analyzer/logs/backup.log 2>&1") | crontab -u www-data -
(crontab -l -u www-data; echo "0 4 * * 0 /opt/political-analyzer/scripts/cleanup-logs.sh >> /opt/political-analyzer/logs/cleanup.log 2>&1") | crontab -u www-data -

# Script de nettoyage des logs
cat > /opt/political-analyzer/scripts/cleanup-logs.sh << 'EOF'
#!/bin/bash
# Nettoyage hebdomadaire des logs volumineux

LOG_DIR="/opt/political-analyzer/logs"
find "$LOG_DIR" -name "*.log" -size +100M -exec truncate -s 50M {} \;
find "$LOG_DIR" -name "*.log.*" -mtime +7 -delete
echo "$(date): Logs nettoyés"
EOF

chmod +x /opt/political-analyzer/scripts/cleanup-logs.sh
chown www-data:www-data /opt/political-analyzer/scripts/cleanup-logs.sh

# Vérification finale
log "Vérification finale des services..."
systemctl is-active --quiet mongod && log "MongoDB: ✓" || error "MongoDB: ✗"
systemctl is-active --quiet nginx && log "Nginx: ✓" || error "Nginx: ✗"
systemctl is-active --quiet supervisor && log "Supervisor: ✓" || error "Supervisor: ✗"

# Résumé
log "✅ Installation terminée avec succès!"
echo ""
info "📦 Logiciels installés:"
info "├── Python: $(python3 --version)"
info "├── Node.js: $(node --version)"
info "├── Yarn: $(yarn --version)"
info "├── MongoDB: $(mongod --version | head -1)"
info "├── Nginx: $(nginx -v 2>&1)"
info "└── Supervisor: $(supervisord --version)"
echo ""
info "🔧 Services démarrés:"
info "├── MongoDB (port 27017)"
info "├── Nginx (ports 80, 443)"
info "└── Supervisor"
echo ""
info "📁 Répertoires créés:"
info "├── /opt/political-analyzer/app (code source)"
info "├── /opt/political-analyzer/logs (logs)"
info "├── /opt/political-analyzer/backups (sauvegardes)"
info "└── /opt/political-analyzer/scripts (scripts maintenance)"
echo ""
warn "🔑 Étapes suivantes:"
warn "1. Clonez votre code dans /opt/political-analyzer/app"
warn "2. Exécutez le script de déploiement: ./deployment/deploy.sh"
warn "3. Configurez vos clés API dans les fichiers .env"
warn "4. Configurez votre domaine dans Nginx"
warn "5. Configurez SSL avec: certbot --nginx -d votre-domaine.com"
echo ""
log "🎉 Serveur prêt pour le déploiement de l'Application d'Analyse Politique!"