import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`bg-[var(--color-surface)] rounded-xl p-6 shadow-lg ${className}`}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = '' }: CardProps) {
  return <h2 className={`text-xl font-semibold mb-4 text-white ${className}`}>{children}</h2>;
}
