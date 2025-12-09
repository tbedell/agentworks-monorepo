import { Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

type FounderTier = 'diamond' | 'gold' | 'silver';

interface FounderBadgeProps {
  tier: FounderTier | string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const tierConfig: Record<FounderTier, { bg: string; text: string; icon: string; label: string }> = {
  diamond: {
    bg: 'bg-gradient-to-r from-cyan-50 to-blue-50',
    text: 'text-cyan-700',
    icon: 'text-cyan-500',
    label: 'Diamond Founder',
  },
  gold: {
    bg: 'bg-gradient-to-r from-amber-50 to-yellow-50',
    text: 'text-amber-700',
    icon: 'text-amber-500',
    label: 'Gold Founder',
  },
  silver: {
    bg: 'bg-gradient-to-r from-slate-100 to-slate-50',
    text: 'text-slate-600',
    icon: 'text-slate-500',
    label: 'Silver Founder',
  },
};

const sizeClasses = {
  sm: { badge: 'px-2 py-0.5 text-xs gap-1', icon: 'w-3 h-3' },
  md: { badge: 'px-2.5 py-1 text-xs gap-1.5', icon: 'w-3.5 h-3.5' },
  lg: { badge: 'px-3 py-1.5 text-sm gap-2', icon: 'w-4 h-4' },
};

export function FounderBadge({ tier, size = 'md', showLabel = true, className }: FounderBadgeProps) {
  const normalizedTier = tier.toLowerCase() as FounderTier;
  const config = tierConfig[normalizedTier];

  if (!config) {
    return null;
  }

  const sizes = sizeClasses[size];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium border',
        config.bg,
        config.text,
        'border-current/20',
        sizes.badge,
        className
      )}
    >
      <Crown className={cn(sizes.icon, config.icon)} />
      {showLabel && <span>{config.label}</span>}
    </span>
  );
}

// Simple icon-only version for use in tables
export function FounderIcon({ tier, className }: { tier: string; className?: string }) {
  const normalizedTier = tier.toLowerCase() as FounderTier;
  const config = tierConfig[normalizedTier];

  if (!config) {
    return null;
  }

  return (
    <span title={config.label}>
      <Crown className={cn('w-4 h-4', config.icon, className)} />
    </span>
  );
}
