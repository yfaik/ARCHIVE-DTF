import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('dtf_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('dtf_jwt_token');
      if (token) {
        try {
          const res = await api.get('/auth/me');
          if (res.data?.user) {
            setUser(res.data.user);
            localStorage.setItem('dtf_user', JSON.stringify(res.data.user));
          }
        } catch (e) {
          setUser(null);
          localStorage.removeItem('dtf_jwt_token');
          localStorage.removeItem('dtf_user');
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const login = async (loginId, password) => {
    try {
      const res = await api.post('/auth/login', { login: loginId, password });
      const { token, user: userData } = res.data || {};
      
      if (!token || !userData) {
        throw new Error('Réponse de connexion invalide du serveur.');
      }

      localStorage.setItem('dtf_jwt_token', token);
      localStorage.setItem('dtf_user', JSON.stringify(userData));
      setUser(userData);
      toast.success(`Bienvenue, ${userData.name || userData.login}!`);
      return { success: true, user: userData };
    } catch (err) {
      const errorMsg = String(
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Identifiant ou mot de passe incorrect.'
      );
      toast.error(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('dtf_jwt_token');
      localStorage.removeItem('dtf_user');
      setUser(null);
      toast.success('Déconnexion réussie.');
    }
  };

  // Roles permissions helpers
  const isChefDivision = user?.role === 'CHEF_DIVISION';
  const isResponsableBO = user?.role === 'RESPONSABLE_BO' || user?.role === 'SECRETAIRE';
  const isSecretaire = isResponsableBO;
  const isUserService = user?.role === 'USER_SERVICE';
  
  const canCreateMail = isChefDivision || isResponsableBO;
  const canEditMail = isChefDivision || isResponsableBO;
  const canManageUsers = isChefDivision;
  const canManageBackups = isChefDivision;
  const canViewAuditLogs = isChefDivision;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isChefDivision,
        isResponsableBO,
        isSecretaire,
        isUserService,
        canCreateMail,
        canEditMail,
        canManageUsers,
        canManageBackups,
        canViewAuditLogs
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
