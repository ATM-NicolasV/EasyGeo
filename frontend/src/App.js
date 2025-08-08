import React, { useState, useEffect } from 'react';
import './App.css';
import Cookies from 'js-cookie';

// Import des composants d'authentification
import { AuthProvider, useAuth } from './AuthContext';
import { AuthModal, AuthButton, AuthBanner, PremiumBadge } from './AuthComponents';

// Import des composants d'administration avancés
import { SourcesManager, AIModelsManager } from './AdminComponents';
import { GlossaryManager, SystemConfigManager } from './AdminComponents2';
import CustomAISynthesis from './CustomAISynthesis';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL;

function AppContent() {
  const [activeTab, setActiveTab] = useState('today');
  const [loading, setLoading] = useState(false);
  
  // États pour les données
  const [dailySynthesis, setDailySynthesis] = useState(null);
  const [synthesisHistory, setSynthesisHistory] = useState([]);
  const [sourcesStatus, setSourcesStatus] = useState([]);
  const [glossary, setGlossary] = useState([]);
  
  
  // États pour la modal des articles par source
  const [showSourceArticles, setShowSourceArticles] = useState(false);
  const [selectedSourceArticles, setSelectedSourceArticles] = useState([]);
  const [selectedSourceName, setSelectedSourceName] = useState('');
  const [loadingSourceArticles, setLoadingSourceArticles] = useState(false);

  // États pour l'authentification
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('login');

  // Hook d'authentification
  const { user, isAuthenticated, isPremium, userInfo, isAdmin, token } = useAuth();

  // Fonction utilitaire pour obtenir les headers d'authentification
  const getAuthHeaders = () => {
    const authToken = token || Cookies.get('easygeo_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken || ''}`
    };
  };
  
  // Charger les données au démarrage
  useEffect(() => {
    loadTodaySynthesis();
    loadSynthesisHistory();
    loadSourcesStatus();
    loadGlossary();
    initializeDefaultSources();
  }, []);

  // Gérer la fermeture de la modal avec Escape
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && showSourceArticles) {
        closeSourceArticlesModal();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showSourceArticles]);

  const loadTodaySynthesis = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/synthesis/today`);
      const data = await response.json();
      
      // Adapter la nouvelle structure de données
      if (data.synthesis) {
        setDailySynthesis({ synthesis: data.synthesis });
      } else {
        setDailySynthesis({ synthesis: null });
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la synthèse:', error);
      setDailySynthesis({ synthesis: null });
    } finally {
      setLoading(false);
    }
  };

  const loadSynthesisHistory = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/synthesis/history`);
      const data = await response.json();
      
      // Adapter la nouvelle structure de données
      setSynthesisHistory(data.syntheses || []);
      
      // Optionnel: traiter les informations d'accès utilisateur
      if (data.access_info) {
        console.log('Type d\'accès:', data.access_info.type);
        console.log('Message:', data.access_info.message);
      }
    } catch (error) {
      console.error('Erreur lors du chargement de l\'historique:', error);
    }
  };

  const loadSourcesStatus = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/sources-status`);
      const data = await response.json();
      setSourcesStatus(data.sources || []);
    } catch (error) {
      console.error('Erreur lors du chargement des sources:', error);
    }
  };

  const loadGlossary = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/glossary`);
      const data = await response.json();
      setGlossary(data.terms || []);
    } catch (error) {
      console.error('Erreur lors du chargement du glossaire:', error);
    }
  };

  const initializeDefaultSources = async () => {
    try {
      await fetch(`${API_BASE_URL}/api/init-default-sources`, { method: 'POST' });
      await fetch(`${API_BASE_URL}/api/auto-glossary`, { method: 'POST' });
    } catch (error) {
      console.error('Erreur lors de l\'initialisation:', error);
    }
  };

  const triggerManualScraping = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/admin/scrape/manual`, { 
        method: 'POST' 
      });
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      alert(`Scraping terminé avec succès !\n${data.articles_found} articles trouvés\n${data.new_articles} nouveaux articles ajoutés`);
      
      // Actualiser les données
      await loadSourcesStatus();
      
    } catch (error) {
      console.error('Erreur lors du scraping manuel:', error);
      alert(`Erreur lors du scraping manuel: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const triggerManualSynthesis = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/admin/synthesis/manual`, { 
        method: 'POST' 
      });
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      alert(`Synthèse générée avec succès !\n${data.articles_analyzed} articles analysés\nSynthèse ID: ${data.synthesis_id}`);
      
      // Actualiser les données
      await loadTodaySynthesis();
      await loadSynthesisHistory();
      
    } catch (error) {
      console.error('Erreur lors de la synthèse manuelle:', error);
      alert(`Erreur lors de la génération de synthèse: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadSourceArticles = async (sourceName) => {
    try {
      console.log(`🔍 Chargement des articles pour: ${sourceName}`);
      setLoadingSourceArticles(true);
      setSelectedSourceName(sourceName);
      
      const response = await fetch(`${API_BASE_URL}/api/admin/articles/by-source?source=${encodeURIComponent(sourceName)}&limit=50`);
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`✅ ${data.articles.length} articles récupérés pour ${sourceName}`);
      setSelectedSourceArticles(data.articles || []);
      setShowSourceArticles(true);
      
    } catch (error) {
      console.error('❌ Erreur lors du chargement des articles:', error);
      alert(`Erreur lors du chargement des articles: ${error.message}`);
      setSelectedSourceArticles([]);
    } finally {
      setLoadingSourceArticles(false);
    }
  };

  const closeSourceArticlesModal = () => {
    setShowSourceArticles(false);
    setSelectedSourceArticles([]);
    setSelectedSourceName('');
  };

  const formatSynthesisContent = (content) => {
    if (!content) return '';
    
    // Améliorer la mise en page du contenu généré par l'IA
    let formattedContent = content
      // Gérer les titres (lignes commençant par majuscules suivies de deux points)
      .replace(/^([A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝ][A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝ\s]+)\s*:/gm, '<h4>$1</h4>')
      // Gérer les sous-titres numérotés
      .replace(/^(\d+\.\s*[A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝA-z][^:]*)\s*:/gm, '<h5>$1</h5>')
      // Gérer les listes avec tirets
      .replace(/^-\s+(.+)$/gm, '<li>$1</li>')
      // Gérer les listes numérotées
      .replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>')
      // Encapsuler les groupes de listes
      .replace(/(<li>.*?<\/li>)(\n|$)/gs, '<ul>$1</ul>')
      // Nettoyer les ul multiples
      .replace(/<\/ul>\s*<ul>/g, '')
      // Gérer les paragraphes
      .split('\n\n')
      .map(para => {
        para = para.trim();
        if (para === '') return '';
        if (para.includes('<h4>') || para.includes('<h5>') || para.includes('<ul>')) {
          return para;
        }
        return `<p>${para}</p>`;
      })
      .join('');
    
    return formattedContent;
  };

  const renderGlossaryTooltip = (text) => {
    if (!glossary.length || !text) return <div dangerouslySetInnerHTML={{ __html: formatSynthesisContent(text) }} />;

    let processedText = formatSynthesisContent(text);
    glossary.forEach(term => {
      const regex = new RegExp(`\\b${term.term}\\b`, 'gi');
      processedText = processedText.replace(regex, 
        `<span class="glossary-term" data-term="${term.term}" title="${term.definition}">${term.term}</span>`
      );
    });

    return <div dangerouslySetInnerHTML={{ __html: processedText }} />;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Composant Synthèse du Jour
  const TodayTab = () => (
    <div className="tab-content">
      <div className="today-header">
        <h2>📰 Synthèse du Jour</h2>
        <p>Analyse automatique des actualités politiques et géopolitiques</p>
        <div className="last-update">
          Dernière mise à jour: {new Date().toLocaleTimeString('fr-FR')}
        </div>
      </div>

      {!isAuthenticated() && (
        <AuthBanner onOpenModal={(mode) => {
          setAuthModalMode(mode);
          setShowAuthModal(true);
        }} />
      )}

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Chargement de la synthèse...</p>
        </div>
      ) : (
        <>
          {dailySynthesis?.synthesis ? (
            <div className="synthesis-container">
              <div className="synthesis-meta">
                <div className="meta-item">
                  <span className="meta-label">Date:</span>
                  <span className="meta-value">{formatDate(dailySynthesis.synthesis.date)}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Sources analysées:</span>
                  <span className="meta-value">{dailySynthesis.synthesis.sources_count}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Fiabilité:</span>
                  <span className="meta-value reliability-score">
                    {Math.round(dailySynthesis.synthesis.reliability_score * 100)}%
                  </span>
                </div>
              </div>

              {dailySynthesis.synthesis.themes && dailySynthesis.synthesis.themes.length > 0 && (
                <div className="themes-container">
                  <h4>🏷️ Thèmes abordés:</h4>
                  <div className="themes-list">
                    {dailySynthesis.synthesis.themes.map((theme, index) => (
                      <span key={index} className="theme-tag">{theme}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="synthesis-content">
                <h3>{dailySynthesis.synthesis.title}</h3>
                <div className="content-text">
                  {renderGlossaryTooltip(dailySynthesis.synthesis.content)}
                </div>
              </div>

              <div className="sources-breakdown">
                <h4>📊 Répartition des sources:</h4>
                <div className="sources-stats">
                  {Object.entries(dailySynthesis.synthesis.sources_breakdown || {}).map(([source, count]) => (
                    <div 
                      key={source} 
                      className="source-stat clickable"
                      onClick={() => loadSourceArticles(source)}
                      title={`Cliquer pour voir les ${count} articles de ${source}`}
                    >
                      <span className="source-name">{source}</span>
                      <span className="source-count">{count} article{count > 1 ? 's' : ''}</span>
                      <span className="click-indicator">👁️</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="no-synthesis">
              <div className="no-content-icon">📝</div>
              <h3>Aucune synthèse disponible</h3>
              <p>La synthèse automatique est en cours de génération ou aucun article politique n'a été trouvé aujourd'hui.</p>
              
              {isAdmin() && (
                <div className="admin-actions">
                  <button onClick={triggerManualScraping} disabled={loading} className="admin-btn">
                    🔄 Lancer le scraping
                  </button>
                  <button onClick={triggerManualSynthesis} disabled={loading} className="admin-btn">
                    ⚡ Générer la synthèse
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );

  // Composant Historique
  const HistoryTab = () => (
    <div className="tab-content">
      <h2>📚 Historique des Synthèses</h2>
      <p>Consultez les analyses précédentes des actualités politiques et géopolitiques</p>

      {!isAuthenticated() && (
        <AuthBanner onOpenModal={(mode) => {
          setAuthModalMode(mode);
          setShowAuthModal(true);
        }} />
      )}

      {isAuthenticated() && !isPremium() && (
        <div className="premium-upgrade-banner">
          <div className="upgrade-content">
            <h3>⭐ Historique complet avec Premium</h3>
            <p>Accès gratuit limité à la dernière synthèse. Passez Premium pour voir tout l'historique !</p>
            <PremiumBadge onUpgrade={() => {
              // Recharger les données après upgrade
              loadSynthesisHistory();
            }} />
          </div>
        </div>
      )}
      
      {synthesisHistory.length > 0 ? (
        <div className="history-list">
          {synthesisHistory.map((synthesis) => (
            <div key={synthesis.id} className="history-item">
              <div className="history-header">
                <h3>{synthesis.title}</h3>
                <div className="history-date">{formatDate(synthesis.date)}</div>
              </div>
              
              <div className="history-meta">
                <span className="sources-count">{synthesis.sources_count} sources</span>
                <span className="reliability-score">
                  Fiabilité: {Math.round(synthesis.reliability_score * 100)}%
                </span>
                {synthesis.themes && synthesis.themes.length > 0 && (
                  <div className="themes-preview">
                    {synthesis.themes.slice(0, 3).map((theme, index) => (
                      <span key={index} className="theme-tag-small">{theme}</span>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="history-preview">
                {synthesis.preview}
              </div>
              
              <button 
                onClick={() => {
                  setDailySynthesis({ synthesis });
                  setActiveTab('today');
                }}
                className="view-synthesis-btn"
              >
                Voir la synthèse complète
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="no-history">
          <div className="no-content-icon">📖</div>
          <h3>Aucun historique</h3>
          <p>Les synthèses quotidiennes apparaîtront ici au fur et à mesure.</p>
        </div>
      )}
    </div>
  );

  // Composant Sources
  const SourcesTab = () => (
    <div className="tab-content">
      <h2>🔗 Sources d'Information</h2>
      <p>Surveillance automatique des actualités politiques et géopolitiques</p>
      
      <div className="sources-status">
        {sourcesStatus.map((source) => (
          <div key={source.id} className="source-card">
            <div className="source-header">
              <h3>{source.name}</h3>
              <div className={`status-indicator ${source.is_active ? 'active' : 'inactive'}`}>
                {source.is_active ? '🟢 Actif' : '🔴 Inactif'}
              </div>
            </div>
            
            <p className="source-description">{source.description}</p>
            
            <div className="source-stats">
              <div className="stat-item">
                <span className="stat-label">Articles aujourd'hui:</span>
                <span className="stat-value">{source.today_articles || 0}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Total récupérés:</span>
                <span className="stat-value">{source.articles_scraped || 0}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Dernier scraping:</span>
                <span className="stat-value">
                  {source.last_scrape ? new Date(source.last_scrape).toLocaleTimeString('fr-FR') : 'Jamais'}
                </span>
              </div>
            </div>
            
            <a href={source.url} target="_blank" rel="noopener noreferrer" className="source-link">
              Visiter le site →
            </a>
          </div>
        ))}
      </div>
      
      {isAdmin() && (
        <div className="admin-section">
          <h4>🔧 Actions Administrateur</h4>
          <div className="admin-buttons">
            <button onClick={triggerManualScraping} disabled={loading} className="admin-btn">
              🔄 Scraping manuel
            </button>
            <button onClick={loadSourcesStatus} className="admin-btn">
              📊 Actualiser les stats
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // Composant Glossaire
  const GlossaryTab = () => (
    <div className="tab-content">
      <h2>📖 Glossaire Politique & Géopolitique</h2>
      <p>Définitions des termes complexes pour mieux comprendre l'actualité</p>
      
      {glossary.length > 0 ? (
        <div className="glossary-grid">
          {glossary.map((term) => (
            <div key={term.id} className="glossary-card">
              <h4 className="glossary-term">{term.term}</h4>
              <p className="glossary-definition">{term.definition}</p>
              {term.detailed_explanation && (
                <details className="glossary-details">
                  <summary>En savoir plus</summary>
                  <p className="glossary-explanation">{term.detailed_explanation}</p>
                </details>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="no-glossary">
          <div className="no-content-icon">📚</div>
          <p>Chargement du glossaire...</p>
        </div>
      )}
    </div>
  );

  // Composant Modal pour les articles d'une source
  const SourceArticlesModal = () => {
    if (!showSourceArticles) return null;

    return (
      <div className="modal-overlay" onClick={closeSourceArticlesModal}>
        <div className="modal-content source-articles-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>📰 Articles de {selectedSourceName}</h3>
            <button className="modal-close" onClick={closeSourceArticlesModal}>✕</button>
          </div>
          
          <div className="modal-body">
            {loadingSourceArticles ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Chargement des articles...</p>
              </div>
            ) : (
              <>
                <div className="articles-summary">
                  <p>{selectedSourceArticles.length} articles trouvés pour <strong>{selectedSourceName}</strong></p>
                </div>
                
                <div className="articles-list">
                  {selectedSourceArticles.map((article, index) => (
                    <div key={article.id || index} className="article-card">
                      <div className="article-header">
                        <h4 className="article-title">{article.title}</h4>
                        <span className={`political-badge ${article.is_political ? 'political' : 'non-political'}`}>
                          {article.is_political ? '🏛️ Politique' : '📰 Général'}
                        </span>
                      </div>
                      
                      <div className="article-meta">
                        <span className="article-date">
                          {article.scraped_at ? new Date(article.scraped_at).toLocaleDateString('fr-FR') : 'Date inconnue'}
                        </span>
                        <span className="article-time">
                          {article.scraped_at ? new Date(article.scraped_at).toLocaleTimeString('fr-FR') : ''}
                        </span>
                      </div>
                      
                      <p className="article-preview">{article.content}</p>
                      
                      <div className="article-actions">
                        <a 
                          href={article.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="article-link"
                        >
                          🔗 Lire l'article complet
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
                
                {selectedSourceArticles.length === 0 && (
                  <div className="no-articles">
                    <div className="no-content-icon">📭</div>
                    <h3>Aucun article trouvé</h3>
                    <p>Aucun article n'a été trouvé pour cette source.</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  };
  // Composant Administration Avancé
  const AdminTab = () => {
    const [adminView, setAdminView] = useState('dashboard');
    
    return (
      <div className="tab-content">
        <h2>⚙️ Administration Avancée</h2>
        <p>Panneau de contrôle complet pour la gestion du système EasyGeo</p>
        
        {/* Navigation des sections d'admin */}
        <div className="admin-nav">
          <button 
            className={`admin-nav-btn ${adminView === 'dashboard' ? 'active' : ''}`}
            onClick={() => setAdminView('dashboard')}
          >
            🏠 Tableau de Bord
          </button>
          <button 
            className={`admin-nav-btn ${adminView === 'sources' ? 'active' : ''}`}
            onClick={() => setAdminView('sources')}
          >
            🔗 Gestion des Sources
          </button>
          <button 
            className={`admin-nav-btn ${adminView === 'ai-models' ? 'active' : ''}`}
            onClick={() => setAdminView('ai-models')}
          >
            🤖 Modèles IA
          </button>
          <button 
            className={`admin-nav-btn ${adminView === 'glossary' ? 'active' : ''}`}
            onClick={() => setAdminView('glossary')}
          >
            📚 Glossaire
          </button>
          <button 
            className={`admin-nav-btn ${adminView === 'synthesis' ? 'active' : ''}`}
            onClick={() => setAdminView('synthesis')}
          >
            🚀 Synthèse IA
          </button>
          <button 
            className={`admin-nav-btn ${adminView === 'config' ? 'active' : ''}`}
            onClick={() => setAdminView('config')}
          >
            ⚙️ Configuration
          </button>
        </div>

        {/* Contenu des sections */}
        <div className="admin-content">
          {adminView === 'dashboard' && (
            <div className="admin-dashboard">
              <h3>🏠 Tableau de Bord Administrateur</h3>
              
              {/* Actions rapides */}
              <div className="quick-actions">
                <h4>🔄 Actions Rapides</h4>
                <div className="quick-buttons">
                  <button 
                    onClick={triggerManualScraping} 
                    disabled={loading} 
                    className="quick-btn scraping"
                  >
                    {loading ? '⏳ En cours...' : '🔄 Scraping Manuel'}
                  </button>
                  <button 
                    onClick={triggerManualSynthesis} 
                    disabled={loading} 
                    className="quick-btn synthesis"
                  >
                    {loading ? '⏳ En cours...' : '⚡ Synthèse Manuelle'}
                  </button>
                  <button 
                    onClick={() => {
                      loadTodaySynthesis();
                      loadSynthesisHistory();
                      loadSourcesStatus();
                      loadGlossary();
                    }} 
                    className="quick-btn refresh"
                  >
                    📊 Actualiser Données
                  </button>
                </div>
              </div>

              {/* Statistiques système */}
              <div className="dashboard-stats">
                <h4>📊 Statistiques Système</h4>
                <div className="stats-grid-dashboard">
                  <div className="stat-card">
                    <div className="stat-icon">🔗</div>
                    <div className="stat-info">
                      <span className="stat-number">{sourcesStatus.length}</span>
                      <span className="stat-label">Sources configurées</span>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">📰</div>
                    <div className="stat-info">
                      <span className="stat-number">
                        {sourcesStatus.reduce((total, source) => total + (source.articles_scraped || 0), 0)}
                      </span>
                      <span className="stat-label">Articles scrapés</span>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">📄</div>
                    <div className="stat-info">
                      <span className="stat-number">{synthesisHistory.length}</span>
                      <span className="stat-label">Synthèses générées</span>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">📚</div>
                    <div className="stat-info">
                      <span className="stat-number">{glossary.length}</span>
                      <span className="stat-label">Termes au glossaire</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Configuration système */}
              <div className="system-overview">
                <h4>🎛️ Aperçu Configuration</h4>
                <div className="config-overview">
                  <div className="config-item-overview">
                    <span className="config-label">🕐 Scraping automatique:</span>
                    <span className="config-value">Toutes les heures</span>
                  </div>
                  <div className="config-item-overview">
                    <span className="config-label">🤖 Modèle IA:</span>
                    <span className="config-value">Claude 3.5 Haiku</span>
                  </div>
                  <div className="config-item-overview">
                    <span className="config-label">⏰ Synthèses automatiques:</span>
                    <span className="config-value">9h, 15h, 20h</span>
                  </div>
                  <div className="config-item-overview">
                    <span className="config-label">🎯 Sources actives:</span>
                    <span className="config-value">
                      {sourcesStatus.filter(s => s.is_active).length} / {sourcesStatus.length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {adminView === 'sources' && <SourcesManager />}
          {adminView === 'ai-models' && <AIModelsManager />}
          {adminView === 'glossary' && <GlossaryManager />}
          {adminView === 'synthesis' && <CustomAISynthesis />}
          {adminView === 'config' && <SystemConfigManager />}
        </div>
      </div>
    );
  };

  return (
    <div className="App">
      <header className="app-header">
        <div className="header-content">
          <div className="header-left">
            <h1>🏛️ Analyseur Politique Automatique</h1>
            <p>Synthèse quotidienne neutre et factuelle de l'actualité</p>
          </div>
          <div className="header-right">
            <AuthButton onOpenModal={(mode) => {
              setAuthModalMode(mode);
              setShowAuthModal(true);
            }} />
          </div>
        </div>
      </header>

      <nav className="nav-tabs">
        <button 
          className={activeTab === 'today' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('today')}
        >
          📰 Aujourd'hui
        </button>
        <button 
          className={activeTab === 'history' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('history')}
        >
          📚 Historique
        </button>
        <button 
          className={activeTab === 'sources' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('sources')}
        >
          🔗 Sources
        </button>
        <button 
          className={activeTab === 'glossary' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('glossary')}
        >
          📖 Glossaire
        </button>
        {isAdmin() && (
          <button 
            className={activeTab === 'admin' ? 'tab active admin-tab' : 'tab admin-tab'}
            onClick={() => setActiveTab('admin')}
          >
            ⚙️ Administration
          </button>
        )}
      </nav>

      <main className="main-content">
        {activeTab === 'today' && <TodayTab />}
        {activeTab === 'history' && <HistoryTab />}
        {activeTab === 'sources' && <SourcesTab />}
        {activeTab === 'glossary' && <GlossaryTab />}
        {activeTab === 'admin' && isAdmin() && <AdminTab />}
      </main>

      <footer className="app-footer">
        <div className="footer-content">
          <p>🤖 Scraping automatique toutes les heures • 🎯 Filtrage politique/géopolitique • ⚖️ Analyse neutre par IA</p>
          <div className="footer-info">
            <span>Sources: Le Monde, BFM Business, Blast</span>
            <span>•</span>
            <span>IA: Claude 3.5 Haiku</span>
          </div>
        </div>
      </footer>

      {/* Modal pour les articles par source */}
      <SourceArticlesModal />

      {/* Modal d'authentification */}
      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode={authModalMode}
      />
    </div>
  );
}

// Composant App principal avec AuthProvider
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;