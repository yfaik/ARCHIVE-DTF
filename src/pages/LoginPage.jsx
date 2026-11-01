import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { User, Lock, ArrowRight, ShieldCheck, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Spinner } from '../components/common/Spinner';

export const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('Password123!');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!username.trim() || !password) {
      setErrorMsg('Veuillez saisir votre identifiant et votre mot de passe.');
      return;
    }

    setLoading(true);
    const success = await login(username.trim(), password);
    setLoading(false);

    if (success) {
      navigate('/dashboard');
    } else {
      setErrorMsg('Identifiant ou mot de passe incorrect.');
    }
  };

  // Subtle Moroccan zellij line pattern
  const moroccanPatternSvg = `data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%230D5C46' stroke-width='1' stroke-opacity='0.08'%3E%3Cpath d='M40 0 L80 40 L40 80 L0 40 Z'/%3E%3Cpath d='M0 0 L80 80 M80 0 L0 80'/%3E%3Crect x='20' y='20' width='40' height='40' transform='rotate(45 40 40)'/%3E%3Ccircle cx='40' cy='40' r='18'/%3E%3C%g%3E%3C%2Fsvg%3E`;

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-surface-50 dark:bg-[#071512] p-4 relative overflow-hidden transition-colors duration-200">
      {/* Moroccan Geometric Background Pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-80 dark:opacity-20"
        style={{
          backgroundImage: `url("${moroccanPatternSvg}")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '80px 80px',
        }}
      />

      {/* Glow Backdrops */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary-500/10 dark:bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-80 h-80 bg-amber-500/10 dark:bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Card */}
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[440px] bg-white/95 dark:bg-[#0D221D]/95 backdrop-blur-md rounded-xl border border-surface-300 dark:border-[#1A3D34] shadow-elevation-4 dark:shadow-dark-elevation-4 relative z-10 overflow-hidden p-6 sm:p-9"
      >
        {/* Top Header & Official Branding */}
        <div className="flex flex-col items-center text-center mb-6">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-surface-500 dark:text-emerald-400 mb-2 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-primary-600 dark:text-emerald-400" />
           
          </span>

          {/* Official Emblem Logo */}
          <div className="w-24 h-24 sm:w-28 sm:h-28 mb-3 p-2 rounded-xl bg-white shadow-sm border border-surface-200 dark:border-surface-700 flex items-center justify-center overflow-hidden transition-transform duration-200 hover:scale-105">
            <img
              src="/logo.png"
              alt="Logo Officiel Commune de Benslimane"
              className="max-h-full max-w-full object-contain"
            />
          </div>

          {/* Institution Titles */}
          <h1 className="text-xl sm:text-2xl font-black font-display text-surface-900 dark:text-surface-50 tracking-tight">
            Commune de Benslimane
          </h1>
          <p className="text-[11px] sm:text-xs font-extrabold text-primary-600 dark:text-emerald-300 tracking-wider uppercase mt-1">
            Division Technique et Financière
          </p>

          {/* Gold Accent Separator */}
          <div className="w-12 h-1 bg-amber-500 rounded-full my-2.5 opacity-80" />

          {/* Heading */}
          <h2 className="text-sm font-bold text-surface-800 dark:text-surface-100">
            Gestion Documentaire
          </h2>
         
        </div>

        {/* Error Banner */}
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 rounded-md bg-danger-50 dark:bg-danger-950/60 border border-danger-200 dark:border-danger-800 text-danger-800 dark:text-danger-300 text-xs font-semibold flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 text-danger-600 dark:text-danger-400 shrink-0" />
            <span>{errorMsg}</span>
          </motion.div>
        )}

        {/* Login Form */}
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {/* Identifiant */}
          <div className="space-y-1.5">
            <label
              htmlFor="username-input"
              className="text-xs font-bold text-surface-800 dark:text-surface-100 uppercase tracking-wider block"
            >
              Identifiant
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-surface-400 dark:text-surface-400">
                <User className="w-4 h-4" />
              </div>
              <input
                id="username-input"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="Entrez votre identifiant"
                className="w-full pl-10 pr-4 py-2.5 rounded bg-surface-50 dark:bg-[#132E27] border border-surface-300 dark:border-[#20493E] text-surface-900 dark:text-surface-50 text-sm font-semibold placeholder-surface-400 dark:placeholder-surface-400 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 dark:focus:ring-emerald-400/30 dark:focus:border-emerald-400"
              />
            </div>
          </div>

          {/* Mot de Passe avec option Afficher/Masquer */}
          <div className="space-y-1.5">
            <label
              htmlFor="password-input"
              className="text-xs font-bold text-surface-800 dark:text-surface-100 uppercase tracking-wider block"
            >
              Mot de passe
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-surface-400 dark:text-surface-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="password-input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 rounded bg-surface-50 dark:bg-[#132E27] border border-surface-300 dark:border-[#20493E] text-surface-900 dark:text-surface-50 text-sm font-semibold placeholder-surface-400 dark:placeholder-surface-400 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 dark:focus:ring-emerald-400/30 dark:focus:border-emerald-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-surface-400 hover:text-surface-700 dark:text-surface-300 dark:hover:text-surface-100 transition-colors"
                title={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 rounded bg-primary-600 hover:bg-primary-700 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white font-bold text-sm transition-all duration-150 shadow-elevation-1 hover:shadow-elevation-2 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group border border-primary-700/30"
          >
            {loading ? (
              <>
                <Spinner size="sm" />
                <span>Connexion en cours...</span>
              </>
            ) : (
              <>
                <span>Se connecter</span>
                <ArrowRight className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-1" />
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 pt-5 border-t border-surface-200 dark:border-[#1A3D34] text-center">
          <p className="text-[11px] font-bold text-surface-800 dark:text-surface-200">
            © Commune de Benslimane
          </p>
          <p className="text-[10px] font-semibold text-surface-500 dark:text-surface-400 mt-0.5">
            Division Technique et Financière — Gestion Documentaire
          </p>
        </div>
      </motion.div>
    </div>
  );
};
