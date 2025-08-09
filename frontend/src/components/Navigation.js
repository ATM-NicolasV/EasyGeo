import React from 'react';
import { Home, Search, Bookmark, User, Settings } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const navItems = [
    { icon: Home, path: '/', label: 'Accueil' },
    { icon: Search, path: '/search', label: 'Recherche' },
    { icon: Bookmark, path: '/bookmarks', label: 'Favoris' },
    { icon: User, path: '/profile', label: 'Profil' }
  ];

  // Ajouter l'administration pour les admins
  if (isAdmin) {
    navItems.push({ icon: Settings, path: '/admin', label: 'Admin' });
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700 px-2 py-1 z-50">
      <div className="flex justify-around items-center max-w-md mx-auto">
        {navItems.map(({ icon: Icon, path, label }) => (
          <button
            key={path}
            onClick={() => navigate(path)}
            className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors duration-200 ${
              location.pathname === path
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Icon size={20} />
            <span className="text-xs mt-1 font-medium">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default Navigation;