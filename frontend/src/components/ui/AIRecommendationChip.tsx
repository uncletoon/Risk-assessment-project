import { CheckCircle2, Eye, XCircle } from 'lucide-react';

interface AIRecommendationChipProps {
  recommendation: 'APPROVE' | 'REVIEW' | 'REJECT';
}

const config = {
  APPROVE: {
    className: 'bg-emerald-500 text-white',
    Icon: CheckCircle2,
    label: 'Approve',
  },
  REVIEW: {
    className: 'bg-blue-500 text-white',
    Icon: Eye,
    label: 'Review',
  },
  REJECT: {
    className: 'bg-red-500 text-white',
    Icon: XCircle,
    label: 'Reject',
  },
};

export default function AIRecommendationChip({ recommendation }: AIRecommendationChipProps) {
  const { className, Icon, label } = config[recommendation];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${className}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}
