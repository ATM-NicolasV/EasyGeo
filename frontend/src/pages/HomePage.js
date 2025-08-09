import React, { useState, useEffect } from 'react';
import { ArrowLeft, Bell, Sun, Moon, Menu } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import NewsCard from '../components/NewsCard';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const HomePage = () => {
  const { theme, toggleTheme } = useTheme();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [todaySynthesis, setTodaySynthesis] = useState(null);
  const [synthesisHistory, setSynthesisHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const categories = ['All', 'Politics', 'Sports', 'Movies', 'Tech'];

  useEffect(() => {
    loadTodaySynthesis();
    loadSynthesisHistory();
  }, []);

  const loadTodaySynthesis = async () => {
    try {
      setError(null);
      const response = await axios.get('/api/synthesis/today');
      if (response.data) {
        setTodaySynthesis(response.data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la synthèse du jour:', error);
      if (error.response?.status === 401 && !isAuthenticated) {
        // L'utilisateur n'est pas connecté, ne pas afficher d'erreur
        setError(null);
      } else {
        setError('Erreur lors du chargement de la synthèse du jour');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadSynthesisHistory = async () => {
    try {
      const response = await axios.get('/api/synthesis/history');
      if (response.data?.syntheses) {
        setSynthesisHistory(response.data.syntheses);
      }
    } catch (error) {
      console.error('Erreur lors du chargement de l\'historique:', error);
    }
  };

  const handleCategoryChange = (category) => {
    setSelectedCategory(category.toLowerCase());
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Chargement des actualités...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
      {/* Header */}
      <div className="bg-slate-800 dark:bg-slate-900 text-white p-4">
        <div className="flex items-center justify-between mb-4">
          <ArrowLeft 
            size={24} 
            className="cursor-pointer hover:text-gray-300 transition-colors"
            onClick={() => navigate(-1)}
          />
          <h1 className="text-xl font-bold">EasyGeo - Actualités Politiques</h1>
          <div className="flex items-center space-x-3">
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-slate-700 transition-colors"
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <Bell 
              size={24} 
              className="cursor-pointer hover:text-gray-300 transition-colors"
            />
            <div 
              onClick={() => isAuthenticated ? navigate('/profile') : navigate('/auth')}
              className="w-8 h-8 bg-gray-400 rounded-full cursor-pointer hover:bg-gray-500 transition-colors flex items-center justify-center"
            >
              {user?.avatar ? (
                <img src={user.avatar} alt="Profile" className="w-full h-full rounded-full object-cover" />
              ) : (
                <span className="text-xs font-medium">{user?.name?.[0] || 'U'}</span>
              )}
            </div>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex space-x-4 overflow-x-auto scrollbar-hide">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => handleCategoryChange(category)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === category.toLowerCase()
                  ? 'bg-white text-slate-800'
                  : 'text-gray-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Synthèse du jour */}
      {todaySynthesis && selectedCategory === 'all' && (
        <div className="px-4 pt-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                📊 Synthèse du jour
              </h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {formatDate(todaySynthesis.date)}
              </span>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                  {todaySynthesis.sources_analyzed || 0}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Sources</p>
              </div>
              <div className="text-center p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                <p className="text-xl font-bold text-green-600 dark:text-green-400">
                  {todaySynthesis.articles_analyzed || 0}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Articles</p>
              </div>
              <div className="text-center p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                  {Math.round((todaySynthesis.reliability_score || 0) * 100)}%
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Fiabilité</p>
              </div>
            </div>

            {/* Contenu de la synthèse */}
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                {todaySynthesis.synthesis?.content || todaySynthesis.content || 'Aucune synthèse disponible pour aujourd\'hui.'}
              </p>
            </div>

            {/* Sources */}
            {todaySynthesis.sources && Object.keys(todaySynthesis.sources).length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-600">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sources analysées:</h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(todaySynthesis.sources).map(([source, count]) => (
                    <span 
                      key={source}
                      className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full text-xs"
                    >
                      {source}: {count} articles
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Historique des synthèses */}
      <div className="px-4 pt-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {selectedCategory === 'all' ? 'Historique des synthèses' : `Synthèses ${categories.find(cat => cat.toLowerCase() === selectedCategory)}`}
          </h2>
          {!isAuthenticated && (
            <button 
              onClick={() => navigate('/auth')}
              className="text-blue-600 dark:text-blue-400 text-sm font-medium hover:underline"
            >
              Se connecter pour plus
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
            <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* Liste des synthèses */}
        <div className="space-y-4">
          {synthesisHistory.length > 0 ? (
            synthesisHistory.slice(0, isAuthenticated ? synthesisHistory.length : 2).map((synthesis) => (
              <div key={synthesis.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      Synthèse du {formatDate(synthesis.date)}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {synthesis.sources_analyzed || 0} sources • {synthesis.articles_analyzed || 0} articles
                    </p>
                  </div>
                  <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded-full text-xs">
                    {Math.round((synthesis.reliability_score || 0) * 100)}% fiable
                  </span>
                </div>
                
                <p className="text-gray-700 dark:text-gray-300 text-sm line-clamp-3">
                  {synthesis.synthesis?.content || synthesis.content || 'Contenu de synthèse non disponible'}
                </p>
                
                <button className="mt-3 text-blue-600 dark:text-blue-400 text-sm hover:underline">
                  Lire la synthèse complète →
                </button>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <p>Aucune synthèse disponible pour le moment.</p>
              {!isAuthenticated && (
                <button 
                  onClick={() => navigate('/auth')}
                  className="mt-2 text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Connectez-vous pour accéder à plus de contenu
                </button>
              )}
            </div>
          )}
        </div>

        {/* Bannière premium pour les utilisateurs non connectés */}
        {!isAuthenticated && synthesisHistory.length > 2 && (
          <div className="mt-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 text-white text-center">
            <h3 className="font-bold text-lg mb-2">Débloquez l'accès complet</h3>
            <p className="text-blue-100 mb-4">
              Connectez-vous pour accéder à toutes les synthèses et analyses politiques
            </p>
            <button 
              onClick={() => navigate('/auth')}
              className="bg-white text-blue-600 px-6 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors"
            >
              Se connecter
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;