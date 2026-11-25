import type { ComponentProps } from 'react';

type ButtonProps = ComponentProps<'button'> & {
  loading?: boolean;
  variant?: 'primary' | 'secondary';
};

const variants = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-500',
  secondary: 'border border-slate-700 text-slate-200 hover:bg-slate-800',
};

export function Button({
  loading = false,
  variant = 'primary',
  disabled,
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center rounded-lg px-4 py-2 font-medium transition focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
      {...props}
    >
      {loading ? 'Please wait…' : children}
    </button>
  );
}
