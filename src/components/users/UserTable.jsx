import React, { useState } from 'react';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { Edit3, UserCheck, UserX, Trash2, AlertTriangle } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

export const UserTable = ({ users = [], onEditUser, onRefresh }) => {
  const { user: currentUser } = useAuth();

  const [deleteState, setDeleteState] = useState({
    isOpen: false,
    user: null,
    loading: false
  });

  const handleToggleStatus = async (user) => {
    try {
      const newStatus = user.active === 1 || user.active === true ? false : true;
      await api.patch(`/users/${user.id}/status`, { active: newStatus });
      toast.success(`Compte ${user.login} ${newStatus ? 'activé' : 'désactivé'}.`);
      onRefresh && onRefresh();
    } catch (e) {
      const msg = e.response?.data?.error || 'Erreur modification statut utilisateur.';
      toast.error(msg);
    }
  };

  const handleOpenDeleteModal = (targetUser) => {
    if (currentUser && String(currentUser.id) === String(targetUser.id)) {
      toast.error('Vous ne pouvez pas supprimer votre propre compte.');
      return;
    }
    if (targetUser.login === 'admin') {
      toast.error('Le compte principal Chef de Division (admin) ne peut pas être supprimé.');
      return;
    }
    setDeleteState({
      isOpen: true,
      user: targetUser,
      loading: false
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteState.user) return;
    setDeleteState(prev => ({ ...prev, loading: true }));
    try {
      await api.delete(`/users/${deleteState.user.id}`);
      toast.success(`Utilisateur ${deleteState.user.login} supprimé avec succès.`);
      setDeleteState({ isOpen: false, user: null, loading: false });
      onRefresh && onRefresh();
    } catch (e) {
      const msg = e.response?.data?.error || 'Erreur lors de la suppression de l utilisateur.';
      toast.error(msg);
      setDeleteState(prev => ({ ...prev, loading: false }));
    }
  };

  const getRoleBadge = (role) => {
    if (role === 'CHEF_DIVISION') return <Badge variant="purple">Chef de Division</Badge>;
    if (role === 'RESPONSABLE_BO' || role === 'SECRETAIRE') return <Badge variant="info">Responsable Bureau d'Ordre</Badge>;
    return <Badge variant="primary">Utilisateur de Service</Badge>;
  };

  return (
    <>
      <div className="card p-0 overflow-hidden shadow-elevation-1 w-full">
        <div className="w-full overflow-hidden">
          <table className="w-full table-fixed text-left text-xs sm:text-sm">
            <colgroup>
              <col className="w-[16%]" />
              <col className="w-[24%]" />
              <col className="w-[22%]" />
              <col className="w-[16%]" />
              <col className="w-[10%]" />
              <col className="w-[12%]" />
            </colgroup>
            <thead>
              <tr className="table-header">
                <th className="py-2.5 px-3 font-semibold truncate">Login</th>
                <th className="py-2.5 px-3 font-semibold truncate">Nom Complet</th>
                <th className="py-2.5 px-3 font-semibold truncate">Rôle</th>
                <th className="py-2.5 px-3 font-semibold truncate">Service</th>
                <th className="py-2.5 px-3 font-semibold truncate">Statut</th>
                <th className="py-2.5 px-3 font-semibold text-right truncate">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200/80 dark:divide-surface-700/60">
              {users.map((u) => {
                const isActive = u.active === 1 || u.active === true;
                const isSelf = currentUser && String(currentUser.id) === String(u.id);
                const isAdminAccount = u.login === 'admin';

                return (
                  <tr key={u.id} className="table-row table-row-zebra">
                    <td className="py-2.5 px-3 font-mono font-medium text-surface-900 dark:text-surface-100">
                      <div className="truncate" title={u.login}>
                        {u.login}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-surface-700 dark:text-surface-300">
                      <div className="line-clamp-2 break-words leading-tight" title={u.name}>
                        {u.name}
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="truncate max-w-full">
                        {getRoleBadge(u.role)}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-xs text-surface-500 dark:text-surface-400">
                      <div className="truncate max-w-full" title={u.service || 'Tous Services'}>
                        {u.service || 'Tous Services'}
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      {isActive ? (
                        <Badge variant="success" dot>Actif</Badge>
                      ) : (
                        <Badge variant="neutral" dot>Désactivé</Badge>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1 flex-nowrap">
                        {/* 1. Modifier */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEditUser(u)}
                          icon={Edit3}
                          title="Modifier les détails"
                          className="text-surface-500 hover:text-surface-900 dark:text-surface-400 dark:hover:text-surface-100"
                        />

                        {/* 2. Désactiver / Activer */}
                        <Button
                          variant={isActive ? 'outline' : 'primary'}
                          size="icon"
                          onClick={() => handleToggleStatus(u)}
                          icon={isActive ? UserX : UserCheck}
                          title={isActive ? 'Désactiver le compte' : 'Activer le compte'}
                        />

                        {/* 3. Supprimer */}
                        <Button
                          variant="danger"
                          size="icon"
                          onClick={() => handleOpenDeleteModal(u)}
                          icon={Trash2}
                          disabled={isSelf || isAdminAccount}
                          title={
                            isSelf
                              ? 'Vous ne pouvez pas supprimer votre propre compte'
                              : isAdminAccount
                              ? 'Le compte principal ne peut pas être supprimé'
                              : 'Supprimer définitivement l utilisateur'
                          }
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de confirmation de suppression */}
      {deleteState.isOpen && (
        <Modal
          isOpen={deleteState.isOpen}
          onClose={() => setDeleteState({ isOpen: false, user: null, loading: false })}
          title="Confirmation de suppression"
          subtitle="Cette action supprimera définitivement le compte de la base de données."
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3.5 rounded-lg bg-danger-50 dark:bg-danger-500/10 border border-danger-200 dark:border-danger-500/20 text-danger-800 dark:text-danger-300 text-sm">
              <AlertTriangle className="w-5 h-5 text-danger-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-base mb-1">
                  Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible.
                </p>
                <p className="text-xs text-surface-600 dark:text-surface-400 mt-1">
                  Utilisateur : <span className="font-mono font-bold">{deleteState.user?.name}</span> ({deleteState.user?.login})
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-surface-200 dark:border-surface-700">
              <Button
                variant="outline"
                onClick={() => setDeleteState({ isOpen: false, user: null, loading: false })}
                disabled={deleteState.loading}
              >
                Annuler
              </Button>
              <Button
                variant="danger"
                icon={Trash2}
                loading={deleteState.loading}
                onClick={handleConfirmDelete}
              >
                Supprimer
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};
