import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('dtf_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('dtf_jwt_token');
      if (token) {
        try {
          const res = await api.get('/auth/me');
          setUser(res.data.user);
          localStorage.setItem('dtf_user', JSON.stringify(res.data.user));
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
      const { token, user: userData } = res.data;
      
      localStorage.setItem('dtf_jwt_token', token);
      localStorage.setItem('dtf_user', JSON.stringify(userData));
      setUser(userData);
      toast.success(`Bienvenue, ${userData.name}!`);
      return true;
    } catch (err) {
      toast.error(err.response?.data?.error || 'Identifiants incorrects.');
      return false;
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // Ignore
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
