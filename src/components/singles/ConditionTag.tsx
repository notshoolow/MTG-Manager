'use client';

export type CardCondition = 'M' | 'NM' | 'EX' | 'GD' | 'LP' | 'PL' | 'PO';

export const CONDITION_MAP: Record<CardCondition, { label: string, short: string, color: string }> = {
  'M': { label: 'Mint', short: 'MT', color: 'bg-sky-500' },
  'NM': { label: 'Near Mint', short: 'NM', color: 'bg-emerald-600' },
  'EX': { label: 'Excellent', short: 'EX', color: 'bg-lime-500' },
  'GD': { label: 'Good', short: 'GD', color: 'bg-yellow-500' },
  'LP': { label: 'Lightly Played', short: 'LP', color: 'bg-orange-500' },
  'PL': { label: 'Played', short: 'PL', color: 'bg-orange-700' },
  'PO': { label: 'Poor', short: 'PO', color: 'bg-red-600' },
};

export default function ConditionTag({ condition, short = false, className = "" }: { condition: string, short?: boolean, className?: string }) {
  const config = CONDITION_MAP[condition as CardCondition] || { label: condition, short: condition, color: 'bg-gray-600' };
  
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-sm ${config.color} ${className}`} title={config.label}>
      {short ? config.short : config.label}
    </span>
  );
}
