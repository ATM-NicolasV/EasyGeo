// Composants d'administration avancés - Partie 2
import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import Cookies from 'js-cookie';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL;

// ===================================
// COMPOSANT GESTION DU GLOSSAIRE
// ===================================
export const GlossaryManager = () => {
  const { token } = useAuth();
  const [glossaryTerms, setGlossaryTerms] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTerm, setEditingTerm] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [formData, setFormData] = useState({
    term: '',
    display_term: '',
    definition: '',
    detailed_explanation: '',
    category: 'general',
    examples: []
  });

  // Fonction utilitaire pour obtenir les headers d'authentification
  const getAuthHeaders = () => {
    const authToken = token || Cookies.get('easygeo_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken || ''}`
    };
  };

  // Charger le glossaire
  const loadGlossary = async () => {
    try {
      setError(null);
      const response = await fetch(`${API_BASE_URL}/api/admin/glossary`, {
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        setGlossaryTerms(data.glossary || []);
      } else if (response.status === 401) {
        setError('Non autorisé - veuillez vous reconnecter');
      } else {
        setError(`Erreur: ${response.status}`);
      }
    } catch (error) {
      console.error('Erreur lors du chargement du glossaire:', error);
      setError('Erreur de connexion');
    }
  };

  useEffect(() => {
    loadGlossary();
  }, []);

  // Filtrer les termes
  const filteredTerms = glossaryTerms.filter(term => {
    const matchesSearch = term.display_term.toLowerCase().includes(searchFilter.toLowerCase()) ||
                         term.definition.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || term.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Catégories disponibles
  const categories = [...new Set(glossaryTerms.map(term => term.category))].filter(Boolean);

  // Ajouter ou modifier un terme
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = editingTerm 
        ? `${API_BASE_URL}/api/admin/glossary/${editingTerm.id}`
        : `${API_BASE_URL}/api/admin/glossary`;
        
      const method = editingTerm ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...formData,
          examples: formData.examples.filter(ex => ex.trim() !== '')
        })
      });

      if (response.ok) {
        await loadGlossary();
        resetForm();
        alert(editingTerm ? 'Terme modifié avec succès' : 'Terme ajouté avec succès');
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

  // Supprimer un terme
  const handleDelete = async (termId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce terme ?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/glossary/${termId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        await loadGlossary();
        alert('Terme supprimé avec succès');
      }
    } catch (error) {
      alert(`Erreur: ${error.message}`);
    }
  };

  const resetForm = () => {
    setFormData({
      term: '',
      display_term: '',
      definition: '',
      detailed_explanation: '',
      category: 'general',
      examples: []
    });
    setEditingTerm(null);
    setShowAddForm(false);
  };

  const startEdit = (term) => {
    setFormData({
      term: term.term || '',
      display_term: term.display_term || '',
      definition: term.definition || '',
      detailed_explanation: term.detailed_explanation || '',
      category: term.category || 'general',
      examples: term.examples || []
    });
    setEditingTerm(term);
    setShowAddForm(true);
  };

  const handleExampleChange = (index, value) => {
    const newExamples = [...formData.examples];
    newExamples[index] = value;
    setFormData({...formData, examples: newExamples});
  };

  const addExample = () => {
    setFormData({...formData, examples: [...formData.examples, '']});
  };

  const removeExample = (index) => {
    const newExamples = formData.examples.filter((_, i) => i !== index);
    setFormData({...formData, examples: newExamples});
  };

  return (
    <div className="admin-section">
      <div className="section-header">
        <h3>📚 Gestion du Glossaire</h3>
        <button 
          className="add-btn"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? '❌ Annuler' : '➕ Ajouter un terme'}
        </button>
      </div>

      {/* Filtres */}
      <div className="filters-section">
        <div className="filter-group">
          <label>🔍 Rechercher:</label>
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Rechercher un terme ou définition..."
          />
        </div>
        
        <div className="filter-group">
          <label>📂 Catégorie:</label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">Toutes les catégories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {showAddForm && (
        <form className="add-form glossary-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label>Terme (clé de recherche) *</label>
              <input
                type="text"
                value={formData.term}
                onChange={(e) => setFormData({...formData, term: e.target.value})}
                placeholder="ex: pib, otan, brexit"
                required
              />
            </div>

            <div className="form-group">
              <label>Terme d'affichage *</label>
              <input
                type="text"
                value={formData.display_term}
                onChange={(e) => setFormData({...formData, display_term: e.target.value})}
                placeholder="ex: PIB, OTAN, Brexit"
                required
              />
            </div>

            <div className="form-group">
              <label>Catégorie</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
              >
                <option value="general">Général</option>
                <option value="politique">Politique</option>
                <option value="economie">Économie</option>
                <option value="geopolitique">Géopolitique</option>
                <option value="institutions">Institutions</option>
                <option value="droit">Droit</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Définition courte *</label>
            <textarea
              value={formData.definition}
              onChange={(e) => setFormData({...formData, definition: e.target.value})}
              placeholder="Définition concise du terme"
              rows="2"
              required
            />
          </div>

          <div className="form-group">
            <label>Explication détaillée</label>
            <textarea
              value={formData.detailed_explanation}
              onChange={(e) => setFormData({...formData, detailed_explanation: e.target.value})}
              placeholder="Explication approfondie avec contexte"
              rows="4"
            />
          </div>

          {/* Exemples */}
          <div className="form-group">
            <div className="examples-header">
              <label>Exemples d'utilisation</label>
              <button type="button" onClick={addExample} className="add-example-btn">
                ➕ Ajouter un exemple
              </button>
            </div>
            
            {formData.examples.map((example, index) => (
              <div key={index} className="example-input">
                <input
                  type="text"
                  value={example}
                  onChange={(e) => handleExampleChange(index, e.target.value)}
                  placeholder={`Exemple ${index + 1}`}
                />
                <button 
                  type="button" 
                  onClick={() => removeExample(index)}
                  className="remove-example-btn"
                >
                  ❌
                </button>
              </div>
            ))}
          </div>

          <div className="form-actions">
            <button type="submit" disabled={loading} className="submit-btn">
              {loading ? '⏳ En cours...' : (editingTerm ? '💾 Modifier' : '➕ Ajouter')}
            </button>
            <button type="button" onClick={resetForm} className="cancel-btn">
              Annuler
            </button>
          </div>
        </form>
      )}

      <div className="glossary-stats">
        <p>📊 {filteredTerms.length} terme(s) affiché(s) sur {glossaryTerms.length} total</p>
      </div>

      <div className="glossary-list">
        {filteredTerms.map((term) => (
          <div key={term.id} className="glossary-card editable">
            <div className="term-header">
              <h4>{term.display_term}</h4>
              <div className="term-actions">
                <span className="category-badge">{term.category}</span>
                <button onClick={() => startEdit(term)} className="edit-btn" title="Modifier">
                  ✏️
                </button>
                <button onClick={() => handleDelete(term.id)} className="delete-btn" title="Supprimer">
                  🗑️
                </button>
              </div>
            </div>
            
            <div className="term-content">
              <p className="term-definition"><strong>Définition:</strong> {term.definition}</p>
              
              {term.detailed_explanation && (
                <p className="term-explanation"><strong>Détails:</strong> {term.detailed_explanation}</p>
              )}
              
              {term.examples && term.examples.length > 0 && (
                <div className="term-examples">
                  <strong>Exemples:</strong>
                  <ul>
                    {term.examples.map((example, index) => (
                      <li key={index}>{example}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div className="term-meta">
                <small>
                  {term.auto_generated ? '🤖 Généré automatiquement' : '👤 Ajouté manuellement'} 
                  {term.created_at && ` • ${new Date(term.created_at).toLocaleDateString('fr-FR')}`}
                </small>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ===================================
// COMPOSANT CONFIGURATION SYSTÈME
// ===================================
export const SystemConfigManager = () => {
  const { token } = useAuth();
  const [config, setConfig] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    scraping_frequency_hours: 1,
    synthesis_times: ['09:00', '15:00', '20:00'],
    max_articles_per_synthesis: 50,
    reliability_threshold: 0.7,
    auto_glossary_generation: true,
    default_ai_model: 'claude-3-5-haiku',
    email_notifications: false,
    notification_email: '',
    data_retention_days: 365
  });

  // Fonction utilitaire pour obtenir les headers d'authentification
  const getAuthHeaders = () => {
    const authToken = token || Cookies.get('easygeo_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken || ''}`
    };
  };

  // Charger la configuration
  const loadConfig = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/config`);
      const data = await response.json();
      setConfig(data.config || {});
      setFormData({
        ...formData,
        ...data.config
      });
    } catch (error) {
      console.error('Erreur lors du chargement de la configuration:', error);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  // Sauvegarder la configuration
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        await loadConfig();
        alert('Configuration mise à jour avec succès');
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

  const handleSynthesisTimeChange = (index, value) => {
    const newTimes = [...formData.synthesis_times];
    newTimes[index] = value;
    setFormData({...formData, synthesis_times: newTimes});
  };

  const addSynthesisTime = () => {
    setFormData({
      ...formData, 
      synthesis_times: [...formData.synthesis_times, '12:00']
    });
  };

  const removeSynthesisTime = (index) => {
    const newTimes = formData.synthesis_times.filter((_, i) => i !== index);
    setFormData({...formData, synthesis_times: newTimes});
  };

  return (
    <div className="admin-section">
      <div className="section-header">
        <h3>⚙️ Configuration Système</h3>
      </div>

      <form className="config-form" onSubmit={handleSubmit}>
        <div className="config-sections">
          
          {/* Section Scraping */}
          <div className="config-section">
            <h4>🔄 Configuration du Scraping</h4>
            
            <div className="form-group">
              <label>Fréquence de scraping (heures)</label>
              <input
                type="number"
                min="1"
                max="24"
                value={formData.scraping_frequency_hours}
                onChange={(e) => setFormData({...formData, scraping_frequency_hours: parseInt(e.target.value)})}
              />
              <small>Intervalle entre les sessions de scraping automatique</small>
            </div>

            <div className="form-group">
              <label>Articles maximum par synthèse</label>
              <input
                type="number"
                min="10"
                max="200"
                value={formData.max_articles_per_synthesis}
                onChange={(e) => setFormData({...formData, max_articles_per_synthesis: parseInt(e.target.value)})}
              />
              <small>Nombre maximum d'articles à analyser pour chaque synthèse</small>
            </div>
          </div>

          {/* Section Synthèses */}
          <div className="config-section">
            <h4>📄 Configuration des Synthèses</h4>
            
            <div className="form-group">
              <label>Heures de synthèses automatiques</label>
              <div className="synthesis-times">
                {formData.synthesis_times.map((time, index) => (
                  <div key={index} className="time-input">
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => handleSynthesisTimeChange(index, e.target.value)}
                    />
                    {formData.synthesis_times.length > 1 && (
                      <button 
                        type="button" 
                        onClick={() => removeSynthesisTime(index)}
                        className="remove-time-btn"
                      >
                        ❌
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={addSynthesisTime} className="add-time-btn">
                  ➕ Ajouter une heure
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Seuil de fiabilité</label>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                value={formData.reliability_threshold}
                onChange={(e) => setFormData({...formData, reliability_threshold: parseFloat(e.target.value)})}
              />
              <span className="range-value">{formData.reliability_threshold}</span>
              <small>Seuil minimum de fiabilité pour inclure un article dans la synthèse</small>
            </div>

            <div className="form-group">
              <label>Modèle IA par défaut</label>
              <select
                value={formData.default_ai_model}
                onChange={(e) => setFormData({...formData, default_ai_model: e.target.value})}
              >
                <option value="claude-3-5-haiku">Claude 3.5 Haiku</option>
                <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
                <option value="gpt-4">GPT-4</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
              </select>
            </div>
          </div>

          {/* Section Glossaire */}
          <div className="config-section">
            <h4>📚 Configuration du Glossaire</h4>
            
            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={formData.auto_glossary_generation}
                  onChange={(e) => setFormData({...formData, auto_glossary_generation: e.target.checked})}
                />
                Génération automatique du glossaire
              </label>
              <small>Générer automatiquement des termes lors de l'analyse des articles</small>
            </div>
          </div>

          {/* Section Notifications */}
          <div className="config-section">
            <h4>📧 Configuration des Notifications</h4>
            
            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={formData.email_notifications}
                  onChange={(e) => setFormData({...formData, email_notifications: e.target.checked})}
                />
                Activer les notifications email
              </label>
            </div>

            {formData.email_notifications && (
              <div className="form-group">
                <label>Email de notification</label>
                <input
                  type="email"
                  value={formData.notification_email}
                  onChange={(e) => setFormData({...formData, notification_email: e.target.value})}
                  placeholder="admin@example.com"
                />
              </div>
            )}
          </div>

          {/* Section Données */}
          <div className="config-section">
            <h4>💾 Gestion des Données</h4>
            
            <div className="form-group">
              <label>Rétention des données (jours)</label>
              <input
                type="number"
                min="30"
                max="3650"
                value={formData.data_retention_days}
                onChange={(e) => setFormData({...formData, data_retention_days: parseInt(e.target.value)})}
              />
              <small>Durée de conservation des articles et synthèses</small>
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" disabled={loading} className="submit-btn large">
            {loading ? '⏳ Sauvegarde...' : '💾 Sauvegarder la Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default { GlossaryManager, SystemConfigManager };