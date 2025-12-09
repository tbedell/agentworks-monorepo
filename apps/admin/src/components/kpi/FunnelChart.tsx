import { cn, formatNumber, formatPercent } from '@/lib/utils';

interface FunnelStage {
  name: string;
  value: number;
  conversionRate?: number;
  color: string;
}

interface FunnelChartProps {
  stages: FunnelStage[];
  className?: string;
}

export function FunnelChart({ stages, className }: FunnelChartProps) {
  if (stages.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        No funnel data available
      </div>
    );
  }

  const maxValue = Math.max(...stages.map((s) => s.value));

  return (
    <div className={cn('space-y-3', className)}>
      {stages.map((stage, index) => {
        const width = maxValue > 0 ? (stage.value / maxValue) * 100 : 0;
        const isLast = index === stages.length - 1;

        return (
          <div key={stage.name} className="relative">
            {/* Stage bar */}
            <div className="flex items-center gap-4">
              <div className="w-32 text-right">
                <span className="text-sm font-medium text-slate-700">
                  {stage.name}
                </span>
              </div>
              <div className="flex-1 relative h-10">
                <div
                  className={cn(
                    'absolute left-0 top-0 h-full rounded-r-lg transition-all duration-500',
                    stage.color
                  )}
                  style={{ width: `${width}%`, minWidth: width > 0 ? '60px' : '0' }}
                >
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <span className="text-sm font-bold text-white">
                      {formatNumber(stage.value)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="w-20 text-right">
                {!isLast && stage.conversionRate !== undefined && (
                  <span className="text-xs text-slate-500">
                    {formatPercent(stage.conversionRate)} →
                  </span>
                )}
              </div>
            </div>

            {/* Conversion arrow */}
            {!isLast && (
              <div className="ml-32 pl-4 h-4 flex items-center">
                <svg
                  className="w-4 h-4 text-slate-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 14l-7 7m0 0l-7-7m7 7V3"
                  />
                </svg>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Compact version for dashboard widgets
export function FunnelChartCompact({ stages, className }: FunnelChartProps) {
  if (stages.length === 0) {
    return null;
  }

  const maxValue = Math.max(...stages.map((s) => s.value));

  return (
    <div className={cn('space-y-2', className)}>
      {stages.map((stage) => {
        const width = maxValue > 0 ? (stage.value / maxValue) * 100 : 0;

        return (
          <div key={stage.name}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-500">{stage.name}</span>
              <span className="text-xs font-medium text-slate-700">
                {formatNumber(stage.value)}
              </span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', stage.color)}
                style={{ width: `${width}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
