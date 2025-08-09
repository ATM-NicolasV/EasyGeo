import React, { useState } from 'react';
import { Bookmark, Trash2 } from 'lucide-react';
import { mockNews } from '../data/mock';
import NewsCard from '../components/NewsCard';

const BookmarksPage = () => {
  // Mock bookmarked articles (first 3 articles from mockNews)
  const [bookmarkedArticles, setBookmarkedArticles] = useState(mockNews.slice(0, 3));

  const removeBookmark = (articleId) => {
    setBookmarkedArticles(prev => prev.filter(article => article.id !== articleId));
  };

  const clearAllBookmarks = () => {
    setBookmarkedArticles([]);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 shadow-sm p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Bookmark size={24} className="text-blue-600 dark:text-blue-400" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Articles sauvegardés</h1>
          </div>
          {bookmarkedArticles.length > 0 && (
            <button
              onClick={clearAllBookmarks}
              className="text-red-600 dark:text-red-400 text-sm font-medium hover:underline"
            >
              Tout effacer
            </button>
          )}
        </div>
        
        {bookmarkedArticles.length > 0 && (
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">
            {bookmarkedArticles.length} article{bookmarkedArticles.length > 1 ? 's' : ''} sauvegardé{bookmarkedArticles.length > 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Bookmarked Articles */}
      <div className="p-4">
        {bookmarkedArticles.length > 0 ? (
          <div className="space-y-4">
            {bookmarkedArticles.map(article => (
              <div key={article.id} className="relative">
                <NewsCard article={article} />
                <button
                  onClick={() => removeBookmark(article.id)}
                  className="absolute top-2 right-2 p-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Bookmark size={64} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Aucun article sauvegardé
            </h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
              Sauvegardez des articles intéressants pour les retrouver facilement plus tard
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookmarksPage;