import { ReactNode, ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

export function Button({ variant = 'primary', size = 'md', children, className = '', ...props }: ButtonProps) {
  const sizeStyles = {
    sm: "px-3 py-1 text-sm",
    md: "px-4 py-2",
    lg: "px-6 py-3 text-lg",
  };
  const baseStyles = `${sizeStyles[size]} font-medium rounded-lg transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed`;
  
  const variants = {
    primary: "bg-[var(--color-indigo-accent)] text-white hover:bg-indigo-600",
    secondary: "bg-[var(--color-surface)] text-foreground hover:bg-gray-700",
    danger: "bg-[var(--color-dispute)] text-white hover:bg-red-600",
    success: "bg-[var(--color-valid)] text-white hover:bg-green-600",
  };

  return (
    <button className={`${baseStyles} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
