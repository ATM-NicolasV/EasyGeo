import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Share2, Bookmark, Clock, User } from 'lucide-react';
import { mockNews } from '../data/mock';

const ArticleDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const article = mockNews.find(a => a.id === parseInt(id));

  if (!article) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <p>Article non trouvé</p>
          <button 
            onClick={() => navigate('/')}
            className="mt-4 text-blue-600 dark:text-blue-400 hover:underline"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 pb-20">
      {/* Header */}
      <div className="bg-slate-800 dark:bg-slate-900 text-white p-4">
        <div className="flex items-center justify-between">
          <ArrowLeft 
            size={24} 
            className="cursor-pointer hover:text-gray-300 transition-colors"
            onClick={() => navigate(-1)}
          />
          <div className="flex items-center space-x-4">
            <Share2 size={20} className="cursor-pointer hover:text-gray-300 transition-colors" />
            <Bookmark size={20} className="cursor-pointer hover:text-gray-300 transition-colors" />
          </div>
        </div>
      </div>

      {/* Article Content */}
      <div className="px-4 pt-6">
        {/* Category Badge */}
        <div className="mb-4">
          <span className="bg-purple-600 text-white px-3 py-1 rounded-full text-sm font-medium">
            {article.category.toUpperCase()}
          </span>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight mb-4">
          {article.title}
        </h1>

        {/* Author and Date */}
        <div className="flex items-center text-gray-600 dark:text-gray-400 text-sm mb-6">
          <User size={16} className="mr-2" />
          <span className="mr-4 font-medium">{article.author}</span>
          <Clock size={16} className="mr-2" />
          <span>{formatDate(article.publishedAt)}</span>
          <span className="ml-4 text-blue-600 dark:text-blue-400">{article.readTime}</span>
        </div>

        {/* Featured Image */}
        <div className="w-full h-48 rounded-xl overflow-hidden mb-6">
          <img 
            src={article.image} 
            alt={article.title}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Article Content */}
        <div className="prose prose-slate dark:prose-invert max-w-none">
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-base mb-4">
            {article.content}
          </p>
          
          {/* Extended content for better reading experience */}
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-base mb-4">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
          </p>
          
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-base mb-4">
            Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
          </p>

          <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-6 mb-3">
            Points clés à retenir
          </h3>
          
          <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 space-y-2">
            <li>Analyse approfondie des événements récents</li>
            <li>Impact sur la société et l'économie</li>
            <li>Perspectives d'avenir et recommandations</li>
          </ul>
        </div>

        {/* Source */}
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-slate-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Source: <span className="font-medium text-gray-700 dark:text-gray-300">{article.source}</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ArticleDetailPage;