import React from 'react';
import { Spinner } from './Spinner';

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  disabled = false,
  loading = false,
  onClick,
  icon: Icon,
  className = '',
  title,
  ...rest
}) => {
  const isDisabled = disabled || loading;

  const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none';

  const variants = {
    primary: 'bg-primary-500 hover:bg-primary-600 dark:bg-primary-500 dark:hover:bg-primary-600 text-white font-semibold shadow-elevation-1 hover:shadow-elevation-2 active:scale-[0.99] border border-primary-600/30',
    secondary: 'bg-surface-100 hover:bg-surface-200 text-surface-800 dark:bg-surface-800 dark:hover:bg-surface-700 dark:text-surface-100 border border-surface-200 dark:border-surface-700 active:scale-[0.99]',
    outline: 'border border-surface-300 dark:border-surface-600 text-surface-800 dark:text-surface-100 hover:bg-surface-100/60 dark:hover:bg-surface-800 hover:border-surface-400 dark:hover:border-surface-500 focus-visible:outline-primary-500',
    ghost: 'text-surface-700 dark:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-surface-900 dark:hover:text-white focus-visible:outline-primary-500',
    danger: 'bg-danger-600 hover:bg-danger-700 text-white font-semibold shadow-elevation-1 hover:shadow-elevation-2 active:scale-[0.99] border border-danger-700/30',
  };

  const sizes = {
    icon: 'w-7 h-7 p-0 flex items-center justify-center rounded text-xs shrink-0',
    xs: 'px-2 py-1 text-[11px] font-semibold gap-1 rounded',
    sm: 'px-3 py-1.5 text-xs font-semibold gap-1.5 rounded',
    md: 'px-4 py-2 text-sm font-semibold gap-2 rounded-md',
    lg: 'px-5 py-2.5 text-sm font-bold gap-2 rounded-md',
  };

  const iconSizes = {
    icon: 'w-3.5 h-3.5',
    xs: 'w-3 h-3',
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-4.5 h-4.5',
  };

  return (
    <button
      type={type}
      disabled={isDisabled}
      onClick={onClick}
      title={title}
      className={`${baseStyles} ${variants[variant] || variants.primary} ${sizes[size]} ${className}`}
      {...rest}
    >
      {loading ? (
        <Spinner size="sm" className={children ? 'mr-1.5' : ''} />
      ) : (
        Icon && <Icon className={iconSizes[size]} />
      )}
      {children}
    </button>
  );
};
