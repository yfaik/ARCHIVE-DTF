import React, { useState, useEffect } from 'react';
import { AuditLogTable } from '../components/audit/AuditLogTable';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { PageHeader } from '../components/common/PageHeader';
import { ShieldAlert, RefreshCw, Search } from 'lucide-react';
import api from '../services/api';

export const AuditLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [userFilter, setUserFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let url = `/audit?user=${encodeURIComponent(userFilter)}&action=${encodeURIComponent(actionFilter)}`;
      const res = await api.get(url);
      setLogs(res.data);
    } catch (e) {
      // Error handling
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [userFilter, actionFilter]);

  return (
    <div className="space-y-5">
      <PageHeader
        icon={ShieldAlert}
        title="Journal d'Audit"
        description="Traçabilité intégrale de toutes les actions système"
      >
        <Button variant="outline" size="sm" onClick={fetchLogs} icon={RefreshCw}>
          Actualiser
        </Button>
      </PageHeader>

      {/* Filter Bar */}
      <div className="filter-bar grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          placeholder="Filtrer par utilisateur..."
          value={userFilter}
          onChange={(e) => setUserFilter(e.target.value)}
          icon={Search}
        />
        <Input
          placeholder="Filtrer par action..."
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          icon={Search}
        />
      </div>

      {/* Audit Log Table */}
      <AuditLogTable logs={logs} />
    </div>
  );
};
