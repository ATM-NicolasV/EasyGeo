# 📊 Guide de Déploiement Linux - Application d'Analyse Politique

## 🌟 Vue d'ensemble

Application complète d'analyse politique automatisée avec :
- **Backend FastAPI** (Python) avec scraping automatique
- **Frontend React** avec interface moderne
- **MongoDB** pour stockage des données
- **Claude AI** pour génération de synthèses
- **Scraping automatisé** Le Monde, BFM Business, Blast
- **Classification thématique** : politique, géopolitique, tech, complotisme

---

## 🚀 Configuration Serveur Linux

### Prérequis Système
```bash
# Ubuntu/Debian 20.04+ recommandé
sudo apt update && sudo apt upgrade -y

# Outils essentiels
sudo apt install -y git curl wget build-essential software-properties-common
sudo apt install -y nginx supervisor htop ufw
```

### Installation Python 3.9+
```bash
# Python et pip
sudo apt install -y python3.9 python3.9-pip python3.9-venv python3.9-dev
sudo update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.9 1
sudo update-alternatives --install /usr/bin/pip3 pip3 /usr/bin/pip3.9 1
```

### Installation Node.js 18+
```bash
# Via NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Installer Yarn globalement
sudo npm install -g yarn
```

### Installation MongoDB 6.0+
```bash
# Import de la clé GPG publique
curl -fsSL https://www.mongodb.org/static/pgp/server-6.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-6.0.gpg --dearmor

# Ajouter le repository MongoDB
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-6.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# Installation
sudo apt update
sudo apt install -y mongodb-org

# Démarrage et activation
sudo systemctl start mongod
sudo systemctl enable mongod
```

---

## 📁 Structure de Déploiement

```
/opt/political-analyzer/
├── app/                    # Code source de l'application
│   ├── backend/           # API FastAPI Python
│   ├── frontend/          # Interface React
│   └── deployment/        # Scripts de déploiement
├── logs/                  # Logs de l'application
├── backups/              # Sauvegardes MongoDB
└── scripts/              # Scripts de maintenance
```

---

## 💾 Déploiement de l'Application

### 1. Clonage et Configuration
```bash
# Créer le répertoire de déploiement
sudo mkdir -p /opt/political-analyzer
sudo chown $USER:$USER /opt/political-analyzer

# Cloner votre code (remplacez par votre repo)
cd /opt/political-analyzer
git clone <VOTRE_REPO_GITHUB> app
cd app
```

### 2. Configuration Backend
```bash
cd /opt/political-analyzer/app/backend

# Créer l'environnement virtuel Python
python3 -m venv venv
source venv/bin/activate

# Installer les dépendances
pip install -r requirements.txt

# Configuration .env
cp .env.example .env  # Si vous avez un .env.example
# Ou créer directement .env avec les bonnes valeurs
```

### 3. Configuration Frontend
```bash
cd /opt/political-analyzer/app/frontend

# Installer les dépendances
yarn install

# Configuration .env
cp .env.example .env  # Si vous avez un .env.example
```

---

## ⚙️ Configuration des Services

### 1. Configuration Supervisor
```bash
# Créer les fichiers de configuration (voir deployment/supervisor/)
sudo cp deployment/supervisor/*.conf /etc/supervisor/conf.d/

# Recharger supervisor
sudo supervisorctl reread
sudo supervisorctl update
```

### 2. Configuration Nginx
```bash
# Copier la configuration nginx
sudo cp deployment/nginx/political-analyzer.conf /etc/nginx/sites-available/

# Activer le site
sudo ln -s /etc/nginx/sites-available/political-analyzer.conf /etc/nginx/sites-enabled/

# Tester la configuration
sudo nginx -t

# Recharger nginx
sudo systemctl reload nginx
```

### 3. Configuration Firewall
```bash
# Configuration UFW
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
```

---

## 🔑 Variables d'Environnement

### Backend (.env)
```bash
# MongoDB
MONGO_URL=mongodb://localhost:27017
DB_NAME=political_analyzer

# AI Configuration
ANTHROPIC_API_KEY=votre_cle_anthropic_ici

# Security
JWT_SECRET_KEY=votre_cle_jwt_super_secrete_ici

# Environment
ENVIRONMENT=production
DEBUG=false
```

