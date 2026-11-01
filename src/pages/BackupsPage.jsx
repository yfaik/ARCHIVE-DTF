import React from 'react';
import { BackupManager } from '../components/backup/BackupManager';
import { PageHeader } from '../components/common/PageHeader';
import { DatabaseBackup } from 'lucide-react';

export const BackupsPage = () => {
  return (
    <div className="space-y-5">
      <PageHeader
        icon={DatabaseBackup}
        title="Sauvegardes & Restauration"
        description="Gestion des sauvegardes automatiques quotidiennes et restauration système"
      />
      <BackupManager />
    </div>
  );
};
