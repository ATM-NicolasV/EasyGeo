// Composants d'authentification pour EasyGeo
import React, { useState } from 'react';
import { useAuth } from './AuthContext';

// Composant Modal de connexion/inscription
export const AuthModal = ({ isOpen, onClose, initialMode = 'login' }) => {
  const [mode, setMode] = useState(initialMode); // 'login' ou 'register'
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: ''
  });
  const [formErrors, setFormErrors] = useState({});
  
  const { login, register, loading, authError } = useAuth();

  if (!isOpen) return null;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Supprimer l'erreur du champ modifié
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.email) {
      errors.email = 'Email requis';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email invalide';
    }
    
    if (!formData.password) {
      errors.password = 'Mot de passe requis';
    } else if (formData.password.length < 6) {
      errors.password = 'Mot de passe trop court (minimum 6 caractères)';
    }
    
    if (mode === 'register') {
      if (!formData.first_name) {
        errors.first_name = 'Prénom requis';
      }
      if (!formData.last_name) {
        errors.last_name = 'Nom requis';
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      let result;
      
      if (mode === 'login') {
        result = await login(formData.email, formData.password);
      } else {
        result = await register({
          email: formData.email,
          password: formData.password,
          first_name: formData.first_name,
          last_name: formData.last_name
        });
      }

      if (result.success) {
        onClose();
        // Reset form
        setFormData({
          email: '',
          password: '',
          first_name: '',
          last_name: ''
        });
        setFormErrors({});
      }
    } catch (error) {
      console.error('Erreur lors de l\'authentification:', error);
    }
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setFormErrors({});
  };

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="auth-modal-header">
          <h2>{mode === 'login' ? '🔐 Connexion' : '👤 Inscription'}</h2>
          <button className="auth-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="auth-modal-body">
          {authError && (
            <div className="auth-error">
              ⚠️ {authError}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {mode === 'register' && (
              <>
                <div className="auth-form-row">
                  <div className="auth-form-group">
                    <label htmlFor="first_name">Prénom</label>
                    <input
                      type="text"
                      id="first_name"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleInputChange}
                      className={formErrors.first_name ? 'error' : ''}
                      disabled={loading}
                    />
                    {formErrors.first_name && <span className="error-text">{formErrors.first_name}</span>}
                  </div>
                  
                  <div className="auth-form-group">
                    <label htmlFor="last_name">Nom</label>
                    <input
                      type="text"
                      id="last_name"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleInputChange}
                      className={formErrors.last_name ? 'error' : ''}
                      disabled={loading}
                    />
                    {formErrors.last_name && <span className="error-text">{formErrors.last_name}</span>}
                  </div>
                </div>
              </>
            )}

            <div className="auth-form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className={formErrors.email ? 'error' : ''}
                disabled={loading}
              />
              {formErrors.email && <span className="error-text">{formErrors.email}</span>}
            </div>

            <div className="auth-form-group">
              <label htmlFor="password">Mot de passe</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className={formErrors.password ? 'error' : ''}
                disabled={loading}
              />
              {formErrors.password && <span className="error-text">{formErrors.password}</span>}
            </div>

            <button 
              type="submit" 
              className="auth-submit-btn"
              disabled={loading}
            >
              {loading ? '⏳ En cours...' : (mode === 'login' ? '🔐 Se connecter' : '👤 S\'inscrire')}
            </button>
          </form>

          <div className="auth-switch">
            <p>
              {mode === 'login' ? 'Pas encore de compte ?' : 'Déjà un compte ?'}
              <button 
                type="button" 
                className="auth-switch-btn" 
                onClick={switchMode}
                disabled={loading}
              >
                {mode === 'login' ? 'S\'inscrire' : 'Se connecter'}
              </button>
            </p>
          </div>

          {mode === 'register' && (
            <div className="auth-info">
              <h4>📦 Accès gratuit inclut :</h4>
              <ul>
                <li>✅ Accès à la dernière synthèse</li>
                <li>✅ Consultation du glossaire</li>
                <li>✅ Informations sur les sources</li>
              </ul>
              
              <h4>🌟 Premium inclut :</h4>
              <ul>
                <li>✅ Historique complet des synthèses</li>
                <li>✅ Fonctionnalités avancées</li>
                <li>✅ Support prioritaire</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Composant Bouton d'authentification
export const AuthButton = ({ onOpenModal }) => {
  const { user, logout, isPremium } = useAuth();

  if (user) {
    return (
      <div className="auth-user-menu">
        <div className="user-info">
          <span className="user-name">{user.first_name} {user.last_name}</span>
          <span className={`user-badge ${isPremium() ? 'premium' : 'free'}`}>
            {isPremium() ? '⭐ Premium' : '🆓 Gratuit'}
          </span>
        </div>
        <button className="logout-btn" onClick={logout} title="Se déconnecter">
          🚪 Déconnexion
        </button>
      </div>
    );
  }

  return (
    <button className="login-btn" onClick={() => onOpenModal('login')}>
      🔐 Se connecter
    </button>
  );
};

// Composant Banner pour inviter à l'inscription
export const AuthBanner = ({ onOpenModal }) => {
  return (
    <div className="auth-banner">
      <div className="auth-banner-content">
        <h3>🔓 Débloquez tout le potentiel d'EasyGeo</h3>
        <p>Inscrivez-vous gratuitement pour accéder aux dernières synthèses politiques</p>
        <div className="auth-banner-buttons">
          <button 
            className="auth-banner-btn register"
            onClick={() => onOpenModal('register')}
          >
            👤 Inscription gratuite
          </button>
          <button 
            className="auth-banner-btn login"
            onClick={() => onOpenModal('login')}
          >
            🔐 Connexion
          </button>
        </div>
      </div>
    </div>
  );
};

// Composant Premium Badge
export const PremiumBadge = ({ onUpgrade }) => {
  const { isPremium, upgradeToPremium } = useAuth();

  const handleUpgrade = async () => {
    const result = await upgradeToPremium();
    if (result.success && onUpgrade) {
      onUpgrade();
    }
  };

  if (isPremium()) {
    return (
      <div className="premium-badge active">
        ⭐ Premium
      </div>
    );
  }

  return (
    <button className="premium-badge upgrade" onClick={handleUpgrade}>
      ⬆️ Passer Premium
    </button>
  );
};