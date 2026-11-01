import React from 'react';
import { FileText } from 'lucide-react';
import { Button } from './Button';

export const EmptyState = ({
  icon: Icon = FileText,
  title = 'Aucun élément trouvé',
  description = '',
  actionLabel,
  actionIcon,
  onAction,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-8 text-center ${className}`}>
      <div className="w-14 h-14 rounded-xl bg-surface-100 dark:bg-surface-800 flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-surface-400" />
      </div>
      <h3 className="text-base font-semibold text-surface-900 dark:text-surface-50 mb-1 font-display">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-surface-500 dark:text-surface-400 max-w-sm">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <div className="mt-5">
          <Button variant="primary" size="sm" onClick={onAction} icon={actionIcon}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
};
