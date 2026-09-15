import { cn } from '../../lib/utils';

interface RiskBadgeProps {
  level: 'LOW' | 'MEDIUM' | 'HIGH';
  size?: 'sm' | 'md';
}

const config = {
  LOW: {
    wrapper: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    dot: 'bg-emerald-500',
    label: 'Low Risk',
  },
  MEDIUM: {
    wrapper: 'bg-amber-50 text-amber-700 border border-amber-200',
    dot: 'bg-amber-500',
    label: 'Medium Risk',
  },
  HIGH: {
    wrapper: 'bg-red-50 text-red-700 border border-red-200',
    dot: 'bg-red-500',
    label: 'High Risk',
  },
};

export default function RiskBadge({ level, size = 'md' }: RiskBadgeProps) {
  const { wrapper, dot, label } = config[level];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        wrapper,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
      )}
    >
      <span className={cn('rounded-full', dot, size === 'sm' ? 'h-1.5 w-1.5' : 'h-2 w-2')} />
      {label}
    </span>
  );
}
