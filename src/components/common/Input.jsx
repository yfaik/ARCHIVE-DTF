import React from 'react';

export const Input = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  required = false,
  disabled = false,
  icon: Icon,
  hint,
  className = '',
  ...rest
}) => {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={name}
          className="text-xs font-semibold uppercase tracking-wider text-surface-700 dark:text-surface-200"
        >
          {label}
          {required && <span className="text-danger-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-surface-400 dark:text-surface-400">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={`w-full rounded-md border bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 placeholder-surface-400 dark:placeholder-surface-400 text-sm px-3.5 py-2.5 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 dark:focus:ring-primary-400/30 dark:focus:border-primary-400 ${
            Icon ? 'pl-10' : ''
          } ${
            error
              ? 'border-danger-500 focus:ring-danger-500/30 focus:border-danger-500'
              : 'border-surface-300 dark:border-surface-600'
          } ${
            disabled
              ? 'opacity-60 cursor-not-allowed bg-surface-100 dark:bg-surface-900'
              : ''
          }`}
          {...rest}
        />
      </div>
      {hint && !error && (
        <span className="text-[11px] text-surface-500 dark:text-surface-400">{hint}</span>
      )}
      {error && (
        <span className="text-xs font-semibold text-danger-500">{error}</span>
      )}
    </div>
  );
};

export const Select = ({
  label,
  name,
  value,
  onChange,
  options = [],
  error,
  required = false,
  disabled = false,
  className = '',
}) => {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={name}
          className="text-xs font-semibold uppercase tracking-wider text-surface-700 dark:text-surface-200"
        >
          {label}
          {required && <span className="text-danger-500 ml-1">*</span>}
        </label>
      )}
      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
        className={`w-full rounded-md border bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 text-sm px-3.5 py-2.5 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 dark:focus:ring-primary-400/30 dark:focus:border-primary-400 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2364748B%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px_16px] bg-[position:calc(100%-12px)_center] bg-no-repeat pr-10 cursor-pointer ${
          error
            ? 'border-danger-500'
            : 'border-surface-300 dark:border-surface-600'
        } ${
          disabled
            ? 'opacity-60 cursor-not-allowed bg-surface-100 dark:bg-surface-900'
            : ''
        }`}
      >
        {options.length === 0 || !options.some(o => o.value === '') ? (
          <option value="" className="bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 font-medium">-- Sélectionner --</option>
        ) : null}
        {options.map((opt) => (
          <option
            key={opt.value}
            value={opt.value}
            className="bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 py-1 font-medium"
          >
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <span className="text-xs font-semibold text-danger-500">{error}</span>
      )}
    </div>
  );
};
