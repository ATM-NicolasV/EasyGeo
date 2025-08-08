// Composants d'administration avancés pour EasyGeo
import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import Cookies from 'js-cookie';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL;

// ===================================
// COMPOSANT GESTION DES SOURCES
// ===================================
export const SourcesManager = () => {
  const [sources, setSources] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSource, setEditingSource] = useState(null);
  const [loading, setLoading] = useState(false);
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

  // Charger les sources
  const loadSources = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/sources/all`);
      const data = await response.json();
      setSources(data.sources || []);
    } catch (error) {
      console.error('Erreur lors du chargement des sources:', error);
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
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
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
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
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
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      });

      const data = await response.json();
      alert(`Test terminé: ${data.articles_found} articles trouvés`);
    } catch (error) {
      alert(`Erreur de test: ${error.message}`);
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
    <div className="admin-section">
      <div className="section-header">
        <h3>🔗 Gestion des Sources</h3>
        <button 
          className="add-btn"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? '❌ Annuler' : '➕ Ajouter une source'}
        </button>
      </div>

      {showAddForm && (
        <form className="add-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label>Nom de la source *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
              />
            </div>

            <div className="form-group">
              <label>URL *</label>
              <input
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({...formData, url: e.target.value})}
                required
              />
            </div>

            <div className="form-group">
              <label>Type de scraper</label>
              <select
                value={formData.scraper_type}
                onChange={(e) => setFormData({...formData, scraper_type: e.target.value})}
              >
                <option value="generic">Générique</option>
                <option value="lemonde">Le Monde</option>
                <option value="bfm">BFM</option>
                <option value="blast">Blast</option>
                <option value="custom">Personnalisé</option>
              </select>
            </div>

            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                />
                Source active
              </label>
            </div>
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows="2"
            />
          </div>

          <div className="form-actions">
            <button type="submit" disabled={loading} className="submit-btn">
              {loading ? '⏳ En cours...' : (editingSource ? '💾 Modifier' : '➕ Ajouter')}
            </button>
            <button type="button" onClick={resetForm} className="cancel-btn">
              Annuler
            </button>
          </div>
        </form>
      )}

      <div className="sources-list">
        {sources.map((source) => (
          <div key={source.id} className="source-card">
            <div className="source-header">
              <h4>{source.name}</h4>
              <div className="source-actions">
                <button onClick={() => handleTest(source.id)} className="test-btn" title="Tester">
                  🧪
                </button>
                <button onClick={() => startEdit(source)} className="edit-btn" title="Modifier">
                  ✏️
                </button>
                <button onClick={() => handleDelete(source.id)} className="delete-btn" title="Supprimer">
                  🗑️
                </button>
              </div>
            </div>
            
            <div className="source-info">
              <p><strong>URL:</strong> <a href={source.url} target="_blank" rel="noopener noreferrer">{source.url}</a></p>
              <p><strong>Type:</strong> {source.scraper_type}</p>
              <p><strong>Articles scrapés:</strong> {source.articles_scraped || 0}</p>
              <p><strong>Statut:</strong> 
                <span className={`status ${source.is_active ? 'active' : 'inactive'}`}>
                  {source.is_active ? '✅ Actif' : '❌ Inactif'}
                </span>
              </p>
              {source.description && (
                <p><strong>Description:</strong> {source.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ===================================
// COMPOSANT GESTION DES MODÈLES IA
// ===================================
export const AIModelsManager = () => {
  const [aiModels, setAIModels] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(false);
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

  // Charger les modèles IA
  const loadAIModels = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/ai-models`);
      const data = await response.json();
      setAIModels(data.ai_models || []);
    } catch (error) {
      console.error('Erreur lors du chargement des modèles IA:', error);
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
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
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
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      });

      const data = await response.json();
      alert(`Test du modèle: ${data.success ? 'Succès' : 'Échec'}\nTemps de réponse: ${data.response_time_ms}ms`);
    } catch (error) {
      alert(`Erreur de test: ${error.message}`);
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
    <div className="admin-section">
      <div className="section-header">
        <h3>🤖 Gestion des Modèles IA</h3>
        <button 
          className="add-btn"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? '❌ Annuler' : '➕ Ajouter un modèle'}
        </button>
      </div>

      {showAddForm && (
        <form className="add-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label>Nom du modèle *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="ex: Claude 3.5 Haiku"
                required
              />
            </div>

            <div className="form-group">
              <label>Fournisseur *</label>
              <select
                value={formData.provider}
                onChange={(e) => setFormData({...formData, provider: e.target.value})}
                required
              >
                <option value="anthropic">Anthropic</option>
                <option value="openai">OpenAI</option>
                <option value="google">Google</option>
                <option value="local">Local</option>
                <option value="other">Autre</option>
              </select>
            </div>

            <div className="form-group">
              <label>ID du modèle *</label>
              <input
                type="text"
                value={formData.model_id}
                onChange={(e) => setFormData({...formData, model_id: e.target.value})}
                placeholder="ex: claude-3-5-haiku-20241022"
                required
              />
            </div>

            <div className="form-group">
              <label>Clé API</label>
              <input
                type="password"
                value={formData.api_key}
                onChange={(e) => setFormData({...formData, api_key: e.target.value})}
                placeholder="Clé API (optionnel si configurée globalement)"
              />
            </div>

            <div className="form-group">
              <label>Endpoint API (optionnel)</label>
              <input
                type="url"
                value={formData.api_endpoint}
                onChange={(e) => setFormData({...formData, api_endpoint: e.target.value})}
                placeholder="URL personnalisée de l'API"
              />
            </div>

            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                />
                Modèle actif
              </label>
            </div>
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Description du modèle et de ses capacités"
              rows="3"
            />
          </div>

          <div className="form-actions">
            <button type="submit" disabled={loading} className="submit-btn">
              {loading ? '⏳ En cours...' : '➕ Ajouter le modèle'}
            </button>
            <button type="button" onClick={resetForm} className="cancel-btn">
              Annuler
            </button>
          </div>
        </form>
      )}

      <div className="ai-models-list">
        {aiModels.map((model) => (
          <div key={model.id} className="ai-model-card">
            <div className="model-header">
              <h4>{model.name}</h4>
              <div className="model-actions">
                <button onClick={() => handleTest(model.id)} className="test-btn" title="Tester">
                  🧪 Tester
                </button>
              </div>
            </div>
            
            <div className="model-info">
              <p><strong>Fournisseur:</strong> {model.provider}</p>
              <p><strong>ID Modèle:</strong> {model.model_id}</p>
              <p><strong>API Key:</strong> {model.api_key || 'Non configurée'}</p>
              <p><strong>Statut:</strong> 
                <span className={`status ${model.is_active ? 'active' : 'inactive'}`}>
                  {model.is_active ? '✅ Actif' : '❌ Inactif'}
                </span>
              </p>
              {model.description && (
                <p><strong>Description:</strong> {model.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default { SourcesManager, AIModelsManager };