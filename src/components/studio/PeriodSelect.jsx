import { cn } from '@/lib/utils';

export const PERIODS = [
  { value: 7, label: '7 jours' },
  { value: 30, label: '30 jours' },
  { value: 90, label: '90 jours' },
  { value: 0, label: 'Tout' },
];

export default function PeriodSelect({ value, onChange }) {
  return (
    <div className="flex gap-1 rounded-full bg-secondary p-1">
      {PERIODS.map((period) => (
        <button
          key={period.value}
          type="button"
          onClick={() => onChange(period.value)}
          className={cn(
            'rounded-full px-3.5 py-1.5 text-xs transition-colors',
            value === period.value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {period.label}
        </button>
      ))}
    </div>
  );
}