import React, { useState } from 'react';
import { X, Eye, EyeOff } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

const AIModelModal = ({ isOpen, onClose, model = null, onSave }) => {
  const [formData, setFormData] = useState({
    name: model?.name || '',
    provider: model?.provider || 'OpenAI',
    modelId: model?.modelId || '',
    apiKey: model?.apiKey || '',
    costPerToken: model?.costPerToken || 0.00003,
    maxTokens: model?.maxTokens || 4096,
    temperature: model?.temperature || 0.7,
    isActive: model?.isActive !== undefined ? model.isActive : true,
    features: model?.features || []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const { toast } = useToast();

  const providers = [
    'OpenAI',
    'Anthropic', 
    'Google',
    'Mistral',
    'Cohere',
    'Hugging Face'
  ];

  const availableFeatures = [
    'text-analysis',
    'sentiment',
    'summarization',
    'fact-checking',
    'classification',
    'translation',
    'code-generation',
    'creative-writing'
  ];

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleFeatureToggle = (feature) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter(f => f !== feature)
        : [...prev.features, feature]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    // Validation
    if (!formData.name || !formData.modelId || !formData.apiKey) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires.",
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }

    // Cost validation
    const cost = parseFloat(formData.costPerToken);
    if (isNaN(cost) || cost < 0) {
      toast({
        title: "Erreur",
        description: "Le coût par token doit être un nombre positif.",
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }

    // Temperature validation
    const temp = parseFloat(formData.temperature);
    if (isNaN(temp) || temp < 0 || temp > 2) {
      toast({
        title: "Erreur",
        description: "La température doit être entre 0 et 2.",
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }

    try {
      const modelData = {
        ...formData,
        id: model?.id || Date.now(),
        costPerToken: parseFloat(formData.costPerToken),
        maxTokens: parseInt(formData.maxTokens),
        temperature: parseFloat(formData.temperature),
        addedDate: model?.addedDate || new Date().toISOString(),
        lastUsed: model?.lastUsed || null,
        usageCount: model?.usageCount || 0
      };

      onSave(modelData);
      
      toast({
        title: "Succès",
        description: model ? "Modèle IA modifié avec succès !" : "Modèle IA créé avec succès !",
      });

      onClose();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur s'est produite lors de la sauvegarde.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {model ? 'Modifier le modèle IA' : 'Nouveau modèle IA'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nom du modèle *
            </label>
            <input
              type="text"
              name="name"
              required
              value={formData.name}
              onChange={handleInputChange}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white transition-colors"
              placeholder="Ex: GPT-4 Turbo, Claude-3 Sonnet..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Provider
              </label>
              <select
                name="provider"
                value={formData.provider}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white transition-colors"
              >
                {providers.map(provider => (
                  <option key={provider} value={provider}>{provider}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Model ID *
              </label>
              <input
                type="text"
                name="modelId"
                required
                value={formData.modelId}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white transition-colors"
                placeholder="gpt-4-turbo-preview"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Clé API *
            </label>
            <div className="relative">
              <input
                type={showApiKey ? "text" : "password"}
                name="apiKey"
                required
                value={formData.apiKey}
                onChange={handleInputChange}
                className="w-full px-3 py-2 pr-10 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white transition-colors"
                placeholder="sk-proj-*********************"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Coût/token
              </label>
              <input
                type="number"
                name="costPerToken"
                step="0.000001"
                min="0"
                value={formData.costPerToken}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Max tokens
              </label>
              <input
                type="number"
                name="maxTokens"
                min="1"
                max="32000"
                value={formData.maxTokens}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Température
              </label>
              <input
                type="number"
                name="temperature"
                step="0.1"
                min="0"
                max="2"
                value={formData.temperature}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Fonctionnalités supportées
            </label>
            <div className="grid grid-cols-2 gap-2">
              {availableFeatures.map(feature => (
                <label key={feature} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.features.includes(feature)}
                    onChange={() => handleFeatureToggle(feature)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <span className="text-xs text-gray-700 dark:text-gray-300 capitalize">
                    {feature.replace('-', ' ')}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              name="isActive"
              id="modelActive"
              checked={formData.isActive}
              onChange={handleInputChange}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <label htmlFor="modelActive" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Modèle actif
            </label>
          </div>

          {/* Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg font-medium transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Enregistrement...' : (model ? 'Modifier' : 'Créer')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AIModelModal;