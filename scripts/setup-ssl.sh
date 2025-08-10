#!/bin/bash
# Script de configuration SSL avec Let's Encrypt
# Usage: sudo ./setup-ssl.sh votre-domaine.com

set -e

# Variables
DOMAIN="$1"
EMAIL="${2:-admin@$DOMAIN}"
NGINX_SITE="/etc/nginx/sites-available/political-analyzer"

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

# Vérifications
if [ -z "$DOMAIN" ]; then
    error "Usage: sudo ./setup-ssl.sh votre-domaine.com [email@domain.com]"
    exit 1
fi

if [ "$EUID" -ne 0 ]; then
    error "Ce script doit être exécuté avec sudo"
    exit 1
fi

if ! command -v certbot &> /dev/null; then
    error "Certbot n'est pas installé. Installez-le d'abord avec: apt install certbot python3-certbot-nginx"
    exit 1
fi

log "🔒 Configuration SSL pour $DOMAIN"

# Vérifier que le domaine pointe vers ce serveur
log "Vérification DNS pour $DOMAIN..."
DOMAIN_IP=$(dig +short "$DOMAIN" | tail -1)
SERVER_IP=$(curl -s ifconfig.me || curl -s ipinfo.io/ip)

if [ "$DOMAIN_IP" != "$SERVER_IP" ]; then
    warn "Le domaine $DOMAIN ($DOMAIN_IP) ne pointe pas vers ce serveur ($SERVER_IP)"
    warn "Assurez-vous que votre DNS est correctement configuré"
    read -p "Continuer quand même? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Sauvegarder la configuration Nginx actuelle
if [ -f "$NGINX_SITE" ]; then
    log "Sauvegarde de la configuration Nginx actuelle..."
    cp "$NGINX_SITE" "$NGINX_SITE.backup.$(date +%Y%m%d_%H%M%S)"
fi

# Mettre à jour la configuration Nginx avec le domaine
log "Mise à jour de la configuration Nginx..."
sed -i "s/server_name localhost.*;/server_name $DOMAIN www.$DOMAIN;/g" "$NGINX_SITE"

# Tester la configuration Nginx
log "Test de la configuration Nginx..."
if nginx -t; then
    log "Configuration Nginx valide ✓"
    systemctl reload nginx
else
    error "Configuration Nginx invalide"
    exit 1
fi

# Vérifier que le site est accessible en HTTP
log "Vérification de l'accessibilité HTTP..."
if curl -f -s "http://$DOMAIN" > /dev/null; then
    log "Site accessible en HTTP ✓"
else
    warn "Site non accessible en HTTP, vérifiez votre configuration"
fi

# Générer le certificat SSL
log "Génération du certificat SSL avec Let's Encrypt..."
if certbot --nginx \
    --non-interactive \
    --agree-tos \
    --email "$EMAIL" \
    --domains "$DOMAIN,www.$DOMAIN" \
    --redirect; then
    log "Certificat SSL configuré avec succès ✓"
else
    error "Échec de la configuration SSL"
    exit 1
fi

# Vérifier le certificat
log "Vérification du certificat SSL..."
if openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" < /dev/null 2>/dev/null | openssl x509 -noout -dates; then
    log "Certificat SSL valide ✓"
else
    warn "Problème avec le certificat SSL"
fi

