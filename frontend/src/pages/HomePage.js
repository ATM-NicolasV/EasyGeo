import React, { useState } from 'react';
import { ArrowLeft, Bell, Sun, Moon, Menu } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { mockNews } from '../data/mock';
import NewsCard from '../components/NewsCard';
import { useNavigate } from 'react-router-dom';

const HomePage = () => {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = ['All', 'Politics', 'Sports', 'Movies', 'Tech'];
  const latestNews = mockNews.slice(0, 5);
  const featuredArticle = mockNews.find(article => article.featured);

  const filteredNews = selectedCategory === 'all' 
    ? mockNews 
    : mockNews.filter(article => 
        article.category.toLowerCase() === selectedCategory.toLowerCase()
      );

  const handleCategoryChange = (category) => {
    setSelectedCategory(category.toLowerCase());
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
      {/* Header */}
      <div className="bg-slate-800 dark:bg-slate-900 text-white p-4">
        <div className="flex items-center justify-between mb-4">
          <ArrowLeft 
            size={24} 
            className="cursor-pointer hover:text-gray-300 transition-colors"
            onClick={() => navigate(-1)}
          />
          <h1 className="text-xl font-bold">Latest News</h1>
          <div className="flex items-center space-x-3">
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-slate-700 transition-colors"
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <Bell 
              size={24} 
              className="cursor-pointer hover:text-gray-300 transition-colors"
            />
            <div 
              onClick={() => navigate('/profile')}
              className="w-8 h-8 bg-gray-400 rounded-full cursor-pointer hover:bg-gray-500 transition-colors flex items-center justify-center"
            >
              {user?.avatar ? (
                <img src={user.avatar} alt="Profile" className="w-full h-full rounded-full object-cover" />
              ) : (
                <span className="text-xs font-medium">{user?.name?.[0] || 'U'}</span>
              )}
            </div>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex space-x-4 overflow-x-auto scrollbar-hide">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => handleCategoryChange(category)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === category.toLowerCase()
                  ? 'bg-white text-slate-800'
                  : 'text-gray-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Featured Article */}
      {featuredArticle && selectedCategory === 'all' && (
        <div className="px-4 pt-6">
          <NewsCard article={featuredArticle} variant="featured" />
        </div>
      )}

      {/* Latest News Section */}
      <div className="px-4 pt-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {selectedCategory === 'all' ? 'Latest News' : `${categories.find(cat => cat.toLowerCase() === selectedCategory)} News`}
          </h2>
          <button className="text-blue-600 dark:text-blue-400 text-sm font-medium">
            View More
          </button>
        </div>

        {/* News List */}
        <div className="space-y-4">
          {filteredNews.slice(0, 6).map((article) => (
            <NewsCard key={article.id} article={article} />
          ))}
        </div>

        {filteredNews.length === 0 && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <p>Aucun article trouvé dans cette catégorie.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;