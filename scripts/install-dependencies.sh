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

# MongoDB
if systemctl is-active --quiet mongod; then
    log "MongoDB est déjà installé et actif. On passe à la suite. ✓" 
else
    log "Installation de MongoDB..."
    if lscpu | grep -qi "avx"; then
        # --- Processeur compatible AVX : Installation de MongoDB 6.0 ---
        log "CPU compatible AVX détecté. Installation de MongoDB 6.0..."
        curl -fsSL https://www.mongodb.org/static/pgp/server-6.0.asc | gpg --dearmor -o /usr/share/keyrings/mongodb-server-6.0.gpg
        echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-6.0.gpg ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/6.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-6.0.list # <-- CORRECTION: Ligne complète
        apt-get update
        apt-get install -y mongodb-org
    else
        # --- Processeur non compatible AVX : Installation de MongoDB 4.4 ---
        log "CPU non compatible AVX détecté. Installation de MongoDB 4.4..."
        wget -qO - https://www.mongodb.org/static/pgp/server-4.4.asc | apt-key add -
        echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/4.4 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-4.4.list # <-- CORRECTION: Ligne complète
        apt-get update
        apt-get install -y mongodb-org=4.4.29 mongodb-org-server=4.4.29 mongodb-org-shell=4.4.29 mongodb-org-mongos=4.4.29 mongodb-org-tools=4.4.29 # <-- CORRECTION: Ligne complète
        
        log "Blocage des paquets MongoDB à la version 4.4 pour éviter les mises à jour."
        echo "mongodb-org hold" | dpkg --set-selections
        echo "mongodb-org-server hold" | dpkg --set-selections
        echo "mongodb-org-shell hold" | dpkg --set-selections
        echo "mongodb-org-mongos hold" | dpkg --set-selections
        echo "mongodb-org-tools hold" | dpkg --set-selections
    fi
fi

# Nginx
log "Installation de Nginx..."
apt install -y nginx
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
warn "La commande 'ufw reset' va effacer toutes les règles existantes."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 'Nginx Full'
ufw allow from 127.0.0.1 to any port 27017 # <--  Plus sécurisé, n'autorise que le local pour Mongo
ufw --force enable
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
if ! grep -q "www-data soft nofile 65536" /etc/security/limits.conf; then
    cat >> /etc/security/limits.conf << EOF

# Limites pour l'application politique
www-data soft nofile 65536
www-data hard nofile 65536
EOF
fi

#  On ne modifie que la ligne bindIp dans mongod.conf.
log "Configuration de MongoDB pour écouter sur localhost uniquement..."
if grep -q "bindIp: 127.0.0.1" /etc/mongod.conf; then
    log "bindIp est déjà configuré dans mongod.conf."
else
    sed -i 's/bindIp: .*/bindIp: 127.0.0.1/' /etc/mongod.conf
fi

# Démarrer/Redémarrer MongoDB avec la configuration
systemctl enable mongod
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
}
EOF

# Tâche cron pour maintenance
log "Configuration des tâches de maintenance..."
CRON_FILE="/etc/cron.d/political-analyzer"
cat > "$CRON_FILE" << EOF
# Tâches de maintenance pour Political Analyzer
0 2 * * * www-data /opt/political-analyzer/scripts/backup-mongodb.sh >> /opt/political-analyzer/logs/backup.log 2>&1
0 4 * * 0 www-data /opt/political-analyzer/scripts/cleanup-logs.sh >> /opt/political-analyzer/logs/cleanup.log 2>&1
EOF
chmod 0644 "$CRON_FILE"

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
info "├── MongoDB (port 27017, local seulement)"
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

server {
    listen 80;
    server_name jordy.codesieg.fr;
    root /var/www/html/jordi/htdocs/;

    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-XSS-Protection "1; mode=block";
    add_header X-Content-Type-Options "nosniff";

    index index.html index.htm index.php;

    charset utf-8;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location = /favicon.ico { access_log off; log_not_found off; }
    location = /robots.txt  { access_log off; log_not_found off; }

    error_page 404 /index.php;

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php7.4-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }
}