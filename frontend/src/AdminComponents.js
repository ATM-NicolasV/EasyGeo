// Composants d'administration avancés pour EasyGeo
import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import Cookies from 'js-cookie';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL;

// ===================================
// COMPOSANT GESTION DES SOURCES
// ===================================
export const SourcesManager = () => {
  const { token } = useAuth();
  const [sources, setSources] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSource, setEditingSource] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    description: '',
    scraper_type: 'generic',
    is_active: true,
    headers: {},
    css_selectors: {},
    custom_scraping_rules: {}
  });

  // Fonction utilitaire pour obtenir les headers d'authentification
  const getAuthHeaders = () => {
    const authToken = token || Cookies.get('easygeo_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken || ''}`
    };
  };

  // Charger les sources
  const loadSources = async () => {
    try {
      setError(null);
      const response = await fetch(`${API_BASE_URL}/api/admin/sources/all`, {
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        setSources(data.sources || []);
      } else if (response.status === 401) {
        setError('Non autorisé - veuillez vous reconnecter');
      } else {
        setError(`Erreur: ${response.status}`);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des sources:', error);
      setError('Erreur de connexion');
    }
  };

  useEffect(() => {
    loadSources();
  }, []);

  // Ajouter ou modifier une source
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = editingSource 
        ? `${API_BASE_URL}/api/admin/sources/${editingSource.id}`
        : `${API_BASE_URL}/api/admin/sources/create`;
        
      const method = editingSource ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        await loadSources();
        resetForm();
        alert(editingSource ? 'Source modifiée avec succès' : 'Source ajoutée avec succès');
      } else {
        const error = await response.json();
        alert(`Erreur: ${error.detail}`);
      }
    } catch (error) {
      alert(`Erreur: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Supprimer une source
  const handleDelete = async (sourceId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette source ?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/sources/${sourceId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        await loadSources();
        alert('Source supprimée avec succès');
      }
    } catch (error) {
      alert(`Erreur: ${error.message}`);
    }
  };

  // Tester une source
  const handleTest = async (sourceId) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/sources/${sourceId}/test`, {
        method: 'POST',
        headers: getAuthHeaders()
      });

      const data = await response.json();
      alert(`Test terminé: ${data.articles_found} articles trouvés`);
    } catch (error) {
      alert(`Erreur de test: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Initialiser les sources par défaut
  const initializeDefaultSources = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_BASE_URL}/api/admin/sources/initialize-defaults`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        alert(`✅ ${data.message}\n${data.sources_added} nouvelles sources ajoutées`);
        await loadSources();
      } else if (response.status === 401) {
        setError('Non autorisé - veuillez vous reconnecter');
      } else {
        const errorData = await response.json();
        setError(`Erreur: ${errorData.detail}`);
      }
    } catch (error) {
      console.error('Erreur lors de l\'initialisation:', error);
      setError('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      url: '',
      description: '',
      scraper_type: 'generic',
      is_active: true,
      headers: {},
      css_selectors: {},
      custom_scraping_rules: {}
    });
    setEditingSource(null);
    setShowAddForm(false);
  };

  const startEdit = (source) => {
    setFormData({
      name: source.name || '',
      url: source.url || '',
      description: source.description || '',
      scraper_type: source.scraper_type || 'generic',
      is_active: source.is_active !== false,
      headers: source.headers || {},
      css_selectors: source.css_selectors || {},
      custom_scraping_rules: source.custom_scraping_rules || {}
    });
    setEditingSource(source);
    setShowAddForm(true);
  };

  return (
    <div className="admin-section modern">
      <div className="section-header">
        <div className="header-content">
          <h3>🔗 Gestion des Sources</h3>
          <p className="section-description">Configurez et gérez les sources d'actualités politiques</p>
        </div>
        <button 
          className={`modern-btn primary ${showAddForm ? 'danger' : ''}`}
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? '✕ Annuler' : '+ Ajouter une source'}
        </button>
      </div>

      {error && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
          <button onClick={() => setError(null)} className="error-close">✕</button>
        </div>
      )}

      {showAddForm && (
        <div className="modern-form-container">
          <form className="modern-form" onSubmit={handleSubmit}>
            <div className="form-header">
              <h4>{editingSource ? '✏️ Modifier la source' : '➕ Nouvelle source'}</h4>
            </div>
            
            <div className="form-grid modern">
              <div className="form-group modern">
                <label>Nom de la source *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="ex: Le Figaro, France Info..."
                  required
                />
              </div>

              <div className="form-group modern">
                <label>URL du site *</label>
                <input
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData({...formData, url: e.target.value})}
                  placeholder="https://example.com"
                  required
                />
              </div>

              <div className="form-group modern">
                <label>Type de scraper</label>
                <div className="select-wrapper">
                  <select
                    value={formData.scraper_type}
                    onChange={(e) => setFormData({...formData, scraper_type: e.target.value})}
                  >
                    <option value="generic">🔄 Générique</option>
                    <option value="lemonde">📰 Le Monde</option>
                    <option value="bfm">📺 BFM</option>
                    <option value="blast">💥 Blast</option>
                    <option value="custom">⚙️ Personnalisé</option>
                  </select>
                </div>
              </div>

              <div className="form-group modern checkbox">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                  />
                  <span className="checkmark"></span>
                  Source active
                </label>
              </div>
            </div>

            <div className="form-group modern">
              <label>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Description de la source et de son contenu..."
                rows="3"
              />
            </div>

            <div className="form-actions modern">
              <button type="button" onClick={resetForm} className="modern-btn secondary">
                Annuler
              </button>
              <button type="submit" disabled={loading} className="modern-btn primary">
                {loading ? '⏳ En cours...' : (editingSource ? '💾 Modifier' : '+ Ajouter')}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="sources-grid modern">
        {sources.length > 0 ? (
          sources.map((source) => (
            <div key={source.id} className="source-card modern">
              <div className="card-header">
                <div className="source-info">
                  <h4>{source.name}</h4>
                  <span className={`status-badge ${source.is_active ? 'active' : 'inactive'}`}>
                    {source.is_active ? '✅ Actif' : '❌ Inactif'}
                  </span>
                </div>
                <div className="card-actions">
                  <button onClick={() => handleTest(source.id)} className="action-btn test" title="Tester">
                    🧪
                  </button>
                  <button onClick={() => startEdit(source)} className="action-btn edit" title="Modifier">
                    ✏️
                  </button>
                  <button onClick={() => handleDelete(source.id)} className="action-btn delete" title="Supprimer">
                    🗑️
                  </button>
                </div>
              </div>
              
              <div className="card-content">
                <div className="source-details">
                  <div className="detail-item">
                    <span className="detail-label">URL:</span>
                    <a href={source.url} target="_blank" rel="noopener noreferrer" className="detail-link">
                      {source.url}
                    </a>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Type:</span>
                    <span className="detail-value">{source.scraper_type}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Articles scrapés:</span>
                    <span className="detail-value stats">{source.articles_scraped || 0}</span>
                  </div>
                </div>
                
                {source.description && (
                  <div className="source-description">
                    <p>{source.description}</p>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state modern">
            <div className="empty-icon">📭</div>
            <h3>Aucune source configurée</h3>
            <p>Commencez par initialiser les sources par défaut ou ajoutez votre première source d'actualité</p>
            <div className="empty-actions">
              <button onClick={initializeDefaultSources} className="modern-btn primary" disabled={loading}>
                {loading ? '⏳ Initialisation...' : '🚀 Initialiser sources par défaut'}
              </button>
              <button onClick={() => setShowAddForm(true)} className="modern-btn secondary">
                + Ajouter une source personnalisée
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ===================================
// COMPOSANT GESTION DES MODÈLES IA
// ===================================
export const AIModelsManager = () => {
  const { token } = useAuth();
  const [aiModels, setAIModels] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    provider: 'anthropic',
    model_id: '',
    api_key: '',
    api_endpoint: '',
    description: '',
    is_active: true,
    parameters: {}
  });

  // Fonction utilitaire pour obtenir les headers d'authentification
  const getAuthHeaders = () => {
    const authToken = token || Cookies.get('easygeo_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken || ''}`
    };
  };

  // Charger les modèles IA
  const loadAIModels = async () => {
    try {
      setError(null);
      const response = await fetch(`${API_BASE_URL}/api/admin/ai-models`, {
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        setAIModels(data.ai_models || []);
      } else if (response.status === 401) {
        setError('Non autorisé - veuillez vous reconnecter');
      } else {
        setError(`Erreur: ${response.status}`);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des modèles IA:', error);
      setError('Erreur de connexion');
    }
  };

  useEffect(() => {
    loadAIModels();
  }, []);

  // Ajouter un modèle IA
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/ai-models`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        await loadAIModels();
        resetForm();
        alert('Modèle IA ajouté avec succès');
      } else {
        const error = await response.json();
        alert(`Erreur: ${error.detail}`);
      }
    } catch (error) {
      alert(`Erreur: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Tester un modèle IA
  const handleTest = async (modelId) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/ai-models/${modelId}/test`, {
        method: 'POST',
        headers: getAuthHeaders()
      });

      const data = await response.json();
      alert(`Test du modèle: ${data.success ? 'Succès' : 'Échec'}\nTemps de réponse: ${data.response_time_ms}ms`);
    } catch (error) {
      alert(`Erreur de test: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Initialiser les modèles IA par défaut
  const initializeDefaultAIModels = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_BASE_URL}/api/admin/ai-models/initialize-defaults`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        alert(`✅ ${data.message}\n${data.models_added} nouveaux modèles ajoutés`);
        await loadAIModels();
      } else if (response.status === 401) {
        setError('Non autorisé - veuillez vous reconnecter');
      } else {
        const errorData = await response.json();
        setError(`Erreur: ${errorData.detail}`);
      }
    } catch (error) {
      console.error('Erreur lors de l\'initialisation:', error);
      setError('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      provider: 'anthropic',
      model_id: '',
      api_key: '',
      api_endpoint: '',
      description: '',
      is_active: true,
      parameters: {}
    });
    setShowAddForm(false);
  };

  return (
    <div className="admin-section modern">
      <div className="section-header">
        <div className="header-content">
          <h3>🤖 Gestion des Modèles IA</h3>
          <p className="section-description">Configurez les modèles d'intelligence artificielle pour l'analyse</p>
        </div>
        <button 
          className={`modern-btn primary ${showAddForm ? 'danger' : ''}`}
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? '✕ Annuler' : '+ Ajouter un modèle'}
        </button>
      </div>

      {error && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
          <button onClick={() => setError(null)} className="error-close">✕</button>
        </div>
      )}

      {showAddForm && (
        <div className="modern-form-container">
          <form className="modern-form" onSubmit={handleSubmit}>
            <div className="form-header">
              <h4>🤖 Nouveau modèle IA</h4>
            </div>
            
            <div className="form-grid modern">
              <div className="form-group modern">
                <label>Nom du modèle *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="ex: Claude 3.5 Haiku, GPT-4..."
                  required
                />
              </div>

              <div className="form-group modern">
                <label>Fournisseur *</label>
                <div className="select-wrapper">
                  <select
                    value={formData.provider}
                    onChange={(e) => setFormData({...formData, provider: e.target.value})}
                    required
                  >
                    <option value="anthropic">🤖 Anthropic (Claude)</option>
                    <option value="openai">🚀 OpenAI (GPT)</option>
                    <option value="google">📊 Google (Gemini)</option>
                    <option value="local">💻 Local</option>
                    <option value="other">⚙️ Autre</option>
                  </select>
                </div>
              </div>

              <div className="form-group modern">
                <label>ID du modèle *</label>
                <input
                  type="text"
                  value={formData.model_id}
                  onChange={(e) => setFormData({...formData, model_id: e.target.value})}
                  placeholder="ex: claude-3-5-haiku-20241022"
                  required
                />
              </div>

              <div className="form-group modern">
                <label>Clé API</label>
                <input
                  type="password"
                  value={formData.api_key}
                  onChange={(e) => setFormData({...formData, api_key: e.target.value})}
                  placeholder="Clé API (optionnel si configurée globalement)"
                />
              </div>

              <div className="form-group modern">
                <label>Endpoint API (optionnel)</label>
                <input
                  type="url"
                  value={formData.api_endpoint}
                  onChange={(e) => setFormData({...formData, api_endpoint: e.target.value})}
                  placeholder="URL personnalisée de l'API"
                />
              </div>

              <div className="form-group modern checkbox">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                  />
                  <span className="checkmark"></span>
                  Modèle actif
                </label>
              </div>
            </div>

            <div className="form-group modern">
              <label>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Description du modèle et de ses capacités..."
                rows="3"
              />
            </div>

            <div className="form-actions modern">
              <button type="button" onClick={resetForm} className="modern-btn secondary">
                Annuler
              </button>
              <button type="submit" disabled={loading} className="modern-btn primary">
                {loading ? '⏳ En cours...' : '+ Ajouter le modèle'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="models-grid modern">
        {aiModels.length > 0 ? (
          aiModels.map((model) => (
            <div key={model.id} className="model-card modern">
              <div className="card-header">
                <div className="model-info">
                  <h4>{model.name}</h4>
                  <span className={`status-badge ${model.is_active ? 'active' : 'inactive'}`}>
                    {model.is_active ? '✅ Actif' : '❌ Inactif'}
                  </span>
                </div>
                <div className="card-actions">
                  <button onClick={() => handleTest(model.id)} className="action-btn test" title="Tester">
                    🧪 Test
                  </button>
                </div>
              </div>
              
              <div className="card-content">
                <div className="model-details">
                  <div className="detail-item">
                    <span className="detail-label">Fournisseur:</span>
                    <span className="detail-value provider">{model.provider}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">ID Modèle:</span>
                    <span className="detail-value">{model.model_id}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">API Key:</span>
                    <span className="detail-value">
                      {model.api_key ? '🔑 Configurée' : '❌ Non configurée'}
                    </span>
                  </div>
                </div>
                
                {model.description && (
                  <div className="model-description">
                    <p>{model.description}</p>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state modern">
            <div className="empty-icon">🤖</div>
            <h3>Aucun modèle IA configuré</h3>
            <p>Ajoutez votre premier modèle IA pour personnaliser l'analyse des actualités</p>
            <button onClick={() => setShowAddForm(true)} className="modern-btn primary">
              + Ajouter un modèle IA
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default { SourcesManager, AIModelsManager };