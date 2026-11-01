import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Sun, Moon, Bell, Search, LogOut, ArrowRight, Menu, ChevronDown, ShieldCheck } from 'lucide-react';
import api from '../../services/api';

export const Header = ({ onOpenPdfViewer, onToggleMobileSidebar }) => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const searchRef = useRef(null);
  const notifRef = useRef(null);
  const userMenuRef = useRef(null);

  // Fetch notifications with live periodic polling (every 30s)
  useEffect(() => {
    let isMounted = true;
    const fetchNotifs = async () => {
      try {
        const res = await api.get('/notifications');
        if (isMounted) setNotifications(res.data);
      } catch (e) {
        // Ignore
      }
    };

    if (user) {
      fetchNotifs();
      const interval = setInterval(fetchNotifs, 30000);
      return () => {
        isMounted = false;
        clearInterval(interval);
      };
    }
  }, [user]);

  // Debounced Instant Search Suggestions
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim().length >= 2) {
        try {
          const res = await api.get(`/mails/search/suggestions?q=${encodeURIComponent(searchQuery)}`);
          setSuggestions(res.data);
          setShowSuggestions(true);
        } catch (e) {
          setSuggestions([]);
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifs(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkNotifRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n)));
    } catch (e) {
      // Ignore
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
    } catch (e) {
      // Ignore
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const getUserRoleLabel = (role) => {
    if (role === 'CHEF_DIVISION') return 'Chef de Division';
    if (role === 'RESPONSABLE_BO' || role === 'SECRETAIRE') return 'Responsable Bureau d\'Ordre';
    return user?.service || 'Utilisateur';
  };

  return (
    <header className="sticky top-0 z-30 h-header bg-white dark:bg-surface-900 border-b border-surface-200 dark:border-surface-700/80 px-4 sm:px-6 flex items-center justify-between gap-4 transition-colors duration-200 shadow-sm">
      {/* Left: Mobile hamburger + Institutional Emblem + Search */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Mobile Hamburger */}
        <button
          onClick={onToggleMobileSidebar}
          className="lg:hidden p-1.5 rounded text-surface-600 hover:text-surface-900 dark:text-surface-300 dark:hover:text-white hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
          aria-label="Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Institutional Small Header Title */}
        <div className="flex items-center gap-2.5 mr-2">
          <div className="w-7 h-7 rounded bg-white p-0.5 border border-surface-200 dark:border-surface-700 shrink-0 shadow-sm">
            <img
              src="/logo-small.png"
              alt="Commune de Benslimane"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="hidden sm:block leading-tight">
            <span className="text-xs font-bold text-surface-900 dark:text-surface-50 font-display block">
             Commune de Benslimane
            </span>
             <span className="text-[10px] font-bold text-primary-600 dark:text-emerald-400 leading-tight block truncate">
              Division Technique & Financière
            </span>
            <span className="text-[9px] uppercase tracking-wider font-extrabold text-surface-400 dark:text-surface-400 block" >
              Gestion Documentaire
            </span>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative flex-1 max-w-md hidden md:block" ref={searchRef}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 dark:text-surface-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.length >= 2 && setShowSuggestions(true)}
              placeholder="Rechercher un courrier par référence, objet..."
              className="w-full pl-9 pr-14 py-2 rounded bg-surface-50 dark:bg-surface-800 border border-surface-300 dark:border-surface-600 text-sm text-surface-900 dark:text-surface-50 placeholder-surface-400 dark:placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all duration-150"
              aria-label="Rechercher un courrier"
            />
          </div>

          {/* Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1.5 rounded-md bg-white dark:bg-surface-800 border border-surface-300 dark:border-surface-700 shadow-elevation-4 dark:shadow-dark-elevation-4 py-1.5 z-50 animate-slide-up">
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-surface-400 dark:text-surface-400 border-b border-surface-100 dark:border-surface-700/60 mb-1">
                Résultats de recherche
              </div>
              {suggestions.map((s) => (
                <div
                  key={`${s.category}-${s.id}`}
                  onClick={() => {
                    setShowSuggestions(false);
                    setSearchQuery('');
                    onOpenPdfViewer && onOpenPdfViewer(s.category, s);
                  }}
                  className="px-3 py-2 mx-1 rounded hover:bg-surface-100 dark:hover:bg-surface-700 cursor-pointer transition-colors duration-150 flex items-center justify-between group"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-primary-600 dark:text-emerald-400">
                        Réf: {s.reference}
                      </span>
                      <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-surface-100 dark:bg-surface-700 text-surface-700 dark:text-surface-200 font-semibold border border-surface-200 dark:border-surface-600">
                        {s.category === 'arrive' ? 'Arrivé' : 'Départ'}
                      </span>
                    </div>
                    <div className="text-xs font-medium text-surface-800 dark:text-surface-100 line-clamp-1 mt-0.5">
                      {s.objet}
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-surface-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2">
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded text-surface-600 hover:text-surface-900 dark:text-surface-300 dark:hover:text-white hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors duration-150 border border-surface-200 dark:border-surface-700"
          title={isDark ? 'Activer le mode clair' : 'Activer le mode sombre'}
          aria-label={isDark ? 'Activer le mode clair' : 'Activer le mode sombre'}
        >
          {isDark ? <Sun className="w-4.5 h-4.5 text-amber-400" /> : <Moon className="w-4.5 h-4.5 text-surface-700" />}
        </button>

        {/* Notifications Button & Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="p-2 rounded text-surface-600 hover:text-surface-900 dark:text-surface-300 dark:hover:text-white hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors duration-150 relative border border-surface-200 dark:border-surface-700"
            aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} non lues)` : ''}`}
          >
            <Bell className="w-4.5 h-4.5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-danger-500 ring-2 ring-white dark:ring-surface-900" />
            )}
          </button>

          {/* Notifications Popover */}
          {showNotifs && (
            <div className="absolute right-0 mt-1.5 w-80 sm:w-96 bg-white dark:bg-surface-800 rounded-md border border-surface-300 dark:border-surface-700 shadow-elevation-4 dark:shadow-dark-elevation-4 z-50 animate-slide-up overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-surface-200 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-900/50">
                <h4 className="font-bold text-sm text-surface-900 dark:text-surface-50 font-display">
                  Notifications
                </h4>
                {unreadCount > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[11px] font-medium text-primary-600 hover:text-primary-700 dark:text-emerald-400 dark:hover:text-emerald-300 hover:underline transition-colors"
                    >
                      Tout marquer comme lu
                    </button>
                    <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-primary-100 dark:bg-emerald-950/40 text-primary-700 dark:text-emerald-400 border border-primary-200 dark:border-emerald-800/40">
                      {unreadCount}
                    </span>
                  </div>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-surface-100 dark:divide-surface-700/60">
                {notifications.length === 0 ? (
                  <div className="text-center py-8 px-4">
                    <Bell className="w-7 h-7 text-surface-400 dark:text-surface-500 mx-auto mb-2 opacity-60" />
                    <p className="text-xs text-surface-500 dark:text-surface-400">Aucune notification enregistrée</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleMarkNotifRead(n.id)}
                      className={`px-4 py-3 cursor-pointer transition-colors duration-150 hover:bg-surface-50 dark:hover:bg-surface-700/80 ${
                        !n.is_read ? 'bg-primary-50/40 dark:bg-emerald-950/20' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-surface-900 dark:text-surface-50 flex items-center gap-1.5">
                            {!n.is_read && (
                              <span className="w-1.5 h-1.5 rounded-full bg-primary-500 dark:bg-emerald-400 shrink-0" />
                            )}
                            <span className="truncate">{n.title}</span>
                          </div>
                          <p className="text-xs text-surface-600 dark:text-surface-300 mt-0.5 line-clamp-2">
                            {n.message}
                          </p>
                        </div>
                        <span className="text-[10px] text-surface-500 dark:text-surface-400 font-mono shrink-0 mt-0.5">
                          {new Date(n.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Separator */}
        <div className="w-px h-6 bg-surface-200 dark:bg-surface-700 mx-1 hidden sm:block" />

        {/* User Profile */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2.5 p-1.5 rounded hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors duration-150 border border-transparent hover:border-surface-200 dark:hover:border-surface-700"
            aria-label="Menu utilisateur"
          >
            <div className="w-8 h-8 rounded bg-primary-600 dark:bg-emerald-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="hidden md:block text-left leading-tight">
              <div className="text-xs font-bold text-surface-900 dark:text-surface-50">
                {user?.name}
              </div>
              <div className="text-[10px] font-medium text-surface-500 dark:text-surface-400">
                {getUserRoleLabel(user?.role)}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-surface-400 hidden md:block" />
          </button>

          {/* User Dropdown */}
          {showUserMenu && (
            <div className="absolute right-0 mt-1.5 w-56 bg-white dark:bg-surface-800 rounded-md border border-surface-300 dark:border-surface-700 shadow-elevation-4 dark:shadow-dark-elevation-4 z-50 animate-slide-up overflow-hidden">
              <div className="px-4 py-3 border-b border-surface-200 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-900/50">
                <div className="text-sm font-bold text-surface-900 dark:text-surface-50">
                  {user?.name}
                </div>
                <div className="text-xs text-surface-500 dark:text-surface-300 mt-0.5 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  {getUserRoleLabel(user?.role)}
                </div>
              </div>
              <div className="py-1">
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-danger-600 dark:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-500/10 transition-colors duration-150"
                >
                  <LogOut className="w-4 h-4" />
                  Se déconnecter
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
