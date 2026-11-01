import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Inbox,
  Send,
  Users,
  ShieldAlert,
  DatabaseBackup,
  ChevronLeft,
  ChevronRight,
  Building2,
  Briefcase,
} from 'lucide-react';

export const Sidebar = ({ isCollapsed, onToggleCollapse, isMobileOpen, onMobileClose }) => {
  const { isUserService, user } = useAuth();

  const navItems = [
    {
      label: 'Tableau de bord',
      path: '/dashboard',
      icon: LayoutDashboard,
      roles: ['CHEF_DIVISION', 'RESPONSABLE_BO', 'SECRETAIRE', 'USER_SERVICE'],
    },
    {
      label: 'Mes Courriers (Chef)',
      path: '/mes-courriers',
      icon: Briefcase,
      roles: ['CHEF_DIVISION'],
    },
    {
      label: 'Courriers Arrivés',
      path: '/courriers-arrives',
      icon: Inbox,
      roles: ['CHEF_DIVISION', 'RESPONSABLE_BO', 'SECRETAIRE', 'USER_SERVICE'],
    },
    {
      label: 'Courriers Départ',
      path: '/courriers-depart',
      icon: Send,
      roles: ['CHEF_DIVISION', 'RESPONSABLE_BO', 'SECRETAIRE', 'USER_SERVICE'],
    },
    {
      label: 'Utilisateurs',
      path: '/users',
      icon: Users,
      roles: ['CHEF_DIVISION'],
      section: 'admin',
    },
    {
      label: 'Journal d\'Audit',
      path: '/audit-logs',
      icon: ShieldAlert,
      roles: ['CHEF_DIVISION'],
      section: 'admin',
    },
    {
      label: 'Sauvegardes',
      path: '/backups',
      icon: DatabaseBackup,
      roles: ['CHEF_DIVISION'],
      section: 'admin',
    },
  ];

  const filteredItems = navItems.filter((item) => item.roles.includes(user?.role));

  const mainNav = filteredItems.filter(i => ['Tableau de bord', 'Mes Courriers (Chef)', 'Courriers Arrivés', 'Courriers Départ'].includes(i.label));
  const adminNav = filteredItems.filter(i => ['Utilisateurs', 'Journal d\'Audit', 'Sauvegardes'].includes(i.label));

  const renderNavItem = (item) => {
    const Icon = item.icon;
    return (
      <NavLink
        key={item.path}
        to={item.path}
        onClick={() => isMobileOpen && onMobileClose?.()}
        className={({ isActive }) =>
          `flex items-center gap-3 px-3.5 py-2.5 rounded-md text-sm transition-all duration-150 group relative ${
            isActive
              ? 'bg-primary-50 dark:bg-emerald-950/40 text-primary-700 dark:text-emerald-400 font-bold border-l-4 border-primary-600 dark:border-emerald-400 shadow-sm'
              : 'text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800/80 hover:text-surface-900 dark:hover:text-surface-50 font-medium'
          } ${isCollapsed ? 'justify-center px-0' : ''}`
        }
      >
        {({ isActive }) => (
          <>
            <Icon className={`w-4.5 h-4.5 shrink-0 ${isActive ? 'text-primary-600 dark:text-emerald-400' : 'text-surface-500 dark:text-surface-400 group-hover:text-surface-800 dark:group-hover:text-surface-200'}`} />
            {!isCollapsed && <span className="truncate">{item.label}</span>}
            {isCollapsed && (
              <div className="absolute left-full ml-2 px-2.5 py-1 bg-surface-900 dark:bg-surface-800 text-white text-xs font-semibold rounded shadow-elevation-3 whitespace-nowrap z-50 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                {item.label}
              </div>
            )}
          </>
        )}
      </NavLink>
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white dark:bg-surface-900 border-r border-surface-200 dark:border-surface-700/80">
      {/* Institutional Brand Header */}
      <div className={`flex items-center gap-3 px-4 h-header border-b border-surface-200 dark:border-surface-700/80 shrink-0 bg-surface-50/50 dark:bg-surface-950/40 ${isCollapsed ? 'justify-center px-2' : ''}`}>
        <div className="w-10 h-10 rounded bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 p-1 flex items-center justify-center shrink-0 shadow-sm">
          <img
            src="/logo-small.png"
            alt="Commune de Benslimane"
            className="w-full h-full object-contain"
          />
        </div>
        {!isCollapsed && (
          <div className="min-w-0">
            <span className="text-[9px] uppercase tracking-wider font-extrabold text-surface-400 dark:text-surface-400 block truncate">
              Royaume du Maroc
            </span>
            <h1 className="font-extrabold text-xs text-surface-900 dark:text-surface-50 font-display leading-tight truncate">
              Commune de Benslimane
            </h1>
            <span className="text-[10px] font-bold text-primary-600 dark:text-emerald-400 leading-tight block truncate">
              Division Technique & Financière
            </span>
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {/* Main Navigation */}
        {!isCollapsed && (
          <div className="px-3 mb-2 flex items-center gap-1.5">
            <Building2 className="w-3 h-3 text-primary-500" />
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-surface-500 dark:text-surface-400">
              Menu Principal
            </span>
          </div>
        )}
        {mainNav.map(renderNavItem)}

        {/* Admin Section */}
        {adminNav.length > 0 && (
          <>
            <div className={`pt-5 pb-1.5 ${isCollapsed ? 'px-0' : 'px-3'}`}>
              {isCollapsed ? (
                <div className="w-8 h-px bg-surface-200 dark:border-surface-700 mx-auto" />
              ) : (
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-surface-500 dark:text-surface-400">
                  Administration
                </span>
              )}
            </div>
            {adminNav.map(renderNavItem)}
          </>
        )}
      </nav>

      {/* Institutional Footer Status */}
      <div className={`px-3 py-3 border-t border-surface-200 dark:border-surface-700/80 bg-surface-50/50 dark:bg-surface-950/40 shrink-0 ${isCollapsed ? 'px-2' : ''}`}>
        {!isCollapsed ? (
          <div className="px-3 py-2 rounded bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-xs shadow-sm">
           
            <div className="text-[10px] font-medium text-surface-500 dark:text-surface-400 mt-0.5 truncate">
  {isUserService ? 'Compte Service Authentifié' : 'Gestionnaire de Documents'}
</div>
          </div>
        ) : (
          <div className="flex justify-center">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-surface-800" title={isUserService ? user?.service : 'Accès Global Division'} />
          </div>
        )}

        {/* Collapse Toggle Button */}
        <button
          onClick={onToggleCollapse}
          className="hidden lg:flex items-center justify-center w-full mt-2.5 py-1.5 rounded text-surface-500 hover:text-surface-800 dark:text-surface-400 dark:hover:text-surface-100 hover:bg-surface-200/60 dark:hover:bg-surface-800 transition-colors duration-150"
          aria-label={isCollapsed ? 'Étendre le menu' : 'Réduire le menu'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-surface-950/60 dark:bg-black/80 z-40 lg:hidden backdrop-blur-sm"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`
          fixed lg:sticky top-0 left-0 z-40 h-screen
          transition-all duration-200 ease-in-out
          flex flex-col
          ${isCollapsed ? 'lg:w-sidebar-collapsed' : 'lg:w-sidebar'}
          ${isMobileOpen ? 'w-sidebar translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {sidebarContent}
      </aside>
    </>
  );
};
