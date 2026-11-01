import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { Home, FileQuestion } from 'lucide-react';

export const NotFoundPage = () => {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4">
      <div className="w-16 h-16 rounded-xl bg-surface-100 dark:bg-surface-800 flex items-center justify-center mb-6">
        <FileQuestion className="w-8 h-8 text-surface-400" />
      </div>
      <h1 className="text-5xl font-bold text-primary-500 font-display mb-2">404</h1>
      <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-50 mb-2">
        Page Introuvable
      </h2>
      <p className="text-sm text-surface-500 dark:text-surface-400 max-w-sm mb-6">
        La page que vous recherchez n'existe pas ou a été déplacée.
      </p>
      <Link to="/dashboard">
        <Button variant="primary" icon={Home}>
          Retour au Tableau de Bord
        </Button>
      </Link>
    </div>
  );
};
