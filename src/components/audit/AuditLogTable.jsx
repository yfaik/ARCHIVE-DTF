import React, { useState } from 'react';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { Shield, Lock, Eye } from 'lucide-react';

export const AuditLogTable = ({ logs = [] }) => {
  const [selectedLog, setSelectedLog] = useState(null);

  const getActionBadgeVariant = (action) => {
    if (action.includes('CREATION')) return 'success';
    if (action.includes('MODIFICATION') || action.includes('REDIRECTION')) return 'warning';
    if (action.includes('DESACTIVATION') || action.includes('SUPPRESSION')) return 'danger';
    if (action.includes('LOGIN') || action.includes('LOGOUT')) return 'info';
    return 'purple';
  };

  const formatAuditRole = (role) => {
    if (!role) return '';
    if (role === 'SECRETAIRE' || role === 'Secrétaire' || role === 'secretaire') return 'RESPONSABLE_BO';
    return role;
  };

  return (
    <div className="space-y-4">
      {/* Immutability Banner */}
      <div className="info-banner border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-300">
        <div className="w-9 h-9 rounded-md bg-primary-600 dark:bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
          <Lock className="w-4.5 h-4.5" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-bold flex items-center gap-2">
            Registre d'Audit Inviolable
            <Badge variant="purple">Immuable</Badge>
          </div>
          <div className="text-xs opacity-90 mt-0.5">
            Toutes les actions administratives sont consignées en temps réel. Aucune modification ou suppression n'est autorisée.
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden shadow-elevation-1 w-full">
        <div className="w-full overflow-hidden">
          <table className="w-full table-fixed text-left text-xs">
            <colgroup>
              <col className="w-[18%]" />
              <col className="w-[18%]" />
              <col className="w-[18%]" />
              <col className="w-[22%]" />
              <col className="w-[14%]" />
              <col className="w-[10%]" />
            </colgroup>
            <thead>
              <tr className="bg-surface-100 dark:bg-surface-900 border-b border-surface-200 dark:border-surface-700 font-extrabold uppercase tracking-wider text-surface-700 dark:text-surface-200">
                <th className="py-2.5 px-3 truncate">Date & Heure</th>
                <th className="py-2.5 px-3 truncate">Utilisateur</th>
                <th className="py-2.5 px-3 truncate">Rôle</th>
                <th className="py-2.5 px-3 truncate">Action</th>
                <th className="py-2.5 px-3 truncate">Adresse IP</th>
                <th className="py-2.5 px-3 text-right truncate">Détails</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200/80 dark:divide-surface-700/60">
              {logs.map((log) => (
                <tr key={log.id} className="table-row table-row-zebra hover:bg-surface-100/70 dark:hover:bg-surface-800/60">
                  <td className="py-2.5 px-3 font-mono font-semibold text-surface-700 dark:text-surface-300 truncate">
                    {new Date(log.timestamp).toLocaleString('fr-FR')}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-surface-900 dark:text-surface-50 truncate" title={log.user_name}>
                    {log.user_name}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="truncate max-w-full">
                      <Badge variant="neutral">{formatAuditRole(log.role)}</Badge>
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="truncate max-w-full">
                      <Badge variant={getActionBadgeVariant(log.action)}>
                        {log.action}
                      </Badge>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-surface-500 dark:text-surface-400 truncate font-medium" title={log.ip_address}>
                    {log.ip_address}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setSelectedLog(log)}
                      icon={Eye}
                      title="Inspecter le journal d'audit"
                      className="ml-auto"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payload Inspection Modal */}
      <Modal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title={selectedLog ? `Inspecteur d'Audit #${selectedLog.id}` : ''}
        subtitle={selectedLog?.action}
        maxWidth="max-w-2xl"
      >
        {selectedLog && (
          <div className="space-y-4 font-mono text-xs">
            {selectedLog.old_value && (
              <div>
                <div className="text-danger-600 dark:text-danger-400 font-bold mb-1.5 font-sans text-sm">
                  Données Précédentes
                </div>
                <pre className="p-3 rounded bg-surface-100 dark:bg-surface-900 border border-danger-200 dark:border-danger-900/60 overflow-x-auto text-danger-700 dark:text-danger-300 font-semibold">
                  {JSON.stringify(JSON.parse(selectedLog.old_value), null, 2)}
                </pre>
              </div>
            )}

            {selectedLog.new_value && (
              <div>
                <div className="text-emerald-600 dark:text-emerald-400 font-bold mb-1.5 font-sans text-sm">
                  Nouvelles Données Consignées
                </div>
                <pre className="p-3 rounded bg-surface-100 dark:bg-surface-900 border border-emerald-200 dark:border-emerald-900/60 overflow-x-auto text-emerald-700 dark:text-emerald-300 font-semibold">
                  {JSON.stringify(JSON.parse(selectedLog.new_value), null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
