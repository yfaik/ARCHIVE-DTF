import React from 'react';

const variantStyles = {
  success: 'bg-emerald-50 text-emerald-800 border border-emerald-200/80 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800/80 font-semibold',
  warning: 'bg-amber-50 text-amber-800 border border-amber-200/80 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800/80 font-semibold',
  danger: 'bg-red-50 text-red-800 border border-red-200/80 dark:bg-red-950/70 dark:text-red-300 dark:border-red-800/80 font-semibold',
  info: 'bg-sky-50 text-sky-800 border border-sky-200/80 dark:bg-sky-950/70 dark:text-sky-300 dark:border-sky-800/80 font-semibold',
  neutral: 'bg-surface-100 text-surface-700 border border-surface-200 dark:bg-surface-800 dark:text-surface-200 dark:border-surface-700 font-semibold',
  primary: 'bg-emerald-50 text-emerald-900 border border-emerald-300/80 dark:bg-emerald-950/80 dark:text-emerald-200 dark:border-emerald-700 font-semibold',
  purple: 'bg-purple-50 text-purple-800 border border-purple-200/80 dark:bg-purple-950/70 dark:text-purple-300 dark:border-purple-800/80 font-semibold',
};

export const Badge = ({ children, variant = 'neutral', dot = false, className = '' }) => {
  const dotColors = {
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-red-500',
    info: 'bg-sky-500',
    neutral: 'bg-surface-400 dark:bg-surface-300',
    primary: 'bg-emerald-600 dark:bg-emerald-400',
    purple: 'bg-purple-500',
  };

  return (
    <span
      className={`badge ${variantStyles[variant] || variantStyles.neutral} ${className}`}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors[variant] || dotColors.neutral}`} />
      )}
      {children}
    </span>
  );
};

export const StatusBadge = ({ status, className = '' }) => {
  const norm = String(status || '').trim();
  const upper = norm.toUpperCase();

  let key = 'NOUVEAU';
  if (upper.includes('TRAIT')) {
    key = 'TRAITE';
  } else if (upper.includes('COURS')) {
    key = 'EN_COURS';
  } else if (upper.includes('TRANSMIS')) {
    key = 'TRANSMIS';
  } else if (upper.includes('NOUVEAU')) {
    key = 'NOUVEAU';
  }

  const config = {
    NOUVEAU: {
      label: 'Nouveau',
      dotColor: 'bg-yellow-500',
      classes: 'bg-yellow-50 text-yellow-800 border-yellow-300 dark:bg-yellow-950/60 dark:text-yellow-300 dark:border-yellow-800 font-medium',
    },
    TRANSMIS: {
      label: 'Transmis',
      dotColor: 'bg-blue-500',
      classes: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950/70 dark:text-blue-300 dark:border-blue-800 font-medium',
    },
    EN_COURS: {
      label: 'En cours',
      dotColor: 'bg-amber-500',
      classes: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800 font-semibold',
    },
    TRAITE: {
      label: 'Traité',
      dotColor: 'bg-emerald-500',
      classes: 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800 font-semibold',
    }
  };

  const current = config[key] || config.NOUVEAU;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs border ${current.classes} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${current.dotColor}`} />
      {current.label}
    </span>
  );
};

export const PriorityBadge = ({ priority = 'Normal', className = '' }) => {
  const norm = String(priority || 'Normal').trim();
  const config = {
    'Normal': {
      label: 'Normal',
      dotColor: 'bg-emerald-500',
      badgeClasses: 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800/80 font-medium',
    },
    'Urgent': {
      label: 'Urgent',
      dotColor: 'bg-orange-500',
      badgeClasses: 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-950/70 dark:text-orange-300 dark:border-orange-800/80 font-semibold',
    },
    'Très Urgent': {
      label: 'Très Urgent',
      dotColor: 'bg-red-500',
      badgeClasses: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-950/70 dark:text-red-300 dark:border-red-800/80 font-semibold shadow-xs',
    }
  };

  const current = config[norm] || config['Normal'];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs border ${current.badgeClasses} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${current.dotColor}`} />
      {current.label}
    </span>
  );
};

