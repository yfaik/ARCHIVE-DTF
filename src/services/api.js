import axios from 'axios';
import toast from 'react-hot-toast';

// Normalize API base URL: ensure proper format whether VITE_API_URL includes /api or not
const getBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (!envUrl) return '/api';
  const cleanUrl = envUrl.trim().replace(/\/+$/, '');
  return cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`;
};

const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Inject JWT token into Authorization header
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('dtf_jwt_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Intercept 401, 403 & 500 authorization responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response ? error.response.status : null;
    const rawMsg = 
      error.response?.data?.message || 
      error.response?.data?.error || 
      error.message || 
      'Une erreur est survenue sur le serveur.';
      
    const message = typeof rawMsg === 'string' 
      ? rawMsg 
      : (typeof rawMsg === 'object' ? (rawMsg.message || rawMsg.error || JSON.stringify(rawMsg)) : String(rawMsg));

    if (status === 401) {
      localStorage.removeItem('dtf_jwt_token');
      localStorage.removeItem('dtf_user');
      if (window.location.pathname !== '/login') {
        toast.error('Session expirée. Veuillez vous reconnecter.');
        window.location.href = '/login';
      }
    } else if (status === 403) {
      toast.error(String(message || 'Permissions insuffisantes.'));
    } else if (status === 500) {
      console.error('❌ [API 500 Internal Server Error]:', error.response?.data || error.message);
    }

    return Promise.reject(error);
  }
);

export default api;
