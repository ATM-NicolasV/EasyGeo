import React from 'react';
import { Clock, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const NewsCard = ({ article, variant = 'default' }) => {
  const navigate = useNavigate();
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleClick = () => {
    navigate(`/article/${article.id}`);
  };

  if (variant === 'featured') {
    return (
      <div 
        onClick={handleClick}
        className="relative h-80 w-full rounded-xl overflow-hidden cursor-pointer group mb-6"
      >
        <img 
          src={article.image} 
          alt={article.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="bg-purple-600 text-white px-3 py-1 rounded-full text-xs font-medium w-fit mb-3">
            {article.category.toUpperCase()}
          </div>
          <h3 className="text-white text-xl font-bold leading-tight mb-2">
            {article.title}
          </h3>
          <div className="flex items-center text-gray-300 text-sm">
            <User size={14} className="mr-2" />
            <span className="mr-4">{article.source}</span>
            <Clock size={14} className="mr-2" />
            <span>{formatDate(article.publishedAt)}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      onClick={handleClick}
      className="flex bg-white dark:bg-slate-800 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden cursor-pointer mb-4 group"
    >
      <div className="w-24 h-24 flex-shrink-0">
        <img 
          src={article.image} 
          alt={article.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>
      <div className="flex-1 p-4">
        <div className="flex items-center mb-2">
          <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-1 rounded text-xs font-medium">
            {article.category.toUpperCase()}
          </span>
        </div>
        <h3 className="font-semibold text-gray-900 dark:text-white text-sm leading-tight mb-2 line-clamp-2">
          {article.title}
        </h3>
        <div className="flex items-center text-gray-500 dark:text-gray-400 text-xs">
          <span className="mr-3">{article.source}</span>
          <Clock size={12} className="mr-1" />
          <span>{article.readTime}</span>
        </div>
      </div>
    </div>
  );
};

export default NewsCard;