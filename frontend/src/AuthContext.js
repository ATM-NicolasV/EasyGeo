// Contexte d'authentification pour EasyGeo
import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';

// Configuration axios
const API_BASE_URL = process.env.REACT_APP_BACKEND_URL;

// Créer le contexte d'authentification
const AuthContext = createContext();

// Hook pour utiliser le contexte d'authentification
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Provider d'authentification
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Initialiser l'authentification au chargement
  useEffect(() => {
    const savedToken = Cookies.get('easygeo_token');
    if (savedToken) {
      setToken(savedToken);
      validateToken(savedToken);
    } else {
      setLoading(false);
    }
  }, []);

  // Configurer axios avec le token
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Valider le token existant
  const validateToken = async (tokenToValidate) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${tokenToValidate}` }
      });
      
      setUser(response.data);
      setToken(tokenToValidate);
      setAuthError(null);
    } catch (error) {
      console.error('Token invalide:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  // Fonction de connexion
  const login = async (email, password) => {
    try {
      setLoading(true);
      setAuthError(null);

      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        email,
        password
      });

      const { access_token, user: userData } = response.data;

      // Sauvegarder le token (expire dans 30 jours)
      Cookies.set('easygeo_token', access_token, { expires: 30 });
      
      setToken(access_token);
      setUser(userData);
      
      return { success: true, user: userData };

    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Erreur de connexion';
      setAuthError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Fonction d'inscription
  const register = async (userData) => {
    try {
      setLoading(true);
      setAuthError(null);

      const response = await axios.post(`${API_BASE_URL}/api/auth/register`, userData);
      const { access_token, user: newUser } = response.data;

      // Sauvegarder le token
      Cookies.set('easygeo_token', access_token, { expires: 30 });
      
      setToken(access_token);
      setUser(newUser);
      
      return { success: true, user: newUser };

    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Erreur lors de l\'inscription';
      setAuthError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Fonction de déconnexion
  const logout = () => {
    Cookies.remove('easygeo_token');
    setToken(null);
    setUser(null);
    setAuthError(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  // Fonction pour upgrade vers premium
  const upgradeToPremium = async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/upgrade-premium`);
      
      // Recharger les infos utilisateur
      const userResponse = await axios.get(`${API_BASE_URL}/api/auth/me`);
      setUser(userResponse.data);
      
      return { success: true, message: response.data.message };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Erreur lors de l\'upgrade' 
      };
    }
  };

  // Fonction pour mettre à jour le profil
  const updateProfile = async (profileData) => {
    try {
      const response = await axios.put(`${API_BASE_URL}/api/auth/profile`, profileData);
      setUser(response.data);
      return { success: true, user: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Erreur lors de la mise à jour' 
      };
    }
  };

  // Utilitaires
  const isAuthenticated = () => !!user && !!token;
  const isPremium = () => user?.is_premium || false;
  const getSubscriptionType = () => user?.subscription_type || 'free';

  const value = {
    // État
    user,
    token,
    loading,
    authError,
    
    // Fonctions d'authentification
    login,
    register,
    logout,
    
    // Fonctions de gestion du compte
    upgradeToPremium,
    updateProfile,
    
    // Utilitaires
    isAuthenticated,
    isPremium,
    getSubscriptionType,
    
    // Informations utilisateur
    userInfo: user ? {
      fullName: `${user.first_name} ${user.last_name}`,
      email: user.email,
      subscriptionType: user.subscription_type,
      isPremium: user.is_premium,
      createdAt: user.created_at,
      lastLogin: user.last_login
    } : null
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;