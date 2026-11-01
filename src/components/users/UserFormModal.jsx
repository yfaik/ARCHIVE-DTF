import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Input, Select } from '../common/Input';
import { Button } from '../common/Button';
import api from '../../services/api';
import toast from 'react-hot-toast';

export const UserFormModal = ({ isOpen, onClose, editUser = null, onSuccess }) => {
  const isEdit = !!editUser;

  const [formData, setFormData] = useState({
    login: '',
    name: '',
    password: '',
    role: 'USER_SERVICE',
    service: 'Service Technique',
    active: true,
  });

  const [resetPasswordMode, setResetPasswordMode] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editUser) {
      setFormData({
        login: editUser.login || '',
        name: editUser.name || '',
        password: '',
        role: editUser.role === 'SECRETAIRE' ? 'RESPONSABLE_BO' : (editUser.role || 'USER_SERVICE'),
        service: editUser.service || 'Service Technique',
        active: editUser.active === 1 || editUser.active === true,
      });
      setResetPasswordMode(false);
      setNewPassword('');
    } else {
      setFormData({
        login: '',
        name: '',
        password: '',
        role: 'USER_SERVICE',
        service: 'Service Technique',
        active: true,
      });
    }
  }, [editUser, isOpen]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isEdit) {
        await api.put(`/users/${editUser.id}`, {
          name: formData.name,
          role: formData.role,
          service: formData.role === 'USER_SERVICE' ? formData.service : null,
          active: formData.active,
        });

        if (resetPasswordMode && newPassword.trim()) {
          await api.post(`/users/${editUser.id}/reset-password`, {
            newPassword: newPassword.trim(),
          });
        }

        toast.success(`Utilisateur ${formData.name} mis à jour.`);
      } else {
        await api.post('/users', {
          login: formData.login.trim(),
          name: formData.name.trim(),
          password: formData.password,
          role: formData.role,
          service: formData.role === 'USER_SERVICE' ? formData.service : null,
        });
        toast.success(`Compte ${formData.login} créé avec succès.`);
      }

      onSuccess && onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors de la sauvegarde.');
    } finally {
      setLoading(false);
    }
  };

  const roleOptions = [
    { value: 'CHEF_DIVISION', label: 'Chef de Division (Administrateur)' },
    { value: 'RESPONSABLE_BO', label: 'Responsable Bureau d\'Ordre' },
    { value: 'USER_SERVICE', label: 'Utilisateur de Service (Lecture Seule)' },
  ];

  const serviceOptions = [
    { value: 'Service Technique', label: 'Service Technique' },
    { value: 'Service Financier', label: 'Service Financier' },
    { value: 'Service Comptabilité', label: 'Service Comptabilité' },
    { value: 'Chef de Division', label: 'Chef de Division' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `Modifier: ${formData.login}` : 'Nouvel Utilisateur'}
      subtitle={isEdit ? 'Modifier les informations du compte' : 'Créer un nouveau compte utilisateur'}
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Identifiant Login"
          name="login"
          value={formData.login}
          onChange={handleChange}
          disabled={isEdit}
          placeholder="ex: amrani.tech"
          required
        />

        <Input
          label="Nom Complet"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="ex: Youssef El Amrani"
          required
        />

        {!isEdit && (
          <Input
            label="Mot de passe initial"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="••••••••"
            required
          />
        )}

        <Select
          label="Rôle Système"
          name="role"
          value={formData.role}
          onChange={handleChange}
          options={roleOptions}
          required
        />

        {formData.role === 'USER_SERVICE' && (
          <Select
            label="Service Attribué"
            name="service"
            value={formData.service}
            onChange={handleChange}
            options={serviceOptions}
            required
          />
        )}

        {isEdit && (
          <div className="pt-3 border-t border-surface-200 dark:border-surface-700 space-y-3">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                id="resetPass"
                checked={resetPasswordMode}
                onChange={(e) => setResetPasswordMode(e.target.checked)}
                className="w-4 h-4 text-primary-500 rounded border-surface-300 dark:border-surface-600 focus:ring-primary-500 bg-white dark:bg-surface-800"
              />
              <span className="text-sm font-medium text-surface-700 dark:text-surface-300">
                Réinitialiser le mot de passe
              </span>
            </label>

            {resetPasswordMode && (
              <Input
                label="Nouveau mot de passe"
                name="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Entrez le nouveau mot de passe"
                required
              />
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t border-surface-200 dark:border-surface-700">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            {isEdit ? 'Mettre à jour' : 'Créer l\'Utilisateur'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
