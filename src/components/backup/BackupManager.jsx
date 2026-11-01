import React, { useState, useEffect } from 'react';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { DatabaseBackup, Download, RotateCcw, Clock, Upload } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export const BackupManager = () => {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoreFile, setRestoreFile] = useState(null);
  const [restoring, setRestoring] = useState(false);
  const [downloadingFilename, setDownloadingFilename] = useState(null);

  const fetchBackups = async () => {
    setLoading(true);
    try {
      const res = await api.get('/backups');
      setBackups(res.data);
    } catch (e) {
      toast.error('Erreur chargement des sauvegardes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const handleCreateBackup = async () => {
    setCreating(true);
    try {
      await api.post('/backups/create');
      toast.success('Sauvegarde complète générée avec succès.');
      fetchBackups();
    } catch (e) {
      toast.error('Erreur lors de la création de la sauvegarde.');
    } finally {
      setCreating(false);
    }
  };

  const handleDownloadBackup = async (filename) => {
    setDownloadingFilename(filename);
    try {
      const response = await api.get(`/backups/download/${encodeURIComponent(filename)}`, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'application/zip' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
      toast.success('Téléchargement effectué avec succès.');
    } catch (e) {
      if (e.response) {
        if (e.response.status === 401 || e.response.status === 403) {
          toast.error('Session expirée ou accès non autorisé.');
        } else if (e.response.status === 404) {
          toast.error('Fichier de sauvegarde introuvable.');
        } else {
          let msg = 'Erreur lors du téléchargement de la sauvegarde.';
          if (e.response.data instanceof Blob) {
            try {
              const text = await e.response.data.text();
              const json = JSON.parse(text);
              if (json.error) msg = json.error;
            } catch (_) {}
          } else if (e.response.data?.error) {
            msg = e.response.data.error;
          }
          toast.error(msg);
        }
      } else {
        toast.error('Erreur lors du téléchargement de la sauvegarde.');
      }
    } finally {
      setDownloadingFilename(null);
    }
  };

  const handleRestoreSubmit = async (e) => {
    e.preventDefault();
    if (!restoreFile) {
      toast.error('Veuillez sélectionner un fichier ZIP de sauvegarde.');
      return;
    }

    setRestoring(true);
    try {
      const formData = new FormData();
      formData.append('backupZip', restoreFile);

      await api.post('/backups/restore', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('Base de données et fichiers restaurés avec succès!');
      setRestoreFile(null);
      fetchBackups();
    } catch (e) {
      toast.error('Erreur lors de la restauration de la sauvegarde.');
    } finally {
      setRestoring(false);
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return '0 Mo';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} Mo`;
  };

  return (
    <div className="space-y-5">
      {/* Daily Backup Info Banner */}
      <div className="card flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 border-primary-200 dark:border-primary-500/20 bg-primary-50/50 dark:bg-primary-500/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary-500 text-white flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-50 font-display">
                Sauvegarde Automatique (17h00)
              </h3>
              <Badge variant="success" dot>Planificateur Actif</Badge>
            </div>
            <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5 max-w-2xl">
              Archive ZIP quotidienne de la base de données et des fichiers PDF. Les 30 dernières sauvegardes sont conservées.
            </p>
          </div>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={handleCreateBackup}
          loading={creating}
          icon={DatabaseBackup}
        >
          Sauvegarde Manuelle
        </Button>
      </div>

      {/* Restore Section */}
      <div className="card p-5 space-y-3">
        <h4 className="font-semibold text-sm text-surface-900 dark:text-surface-50 font-display flex items-center gap-2">
          <RotateCcw className="w-4 h-4 text-primary-500" />
          Restauration à partir d'un fichier ZIP
        </h4>
        <form onSubmit={handleRestoreSubmit} className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <input
            type="file"
            accept=".zip"
            onChange={(e) => setRestoreFile(e.target.files[0] || null)}
            className="w-full text-xs text-surface-600 dark:text-surface-400 border border-surface-200 dark:border-surface-700 rounded-md p-2 bg-white dark:bg-surface-800 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-primary-50 file:text-primary-500 dark:file:bg-primary-500/10 hover:file:bg-primary-100 dark:hover:file:bg-primary-500/20 file:cursor-pointer file:transition-colors"
          />
          <Button
            type="submit"
            variant="outline"
            size="sm"
            disabled={!restoreFile}
            loading={restoring}
            icon={Upload}
            className="shrink-0"
          >
            Restaurer
          </Button>
        </form>
      </div>

      {/* Backups List Table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-surface-200 dark:border-surface-700">
          <h4 className="font-semibold text-sm text-surface-900 dark:text-surface-50 font-display">
            Historique des Sauvegardes
          </h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="table-header">
                <th className="py-3 px-5 font-semibold">Nom du fichier</th>
                <th className="py-3 px-5 font-semibold">Taille</th>
                <th className="py-3 px-5 font-semibold">Date de Création</th>
                <th className="py-3 px-5 font-semibold text-right">Téléchargement</th>
              </tr>
            </thead>
            <tbody>
              {backups.map((b) => (
                <tr key={b.filename} className="table-row table-row-zebra">
                  <td className="py-3 px-5 font-mono font-medium text-primary-500">
                    {b.filename}
                  </td>
                  <td className="py-3 px-5 text-surface-600 dark:text-surface-400 font-medium">
                    {formatSize(b.size)}
                  </td>
                  <td className="py-3 px-5 text-surface-500 dark:text-surface-400">
                    {new Date(b.created_at).toLocaleString('fr-FR')}
                  </td>
                  <td className="py-3 px-5 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownloadBackup(b.filename)}
                      loading={downloadingFilename === b.filename}
                      disabled={downloadingFilename !== null}
                      icon={Download}
                    >
                      Télécharger
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
