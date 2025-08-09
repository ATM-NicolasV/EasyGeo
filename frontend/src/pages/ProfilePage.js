import React from 'react';
import { Settings, LogOut, Bell, Moon, Sun, Shield, BookOpen, HelpCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';

const ProfilePage = () => {
  const { user, logout, isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleLogin = () => {
    navigate('/auth');
  };

  const menuItems = [
    {
      icon: Bell,
      label: 'Notifications',
      action: () => console.log('Notifications'),
      showArrow: true
    },
    {
      icon: theme === 'dark' ? Sun : Moon,
      label: theme === 'dark' ? 'Mode clair' : 'Mode sombre',
      action: toggleTheme,
      showArrow: false
    },
    {
      icon: BookOpen,
      label: 'Glossaire',
      action: () => navigate('/glossary'),
      showArrow: true
    },
    {
      icon: HelpCircle,
      label: 'Aide et support',
      action: () => console.log('Support'),
      showArrow: true
    }
  ];

  if (isAdmin) {
    menuItems.splice(1, 0, {
      icon: Shield,
      label: 'Panel administrateur',
      action: () => navigate('/admin'),
      showArrow: true,
      isAdmin: true
    });
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 shadow-sm">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Profil</h1>
          
          {/* User Info */}
          {user ? (
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                {user.avatar ? (
                  <img src={user.avatar} alt="Profile" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <span className="text-white text-xl font-bold">{user.name[0]}</span>
                )}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{user.name}</h2>
                <p className="text-gray-600 dark:text-gray-400">{user.email}</p>
                {isAdmin && (
                  <span className="inline-block mt-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-1 rounded text-xs font-medium">
                    Administrateur
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <Settings size={24} className="text-gray-400" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Non connecté</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">Connectez-vous pour accéder à toutes les fonctionnalités</p>
              <button
                onClick={handleLogin}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Se connecter
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Menu Items */}
      <div className="p-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden">
          {menuItems.map((item, index) => (
            <button
              key={index}
              onClick={item.action}
              className={`w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors ${
                index !== menuItems.length - 1 ? 'border-b border-gray-100 dark:border-slate-700' : ''
              } ${item.isAdmin ? 'bg-purple-50 dark:bg-purple-900/20' : ''}`}
            >
              <div className="flex items-center space-x-3">
                <item.icon 
                  size={20} 
                  className={`${item.isAdmin ? 'text-purple-600 dark:text-purple-400' : 'text-gray-600 dark:text-gray-400'}`} 
                />
                <span className={`font-medium ${item.isAdmin ? 'text-purple-700 dark:text-purple-300' : 'text-gray-900 dark:text-white'}`}>
                  {item.label}
                </span>
              </div>
              {item.showArrow && (
                <span className="text-gray-400">›</span>
              )}
            </button>
          ))}
        </div>

        {/* Logout Button */}
        {user && (
          <div className="mt-4">
            <button
              onClick={handleLogout}
              className="w-full bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-xl font-medium transition-colors flex items-center justify-center space-x-2"
            >
              <LogOut size={20} />
              <span>Se déconnecter</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;