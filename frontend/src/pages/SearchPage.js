import React, { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { mockNews } from '../data/mock';
import NewsCard from '../components/NewsCard';

const SearchPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const categories = ['all', 'politics', 'sports', 'movies', 'tech'];

  const filteredNews = mockNews.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         article.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         article.author.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || 
                           article.category.toLowerCase() === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const clearSearch = () => {
    setSearchQuery('');
    setSelectedCategory('all');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 shadow-sm p-4 sticky top-0 z-10">
        <div className="flex items-center space-x-3 mb-4">
          <div className="relative flex-1">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher des articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-100 dark:bg-slate-700 rounded-xl border-0 focus:ring-2 focus:ring-blue-500 dark:text-white placeholder-gray-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            )}
          </div>
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="p-3 bg-gray-100 dark:bg-slate-700 rounded-xl hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
          >
            <Filter size={20} className="text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        {/* Filters */}
        {isFilterOpen && (
          <div className="bg-gray-50 dark:bg-slate-700 rounded-xl p-4">
            <h3 className="font-medium text-gray-900 dark:text-white mb-3">Catégories</h3>
            <div className="flex flex-wrap gap-2">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3 py-1 rounded-full text-sm capitalize transition-colors ${
                    selectedCategory === category
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-500'
                  }`}
                >
                  {category === 'all' ? 'Tout' : category}
                </button>
              ))}
            </div>
            
            {(searchQuery || selectedCategory !== 'all') && (
              <button
                onClick={clearSearch}
                className="mt-3 text-blue-600 dark:text-blue-400 text-sm font-medium hover:underline"
              >
                Effacer les filtres
              </button>
            )}
          </div>
        )}
      </div>

      {/* Search Results */}
      <div className="p-4">
        {searchQuery && (
          <div className="mb-4">
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              {filteredNews.length} résultat{filteredNews.length > 1 ? 's' : ''} pour "{searchQuery}"
            </p>
          </div>
        )}

        {filteredNews.length > 0 ? (
          <div className="space-y-4">
            {filteredNews.map(article => (
              <NewsCard key={article.id} article={article} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Search size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">
              Aucun résultat trouvé
            </p>
            <p className="text-gray-400 text-sm">
              Essayez de modifier vos termes de recherche ou vos filtres
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;