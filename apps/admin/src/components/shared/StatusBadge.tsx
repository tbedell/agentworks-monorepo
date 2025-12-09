import { cn } from '@/lib/utils';

type StatusType =
  | 'waiting' | 'invited' | 'converted' | 'expired'  // Waitlist
  | 'pending' | 'approved' | 'rejected' | 'suspended'  // Affiliate
  | 'active' | 'trial' | 'deleted'  // Tenant
  | 'paid' | 'refunded' | 'completed' | 'failed'  // Payout
  | 'healthy' | 'warning' | 'critical';  // Health

interface StatusBadgeProps {
  status: StatusType | string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const statusConfig: Record<string, { bg: string; text: string; dot?: string }> = {
  // Success states
  active: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  approved: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  converted: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  completed: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  paid: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  healthy: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },

  // Pending/Info states
  waiting: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  pending: { bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-500' },
  invited: { bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-500' },
  trial: { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },

  // Warning states
  warning: { bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-500' },
  suspended: { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },

  // Error states
  rejected: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  expired: { bg: 'bg-slate-50', text: 'text-slate-600', dot: 'bg-slate-400' },
  deleted: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  failed: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  refunded: { bg: 'bg-slate-50', text: 'text-slate-600', dot: 'bg-slate-400' },
  critical: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
};

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-3 py-1.5 text-sm',
};

export function StatusBadge({ status, size = 'md', className }: StatusBadgeProps) {
  const config = statusConfig[status.toLowerCase()] || {
    bg: 'bg-slate-50',
    text: 'text-slate-600',
    dot: 'bg-slate-400',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium capitalize',
        config.bg,
        config.text,
        sizeClasses[size],
        className
      )}
    >
      {config.dot && (
        <span className={cn('h-1.5 w-1.5 rounded-full', config.dot)} />
      )}
      {status.replace(/_/g, ' ')}
    </span>
  );
}
