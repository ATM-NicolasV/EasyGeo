import React, { useState } from 'react';
import { ArrowLeft, Search, BookOpen, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { mockGlossary } from '../data/mock';

const GlossaryPage = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedTerm, setExpandedTerm] = useState(null);

  const categories = ['all', 'tech', 'politics', 'sports', 'movies'];
  
  const filteredTerms = mockGlossary.filter(term => {
    const matchesSearch = term.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         term.definition.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || 
                           term.category.toLowerCase() === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const groupedTerms = filteredTerms.reduce((acc, term) => {
    const firstLetter = term.term[0].toUpperCase();
    if (!acc[firstLetter]) {
      acc[firstLetter] = [];
    }
    acc[firstLetter].push(term);
    return acc;
  }, {});

  const sortedLetters = Object.keys(groupedTerms).sort();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 shadow-sm p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <ArrowLeft 
              size={24} 
              className="cursor-pointer text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
              onClick={() => navigate(-1)}
            />
            <div className="flex items-center space-x-2">
              <BookOpen size={24} className="text-blue-600 dark:text-blue-400" />
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Glossaire</h1>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="space-y-3">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un terme..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-100 dark:bg-slate-700 rounded-xl border-0 focus:ring-2 focus:ring-blue-500 dark:text-white placeholder-gray-500"
            />
          </div>

          {/* Category Filter */}
          <div className="flex space-x-2 overflow-x-auto scrollbar-hide">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1 rounded-full text-sm capitalize whitespace-nowrap transition-colors ${
                  selectedCategory === category
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-slate-600'
                }`}
              >
                {category === 'all' ? 'Tout' : category}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Glossary Content */}
      <div className="p-4">
        {filteredTerms.length > 0 ? (
          <div className="space-y-6">
            {sortedLetters.map(letter => (
              <div key={letter} className="space-y-2">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                    {letter}
                  </div>
                  <div className="flex-1 h-px bg-gray-200 dark:bg-slate-700"></div>
                </div>

                <div className="space-y-3">
                  {groupedTerms[letter].map(term => (
                    <div key={term.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden">
                      <button
                        onClick={() => setExpandedTerm(expandedTerm === term.id ? null : term.id)}
                        className="w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                              {term.term}
                            </h3>
                            <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded text-xs font-medium">
                              {term.category}
                            </span>
                          </div>
                          <div className={`transform transition-transform ${
                            expandedTerm === term.id ? 'rotate-180' : 'rotate-0'
                          }`}>
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-gray-400">
                              <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </div>
                        </div>
                      </button>

                      {expandedTerm === term.id && (
                        <div className="px-4 pb-4">
                          <div className="border-t border-gray-100 dark:border-slate-700 pt-4">
                            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                              {term.definition}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <BookOpen size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Aucun terme trouvé
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Essayez de modifier votre recherche ou vos filtres
            </p>
          </div>
        )}
      </div>

      {/* Glossary Info */}
      <div className="p-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
          <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-2">À propos du glossaire</h4>
          <p className="text-blue-800 dark:text-blue-300 text-sm leading-relaxed">
            Ce glossaire contient des définitions de termes techniques, politiques et spécialisés 
            que vous pouvez rencontrer dans nos articles. Les définitions sont régulièrement mises à jour 
            par notre équipe éditoriale.
          </p>
        </div>
      </div>
    </div>
  );
};

export default GlossaryPage;