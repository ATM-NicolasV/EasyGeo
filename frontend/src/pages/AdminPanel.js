import React, { useState, useEffect } from 'react';
import { ArrowLeft, Users, Rss, Brain, Settings, Plus, Edit, Trash2, Cpu, Play } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../hooks/use-toast';
import axios from 'axios';

const AdminPanel = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('sources');
  
  // Data states
  const [sources, setSources] = useState([]);
  const [aiModels, setAiModels] = useState([]);
  const [glossaryTerms, setGlossaryTerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Stats states
  const [stats, setStats] = useState({
    sourcesCount: 0,
    articlesScraped: 0,
    synthesisGenerated: 0,
    glossaryTerms: 0
  });

  useEffect(() => {
    if (user && !isAdmin) {
      toast({
        title: "Accès refusé",
        description: "Vous n'avez pas les permissions pour accéder à cette page.",
        variant: "destructive"
      });
      navigate('/');
    } else if (isAdmin) {
      loadAdminData();
    }
  }, [user, isAdmin, navigate, toast]);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Charger les sources
      const sourcesResponse = await axios.get('/api/admin/sources/all');
      setSources(sourcesResponse.data.sources || []);
      
      // Charger les modèles IA
      const aiResponse = await axios.get('/api/admin/ai-models');
      setAiModels(aiResponse.data.ai_models || []);
      
      // Charger le glossaire
      const glossaryResponse = await axios.get('/api/admin/glossary');
      setGlossaryTerms(glossaryResponse.data.glossary || []);

      // Charger les statistiques
      const statsResponse = await axios.get('/api/admin/stats');
      if (statsResponse.data) {
        setStats(statsResponse.data);
      }
      
    } catch (error) {
      console.error('Erreur lors du chargement des données admin:', error);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  // Actions rapides
  const triggerManualScraping = async () => {
    try {
      setLoading(true);
      const response = await axios.post('/api/admin/scrape/manual');
      toast({
        title: "Scraping terminé",
        description: `${response.data.articles_found} articles trouvés, ${response.data.new_articles} nouveaux articles`,
      });
      loadAdminData(); // Recharger les données
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors du scraping manuel",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const triggerManualSynthesis = async () => {
    try {
      setLoading(true);
      const response = await axios.post('/api/admin/synthesis/manual');
      toast({
        title: "Synthèse générée",
        description: `${response.data.articles_analyzed} articles analysés`,
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors de la génération de synthèse",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const initializeDefaultSources = async () => {
    try {
      setLoading(true);
      const response = await axios.post('/api/admin/sources/initialize-defaults');
      toast({
        title: "Sources initialisées",
        description: response.data.message,
      });
      loadAdminData();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors de l'initialisation des sources",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const initializeDefaultAIModels = async () => {
    try {
      setLoading(true);
      const response = await axios.post('/api/admin/ai-models/initialize-defaults');
      toast({
        title: "Modèles IA initialisés",
        description: response.data.message,
      });
      loadAdminData();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors de l'initialisation des modèles IA",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Chargement...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'sources', name: 'Sources', icon: Rss },
    { id: 'ai', name: 'Modèles IA', icon: Brain },
    { id: 'glossary', name: 'Glossaire', icon: Settings }
  ];

  const SourcesTab = () => (
    <div className="space-y-6">
      {/* Actions rapides */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Actions rapides</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button 
            onClick={triggerManualScraping}
            disabled={loading}
            className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-3 rounded-lg font-medium transition-colors"
          >
            <Play size={16} />
            <span>Scraping Manuel</span>
          </button>
          <button 
            onClick={triggerManualSynthesis}
            disabled={loading}
            className="flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-3 rounded-lg font-medium transition-colors"
          >
            <Brain size={16} />
            <span>Synthèse Manuel</span>
          </button>
          <button 
            onClick={loadAdminData}
            disabled={loading}
            className="flex items-center justify-center space-x-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white px-4 py-3 rounded-lg font-medium transition-colors"
          >
            <Settings size={16} />
            <span>Actualiser</span>
          </button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{sources.length}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Sources configurées</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.articlesScraped || 0}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Articles scrapés</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.synthesisGenerated || 0}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Synthèses générées</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{glossaryTerms.length}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Termes au glossaire</p>
        </div>
      </div>

      {/* Sources */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Sources de news ({sources.length})
          </h3>
          <button 
            onClick={initializeDefaultSources}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
          >
            <Plus size={16} />
            <span>Initialiser sources par défaut</span>
          </button>
        </div>

        {sources.length > 0 ? (
          <div className="grid gap-4">
            {sources.map((source) => (
              <div key={source.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${source.is_active ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <h4 className="font-medium text-gray-900 dark:text-white">{source.name}</h4>
                    <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded text-xs">
                      {source.scraper_type}
                    </span>
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{source.url}</p>
                
                <div className="flex items-center space-x-4 text-sm">
                  <span className="text-gray-500 dark:text-gray-400">
                    Articles scrapés: <span className="font-medium text-blue-600 dark:text-blue-400">{source.articles_scraped || 0}</span>
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">
                    Statut: <span className={`font-medium ${source.is_active ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {source.is_active ? 'Actif' : 'Inactif'}
                    </span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <Rss size={48} className="mx-auto mb-4 opacity-50" />
            <p className="mb-4">Aucune source configurée</p>
            <button 
              onClick={initializeDefaultSources}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Initialiser sources par défaut
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const AITab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Modèles d'analyse IA ({aiModels.length})
        </h3>
        <button 
          onClick={initializeDefaultAIModels}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
        >
          <Plus size={16} />
          <span>Initialiser modèle par défaut</span>
        </button>
      </div>
      
      {aiModels.length > 0 ? (
        <div className="grid gap-4">
          {aiModels.map((model) => (
            <div key={model.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${model.is_active ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <div className="flex items-center space-x-2">
                    <Cpu size={16} className="text-blue-600 dark:text-blue-400" />
                    <h4 className="font-medium text-gray-900 dark:text-white">{model.name}</h4>
                  </div>
                  <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded text-xs">
                    {model.provider}
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Model ID</p>
                  <p className="text-sm font-mono text-gray-700 dark:text-gray-300">{model.model_id}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">API Key</p>
                  <p className="text-sm font-mono text-gray-700 dark:text-gray-300">
                    {model.api_key ? '🔑 Configurée' : '❌ Non configurée'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                <span>
                  Ajouté: {new Date(model.created_at).toLocaleDateString('fr-FR')}
                </span>
                <span className={`font-medium ${model.is_active ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {model.is_active ? 'Actif' : 'Inactif'}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <Brain size={48} className="mx-auto mb-4 opacity-50" />
          <p className="mb-4">Aucun modèle IA configuré</p>
          <button 
            onClick={initializeDefaultAIModels}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Initialiser modèle par défaut
          </button>
        </div>
      )}
    </div>
  );

  const GlossaryTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Gestion du glossaire ({glossaryTerms.length} termes)
        </h3>
      </div>

      {glossaryTerms.length > 0 ? (
        <div className="space-y-3">
          {glossaryTerms.map((term) => (
            <div key={term.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className="font-medium text-gray-900 dark:text-white">{term.display_term || term.term}</h4>
                    <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded text-xs">
                      {term.category || 'general'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{term.definition}</p>
                  {term.detailed_explanation && (
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">{term.detailed_explanation}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <Settings size={48} className="mx-auto mb-4 opacity-50" />
          <p>Aucun terme au glossaire</p>
        </div>
      )}
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'sources': return <SourcesTab />;
      case 'ai': return <AITab />;
      case 'glossary': return <GlossaryTab />;
      default: return <SourcesTab />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Chargement du panneau d'administration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 shadow-sm p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <ArrowLeft 
              size={24} 
              className="cursor-pointer text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
              onClick={() => navigate(-1)}
            />
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Panel Administrateur</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Bienvenue, {user?.name}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
        <div className="flex overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-6 py-3 whitespace-nowrap border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <tab.icon size={16} />
              <span>{tab.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-4 pb-24">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}
        
        {renderTabContent()}
      </div>
    </div>
  );
};

export default AdminPanel;