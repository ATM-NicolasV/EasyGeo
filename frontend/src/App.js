import React, { useState, useEffect } from 'react';
import './App.css';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL;

function App() {
  const [activeTab, setActiveTab] = useState('analyze');
  const [sources, setSources] = useState([]);
  const [syntheses, setSyntheses] = useState([]);
  const [glossary, setGlossary] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Analysis form state
  const [urls, setUrls] = useState(['']);
  const [topic, setTopic] = useState('');
  const [aiProvider, setAiProvider] = useState('anthropic');
  const [aiModel, setAiModel] = useState('claude-3-5-haiku-20241022');
  
  // Results state
  const [currentSynthesis, setCurrentSynthesis] = useState(null);
  const [selectedTerm, setSelectedTerm] = useState(null);

  // Load data on component mount
  useEffect(() => {
    loadSources();
    loadSyntheses();
    loadGlossary();
    autoGenerateGlossary();
  }, []);

  const loadSources = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/sources`);
      const data = await response.json();
      setSources(data.sources || []);
    } catch (error) {
      console.error('Error loading sources:', error);
    }
  };

  const loadSyntheses = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/syntheses`);
      const data = await response.json();
      setSyntheses(data.syntheses || []);
    } catch (error) {
      console.error('Error loading syntheses:', error);
    }
  };

  const loadGlossary = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/glossary`);
      const data = await response.json();
      setGlossary(data.terms || []);
    } catch (error) {
      console.error('Error loading glossary:', error);
    }
  };

  const autoGenerateGlossary = async () => {
    try {
      await fetch(`${API_BASE_URL}/api/auto-glossary`, { method: 'POST' });
      loadGlossary(); // Refresh glossary
    } catch (error) {
      console.error('Error auto-generating glossary:', error);
    }
  };

  const addUrl = () => {
    setUrls([...urls, '']);
  };

  const removeUrl = (index) => {
    const newUrls = urls.filter((_, i) => i !== index);
    setUrls(newUrls.length > 0 ? newUrls : ['']);
  };

  const updateUrl = (index, value) => {
    const newUrls = [...urls];
    newUrls[index] = value;
    setUrls(newUrls);
  };

  const analyzeContent = async () => {
    if (!topic.trim() || urls.filter(url => url.trim()).length === 0) {
      alert('Veuillez saisir un sujet et au moins une URL');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          urls: urls.filter(url => url.trim()),
          topic: topic.trim(),
          ai_settings: {
            provider: aiProvider,
            model: aiModel
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Erreur lors de l\'analyse');
      }

      const result = await response.json();
      setCurrentSynthesis(result);
      setActiveTab('results');
      loadSyntheses(); // Refresh syntheses list
    } catch (error) {
      console.error('Analysis error:', error);
      alert(`Erreur lors de l'analyse: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const renderGlossaryTooltip = (text) => {
    if (!glossary.length) return text;

    let processedText = text;
    glossary.forEach(term => {
      const regex = new RegExp(`\\b${term.term}\\b`, 'gi');
      processedText = processedText.replace(regex, 
        `<span class="glossary-term" data-term="${term.term}" title="${term.definition}">${term.term}</span>`
      );
    });

    return <div dangerouslySetInnerHTML={{ __html: processedText }} />;
  };

  const AnalyzeTab = () => (
    <div className="tab-content">
      <div className="analyze-header">
        <h2>Analyse Multi-Sources</h2>
        <p>Analysez des articles provenant de différentes sources pour générer une synthèse neutre et factuelle.</p>
      </div>

      <div className="form-group">
        <label>Sujet d'analyse *</label>
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Ex: Élections européennes 2024, Conflit Ukraine-Russie..."
          className="topic-input"
        />
      </div>

      <div className="form-group">
        <label>Configuration IA</label>
        <div className="ai-config">
          <select value={aiProvider} onChange={(e) => setAiProvider(e.target.value)}>
            <option value="anthropic">Anthropic Claude</option>
            <option value="openai">OpenAI GPT</option>
            <option value="gemini">Google Gemini</option>
          </select>
          
          {aiProvider === 'anthropic' && (
            <select value={aiModel} onChange={(e) => setAiModel(e.target.value)}>
              <option value="claude-3-5-haiku-20241022">Claude 3.5 Haiku (Rapide)</option>
              <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
              <option value="claude-sonnet-4-20250514">Claude Sonnet 4 (Dernier)</option>
              <option value="claude-opus-4-20250514">Claude Opus 4 (Premium)</option>
            </select>
          )}
        </div>
      </div>

      <div className="form-group">
        <label>Sources d'information *</label>
        {urls.map((url, index) => (
          <div key={index} className="url-input-group">
            <input
              type="url"
              value={url}
              onChange={(e) => updateUrl(index, e.target.value)}
              placeholder="https://exemple.com/article"
              className="url-input"
            />
            {urls.length > 1 && (
              <button type="button" onClick={() => removeUrl(index)} className="remove-btn">
                ×
              </button>
            )}
          </div>
        ))}
        <button type="button" onClick={addUrl} className="add-url-btn">
          + Ajouter une source
        </button>
      </div>

      <button 
        onClick={analyzeContent} 
        disabled={loading}
        className="analyze-btn"
      >
        {loading ? 'Analyse en cours...' : 'Analyser les sources'}
      </button>
    </div>
  );

  const ResultsTab = () => (
    <div className="tab-content">
      <h2>Résultats d'analyse</h2>
      {currentSynthesis ? (
        <div className="synthesis-result">
          <div className="synthesis-header">
            <h3>{currentSynthesis.topic}</h3>
            <div className="synthesis-meta">
              <span className="sources-count">{currentSynthesis.sources_count} sources analysées</span>
              <span className="reliability-score">
                Fiabilité: {Math.round(currentSynthesis.reliability_score * 100)}%
              </span>
            </div>
          </div>
          
          <div className="synthesis-content">
            {renderGlossaryTooltip(currentSynthesis.article)}
          </div>
          
          <div className="sources-used">
            <h4>Sources utilisées:</h4>
            <ul>
              {currentSynthesis.sources_used.map((source, index) => (
                <li key={index}>
                  <a href={source} target="_blank" rel="noopener noreferrer">
                    {source}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div className="no-results">
          <p>Aucune analyse disponible. Utilisez l'onglet "Analyser" pour commencer.</p>
        </div>
      )}
    </div>
  );

  const HistoryTab = () => (
    <div className="tab-content">
      <h2>Historique des analyses</h2>
      {syntheses.length > 0 ? (
        <div className="syntheses-list">
          {syntheses.map((synthesis) => (
            <div key={synthesis.id} className="synthesis-card">
              <h3>{synthesis.topic}</h3>
              <p>{synthesis.article}</p>
              <div className="synthesis-footer">
                <span>{synthesis.sources_count} sources</span>
                <span>Fiabilité: {Math.round(synthesis.reliability_score * 100)}%</span>
                <button 
                  onClick={() => {
                    setCurrentSynthesis(synthesis);
                    setActiveTab('results');
                  }}
                  className="view-btn"
                >
                  Voir détails
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="no-history">
          <p>Aucun historique disponible.</p>
        </div>
      )}
    </div>
  );

  const GlossaryTab = () => (
    <div className="tab-content">
      <h2>Glossaire Politique & Géopolitique</h2>
      <p>Survolez les termes dans les articles pour voir leurs définitions automatiquement.</p>
      
      {glossary.length > 0 ? (
        <div className="glossary-list">
          {glossary.map((term) => (
            <div key={term.id} className="glossary-item">
              <h4>{term.term}</h4>
              <p>{term.definition}</p>
              {term.detailed_explanation && (
                <details>
                  <summary>En savoir plus</summary>
                  <p>{term.detailed_explanation}</p>
                </details>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="no-glossary">
          <p>Chargement du glossaire...</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="App">
      <header className="app-header">
        <h1>Analyseur Politique Neutre</h1>
        <p>Synthèse factuelle et neutre de l'actualité politique et géopolitique</p>
      </header>

      <nav className="nav-tabs">
        <button 
          className={activeTab === 'analyze' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('analyze')}
        >
          📊 Analyser
        </button>
        <button 
          className={activeTab === 'results' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('results')}
        >
          📄 Résultats
        </button>
        <button 
          className={activeTab === 'history' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('history')}
        >
          📚 Historique
        </button>
        <button 
          className={activeTab === 'glossary' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('glossary')}
        >
          📖 Glossaire
        </button>
      </nav>

      <main className="main-content">
        {activeTab === 'analyze' && <AnalyzeTab />}
        {activeTab === 'results' && <ResultsTab />}
        {activeTab === 'history' && <HistoryTab />}
        {activeTab === 'glossary' && <GlossaryTab />}
      </main>

      <footer className="app-footer">
        <p>Outil d'analyse neutre pour une meilleure compréhension de l'actualité</p>
      </footer>
    </div>
  );
}

export default App;