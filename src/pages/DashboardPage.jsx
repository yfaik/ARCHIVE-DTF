import React, { useState, useEffect } from 'react';
import { Card } from '../components/common/GlassCard';
import { Badge } from '../components/common/Badge';
import { PageHeader } from '../components/common/PageHeader';
import {
  LayoutDashboard,
  Inbox,
  Send,
  Users,
  ShieldAlert,
  Layers,
  Clock,
  TrendingUp,
  Calendar,
  FileText,
  ArrowRightCircle,
  Building2,
  CheckCircle2,
  FileCheck2
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export const DashboardPage = () => {
  const { user, isUserService, isChefDivision } = useAuth();
  const [period, setPeriod] = useState('year');
  const [stats, setStats] = useState({
    totalArrives: 0,
    totalDeparts: 0,
    statusCounts: {
      NOUVEAU: 0,
      TRANSMIS: 0
    },
    serviceStats: [],
    totalUsers: 0,
    recentActivity: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const res = await api.get('/stats/dashboard', {
          params: { period },
        });
        setStats(res.data);
      } catch (e) {
        // Error handling
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [period]);

  // Document-centric metrics for USER_SERVICE
  const serviceCards = [
    {
      label: 'Courriers Transmis',
      value: stats.statusCounts?.TRANSMIS || 0,
      icon: Inbox,
      subtitle: 'En attente de prise en charge',
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60',
    },
    {
      label: 'En cours de traitement',
      value: stats.statusCounts?.EN_COURS || 0,
      icon: Clock,
      subtitle: 'En cours d\'instruction',
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60',
    },
    {
      label: 'Courriers Traités',
      value: stats.statusCounts?.TRAITE || 0,
      icon: CheckCircle2,
      subtitle: 'Dossiers finalisés',
      color: 'text-emerald-700 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60',
    },
    {
      label: 'Courriers Départ (Envoyés)',
      value: stats.totalDeparts || 0,
      icon: Send,
      subtitle: `Sorties du ${user?.service || 'Service'}`,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60',
    },
  ];

  // Global administrative metrics for CHEF_DIVISION / SECRETAIRE
  const adminCards = [
    {
      label: 'Nouveaux au Bureau d\'Ordre',
      value: stats.statusCounts?.NOUVEAU || 0,
      icon: FileText,
      subtitle: 'En attente de transmission',
      color: 'text-yellow-600 dark:text-yellow-400',
      bg: 'bg-yellow-50 dark:bg-yellow-950/40 border border-yellow-200 dark:border-yellow-800/60',
    },
    {
      label: 'Transmis aux Services',
      value: stats.statusCounts?.TRANSMIS || 0,
      icon: ArrowRightCircle,
      subtitle: 'Transmis aux services',
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60',
    },
    {
      label: 'En cours de traitement',
      value: stats.statusCounts?.EN_COURS || 0,
      icon: Clock,
      subtitle: 'Instruction dans les services',
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60',
    },
    {
      label: 'Courriers Traités',
      value: stats.statusCounts?.TRAITE || 0,
      icon: CheckCircle2,
      subtitle: 'Dossiers finalisés',
      color: 'text-emerald-700 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60',
    },
  ];

  const displayCards = isUserService ? serviceCards : adminCards;

  const formatAuditRole = (role) => {
    if (!role) return '';
    if (role === 'SECRETAIRE' || role === 'Secrétaire' || role === 'secretaire') return 'RESPONSABLE_BO';
    return role;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={LayoutDashboard}
        title={isUserService ? `Tableau de Bord — ${user?.service}` : "Tableau de Bord Institutionnel"}
        description={
          isUserService
            ? `Suivi et statistiques documentaires exclusives du ${user?.service}`
            : "Vue d'ensemble de la gestion documentaire — Commune de Benslimane"
        }
      >
        <div className="flex items-center gap-2.5 bg-white dark:bg-surface-800 border border-surface-300 dark:border-surface-700 rounded-md px-3 py-1.5 shadow-sm transition-all">
          <Calendar className="w-4 h-4 text-primary-600 dark:text-emerald-400 shrink-0" />
          <div className="flex items-center gap-1.5">
            <label htmlFor="dashboard-period-select" className="text-xs font-bold uppercase tracking-wider text-surface-600 dark:text-surface-300 whitespace-nowrap">
              Période :
            </label>
            <select
              id="dashboard-period-select"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="bg-transparent text-surface-900 dark:text-surface-50 text-xs sm:text-sm font-bold focus:outline-none cursor-pointer border-none py-0.5 pr-1"
              aria-label="Sélectionner la période temporelle"
            >
              <option value="today" className="bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100">Aujourd’hui</option>
              <option value="week" className="bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100">Cette semaine</option>
              <option value="month" className="bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100">Ce mois</option>
              <option value="year" className="bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100">Cette année</option>
              <option value="total" className="bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100">Total</option>
            </select>
          </div>
        </div>
      </PageHeader>

      {/* Main Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {displayCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} padding="p-5">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wider text-surface-600 dark:text-surface-300">
                    {card.label}
                  </p>
                  <p className="text-2xl font-black text-surface-900 dark:text-surface-50 font-display mt-1">
                    {loading ? (
                      <span className="inline-block w-12 h-7 skeleton rounded animate-pulse" />
                    ) : (
                      card.value
                    )}
                  </p>
                  <p className="text-xs font-medium text-surface-500 dark:text-surface-400 mt-1 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-emerald-500" />
                    {card.subtitle}
                  </p>
                </div>
                <div className={`w-10 h-10 rounded-md ${card.bg} ${card.color} flex items-center justify-center shrink-0 shadow-sm`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Service Document Activity Table / Summary */}
      <Card hover={false} padding="p-0" className="shadow-elevation-1">
        <div className="px-5 py-4 border-b border-surface-200 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-900/50 flex items-center justify-between">
          <h3 className="font-bold text-sm text-surface-900 dark:text-surface-50 font-display flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary-600 dark:text-emerald-400" />
            {isUserService
              ? `Activité Documentaire — ${user?.service}`
              : "Répartition Documentaire par Service Destinataire"}
          </h3>
          <span className="text-xs text-surface-500 dark:text-surface-400 font-bold uppercase tracking-wider">Données en direct</span>
        </div>

        <div className="w-full overflow-hidden">
          <table className="w-full table-fixed text-left text-sm">
            <colgroup>
              <col className="w-[35%]" />
              <col className="w-[13%]" />
              <col className="w-[13%]" />
              <col className="w-[13%]" />
              <col className="w-[13%]" />
              <col className="w-[13%]" />
            </colgroup>
            <thead>
              <tr className="bg-surface-100 dark:bg-surface-900 border-b border-surface-200 dark:border-surface-700 text-xs text-surface-700 dark:text-surface-200 font-extrabold uppercase tracking-wider">
                <th className="py-2.5 px-3 truncate">Service Destinataire</th>
                <th className="py-2.5 px-2 text-center truncate">🟡 Nouveaux</th>
                <th className="py-2.5 px-2 text-center truncate">🔵 Transmis</th>
                <th className="py-2.5 px-2 text-center truncate">🟠 En cours</th>
                <th className="py-2.5 px-2 text-center truncate">🟢 Traités</th>
                <th className="py-2.5 px-3 text-right truncate">Total Courriers</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200/80 dark:divide-surface-700/60">
              {loading ? (
                Array.from({ length: isUserService ? 1 : 3 }).map((_, i) => (
                  <tr key={i}>
                    <td className="py-2.5 px-3"><div className="w-32 h-4 skeleton rounded" /></td>
                    <td className="py-2.5 px-2 text-center"><div className="w-8 h-4 skeleton rounded mx-auto" /></td>
                    <td className="py-2.5 px-2 text-center"><div className="w-8 h-4 skeleton rounded mx-auto" /></td>
                    <td className="py-2.5 px-2 text-center"><div className="w-8 h-4 skeleton rounded mx-auto" /></td>
                    <td className="py-2.5 px-2 text-center"><div className="w-8 h-4 skeleton rounded mx-auto" /></td>
                    <td className="py-2.5 px-3 text-right"><div className="w-12 h-4 skeleton rounded ml-auto" /></td>
                  </tr>
                ))
              ) : stats.serviceStats.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-6 text-xs text-surface-500 dark:text-surface-400 font-medium">
                    Aucune donnée disponible pour cette période.
                  </td>
                </tr>
              ) : (
                stats.serviceStats
                  .filter(item => !isUserService || item.service === user?.service)
                  .map((item) => (
                    <tr key={item.service} className="hover:bg-surface-100/60 dark:hover:bg-surface-800/60 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-surface-900 dark:text-surface-50 flex items-center gap-2 truncate">
                        <Building2 className="w-4 h-4 text-primary-600 dark:text-emerald-400 shrink-0" />
                        <span className="truncate">{item.service}</span>
                        {isUserService && (
                          <Badge variant="primary" className="ml-1 shrink-0">Votre Service</Badge>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono text-yellow-700 dark:text-yellow-300 font-bold">
                        {item.NOUVEAU || 0}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono text-blue-700 dark:text-blue-300 font-bold">
                        {item.TRANSMIS || 0}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono text-amber-700 dark:text-amber-300 font-bold">
                        {item.EN_COURS || 0}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono text-emerald-700 dark:text-emerald-300 font-bold">
                        {item.TRAITE || 0}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-extrabold text-surface-900 dark:text-surface-50 text-base">
                        {item.total || 0}
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Activity Timeline — ONLY FOR CHEF_DIVISION / ADMIN (REMOVED FOR USER_SERVICE) */}
      {!isUserService && (
        <Card hover={false} padding="p-0" className="shadow-elevation-1">
          <div className="px-5 py-4 border-b border-surface-200 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-900/50 flex items-center justify-between">
            <h3 className="font-bold text-sm text-surface-900 dark:text-surface-50 font-display flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              Activité Récente — Registre d'Audit Global
            </h3>
            <Badge variant="purple">Journal d'audit</Badge>
          </div>
          <div className="p-5 max-h-[340px] overflow-y-auto">
            {stats.recentActivity.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-8 h-8 text-surface-400 dark:text-surface-500 mx-auto mb-2 opacity-60" />
                <p className="text-xs text-surface-500 dark:text-surface-400 font-medium">Aucune activité enregistrée</p>
              </div>
            ) : (
              <div className="relative">
                <div className="absolute left-[7px] top-2 bottom-2 w-px bg-surface-200 dark:bg-surface-700" />

                <div className="space-y-3.5">
                  {stats.recentActivity.map((log, idx) => (
                    <div key={idx} className="flex items-start gap-3 relative">
                      <div className="w-[15px] h-[15px] rounded-full border-2 border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 flex items-center justify-center shrink-0 mt-0.5 z-10">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary-600 dark:bg-emerald-400" />
                      </div>

                      <div className="flex-1 min-w-0 pb-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-sm font-bold text-surface-900 dark:text-surface-50 truncate">
                            {log.user_name}
                            <span className="text-surface-500 dark:text-surface-400 font-medium text-xs ml-1.5">
                              ({formatAuditRole(log.role)})
                            </span>
                          </div>
                          <span className="text-[10px] text-surface-500 dark:text-surface-400 font-mono font-semibold shrink-0">
                            {new Date(log.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-surface-700 dark:text-surface-200 mt-0.5">
                          {log.action}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};
