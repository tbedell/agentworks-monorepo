import { cn, formatCurrency, formatPercent } from '@/lib/utils';

interface RevenueSegment {
  name: string;
  value: number;
  percentage: number;
  color: string;
  bgColor: string;
}

interface RevenueBreakdownChartProps {
  segments: RevenueSegment[];
  total: number;
  className?: string;
}

export function RevenueBreakdownChart({
  segments,
  total,
  className,
}: RevenueBreakdownChartProps) {
  if (segments.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        No revenue data available
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Stacked bar */}
      <div className="h-8 flex rounded-lg overflow-hidden">
        {segments.map((segment) => (
          <div
            key={segment.name}
            className={cn('transition-all duration-500', segment.color)}
            style={{ width: `${segment.percentage}%` }}
            title={`${segment.name}: ${formatCurrency(segment.value)} (${formatPercent(segment.percentage)})`}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {segments.map((segment) => (
          <div
            key={segment.name}
            className={cn(
              'p-4 rounded-lg border',
              segment.bgColor,
              'border-current/10'
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={cn('w-3 h-3 rounded-full', segment.color)} />
              <span className="text-sm font-medium text-slate-700">
                {segment.name}
              </span>
            </div>
            <p className="text-xl font-bold text-slate-900">
              {formatCurrency(segment.value)}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {formatPercent(segment.percentage)} of total
            </p>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-600">Total MRR</span>
        <span className="text-2xl font-bold text-slate-900">
          {formatCurrency(total)}
        </span>
      </div>
    </div>
  );
}

// Donut chart version
export function RevenueDonutChart({
  segments,
  total,
  className,
}: RevenueBreakdownChartProps) {
  if (segments.length === 0) {
    return null;
  }

  // Calculate stroke dash arrays for donut
  const radius = 80;
  const circumference = 2 * Math.PI * radius;

  // Calculate cumulative percentages for each segment
  const segmentsWithOffset = segments.reduce<Array<{ segment: RevenueSegment; offset: number }>>((acc, segment) => {
    const lastOffset = acc.length > 0 ? acc[acc.length - 1].offset + acc[acc.length - 1].segment.percentage : 0;
    acc.push({ segment, offset: lastOffset });
    return acc;
  }, []);

  return (
    <div className={cn('flex items-center gap-8', className)}>
      {/* Donut */}
      <div className="relative">
        <svg width="200" height="200" viewBox="0 0 200 200">
          {segmentsWithOffset.map(({ segment, offset }) => {
            const strokeDasharray = `${(segment.percentage / 100) * circumference} ${circumference}`;
            const strokeDashoffset = -offset * (circumference / 100);

            return (
              <circle
                key={segment.name}
                cx="100"
                cy="100"
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth="24"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                className={segment.color}
                transform="rotate(-90 100 100)"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs text-slate-500">Total</span>
          <span className="text-xl font-bold text-slate-900">
            {formatCurrency(total)}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="space-y-3">
        {segments.map((segment) => (
          <div key={segment.name} className="flex items-center gap-3">
            <div className={cn('w-3 h-3 rounded-full', segment.color)} />
            <div>
              <p className="text-sm font-medium text-slate-700">{segment.name}</p>
              <p className="text-xs text-slate-500">
                {formatCurrency(segment.value)} ({formatPercent(segment.percentage)})
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
