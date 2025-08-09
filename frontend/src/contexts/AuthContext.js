import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

// Configuration axios pour gérer les cookies automatiquement
axios.defaults.withCredentials = true;
axios.defaults.baseURL = API_BASE_URL;

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState(null);

  useEffect(() => {
    // Vérifier si l'utilisateur est connecté au démarrage
    const checkAuthStatus = async () => {
      try {
        const savedToken = getCookie('easygeo_token');
        if (savedToken) {
          setToken(savedToken);
          // Configuer axios avec le token
          axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
          
          // Vérifier si le token est toujours valide
          const response = await axios.get('/api/auth/profile');
          if (response.data) {
            setUser(response.data);
          }
        }
      } catch (error) {
        console.error('Erreur lors de la vérification du statut d\'authentification:', error);
        // Token invalide, nettoyer
        logout();
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  // Utilitaire pour lire les cookies
  const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  };

  // Utilitaire pour définir un cookie
  const setCookie = (name, value, days = 30) => {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${value}; expires=${expires}; path=/; secure; samesite=strict`;
  };

  // Utilitaire pour supprimer un cookie
  const deleteCookie = (name) => {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  };

  const login = async (email, password) => {
    setIsLoading(true);
    try {
      const response = await axios.post('/api/auth/login', {
        email,
        password
      });

      if (response.data.access_token && response.data.user) {
        const { access_token, user: userData } = response.data;
        
        // Sauvegarder le token
        setToken(access_token);
        setCookie('easygeo_token', access_token);
        
        // Configurer axios avec le token
        axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
        
        // Sauvegarder les données utilisateur
        setUser(userData);
        
        setIsLoading(false);
        return { success: true };
      } else {
        setIsLoading(false);
        return { success: false, error: 'Réponse invalide du serveur' };
      }
    } catch (error) {
      setIsLoading(false);
      const errorMessage = error.response?.data?.detail || 'Erreur de connexion';
      return { success: false, error: errorMessage };
    }
  };

  const register = async (name, email, password) => {
    setIsLoading(true);
    try {
      const response = await axios.post('/api/auth/register', {
        email,
        password,
        name
      });

      if (response.data.access_token && response.data.user) {
        const { access_token, user: userData } = response.data;
        
        // Sauvegarder le token
        setToken(access_token);
        setCookie('easygeo_token', access_token);
        
        // Configurer axios avec le token
        axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
        
        // Sauvegarder les données utilisateur
        setUser(userData);
        
        setIsLoading(false);
        return { success: true };
      } else {
        setIsLoading(false);
        return { success: false, error: 'Réponse invalide du serveur' };
      }
    } catch (error) {
      setIsLoading(false);
      const errorMessage = error.response?.data?.detail || 'Erreur lors de l\'inscription';
      return { success: false, error: errorMessage };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    deleteCookie('easygeo_token');
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isLoading,
      login,
      register,
      logout,
      isAuthenticated: !!user,
      isPremium: user?.is_premium || false,
      isAdmin: user?.is_admin || false
    }}>
      {children}
    </AuthContext.Provider>
  );
};