import React from 'react';
import { cn } from '@/lib/utils';

export type FormFieldType = 'text' | 'number' | 'password' | 'email' | 'textarea' | 'select';

export interface FormFieldOption {
  value: string | number;
  label: string;
}

export interface FormFieldProps {
  type?: FormFieldType;
  label?: string;
  value: string | number;
  onChange: (val: any) => void;
  placeholder?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  disabled?: boolean;
  options?: FormFieldOption[];
  rows?: number;
  className?: string;
  inputClassName?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  type = 'text',
  label,
  value,
  onChange,
  placeholder,
  error,
  hint,
  required = false,
  disabled = false,
  options = [],
  rows = 3,
  className,
  inputClassName,
}) => {
  const baseClasses = cn(
    'w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-xs font-medium text-zinc-900 transition-colors',
    'placeholder:text-zinc-400 focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20',
    'dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500',
    error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500',
    disabled && 'opacity-60 cursor-not-allowed bg-zinc-50 dark:bg-zinc-950',
    inputClassName
  );

  const renderControl = () => {
    if (type === 'textarea') {
      return (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          rows={rows}
          className={cn(baseClasses, 'resize-y custom-scrollbar')}
        />
      );
    }

    if (type === 'select') {
      return (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          disabled={disabled}
          className={baseClasses}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={String(opt.value)} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    }

    return (
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className={baseClasses}
      />
    );
  };

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}
      {renderControl()}
      {error && <span className="text-[11px] font-medium text-red-500">{error}</span>}
      {hint && !error && <span className="text-[11px] text-zinc-400 dark:text-zinc-500">{hint}</span>}
    </div>
  );
};
