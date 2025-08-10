# 🚀 Quick Start - Déploiement Application d'Analyse Politique

## ⚡ Déploiement Rapide (5 minutes)

### 1. Préparation du serveur Linux
```bash
# Connectez-vous à votre serveur Linux (Ubuntu/Debian)
ssh user@votre-serveur.com

# Clonez votre application
git clone <VOTRE_REPO> /opt/political-analyzer/app
cd /opt/political-analyzer/app

# Rendez les scripts exécutables
chmod +x scripts/*.sh deployment/*.sh
```

### 2. Installation automatique des dépendances
```bash
# Installation complète (Python, Node.js, MongoDB, Nginx, etc.)
sudo ./scripts/install-dependencies.sh
```

### 3. Déploiement de l'application
```bash
# Déploiement automatique
./deployment/deploy.sh
```

### 4. Configuration des clés API
```bash
# Éditez le fichier .env backend
nano backend/.env

# Ajoutez votre clé Anthropic
ANTHROPIC_API_KEY=votre_cle_anthropic_ici

# Éditez le fichier .env frontend
nano frontend/.env

# Ajoutez votre domaine
REACT_APP_BACKEND_URL=https://votre-domaine.com
```

### 5. Redémarrage des services
```bash
# Redémarrer avec les nouvelles configurations
sudo supervisorctl restart all
```

---

## 🌐 Configuration Domaine + SSL (optionnel)

### Configuration rapide SSL
```bash
# Configuration automatique SSL avec Let's Encrypt
sudo ./scripts/setup-ssl.sh votre-domaine.com admin@votre-domaine.com
```

---

## ✅ Vérifications Post-Déploiement

### Tests rapides
```bash
# Santé de l'API
curl https://votre-domaine.com/api/health

# Initialiser les sources par défaut
curl -X POST https://votre-domaine.com/api/init-default-sources

# Générer le glossaire automatique  
curl -X POST https://votre-domaine.com/api/auto-glossary

# Tester le scraping manuel
curl -X POST https://votre-domaine.com/api/admin/scrape/manual \
  -H "Authorization: Bearer admin_token"
```

### Vérifier les services
```bash
# Statut des services
sudo supervisorctl status

# Logs en temps réel
sudo supervisorctl tail -f backend stderr
```

---

## 📊 Accès à l'Application

- **Frontend**: https://votre-domaine.com
- **API**: https://votre-domaine.com/api/health
- **Admin**: https://votre-domaine.com/admin
  - Email: admin@easygeo.com
  - Mot de passe: admin123

---

## 🛠 Maintenance

### Mise à jour
```bash
./deployment/update.sh
```

### Sauvegarde
```bash
/opt/political-analyzer/scripts/backup-mongodb.sh
```

### Logs
```bash
tail -f /opt/political-analyzer/logs/backend.log
tail -f /opt/political-analyzer/logs/scheduler.log
```

---

## 🆘 Dépannage Rapide

### Services non démarrés
```bash
sudo supervisorctl restart all
sudo systemctl restart nginx
```

### MongoDB non accessible
```bash
sudo systemctl restart mongod
```

### Erreurs dans les logs
```bash
# Backend
sudo supervisorctl tail backend stderr

# Permissions
sudo chown -R www-data:www-data /opt/political-analyzer
```

---

## 📞 Support

- 📖 **Documentation complète**: [DEPLOY_LINUX.md](DEPLOY_LINUX.md)
- 🔧 **Scripts inclus**: `/opt/political-analyzer/scripts/`
- 📝 **Logs**: `/opt/political-analyzer/logs/`

---

*Déploiement réalisé en moins de 5 minutes ! ⚡*