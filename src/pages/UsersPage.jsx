import React, { useState, useEffect } from 'react';
import { UserTable } from '../components/users/UserTable';
import { UserFormModal } from '../components/users/UserFormModal';
import { Button } from '../components/common/Button';
import { PageHeader } from '../components/common/PageHeader';
import { UserPlus, Users, RefreshCw } from 'lucide-react';
import api from '../services/api';

export const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (e) {
      // Error handling
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleOpenNewModal = () => {
    setEditUser(null);
    setIsModalOpen(true);
  };

  const handleEditUser = (user) => {
    setEditUser(user);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Users}
        title="Gestion des Utilisateurs"
        description="Création, modification et gestion des comptes utilisateurs"
      >
        <Button variant="outline" size="sm" onClick={fetchUsers} icon={RefreshCw}>
          Actualiser
        </Button>
        <Button variant="primary" size="sm" onClick={handleOpenNewModal} icon={UserPlus}>
          Nouvel Utilisateur
        </Button>
      </PageHeader>

      {/* Users Table */}
      <UserTable
        users={users}
        onEditUser={handleEditUser}
        onRefresh={fetchUsers}
      />

      {/* User Modal */}
      <UserFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editUser={editUser}
        onSuccess={fetchUsers}
      />
    </div>
  );
};