# Configuration du renouvellement automatique
log "Configuration du renouvellement automatique..."
if ! crontab -l | grep -q "certbot renew"; then
    (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet --post-hook 'systemctl reload nginx'") | crontab -
    log "Renouvellement automatique configuré ✓"
fi

# Test du renouvellement
log "Test du renouvellement SSL..."
if certbot renew --dry-run; then
    log "Test de renouvellement réussi ✓"
else
    warn "Problème avec le test de renouvellement"
fi

# Configuration de sécurité avancée
log "Application de la configuration de sécurité SSL avancée..."
cat > /etc/nginx/snippets/ssl-$DOMAIN.conf << EOF
# SSL Configuration pour $DOMAIN
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384;
ssl_prefer_server_ciphers off;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 1d;
ssl_session_tickets off;
ssl_stapling on;
ssl_stapling_verify on;

# Headers de sécurité
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
EOF

# Test final HTTPS
log "Test final HTTPS..."
sleep 5
if curl -f -s "https://$DOMAIN" > /dev/null; then
    log "HTTPS opérationnel ✓"
else
    warn "Problème avec HTTPS"
fi

# Test de redirection HTTP vers HTTPS
log "Test de redirection HTTP -> HTTPS..."
HTTP_REDIRECT=$(curl -s -o /dev/null -w "%{http_code}" "http://$DOMAIN")
if [ "$HTTP_REDIRECT" = "301" ] || [ "$HTTP_REDIRECT" = "302" ]; then
    log "Redirection HTTPS configurée ✓"
else
    warn "Redirection HTTPS non configurée correctement"
fi

# Informations sur le certificat
log "Informations sur le certificat:"
certbot certificates | grep -A 10 "$DOMAIN" || true

# Score SSL Test (optionnel)
if command -v ssllabs-scan &> /dev/null; then
    log "Test SSL Labs (peut prendre quelques minutes)..."
    ssllabs-scan -grade "$DOMAIN" || warn "SSL Labs test échoué"
fi

# Configuration de monitoring SSL
log "Configuration du monitoring SSL..."
cat > /opt/political-analyzer/scripts/check-ssl.sh << 'EOF'
#!/bin/bash
# Vérification du certificat SSL

DOMAIN="$1"
if [ -z "$DOMAIN" ]; then
    echo "Usage: $0 domain.com"
    exit 1
fi

# Vérifier l'expiration
EXPIRE_DATE=$(openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" < /dev/null 2>/dev/null | openssl x509 -noout -enddate | cut -d= -f2)
EXPIRE_TIMESTAMP=$(date -d "$EXPIRE_DATE" +%s)
CURRENT_TIMESTAMP=$(date +%s)
DAYS_UNTIL_EXPIRE=$(( (EXPIRE_TIMESTAMP - CURRENT_TIMESTAMP) / 86400 ))

echo "Certificat SSL pour $DOMAIN expire dans $DAYS_UNTIL_EXPIRE jours"

if [ "$DAYS_UNTIL_EXPIRE" -lt 30 ]; then
    echo "ATTENTION: Certificat expire dans moins de 30 jours!"
    exit 1
fi

exit 0
EOF

chmod +x /opt/political-analyzer/scripts/check-ssl.sh

# Ajouter la vérification SSL au cron
if ! crontab -l | grep -q "check-ssl"; then
    (crontab -l 2>/dev/null; echo "0 9 * * 1 /opt/political-analyzer/scripts/check-ssl.sh $DOMAIN") | crontab -
    log "Monitoring SSL configuré ✓"
fi

# Résumé final
log "✅ Configuration SSL terminée avec succès!"
echo ""
info "📋 Résumé de la configuration SSL:"
info "├── Domaine: $DOMAIN"
info "├── Certificat: Let's Encrypt"
info "├── Renouvellement: Automatique"
info "├── Redirection HTTP->HTTPS: Activée"
info "└── Monitoring: Configuré"
echo ""
info "🔍 URLs à tester:"
info "├── https://$DOMAIN"
info "├── https://www.$DOMAIN"
info "├── https://$DOMAIN/api/health"
info "└── SSL Test: https://www.ssllabs.com/ssltest/analyze.html?d=$DOMAIN"
echo ""
warn "📝 Notes importantes:"
warn "• Le certificat se renouvelle automatiquement"
warn "• Vérifiez le monitoring hebdomadaire"
warn "• Testez régulièrement avec SSL Labs"
warn "• Gardez Certbot à jour"
echo ""
log "🎉 Votre application est maintenant sécurisée avec HTTPS!"