### Frontend (.env)
```bash
# API Backend URL (ajustez selon votre domaine)
REACT_APP_BACKEND_URL=https://votre-domaine.com

# Environment
NODE_ENV=production
```

---

## 🔧 Scripts de Déploiement

### Déploiement Initial
```bash
# Exécuter le script de déploiement
chmod +x deployment/deploy.sh
./deployment/deploy.sh
```

### Mise à Jour
```bash
# Script de mise à jour
chmod +x deployment/update.sh
./deployment/update.sh
```

---

## 📊 Monitoring et Maintenance

### Commandes de Gestion
```bash
# Status des services
sudo supervisorctl status

# Redémarrer l'application
sudo supervisorctl restart all

# Logs en temps réel
sudo supervisorctl tail -f backend stderr
sudo supervisorctl tail -f frontend stderr
```

### Sauvegarde MongoDB
```bash
# Sauvegarde manuelle
chmod +x scripts/backup-mongodb.sh
./scripts/backup-mongodb.sh

# Configuration sauvegarde automatique via cron
sudo crontab -e
# Ajouter: 0 2 * * * /opt/political-analyzer/scripts/backup-mongodb.sh
```

### Logs de l'Application
```bash
# Logs backend
tail -f logs/backend.log

# Logs frontend
tail -f logs/frontend.log

# Logs nginx
sudo tail -f /var/log/nginx/political-analyzer.access.log
sudo tail -f /var/log/nginx/political-analyzer.error.log
```

---

## 🌐 Configuration Domaine et SSL

### Configuration DNS
```bash
# Pointez votre domaine vers l'IP du serveur
# A record: votre-domaine.com -> IP_SERVEUR
# CNAME record: www -> votre-domaine.com
```

### SSL avec Let's Encrypt
```bash
# Installation certbot
sudo apt install -y certbot python3-certbot-nginx

# Génération certificat SSL
sudo certbot --nginx -d votre-domaine.com -d www.votre-domaine.com

# Auto-renouvellement
sudo crontab -e
# Ajouter: 0 12 * * * /usr/bin/certbot renew --quiet
```

---

## 🔍 Vérification du Déploiement

### Tests Post-Déploiement
```bash
# Vérifier les services
curl -X GET https://votre-domaine.com/api/health

# Tester le scraping
curl -X POST https://votre-domaine.com/api/init-default-sources

# Vérifier la génération de synthèse
curl -X GET https://votre-domaine.com/api/daily-synthesis
```

### Points de Contrôle
- [ ] Backend répond sur `/api/health`
- [ ] Frontend accessible sur la racine `/`
- [ ] MongoDB connecté et opérationnel
- [ ] Sources par défaut initialisées
- [ ] Glossaire généré automatiquement
- [ ] SSL/HTTPS configuré
- [ ] Logs rotationnels configurés
- [ ] Sauvegardes automatiques activées

---

## ⚠️ Dépannage

### Erreurs Communes

#### Backend ne démarre pas
```bash
# Vérifier les logs
sudo supervisorctl tail backend stderr

# Vérifier MongoDB
sudo systemctl status mongod

# Tester la connection
python3 -c "from pymongo import MongoClient; print(MongoClient().admin.command('ping'))"
```

#### Frontend ne build pas
```bash
# Vérifier Node.js et Yarn
node --version
yarn --version

# Nettoyer et réinstaller
cd frontend && rm -rf node_modules yarn.lock
yarn install
```

#### Problèmes de permissions
```bash
# Corriger les permissions
sudo chown -R www-data:www-data /opt/political-analyzer
sudo chmod -R 755 /opt/political-analyzer
```

---

## 📞 Support et Maintenance

### Maintenance Régulière
- **Quotidienne** : Vérifier les logs d'erreur
- **Hebdomadaire** : Contrôler l'espace disque et les performances
- **Mensuelle** : Mettre à jour les dépendances de sécurité
- **Trimestrielle** : Tester les sauvegardes et le plan de reprise

### Contact
- 📧 Email : support@votre-domaine.com
- 📱 Monitoring : Configurez des alertes via des services comme UptimeRobot
- 📊 Analytics : Intégrez Google Analytics si nécessaire

---

*Guide créé pour le déploiement production de l'Application d'Analyse Politique - Version 2.0*