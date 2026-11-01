import React from 'react';

export const PageHeader = ({
  icon: Icon,
  title,
  description,
  children,
  className = '',
}) => {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${className}`}>
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50 font-display flex items-center gap-2.5 leading-tight">
          {Icon && (
            <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary-50 dark:bg-primary-500/10 text-primary-500 shrink-0">
              <Icon className="w-5 h-5" />
            </span>
          )}
          <span>{title}</span>
        </h1>
        {description && (
          <p className="text-sm text-surface-500 dark:text-surface-400 mt-1 ml-[46px] sm:ml-[46px]">
            {description}
          </p>
        )}
      </div>
      {children && (
        <div className="flex items-center gap-2 shrink-0">
          {children}
        </div>
      )}
    </div>
  );
};
