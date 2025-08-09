// Composant de synthèse avec IA personnalisée
import React, { useState, useEffect } from 'react';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL;

// ===================================
// COMPOSANT SYNTHÈSE AVEC IA PERSONNALISÉE
// ===================================
export const CustomAISynthesis = () => {
  const [aiModels, setAiModels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [synthesisResult, setSynthesisResult] = useState(null);
  const [formData, setFormData] = useState({
    ai_model: '',
    max_articles: 20,
    custom_prompt: '',
    themes_filter: []
  });

  const predefinedThemes = [
    'Politique française',
    'Géopolitique',
    'Économie',
    'Social',
    'Environnement',
    'Technologie',
    'Sécurité',
    'International'
  ];

  // Charger les modèles IA disponibles
  const loadAIModels = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/ai-models`);
      const data = await response.json();
      const activeModels = (data.ai_models || []).filter(model => model.is_active);
      setAiModels(activeModels);
      
      // Sélectionner le premier modèle par défaut
      if (activeModels.length > 0) {
        setFormData(prev => ({
          ...prev,
          ai_model: activeModels[0].model_id
        }));
      }
    } catch (error) {
      console.error('Erreur lors du chargement des modèles IA:', error);
    }
  };

  useEffect(() => {
    loadAIModels();
  }, []);

  // Générer une synthèse personnalisée
  const handleGenerateSynthesis = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSynthesisResult(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/synthesis/generate-with-ai`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({
          ...formData,
          themes_filter: formData.themes_filter.length > 0 ? formData.themes_filter : null
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        setSynthesisResult(result);
        alert('Synthèse générée avec succès !');
      } else {
        alert(`Erreur: ${result.detail}`);
      }
    } catch (error) {
      alert(`Erreur: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleThemeToggle = (theme) => {
    const isSelected = formData.themes_filter.includes(theme);
    const newThemes = isSelected
      ? formData.themes_filter.filter(t => t !== theme)
      : [...formData.themes_filter, theme];
    
    setFormData({...formData, themes_filter: newThemes});
  };

  const resetForm = () => {
    setFormData({
      ai_model: aiModels.length > 0 ? aiModels[0].model_id : '',
      max_articles: 20,
      custom_prompt: '',
      themes_filter: []
    });
    setSynthesisResult(null);
  };

  return (
    <div className="admin-section">
      <div className="section-header">
        <h3>🤖 Synthèse avec IA Personnalisée</h3>
        <button onClick={resetForm} className="reset-btn">
          🔄 Réinitialiser
        </button>
      </div>

      <form className="synthesis-form" onSubmit={handleGenerateSynthesis}>
        
        {/* Sélection du modèle IA */}
        <div className="form-section">
          <h4>🧠 Modèle IA</h4>
          <div className="form-group">
            <label>Choisir le modèle IA *</label>
            <select
              value={formData.ai_model}
              onChange={(e) => setFormData({...formData, ai_model: e.target.value})}
              required
            >
              <option value="">Sélectionner un modèle...</option>
              {aiModels.map(model => (
                <option key={model.id} value={model.model_id}>
                  {model.name} ({model.provider})
                </option>
              ))}
            </select>
            {aiModels.length === 0 && (
              <small className="warning">⚠️ Aucun modèle IA actif trouvé. Ajoutez d'abord un modèle dans la section "Gestion des IA".</small>
            )}
          </div>
        </div>

        {/* Paramètres de synthèse */}
        <div className="form-section">
          <h4>📊 Paramètres</h4>
          
          <div className="form-group">
            <label>Nombre maximum d'articles à analyser</label>
            <input
              type="range"
              min="5"
              max="100"
              value={formData.max_articles}
              onChange={(e) => setFormData({...formData, max_articles: parseInt(e.target.value)})}
            />
            <span className="range-value">{formData.max_articles} articles</span>
          </div>

          <div className="form-group">
            <label>Filtres thématiques (optionnel)</label>
            <div className="themes-selector">
              {predefinedThemes.map(theme => (
                <button
                  key={theme}
                  type="button"
                  className={`theme-btn ${formData.themes_filter.includes(theme) ? 'selected' : ''}`}
                  onClick={() => handleThemeToggle(theme)}
                >
                  {theme}
                </button>
              ))}
            </div>
            <small>Sélectionnez les thèmes à privilégier (laisser vide pour tous)</small>
          </div>
        </div>

        {/* Prompt personnalisé */}
        <div className="form-section">
          <h4>✍️ Instructions Personnalisées</h4>
          
          <div className="form-group">
            <label>Prompt personnalisé (optionnel)</label>
            <textarea
              value={formData.custom_prompt}
              onChange={(e) => setFormData({...formData, custom_prompt: e.target.value})}
              rows="6"
              placeholder="Laissez vide pour utiliser le prompt par défaut, ou écrivez vos instructions spécifiques pour l'IA...

Exemple:
Rédigez une synthèse axée sur les enjeux économiques, en mettant l'accent sur:
- Les impacts sur les PME
- Les mesures gouvernementales
- Les réactions des marchés financiers

Tone: Analytique et précis
Format: 3 sections avec bullet points"
            />
            <small>Personnalisez les instructions pour adapter la synthèse à vos besoins spécifiques</small>
          </div>

          <div className="prompt-templates">
            <label>Templates rapides:</label>
            <div className="template-buttons">
              <button
                type="button"
                onClick={() => setFormData({...formData, custom_prompt: 'Rédigez une synthèse courte et percutante, format bullet points, max 300 mots.'})}
              >
                📄 Format court
              </button>
              <button
                type="button"
                onClick={() => setFormData({...formData, custom_prompt: 'Analysez les enjeux géopolitiques internationaux avec focus sur les tensions entre grandes puissances.'})}
              >
                🌍 Focus géopolitique
              </button>
              <button
                type="button"
                onClick={() => setFormData({...formData, custom_prompt: 'Concentrez-vous sur l\'impact économique et financier des événements politiques récents.'})}
              >
                💰 Focus économique
              </button>
            </div>
          </div>
        </div>

        {/* Bouton de génération */}
        <div className="form-actions">
          <button 
            type="submit" 
            disabled={loading || !formData.ai_model || aiModels.length === 0} 
            className="generate-btn"
          >
            {loading ? '⏳ Génération en cours...' : '🚀 Générer la Synthèse'}
          </button>
        </div>
      </form>

      {/* Résultat de la synthèse */}
      {synthesisResult && (
        <div className="synthesis-result">
          <div className="result-header">
            <h3>✅ Synthèse Générée avec Succès</h3>
            <div className="result-meta">
              <span className="meta-item">🤖 {synthesisResult.ai_model}</span>
              <span className="meta-item">📊 {synthesisResult.articles_analyzed} articles</span>
              <span className="meta-item">🔗 {synthesisResult.sources_used?.length} sources</span>
            </div>
          </div>

          <div className="result-content">
            <div className="result-info">
              <h4>{synthesisResult.synthesis_title}</h4>
              <p><strong>ID de synthèse:</strong> {synthesisResult.synthesis_id}</p>
              <p><strong>Sources utilisées:</strong> {synthesisResult.sources_used?.join(', ')}</p>
            </div>

            <div className="result-actions">
              <button 
                onClick={() => window.location.reload()} 
                className="view-btn"
              >
                📰 Voir dans l'onglet "Aujourd'hui"
              </button>
              <button 
                onClick={() => navigator.clipboard.writeText(synthesisResult.synthesis_id)}
                className="copy-btn"
              >
                📋 Copier l'ID
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comparaison des modèles */}
      <div className="models-comparison">
        <h4>📈 Performance des Modèles IA</h4>
        <div className="comparison-grid">
          {aiModels.map(model => (
            <div key={model.id} className="model-performance-card">
              <h5>{model.name}</h5>
              <p><strong>Fournisseur:</strong> {model.provider}</p>
              <p><strong>Statut:</strong> <span className="status active">✅ Actif</span></p>
              <div className="model-actions">
                <button 
                  onClick={() => setFormData({...formData, ai_model: model.model_id})}
                  className="select-model-btn"
                >
                  🎯 Sélectionner
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CustomAISynthesis;